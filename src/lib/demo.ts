import "server-only";
import type {
  AdguardData,
  CalendarData,
  CalendarItem,
  ImmichData,
  PlexData,
  TdarrData,
  UnraidData,
} from "./types";

// Sample data for DEMO_MODE=true — lets you preview the layout before
// wiring up any API keys.

const GB = 1024 ** 3;
const TB = 1024 ** 4;
const wobble = (base: number, spread: number) => base + (Math.random() - 0.5) * spread;
const day = (offset: number, hour = 0) => {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d.toISOString();
};

export const demo = {
  unraid: (): UnraidData => ({
    hostname: "Tower",
    version: "7.2.0",
    uptimeSeconds: 1_234_567,
    cpu: { percent: wobble(18, 10), model: "Intel Core i5-12600K", threads: 16 },
    memory: { total: 64 * GB, used: wobble(29, 2) * GB },
    array: { state: "STARTED", capacity: { total: 44 * TB, used: 31.6 * TB } },
    disks: [
      { name: "parity", role: "parity", status: "DISK_OK", temp: 34, size: 16 * TB, used: null },
      { name: "disk1", role: "data", status: "DISK_OK", temp: 33, size: 16 * TB, used: 13.9 * TB },
      { name: "disk2", role: "data", status: "DISK_OK", temp: 35, size: 16 * TB, used: 11.2 * TB },
      { name: "disk3", role: "data", status: "DISK_OK", temp: 36, size: 12 * TB, used: 6.5 * TB },
      { name: "cache", role: "cache", status: "DISK_OK", temp: 41, size: 2 * TB, used: 0.62 * TB },
    ],
    containers: { running: 23, total: 25, stopped: ["handbrake", "makemkv"] },
    warnings: [],
  }),

  adguard: (): AdguardData => {
    const queries = Array.from({ length: 24 }, (_, i) =>
      Math.round(1800 + 1400 * Math.sin((i - 6) / 3.8) + Math.random() * 300),
    ).map((v) => Math.max(v, 250));
    const blocked = queries.map((q) => Math.round(q * (0.14 + Math.random() * 0.06)));
    return {
      protectionEnabled: true,
      version: "v0.107.63",
      queries: queries.reduce((a, b) => a + b, 0),
      blocked: blocked.reduce((a, b) => a + b, 0),
      avgProcessingMs: 11.4,
      timeUnit: "hours",
      series: { queries, blocked },
      topBlocked: [
        { name: "app-measurement.com", count: 2841 },
        { name: "graph.facebook.com", count: 1932 },
        { name: "googleads.g.doubleclick.net", count: 1205 },
        { name: "device-metrics-us.amazon.com", count: 877 },
        { name: "telemetry.roku.com", count: 612 },
      ],
      topClients: [
        { name: "10.10.10.21", count: 9210 },
        { name: "10.10.10.34", count: 6100 },
        { name: "10.10.10.10", count: 4022 },
      ],
    };
  },

  plex: (): PlexData => {
    const now = Date.now();
    const recent: [string, string, string | null, number | null][] = [
      ["season", "Severance", "Season 2 · 10 episodes", 2025],
      ["movie", "Dune: Part Two", null, 2024],
      ["movie", "The Wild Robot", null, 2024],
      ["season", "The Bear", "Season 3 · 10 episodes", 2024],
      ["movie", "Conclave", null, 2024],
      ["season", "Slow Horses", "Season 4 · 6 episodes", 2024],
      ["movie", "Flow", null, 2024],
      ["album", "Cowboy Carter", "Beyoncé", 2024],
      ["movie", "Anora", null, 2024],
      ["season", "Shōgun", "Season 1 · 10 episodes", 2024],
      ["movie", "Nosferatu", null, 2024],
      ["movie", "Wicked", null, 2024],
    ];
    return {
      recent: recent.map(([type, title, subtitle, year], i) => ({
        id: `demo-${i}`,
        type,
        title,
        subtitle,
        year,
        library: type === "movie" ? "Movies" : type === "album" ? "Music" : "TV Shows",
        addedAt: now - i * 5.5 * 3600_000,
        image: null,
      })),
      sessions: [
        {
          id: "s1",
          title: "Andor",
          subtitle: "S02E04 · Ever Been to Ghorman?",
          user: "alex",
          player: "Living Room TV",
          state: "playing",
          progress: 0.42,
          image: null,
        },
      ],
    };
  },

  calendar: (): CalendarData => {
    const items: CalendarItem[] = [
      ["sonarr", -1, 21, "The Last of Us", "S02E07 · Convergence", true],
      ["sonarr", 0, 2, "Andor", "S02E05 · I Have Friends Everywhere", true],
      ["radarr", 0, 0, "Sinners", "Digital release", false],
      ["sonarr", 0, 20, "Severance", "S03E01 · Hello, Ms. Cobel", false],
      ["bookshelf", 1, 0, "Wind and Truth", "Brandon Sanderson", false],
      ["sonarr", 2, 21, "Slow Horses", "S05E03 · Hello Goodbye", false],
      ["radarr", 3, 0, "Mickey 17", "Physical release", false],
      ["sonarr", 4, 3, "The Rookie", "S08E02 · Tribal", false],
      ["bookshelf", 6, 0, "Dungeon Crawler Carl 8", "Matt Dinniman", false],
      ["radarr", 8, 0, "Superman", "In cinemas", false],
      ["sonarr", 9, 21, "Slow Horses", "S05E04 · Scars", false],
      ["bookshelf", 12, 0, "Project Hail Mary (Anniversary)", "Andy Weir", false],
    ].map(([source, offset, hour, title, subtitle, hasFile], i) => ({
      id: `demo-${i}`,
      source: source as CalendarItem["source"],
      date: day(offset as number, hour as number),
      allDay: source !== "sonarr",
      title: title as string,
      subtitle: source === "radarr" ? "2025" : (subtitle as string),
      kind: source === "radarr" ? (subtitle as string) : source === "bookshelf" ? "Book" : "Episode",
      hasFile: hasFile as boolean,
      image: null,
    }));
    return {
      items,
      start: day(-1),
      end: day(14),
      sources: [
        { source: "sonarr", ok: true, queue: 2 },
        { source: "radarr", ok: true, queue: 1 },
        { source: "bookshelf", ok: true, queue: 0 },
      ],
    };
  },

  immich: (): ImmichData => ({
    version: "v1.135.3",
    photos: 48_213,
    videos: 3_904,
    usageBytes: 612 * GB,
    disk: { total: 44 * TB, used: 31.6 * TB },
    users: [
      { name: "Alex", photos: 31_022, videos: 2_410, usageBytes: 402 * GB },
      { name: "Sam", photos: 17_191, videos: 1_494, usageBytes: 210 * GB },
    ],
  }),

  tdarr: (): TdarrData => ({
    files: 8_412,
    transcodes: 3_120,
    healthChecks: 8_390,
    queued: 57,
    processed: 8_301,
    errored: 4,
    savedGb: 4_830.6,
    nodes: 1,
    workers: [
      { id: "w1", node: "MainNode", type: "transcodegpu", file: "Dune Part Two (2024).mkv", percent: wobble(62, 20) },
      { id: "w2", node: "MainNode", type: "healthcheckcpu", file: "The Bear S03E04.mkv", percent: wobble(35, 30) },
    ],
  }),
};
