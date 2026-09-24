import "server-only";
import { config } from "../config";
import { cached, fetchJson, settle } from "../http";
import type { RequestsData } from "../types";

// Works with both Overseerr and Jellyseerr (same API).

const opts = () => ({ headers: { "X-Api-Key": config.overseerr.apiKey ?? "" }, label: "Overseerr" });
const api = (path: string) => `${config.overseerr.url}/api/v1${path}`;

const REQUEST_STATUS = { 1: "pending", 2: "approved", 3: "declined" } as const;
const MEDIA_STATUS: Record<number, string> = {
  1: "Unknown",
  2: "Pending",
  3: "Processing",
  4: "Partially available",
  5: "Available",
};

type Request = {
  id: number;
  status: number;
  type: "movie" | "tv";
  createdAt: string;
  media?: { tmdbId?: number; mediaType?: string; status?: number };
  requestedBy?: { displayName?: string; plexUsername?: string; username?: string };
};

type Details = { title?: string; name?: string; releaseDate?: string; firstAirDate?: string; posterPath?: string };

// Titles aren't in the request list, so look them up (cached — they don't change).
const details = (type: "movie" | "tv", tmdbId: number) =>
  cached(`seerr-${type}-${tmdbId}`, 24 * 3600_000, () => fetchJson<Details>(api(`/${type}/${tmdbId}`), opts()));

export async function getRequests(): Promise<RequestsData> {
  const [counts, list] = await Promise.all([
    fetchJson<Partial<RequestsData["counts"]>>(api("/request/count"), opts()),
    fetchJson<{ results?: Request[] }>(api("/request?take=8&skip=0&sort=added&filter=all"), opts()),
  ]);

  const recent = await Promise.all(
    (list.results ?? []).map(async (r) => {
      const d = r.media?.tmdbId ? await settle(details(r.type, r.media.tmdbId)) : null;
      const date = d?.releaseDate ?? d?.firstAirDate;
      return {
        id: r.id,
        title: d?.title ?? d?.name ?? `TMDB ${r.media?.tmdbId ?? "?"}`,
        year: date ? date.slice(0, 4) : null,
        type: r.type,
        status: REQUEST_STATUS[r.status as 1 | 2 | 3] ?? ("unknown" as const),
        mediaStatus: r.media?.status ? (MEDIA_STATUS[r.media.status] ?? null) : null,
        user: r.requestedBy?.displayName ?? r.requestedBy?.plexUsername ?? r.requestedBy?.username ?? null,
        createdAt: r.createdAt,
        image: d?.posterPath ? `https://image.tmdb.org/t/p/w185${d.posterPath}` : null,
      };
    }),
  );

  return {
    counts: {
      pending: counts.pending ?? 0,
      approved: counts.approved ?? 0,
      processing: counts.processing ?? 0,
      available: counts.available ?? 0,
      total: counts.total ?? 0,
    },
    recent,
  };
}

export async function requestAction(id: number, action: "approve" | "decline") {
  if (!Number.isInteger(id) || id <= 0) throw new Error("Bad request id");
  await fetchJson(api(`/request/${id}/${action}`), { ...opts(), method: "POST" });
}
