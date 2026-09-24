import "server-only";
import type {
  AdguardData,
  CalendarData,
  CalendarItem,
  DownloadsData,
  HomeAssistantData,
  ImmichData,
  RequestsData,
  TautulliData,
  UptimeData,
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
    containers: {
      running: 23,
      total: 25,
      stopped: ["handbrake", "makemkv"],
      list: [
        "adguard", "bookshelf", "handbrake", "homeassistant", "immich", "immich-ml", "makemkv", "overseerr",
        "plex", "postgres", "prowlarr", "qbittorrent", "radarr", "redis", "sabnzbd", "sonarr", "tautulli",
        "tdarr", "tdarr-node", "unraid-dashboard", "uptime-kuma", "vaultwarden", "nginx-proxy", "cloudflared", "zigbee2mqtt",
      ].map((name) => ({ id: name, name, running: name !== "handbrake" && name !== "makemkv" })),
    },
    warnings: [],
    history: Array.from({ length: 360 }, (_, i) => ({
      t: Date.now() - (359 - i) * 10_000,
      cpu: Math.max(2, 14 + 9 * Math.sin(i / 23) + (i > 250 && i < 290 ? 35 : 0) + Math.random() * 6),
      mem: 44 + 3 * Math.sin(i / 60) + Math.random(),
    })),
    parity: { action: "Parity check", progress: 0.37, running: true },
    ups: { name: "Back-UPS 1500", status: "ONLINE", charge: 100, runtimeSeconds: 2940, load: 22 },
    vms: [
      { name: "Home Assistant OS", state: "running" },
      { name: "Windows 11", state: "shutoff" },
    ],
    notifications: {
      unread: 3,
      warnings: 1,
      alerts: 0,
      latest: [
        { id: "n1", title: "Parity check started", subject: "Scheduled check", importance: "info", timestamp: day(0, 1) },
        { id: "n2", title: "Disk 3 is warm", subject: "46 °C", importance: "warning", timestamp: day(-1, 16) },
        { id: "n3", title: "Appdata backup complete", subject: null, importance: "info", timestamp: day(-1, 4) },
      ],
    },
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

  homeassistant: (): HomeAssistantData => {
    const hours = 144;
    const start = Date.now() - hours * 600_000;
    const solar = Array.from({ length: hours }, (_, i) => {
      const hour = new Date(start + i * 600_000).getHours() + new Date(start + i * 600_000).getMinutes() / 60;
      return hour > 6.5 && hour < 18.5 ? Math.round(4200 * Math.sin(((hour - 6.5) / 12) * Math.PI) * (0.85 + Math.random() * 0.15)) : 0;
    });
    const home = solar.map((_, i) => Math.round(650 + 500 * Math.abs(Math.sin(i / 11)) + Math.random() * 250));
    return {
      garage: [{ id: "cover.garage_door", name: "Garage door", state: "closed", since: new Date(Date.now() - 3 * 3600_000).toISOString() }],
      people: [
        { id: "person.alex", name: "Alex", state: "home", picture: null, since: day(0, 17) },
        { id: "person.sam", name: "Sam", state: "Work", picture: null, since: day(0, 8) },
      ],
      openings: [
        { id: "binary_sensor.front_door", name: "Front door", kind: "door", open: false, since: day(0, 18) },
        { id: "binary_sensor.back_door", name: "Back door", kind: "door", open: true, since: new Date(Date.now() - 12 * 60_000).toISOString() },
        { id: "binary_sensor.office_window", name: "Office window", kind: "window", open: false, since: day(-1, 9) },
      ],
      locks: [
        { id: "lock.front_door", name: "Front door", state: "locked" },
        { id: "lock.side_gate", name: "Side gate", state: "unlocked" },
      ],
      controls: [
        ["light.living_room", "Living room", true],
        ["light.kitchen", "Kitchen", true],
        ["light.bedroom", "Bedroom", false],
        ["light.porch", "Porch", false],
        ["switch.office_fan", "Office fan", false],
        ["switch.pool_pump", "Pool pump", true],
        ["scene.movie_night", "Movie night", false],
        ["scene.good_night", "Good night", false],
      ].map(([id, name, on]) => ({
        id: id as string,
        name: name as string,
        domain: (id as string).split(".")[0],
        state: on ? "on" : "off",
        on: on as boolean,
      })),
      weather: {
        name: "Home",
        condition: "partlycloudy",
        temperature: 22,
        unit: "°C",
        humidity: 58,
        wind: 14,
        windUnit: "km/h",
        forecast: [
          ["sunny", 24, 13, 0],
          ["partlycloudy", 23, 14, 0],
          ["rainy", 18, 12, 6],
          ["pouring", 16, 11, 18],
          ["cloudy", 19, 10, 1],
          ["sunny", 22, 11, 0],
        ].map(([condition, high, low, precip], i) => ({
          date: day(i),
          condition: condition as string,
          high: high as number,
          low: low as number,
          precip: precip as number,
        })),
        sunrise: day(1, 6),
        sunset: day(0, 18),
      },
      energy: {
        unit: "W",
        now: { solar: solar[hours - 1], grid: home[hours - 1] - solar[hours - 1], home: home[hours - 1], battery: 86 },
        history: {
          start: start + 600_000,
          stepMs: 600_000,
          solar,
          home,
          grid: home.map((h, i) => h - solar[i]),
        },
      },
      cameras: [
        { id: "camera.driveway", name: "Driveway", image: "" },
        { id: "camera.back_yard", name: "Back yard", image: "" },
      ],
    };
  },

  downloads: (): DownloadsData => ({
    queue: [
      { id: "q1", source: "sonarr", title: "Severance", subtitle: "S03E01 · Hello, Ms. Cobel", progress: 0.72, status: "downloading", eta: "6m", size: 2.1 * GB, warning: null },
      { id: "q2", source: "radarr", title: "Mickey 17", subtitle: "2025", progress: 0.31, status: "downloading", eta: "24m", size: 14.6 * GB, warning: null },
      { id: "q3", source: "bookshelf", title: "Wind and Truth", subtitle: "Brandon Sanderson", progress: 1, status: "import pending", eta: null, size: 0.004 * GB, warning: "No files found are eligible for import" },
      { id: "q4", source: "sonarr", title: "Slow Horses", subtitle: "S05E03 · Hello Goodbye", progress: 0, status: "queued", eta: null, size: 1.4 * GB, warning: null },
    ],
    clients: [
      { id: "qbittorrent", name: "qBittorrent", ok: true, downBps: wobble(38, 10) * 1024 ** 2, upBps: 2.1 * 1024 ** 2, active: 3, paused: false },
      { id: "sabnzbd", name: "SABnzbd", ok: true, downBps: wobble(61, 20) * 1024 ** 2, upBps: null, active: 1, paused: false },
    ],
    arrs: [
      { source: "sonarr", ok: true, missing: 12, health: [] },
      { source: "radarr", ok: true, missing: 4, health: [{ type: "warning", message: "Indexers unavailable due to failures for more than 6 hours: NZBgeek" }] },
      { source: "bookshelf", ok: true, missing: 31, health: [] },
    ],
  }),

  overseerr: (): RequestsData => ({
    counts: { pending: 2, approved: 41, processing: 3, available: 118, total: 164 },
    recent: [
      ["The Brutalist", "2024", "movie", "pending", null, "Sam"],
      ["Paradise", "2025", "tv", "pending", null, "Alex"],
      ["Thunderbolts*", "2025", "movie", "approved", "Processing", "Sam"],
      ["The Studio", "2025", "tv", "approved", "Available", "Alex"],
      ["Sinners", "2025", "movie", "approved", "Available", "Alex"],
    ].map(([title, year, type, status, mediaStatus, user], i) => ({
      id: i + 1,
      title: title as string,
      year,
      type: type as "movie" | "tv",
      status: status as "pending" | "approved",
      mediaStatus,
      user,
      createdAt: new Date(Date.now() - (i + 1) * 7 * 3600_000).toISOString(),
      image: null,
    })),
  }),

  tautulli: (): TautulliData => ({
    days: 30,
    streams: 1,
    bandwidthKbps: 8400,
    topUsers: [
      { name: "Alex", plays: 142, hours: 118 },
      { name: "Sam", plays: 96, hours: 74 },
      { name: "Mum", plays: 31, hours: 22 },
    ],
    topMovies: [
      { name: "Dune: Part Two", plays: 6 },
      { name: "The Wild Robot", plays: 5 },
      { name: "Flow", plays: 3 },
    ],
    topShows: [
      { name: "Severance", plays: 19 },
      { name: "The Bear", plays: 14 },
      { name: "Slow Horses", plays: 11 },
    ],
  }),

  uptimekuma: (): UptimeData => ({
    title: "Homelab",
    monitors: [
      ["Plex", "Media"], ["Sonarr", "Media"], ["Radarr", "Media"], ["Overseerr", "Media"],
      ["Home Assistant", "Home"], ["AdGuard DNS", "Network"], ["Immich", "Apps"], ["Vaultwarden", "Apps"],
      ["Cloudflare tunnel", "Network"], ["Internet (1.1.1.1)", "Network"],
    ].map(([name, group], i) => ({
      id: i + 1,
      name,
      group,
      status: i === 7 ? ("down" as const) : ("up" as const),
      uptime24h: i === 7 ? 0.962 : 0.999 + Math.random() * 0.001,
      ping: Math.round(8 + Math.random() * 40),
      beats: Array.from({ length: 30 }, (_, b) => (i === 7 && b > 26 ? 0 : i === 3 && b === 12 ? 0 : 1)),
    })),
  }),
};
