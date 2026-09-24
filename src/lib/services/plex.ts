import "server-only";
import { config } from "../config";
import { fetchJson, settle } from "../http";
import { imageUrl } from "../images";
import type { PlexData, PlexItem, PlexSession } from "../types";

interface Meta {
  ratingKey?: string;
  type?: string;
  title?: string;
  parentTitle?: string;
  grandparentTitle?: string;
  index?: number;
  parentIndex?: number;
  year?: number;
  parentYear?: number;
  addedAt?: number;
  thumb?: string;
  parentThumb?: string;
  grandparentThumb?: string;
  librarySectionTitle?: string;
  leafCount?: number;
  viewOffset?: number;
  duration?: number;
  sessionKey?: string;
  User?: { title?: string };
  Player?: { title?: string; product?: string; state?: string };
}

type Container = { MediaContainer?: { Metadata?: Meta[] } };

const pad = (n?: number) => String(n ?? 0).padStart(2, "0");
const RECENT_LIMIT = Number(process.env.PLEX_RECENT_LIMIT) || 24;

function describe(m: Meta): { title: string; subtitle: string | null; thumb?: string } {
  switch (m.type) {
    case "episode":
      return {
        title: m.grandparentTitle ?? m.title ?? "Episode",
        subtitle: `S${pad(m.parentIndex)}E${pad(m.index)} · ${m.title ?? ""}`,
        thumb: m.grandparentThumb ?? m.parentThumb ?? m.thumb,
      };
    case "season":
      return {
        title: m.parentTitle ?? m.title ?? "Season",
        subtitle: m.leafCount ? `${m.title} · ${m.leafCount} episodes` : (m.title ?? null),
        thumb: m.thumb ?? m.parentThumb,
      };
    case "album":
      return { title: m.title ?? "Album", subtitle: m.parentTitle ?? null, thumb: m.thumb };
    case "track":
      return { title: m.title ?? "Track", subtitle: m.grandparentTitle ?? null, thumb: m.parentThumb ?? m.thumb };
    default:
      return { title: m.title ?? "Untitled", subtitle: null, thumb: m.thumb };
  }
}

export async function getPlex(): Promise<PlexData> {
  const { url, token } = config.plex;
  const headers = { "X-Plex-Token": token ?? "" };
  const opts = { headers, label: "Plex" };

  const [recent, sessions] = await Promise.all([
    fetchJson<Container>(
      `${url}/library/recentlyAdded?X-Plex-Container-Start=0&X-Plex-Container-Size=${RECENT_LIMIT}`,
      opts,
    ),
    settle(fetchJson<Container>(`${url}/status/sessions`, opts)),
  ]);

  const items: PlexItem[] = (recent.MediaContainer?.Metadata ?? []).map((m) => {
    const d = describe(m);
    return {
      id: m.ratingKey ?? `${m.title}-${m.addedAt}`,
      type: m.type ?? "unknown",
      title: d.title,
      subtitle: d.subtitle,
      library: m.librarySectionTitle ?? null,
      year: m.year ?? m.parentYear ?? null,
      addedAt: (m.addedAt ?? 0) * 1000,
      image: d.thumb ? imageUrl("plex", d.thumb) : null,
    };
  });

  const playing: PlexSession[] = (sessions?.MediaContainer?.Metadata ?? []).map((m) => {
    const d = describe(m);
    return {
      id: m.sessionKey ?? m.ratingKey ?? d.title,
      title: d.title,
      subtitle: d.subtitle,
      user: m.User?.title ?? null,
      player: m.Player?.title ?? m.Player?.product ?? null,
      state: m.Player?.state ?? null,
      progress: m.viewOffset && m.duration ? Math.min(1, m.viewOffset / m.duration) : null,
      image: d.thumb ? imageUrl("plex", d.thumb) : null,
    };
  });

  return { recent: items, sessions: playing };
}
