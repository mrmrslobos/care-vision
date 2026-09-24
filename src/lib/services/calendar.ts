import "server-only";
import { config, enabled } from "../config";
import { fetchJson, settle } from "../http";
import { imageUrl, type ImageService } from "../images";
import type { CalendarData, CalendarItem, CalendarSource } from "../types";

type Image = { coverType?: string; url?: string; remoteUrl?: string };

// Prefer the local MediaCover (served through our proxy, works offline);
// fall back to the remote artwork URL.
function pickImage(service: ImageService, images: Image[] | undefined, types: string[]) {
  const img = types.map((t) => images?.find((i) => i.coverType === t)).find(Boolean);
  if (!img) return null;
  if (img.url?.startsWith("/")) {
    // Sonarr/Radarr can serve pre-scaled covers: poster.jpg -> poster-250.jpg
    const scaled = service === "bookshelf" ? img.url : img.url.replace(/(poster|fanart)\.jpg/, "$1-250.jpg");
    return imageUrl(service, scaled);
  }
  return img.remoteUrl ?? null;
}

const pad = (n?: number) => String(n ?? 0).padStart(2, "0");

async function sonarr(start: string, end: string): Promise<CalendarItem[]> {
  const { url, apiKey } = config.sonarr;
  type Ep = {
    id: number;
    seasonNumber?: number;
    episodeNumber?: number;
    title?: string;
    airDateUtc?: string;
    hasFile?: boolean;
    series?: { title?: string; images?: Image[]; network?: string };
  };
  const eps = await fetchJson<Ep[]>(
    `${url}/api/v3/calendar?start=${start}&end=${end}&includeSeries=true&unmonitored=false`,
    { headers: { "X-Api-Key": apiKey ?? "" }, label: "Sonarr" },
  );
  return eps
    .filter((e) => e.airDateUtc)
    .map((e) => ({
      id: `sonarr-${e.id}`,
      source: "sonarr" as const,
      date: e.airDateUtc!,
      allDay: false,
      title: e.series?.title ?? "Unknown series",
      subtitle: `S${pad(e.seasonNumber)}E${pad(e.episodeNumber)}${e.title ? ` · ${e.title}` : ""}`,
      kind: e.series?.network ?? "Episode",
      hasFile: !!e.hasFile,
      image: pickImage("sonarr", e.series?.images, ["poster"]),
    }));
}

async function radarr(start: string, end: string): Promise<CalendarItem[]> {
  const { url, apiKey } = config.radarr;
  type Movie = {
    id: number;
    title?: string;
    year?: number;
    inCinemas?: string;
    digitalRelease?: string;
    physicalRelease?: string;
    hasFile?: boolean;
    images?: Image[];
  };
  const movies = await fetchJson<Movie[]>(
    `${url}/api/v3/calendar?start=${start}&end=${end}&unmonitored=false`,
    { headers: { "X-Api-Key": apiKey ?? "" }, label: "Radarr" },
  );
  const from = Date.parse(start);
  const to = Date.parse(end);
  const releases = [
    ["inCinemas", "In cinemas"],
    ["digitalRelease", "Digital release"],
    ["physicalRelease", "Physical release"],
  ] as const;

  // A movie shows once per release type that falls inside the window.
  return movies.flatMap((m) =>
    releases
      .filter(([key]) => {
        const t = m[key] ? Date.parse(m[key]!) : NaN;
        return t >= from && t <= to;
      })
      .map(([key, label]) => ({
        id: `radarr-${m.id}-${key}`,
        source: "radarr" as const,
        date: m[key]!,
        allDay: true,
        title: m.title ?? "Unknown movie",
        subtitle: m.year ? String(m.year) : null,
        kind: label,
        hasFile: !!m.hasFile,
        image: pickImage("radarr", m.images, ["poster"]),
      })),
  );
}

// Bookshelf is a Readarr fork and keeps Readarr's v1 API.
async function bookshelf(start: string, end: string): Promise<CalendarItem[]> {
  const { url, apiKey } = config.bookshelf;
  type Book = {
    id: number;
    title?: string;
    releaseDate?: string;
    images?: Image[];
    author?: { authorName?: string; images?: Image[] };
    statistics?: { bookFileCount?: number };
    grabbed?: boolean;
  };
  const books = await fetchJson<Book[]>(
    `${url}/api/v1/calendar?start=${start}&end=${end}&includeAuthor=true&unmonitored=false`,
    { headers: { "X-Api-Key": apiKey ?? "" }, label: "Bookshelf" },
  );
  return books
    .filter((b) => b.releaseDate)
    .map((b) => ({
      id: `bookshelf-${b.id}`,
      source: "bookshelf" as const,
      date: b.releaseDate!,
      allDay: true,
      title: b.title ?? "Unknown book",
      subtitle: b.author?.authorName ?? null,
      kind: "Book",
      hasFile: (b.statistics?.bookFileCount ?? 0) > 0,
      image: pickImage("bookshelf", b.images, ["cover", "poster"]) ?? pickImage("bookshelf", b.author?.images, ["poster"]),
    }));
}

async function queueCount(source: CalendarSource): Promise<number | null> {
  const c = config[source];
  const version = source === "bookshelf" ? "v1" : "v3";
  const res = await settle(
    fetchJson<{ totalCount?: number }>(`${c.url}/api/${version}/queue/status`, {
      headers: { "X-Api-Key": c.apiKey ?? "" },
    }),
  );
  return res?.totalCount ?? null;
}

const fetchers = { sonarr, radarr, bookshelf };

export async function getCalendar(): Promise<CalendarData> {
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - config.calendarPastDays);
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  endDate.setDate(endDate.getDate() + config.calendarDays);
  const start = startDate.toISOString();
  const end = endDate.toISOString();

  const active = (Object.keys(fetchers) as CalendarSource[]).filter((s) => enabled[s]);
  const results = await Promise.all(
    active.map(async (source) => {
      const [items, queue] = await Promise.all([
        fetchers[source](start, end).then(
          (v) => ({ ok: true as const, v }),
          (e: Error) => ({ ok: false as const, e }),
        ),
        queueCount(source),
      ]);
      return { source, items, queue };
    }),
  );

  if (results.length && results.every((r) => !r.items.ok)) {
    throw new Error(results.map((r) => (!r.items.ok ? r.items.e.message : "")).join("; "));
  }

  const items = results
    .flatMap((r) => (r.items.ok ? r.items.v : []))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

  return {
    items,
    start,
    end,
    sources: results.map((r) => ({
      source: r.source,
      ok: r.items.ok,
      error: r.items.ok ? undefined : r.items.e.message,
      queue: r.queue,
    })),
  };
}
