import "server-only";
import { config } from "../config";
import { fetchJson, settle } from "../http";
import type { TautulliData } from "../types";

const DAYS = 30;

type Envelope<T> = { response?: { result?: string; message?: string; data?: T } };
type Stat = {
  stat_id: string;
  rows?: { friendly_name?: string; title?: string; total_plays?: number; total_duration?: number }[];
};

async function call<T>(cmd: string, params = ""): Promise<T> {
  const { url, apiKey } = config.tautulli;
  const res = await fetchJson<Envelope<T>>(
    `${url}/api/v2?apikey=${encodeURIComponent(apiKey ?? "")}&cmd=${cmd}${params}`,
    { label: "Tautulli" },
  );
  if (res.response?.result !== "success") throw new Error(`Tautulli: ${res.response?.message ?? "request failed"}`);
  return res.response.data as T;
}

export async function getTautulli(): Promise<TautulliData> {
  const [stats, activity] = await Promise.all([
    call<Stat[]>("get_home_stats", `&time_range=${DAYS}&stats_count=5&stats_type=plays`),
    settle(call<{ stream_count?: string | number; total_bandwidth?: number }>("get_activity")),
  ]);
  const rows = (id: string) => stats.find((s) => s.stat_id === id)?.rows ?? [];

  return {
    days: DAYS,
    streams: Number(activity?.stream_count ?? 0),
    bandwidthKbps: activity?.total_bandwidth ?? null,
    topUsers: rows("top_users").map((r) => ({
      name: r.friendly_name ?? "?",
      plays: r.total_plays ?? 0,
      hours: Math.round((r.total_duration ?? 0) / 3600),
    })),
    topMovies: rows("top_movies").map((r) => ({ name: r.title ?? "?", plays: r.total_plays ?? 0 })),
    topShows: rows("top_tv").map((r) => ({ name: r.title ?? "?", plays: r.total_plays ?? 0 })),
  };
}
