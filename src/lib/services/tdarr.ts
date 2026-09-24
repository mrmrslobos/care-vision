import "server-only";
import { config } from "../config";
import { fetchJson, settle } from "../http";
import type { TdarrData, TdarrWorker } from "../types";

// Tdarr's statistics document. table1-3 are the transcode queue / success /
// error tables and table4-6 the same for health checks.
interface Stats {
  totalFileCount?: number;
  totalTranscodeCount?: number;
  totalHealthCheckCount?: number;
  sizeDiff?: number; // GB
  table1Count?: number;
  table2Count?: number;
  table3Count?: number;
  table4Count?: number;
  table5Count?: number;
  table6Count?: number;
}

type Nodes = Record<
  string,
  {
    nodeName?: string;
    workers?: Record<string, { workerType?: string; file?: string; percentage?: number; job?: { type?: string } }>;
  }
>;

const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const sum = (...vals: (number | undefined)[]) =>
  vals.some((v) => typeof v === "number") ? vals.reduce<number>((a, v) => a + (v ?? 0), 0) : null;

export async function getTdarr(): Promise<TdarrData> {
  const { url, apiKey } = config.tdarr;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["x-api-key"] = apiKey;

  const [stats, nodes] = await Promise.all([
    fetchJson<Stats>(`${url}/api/v2/cruddb`, {
      method: "POST",
      headers,
      label: "Tdarr",
      body: JSON.stringify({
        data: { collection: "StatisticsJSONDB", mode: "getById", docID: "statistics" },
      }),
    }),
    settle(fetchJson<Nodes>(`${url}/api/v2/get-nodes`, { headers, label: "Tdarr" })),
  ]);

  const workers: TdarrWorker[] = Object.entries(nodes ?? {}).flatMap(([nodeId, node]) =>
    Object.entries(node.workers ?? {}).map(([id, w]) => ({
      id: `${nodeId}-${id}`,
      node: node.nodeName ?? nodeId,
      type: w.workerType ?? w.job?.type ?? "worker",
      file: w.file ? w.file.split(/[\\/]/).pop() ?? null : null,
      percent: n(w.percentage),
    })),
  );

  return {
    files: n(stats.totalFileCount),
    transcodes: n(stats.totalTranscodeCount),
    healthChecks: n(stats.totalHealthCheckCount),
    queued: sum(stats.table1Count, stats.table4Count),
    processed: sum(stats.table2Count, stats.table5Count),
    errored: sum(stats.table3Count, stats.table6Count),
    savedGb: n(stats.sizeDiff),
    nodes: Object.keys(nodes ?? {}).length,
    workers,
  };
}
