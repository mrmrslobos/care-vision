import "server-only";
import { config } from "../config";
import { fetchJson, UpstreamError } from "../http";
import type { UnraidData, UnraidDisk } from "../types";

// Unraid 7.x ships a GraphQL API at /graphql (built in from 7.2, or via the
// Unraid Connect plugin on older versions). Each section is queried on its own
// so a field missing on one Unraid version doesn't blank the whole card.

type GqlResponse<T> = { data?: T; errors?: { message: string }[] };

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetchJson<GqlResponse<T>>(`${config.unraid.url}/graphql`, {
    method: "POST",
    label: "Unraid",
    headers: { "Content-Type": "application/json", "x-api-key": config.unraid.apiKey ?? "" },
    body: JSON.stringify({ query, variables }),
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
  docker: `query { docker { containers { id names state } } }`,
  // Parity/resync progress lives in `vars` (md driver fields).
  parity: `query { vars { mdResyncAction mdResyncPos mdResyncSize mdResync } }`,
  ups: `query { upsDevices { name model status battery { chargeLevel estimatedRuntime } power { loadPercentage } } }`,
  vms: `query { vms { domains { name state } } }`,
  notifications: `query { notifications {
    overview { unread { info warning alert total } }
    list(filter: { type: UNREAD, offset: 0, limit: 5 }) { id title subject importance timestamp } } }`,
};

// A rolling hour of CPU/memory samples, kept in memory while the dashboard
// is open. Samples closer than 8s apart are skipped so extra viewers don't
// speed up the clock.
const HISTORY_MS = 60 * 60_000;
const history: UnraidData["history"] = [];

function record(cpu: number | null, mem: number | null) {
  const now = Date.now();
  const last = history[history.length - 1];
  if (last && now - last.t < 8000) return;
  history.push({ t: now, cpu, mem });
  while (history.length && now - history[0].t > HISTORY_MS) history.shift();
}

export async function getUnraid(): Promise<UnraidData> {
  const [info, version, metrics, memoryLegacy, array, docker, parityRes, upsRes, vmsRes, notesRes] = await Promise.allSettled([
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
    gql<{ docker: { containers?: { id?: string; names?: string[]; state?: string }[] } }>(QUERIES.docker),
    gql<{ vars: { mdResyncAction?: string; mdResyncPos?: string | number; mdResyncSize?: string | number; mdResync?: string | number } }>(QUERIES.parity),
    gql<{
      upsDevices: {
        name?: string;
        model?: string;
        status?: string;
        battery?: { chargeLevel?: number; estimatedRuntime?: number };
        power?: { loadPercentage?: number };
      }[];
    }>(QUERIES.ups),
    gql<{ vms: { domains?: { name?: string; state?: string }[] } }>(QUERIES.vms),
    gql<{
      notifications: {
        overview?: { unread?: { info?: number; warning?: number; alert?: number; total?: number } };
        list?: { id: string; title?: string; subject?: string; importance?: string; timestamp?: string }[];
      };
    }>(QUERIES.notifications),
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
  const par = ok(parityRes)?.vars;
  const upsList = ok(upsRes)?.upsDevices;
  const vmList = ok(vmsRes)?.vms?.domains;
  const notes = ok(notesRes)?.notifications;

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
    const list = d.containers
      .map((c) => ({
        id: c.id ?? "",
        name: (c.names?.[0] ?? "?").replace(/^\//, ""),
        running: c.state?.toUpperCase() === "RUNNING",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    containers = {
      running: list.filter((c) => c.running).length,
      total: list.length,
      stopped: list.filter((c) => !c.running).map((c) => c.name),
      list,
    };
  }

  // mdResync is non-zero while a parity check / rebuild is in progress.
  let parity: UnraidData["parity"] = null;
  const size = num(par?.mdResyncSize);
  const pos = num(par?.mdResyncPos);
  if (par && size && pos !== null && num(par.mdResync)) {
    const action = (par.mdResyncAction ?? "check").toLowerCase();
    parity = {
      action: action.startsWith("recon") ? "Rebuild" : action.includes("clear") ? "Clear" : "Parity check",
      progress: Math.min(1, pos / size),
      running: true,
    };
  }

  const u = upsList?.[0];
  const ups: UnraidData["ups"] = u
    ? {
        name: u.model ?? u.name ?? "UPS",
        status: u.status ?? null,
        charge: num(u.battery?.chargeLevel),
        runtimeSeconds: num(u.battery?.estimatedRuntime),
        load: num(u.power?.loadPercentage),
      }
    : null;

  const unread = notes?.overview?.unread;
  const notifications: UnraidData["notifications"] = notes
    ? {
        unread: unread?.total ?? 0,
        warnings: unread?.warning ?? 0,
        alerts: unread?.alert ?? 0,
        latest: (notes.list ?? []).map((n) => ({
          id: n.id,
          title: n.title ?? "Notification",
          subject: n.subject ?? null,
          importance: (n.importance ?? "INFO").toLowerCase(),
          timestamp: n.timestamp ?? null,
        })),
      }
    : null;

  const cpuPct = num(m?.cpu?.percentTotal);
  record(cpuPct, memory ? (memory.used / memory.total) * 100 : null);

  const warnings = disks
    .filter((x) => x.status && !/DISK_OK|DISK_NP/i.test(x.status))
    .map((x) => `${x.name}: ${x.status!.replace(/^DISK_/, "").toLowerCase()}`);

  return {
    hostname: i?.os?.hostname ?? v?.name ?? null,
    version: v?.version ?? null,
    uptimeSeconds,
    cpu: { percent: cpuPct, model: i?.cpu?.brand ?? null, threads: num(i?.cpu?.threads) },
    memory,
    array: { state: a?.state ?? null, capacity: capTotal ? { total: capTotal, used: capUsed ?? 0 } : null },
    disks,
    containers,
    warnings,
    history: [...history],
    parity,
    ups,
    vms: vmList ? vmList.map((v) => ({ name: v.name ?? "VM", state: (v.state ?? "unknown").toLowerCase() })) : null,
    notifications,
  };
}

// The container id type changed name across API versions, so try both.
export async function containerAction(id: string, action: "start" | "stop") {
  let lastError: unknown;
  for (const type of ["PrefixedID", "String"]) {
    try {
      await gql(`mutation($id: ${type}!) { docker { ${action}(id: $id) { id state } } }`, { id });
      return;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}
