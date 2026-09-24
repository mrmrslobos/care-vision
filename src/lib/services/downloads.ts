import "server-only";
import { config, enabled } from "../config";
import { fetchJson, settle, UpstreamError } from "../http";
import type { CalendarSource, DownloadsData, QueueItem } from "../types";

// One card for "what's coming down the pipe": the *arr download queues,
// their health checks and missing counts, plus download client speeds.

const ARR_API = { sonarr: "v3", radarr: "v3", bookshelf: "v1" } as const;
const pad = (n?: number) => String(n ?? 0).padStart(2, "0");

function eta(timeleft?: string): string | null {
  // *arr timeleft looks like "01:23:45" or "1.02:03:04"
  if (!timeleft) return null;
  const m = timeleft.match(/^(?:(\d+)\.)?(\d+):(\d+):(\d+)/);
  if (!m) return null;
  const [, d, h, min] = m.map((x) => Number(x ?? 0));
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${min}m`;
  return `${Math.max(1, min)}m`;
}

type ArrRecord = {
  id: number;
  title?: string;
  size?: number;
  sizeleft?: number;
  timeleft?: string;
  status?: string;
  trackedDownloadStatus?: string;
  trackedDownloadState?: string;
  statusMessages?: { title?: string; messages?: string[] }[];
  errorMessage?: string;
  series?: { title?: string };
  episode?: { seasonNumber?: number; episodeNumber?: number; title?: string };
  movie?: { title?: string; year?: number };
  author?: { authorName?: string };
  book?: { title?: string };
};

async function arrQueue(source: CalendarSource): Promise<QueueItem[]> {
  const c = config[source];
  const include =
    source === "sonarr" ? "includeSeries=true&includeEpisode=true" : source === "radarr" ? "includeMovie=true" : "includeAuthor=true&includeBook=true";
  const res = await fetchJson<{ records?: ArrRecord[] }>(
    `${c.url}/api/${ARR_API[source]}/queue?page=1&pageSize=25&${include}`,
    { headers: { "X-Api-Key": c.apiKey ?? "" }, label: source },
  );
  return (res.records ?? []).map((r) => {
    let title = r.title ?? "Unknown";
    let subtitle: string | null = null;
    if (source === "sonarr" && r.series) {
      title = r.series.title ?? title;
      subtitle = r.episode ? `S${pad(r.episode.seasonNumber)}E${pad(r.episode.episodeNumber)} · ${r.episode.title ?? ""}` : null;
    } else if (source === "radarr" && r.movie) {
      title = r.movie.title ?? title;
      subtitle = r.movie.year ? String(r.movie.year) : null;
    } else if (source === "bookshelf" && r.book) {
      title = r.book.title ?? title;
      subtitle = r.author?.authorName ?? null;
    }
    const warn =
      r.trackedDownloadStatus && r.trackedDownloadStatus !== "ok"
        ? (r.statusMessages?.[0]?.messages?.[0] ?? r.statusMessages?.[0]?.title ?? r.errorMessage ?? "Needs attention")
        : null;
    return {
      id: `${source}-${r.id}`,
      source,
      title,
      subtitle,
      progress: r.size ? 1 - (r.sizeleft ?? 0) / r.size : null,
      status: (r.trackedDownloadState ?? r.status ?? "queued").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase(),
      eta: eta(r.timeleft),
      size: r.size ?? null,
      warning: warn,
    };
  });
}

async function arrStatus(source: CalendarSource) {
  const c = config[source];
  const opts = { headers: { "X-Api-Key": c.apiKey ?? "" }, label: source };
  const base = `${c.url}/api/${ARR_API[source]}`;
  const [health, missing] = await Promise.all([
    fetchJson<{ type?: string; message?: string }[]>(`${base}/health`, opts),
    settle(fetchJson<{ totalRecords?: number }>(`${base}/wanted/missing?page=1&pageSize=1&monitored=true`, opts)),
  ]);
  return {
    missing: missing?.totalRecords ?? null,
    health: health
      .filter((h) => h.type === "warning" || h.type === "error")
      .map((h) => ({ type: h.type!, message: h.message ?? "" })),
  };
}

// ---------- qBittorrent ----------

let qbitCookie: string | null = null;

async function qbitLogin() {
  const { url, username, password } = config.qbittorrent;
  const res = await fetch(`${url}/api/v2/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Referer: url },
    body: new URLSearchParams({ username: username ?? "", password: password ?? "" }),
    signal: AbortSignal.timeout(8000),
  });
  const text = await res.text();
  if (!res.ok || text.trim() !== "Ok.") throw new UpstreamError("qBittorrent: login failed — check username/password");
  qbitCookie = res.headers.get("set-cookie")?.split(";")[0] ?? null;
}

async function qbit<T>(path: string): Promise<T> {
  const { url, username } = config.qbittorrent;
  const get = () =>
    fetchJson<T>(`${url}${path}`, { headers: qbitCookie ? { Cookie: qbitCookie } : {}, label: "qBittorrent" });
  if (username && !qbitCookie) await qbitLogin();
  try {
    return await get();
  } catch (err) {
    // Session expired (or auth turned on) — log in once and retry.
    if (err instanceof UpstreamError && err.status === 403 && username) {
      await qbitLogin();
      return get();
    }
    throw err;
  }
}

async function qbittorrent() {
  type Torrent = { hash: string; name: string; progress: number; eta: number; size: number; state: string; dlspeed: number };
  const [info, torrents] = await Promise.all([
    qbit<{ dl_info_speed?: number; up_info_speed?: number }>("/api/v2/transfer/info"),
    qbit<Torrent[]>("/api/v2/torrents/info?filter=downloading&sort=added_on&reverse=true"),
  ]);
  const fmtEta = (s: number) =>
    s <= 0 || s >= 8640000 ? null : s > 3600 ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m` : `${Math.max(1, Math.round(s / 60))}m`;
  return {
    client: {
      id: "qbittorrent" as const,
      name: "qBittorrent",
      ok: true,
      downBps: info.dl_info_speed ?? null,
      upBps: info.up_info_speed ?? null,
      active: torrents.length,
      paused: false,
    },
    items: torrents.slice(0, 10).map<QueueItem>((t) => ({
      id: `qbit-${t.hash}`,
      source: "qbittorrent",
      title: t.name,
      subtitle: null,
      progress: t.progress,
      status: t.state.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase(),
      eta: fmtEta(t.eta),
      size: t.size,
      warning: null,
    })),
  };
}

// ---------- SABnzbd ----------

async function sabnzbd() {
  const { url, apiKey } = config.sabnzbd;
  type Queue = {
    queue?: {
      kbpersec?: string;
      paused?: boolean;
      noofslots?: number;
      slots?: { nzo_id: string; filename: string; percentage?: string; timeleft?: string; mb?: string; status?: string }[];
    };
  };
  const res = await fetchJson<Queue>(`${url}/api?mode=queue&output=json&limit=10&apikey=${encodeURIComponent(apiKey ?? "")}`, {
    label: "SABnzbd",
  });
  const q = res.queue ?? {};
  return {
    client: {
      id: "sabnzbd" as const,
      name: "SABnzbd",
      ok: true,
      downBps: q.kbpersec ? parseFloat(q.kbpersec) * 1024 : null,
      upBps: null,
      active: q.noofslots ?? null,
      paused: !!q.paused,
    },
    items: (q.slots ?? []).map<QueueItem>((s) => ({
      id: `sab-${s.nzo_id}`,
      source: "sabnzbd",
      title: s.filename,
      subtitle: null,
      progress: s.percentage ? Number(s.percentage) / 100 : null,
      status: (s.status ?? "queued").toLowerCase(),
      eta: s.timeleft && s.timeleft !== "0:00:00" ? eta(s.timeleft) : null,
      size: s.mb ? parseFloat(s.mb) * 1024 * 1024 : null,
      warning: null,
    })),
  };
}

export async function getDownloads(): Promise<DownloadsData> {
  const arrs = (["sonarr", "radarr", "bookshelf"] as const).filter((s) => enabled[s]);
  const clients = [
    enabled.qbittorrent ? { id: "qbittorrent" as const, name: "qBittorrent", run: qbittorrent } : null,
    enabled.sabnzbd ? { id: "sabnzbd" as const, name: "SABnzbd", run: sabnzbd } : null,
  ].filter((c) => c !== null);

  const [queues, statuses, clientResults] = await Promise.all([
    Promise.all(arrs.map((s) => settle(arrQueue(s)))),
    Promise.all(
      arrs.map((s) =>
        arrStatus(s).then(
          (v) => ({ source: s, ok: true, ...v }),
          () => ({ source: s, ok: false, missing: null, health: [] }),
        ),
      ),
    ),
    Promise.all(
      clients.map((c): Promise<{ client: DownloadsData["clients"][number]; items: QueueItem[] }> =>
        c.run().catch((e: Error) => ({
          client: { id: c.id, name: c.name, ok: false, error: e.message, downBps: null, upBps: null, active: null, paused: false },
          items: [] as QueueItem[],
        })),
      ),
    ),
  ]);

  if (arrs.length + clients.length === 0) throw new Error("Nothing to show");
  if (queues.every((q) => q === null) && statuses.every((s) => !s.ok) && clientResults.every((c) => !c.client.ok)) {
    throw new Error(clientResults[0]?.client.error ?? "All download sources are unreachable");
  }

  // *arr queue entries already describe what the clients are downloading, so
  // raw client items are only shown when no *arr is configured.
  const arrItems = queues.flatMap((q) => q ?? []);
  const queue = arrs.length ? arrItems : clientResults.flatMap((c) => c.items);

  return {
    queue: queue.sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0)).slice(0, 20),
    clients: clientResults.map((c) => c.client),
    arrs: statuses,
  };
}
