import "server-only";
import { config } from "../config";
import { fetchJson, settle } from "../http";
import type { AdguardData } from "../types";

type TopList = Record<string, number>[];

interface Stats {
  time_units?: "hours" | "days";
  num_dns_queries?: number;
  num_blocked_filtering?: number;
  num_replaced_safebrowsing?: number;
  num_replaced_parental?: number;
  avg_processing_time?: number; // seconds
  dns_queries?: number[];
  blocked_filtering?: number[];
  top_blocked_domains?: TopList;
  top_clients?: TopList;
}

const top = (list: TopList | undefined, n = 5) =>
  (list ?? []).slice(0, n).map((o) => {
    const [name, count] = Object.entries(o)[0] ?? ["?", 0];
    return { name, count: Number(count) || 0 };
  });

export async function getAdguard(): Promise<AdguardData> {
  const { url, username, password } = config.adguard;
  const headers: Record<string, string> = {};
  if (username) {
    headers.Authorization = `Basic ${Buffer.from(`${username}:${password ?? ""}`).toString("base64")}`;
  }
  const opts = { headers, label: "AdGuard Home" };

  const [stats, status] = await Promise.all([
    fetchJson<Stats>(`${url}/control/stats`, opts),
    settle(fetchJson<{ protection_enabled?: boolean; version?: string }>(`${url}/control/status`, opts)),
  ]);

  const blocked =
    (stats.num_blocked_filtering ?? 0) +
    (stats.num_replaced_safebrowsing ?? 0) +
    (stats.num_replaced_parental ?? 0);

  return {
    protectionEnabled: status?.protection_enabled ?? null,
    version: status?.version ?? null,
    queries: stats.num_dns_queries ?? 0,
    blocked,
    avgProcessingMs: (stats.avg_processing_time ?? 0) * 1000,
    timeUnit: stats.time_units === "days" ? "days" : "hours",
    series: {
      queries: (stats.dns_queries ?? []).slice(-24),
      blocked: (stats.blocked_filtering ?? []).slice(-24),
    },
    topBlocked: top(stats.top_blocked_domains),
    topClients: top(stats.top_clients),
  };
}
