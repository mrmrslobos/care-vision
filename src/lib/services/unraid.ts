import "server-only";
import { config } from "../config";
import { fetchJson, UpstreamError } from "../http";
import type { UnraidData, UnraidDisk } from "../types";

// Unraid 7.x ships a GraphQL API at /graphql (built in from 7.2, or via the
// Unraid Connect plugin on older versions). Each section is queried on its own
// so a field missing on one Unraid version doesn't blank the whole card.

type GqlResponse<T> = { data?: T; errors?: { message: string }[] };

async function gql<T>(query: string): Promise<T> {
  const res = await fetchJson<GqlResponse<T>>(`${config.unraid.url}/graphql`, {
    method: "POST",
    label: "Unraid",
    headers: { "Content-Type": "application/json", "x-api-key": config.unraid.apiKey ?? "" },
    body: JSON.stringify({ query }),
  });
  if (!res.data || (res.errors?.length && !Object.values(res.data).some(Boolean))) {
    throw new UpstreamError(`Unraid: ${res.errors?.[0]?.message ?? "empty response"}`);
  }
  return res.data;
}

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};
const kb = (v: unknown) => {
  const n = num(v);
  return n === null ? null : n * 1024;
};

type RawDisk = {
  name?: string;
  status?: string;
  temp?: number | null;
  size?: number | string;
  fsSize?: number | string | null;
  fsUsed?: number | string | null;
};

const QUERIES = {
  info: `query { info { os { hostname uptime } cpu { brand threads } } }`,
  version: `query { vars { version name } }`,
  metrics: `query { metrics { cpu { percentTotal } memory { total used } } }`,
  memoryLegacy: `query { info { memory { total used available } } }`,
  array: `query { array { state capacity { kilobytes { free used total } }
    parities { name status temp size }
    disks { name status temp size fsSize fsUsed }
    caches { name status temp size fsSize fsUsed } } }`,
  docker: `query { docker { containers { names state } } }`,
};

export async function getUnraid(): Promise<UnraidData> {
  const [info, version, metrics, memoryLegacy, array, docker] = await Promise.allSettled([
    gql<{ info: { os?: { hostname?: string; uptime?: string | number }; cpu?: { brand?: string; threads?: number } } }>(QUERIES.info),
    gql<{ vars: { version?: string; name?: string } }>(QUERIES.version),
    gql<{ metrics: { cpu?: { percentTotal?: number }; memory?: { total?: number; used?: number } } }>(QUERIES.metrics),
    gql<{ info: { memory?: { total?: number; used?: number; available?: number } } }>(QUERIES.memoryLegacy),
    gql<{
      array: {
        state?: string;
        capacity?: { kilobytes?: { free?: string; used?: string; total?: string } };
        parities?: RawDisk[];
        disks?: RawDisk[];
        caches?: RawDisk[];
      };
    }>(QUERIES.array),
    gql<{ docker: { containers?: { names?: string[]; state?: string }[] } }>(QUERIES.docker),
  ]);

  const all = [info, version, metrics, memoryLegacy, array, docker];
  if (all.every((r) => r.status === "rejected")) {
    throw (info as PromiseRejectedResult).reason;
  }
  const ok = <T,>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : null);

  const i = ok(info)?.info;
  const v = ok(version)?.vars;
  const m = ok(metrics)?.metrics;
  const lm = ok(memoryLegacy)?.info?.memory;
  const a = ok(array)?.array;
  const d = ok(docker)?.docker;

  // `uptime` is the boot timestamp on current API versions, seconds on some older ones.
  let uptimeSeconds: number | null = null;
  const up = i?.os?.uptime;
  if (typeof up === "number") uptimeSeconds = up;
  else if (typeof up === "string") {
    const boot = Date.parse(up);
    uptimeSeconds = Number.isNaN(boot) ? num(up) : Math.max(0, (Date.now() - boot) / 1000);
  }

  let memory: UnraidData["memory"] = null;
  const mt = num(m?.memory?.total) ?? num(lm?.total);
  const mu = num(m?.memory?.used) ?? num(lm?.used) ?? (mt !== null && num(lm?.available) !== null ? mt - num(lm?.available)! : null);
  if (mt && mu !== null) memory = { total: mt, used: mu };

  const cap = a?.capacity?.kilobytes;
  const capTotal = kb(cap?.total);
  const capUsed = kb(cap?.used);

  const mapDisk = (role: UnraidDisk["role"]) => (x: RawDisk): UnraidDisk => ({
    name: x.name ?? role,
    role,
    status: x.status ?? null,
    temp: num(x.temp),
    size: kb(x.fsSize) ?? kb(x.size),
    used: kb(x.fsUsed),
  });
  const disks = [
    ...(a?.parities ?? []).map(mapDisk("parity")),
    ...(a?.disks ?? []).map(mapDisk("data")),
    ...(a?.caches ?? []).map(mapDisk("cache")),
  ];

  let containers: UnraidData["containers"] = null;
  if (d?.containers) {
    const running = d.containers.filter((c) => c.state?.toUpperCase() === "RUNNING");
    containers = {
      running: running.length,
      total: d.containers.length,
      stopped: d.containers
        .filter((c) => c.state?.toUpperCase() !== "RUNNING")
        .map((c) => (c.names?.[0] ?? "?").replace(/^\//, "")),
    };
  }

  const warnings = disks
    .filter((x) => x.status && !/DISK_OK|DISK_NP/i.test(x.status))
    .map((x) => `${x.name}: ${x.status!.replace(/^DISK_/, "").toLowerCase()}`);

  return {
    hostname: i?.os?.hostname ?? v?.name ?? null,
    version: v?.version ?? null,
    uptimeSeconds,
    cpu: { percent: num(m?.cpu?.percentTotal), model: i?.cpu?.brand ?? null, threads: num(i?.cpu?.threads) },
    memory,
    array: { state: a?.state ?? null, capacity: capTotal ? { total: capTotal, used: capUsed ?? 0 } : null },
    disks,
    containers,
    warnings,
  };
}
