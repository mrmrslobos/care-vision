import "server-only";
import { config } from "../config";
import { fetchJson } from "../http";
import type { UptimeData } from "../types";

// Uses an Uptime Kuma *status page* (public JSON, no API key needed).
// Create one under Status Pages and set UPTIME_KUMA_SLUG to its slug.

const STATUS = { 0: "down", 1: "up", 2: "pending", 3: "maintenance" } as const;

export async function getUptime(): Promise<UptimeData> {
  const { url, slug } = config.uptimekuma;
  const s = encodeURIComponent(slug ?? "");
  type Page = {
    config?: { title?: string };
    publicGroupList?: { name?: string; monitorList?: { id: number; name: string }[] }[];
  };
  type Beats = {
    heartbeatList?: Record<string, { status: number; ping?: number | null }[]>;
    uptimeList?: Record<string, number>;
  };
  const [page, beats] = await Promise.all([
    fetchJson<Page>(`${url}/api/status-page/${s}`, { label: "Uptime Kuma" }),
    fetchJson<Beats>(`${url}/api/status-page/heartbeat/${s}`, { label: "Uptime Kuma" }),
  ]);

  const monitors = (page.publicGroupList ?? []).flatMap((g) =>
    (g.monitorList ?? []).map((m) => {
      const list = beats.heartbeatList?.[m.id] ?? [];
      const last = list[list.length - 1];
      return {
        id: m.id,
        name: m.name,
        group: g.name ?? null,
        status: last ? (STATUS[last.status as 0 | 1 | 2 | 3] ?? "unknown") : ("unknown" as const),
        uptime24h: beats.uptimeList?.[`${m.id}_24`] ?? null,
        ping: last?.ping ?? null,
        beats: list.slice(-30).map((b) => b.status),
      };
    }),
  );

  return { title: page.config?.title ?? "Status", monitors };
}
