// Shapes returned by /api/<service>. The browser only ever sees these —
// never raw upstream responses or credentials.

export type ServiceId =
  | "unraid"
  | "adguard"
  | "plex"
  | "calendar"
  | "immich"
  | "tdarr";

export interface ServiceInfo {
  id: string;
  name: string;
  enabled: boolean;
  url: string | null;
}

export interface DashboardConfig {
  title: string;
  host: string;
  demo: boolean;
  controls: { pinRequired: boolean; sensitive: boolean };
  services: ServiceInfo[];
}

export interface Meter {
  used: number;
  total: number;
}

export interface UnraidDisk {
  name: string;
  role: "parity" | "data" | "cache";
  status: string | null;
  temp: number | null;
  size: number | null; // bytes
  used: number | null; // bytes
}

export interface UnraidContainer {
  id: string;
  name: string;
  running: boolean;
}

export interface UnraidData {
  hostname: string | null;
  version: string | null;
  uptimeSeconds: number | null;
  cpu: { percent: number | null; model: string | null; threads: number | null };
  memory: Meter | null; // bytes
  array: { state: string | null; capacity: Meter | null }; // bytes
  disks: UnraidDisk[];
  containers: { running: number; total: number; stopped: string[]; list: UnraidContainer[] } | null;
  warnings: string[];
  history: { t: number; cpu: number | null; mem: number | null }[]; // last hour, sampled ~every 10s
  parity: { action: string; progress: number; running: boolean } | null;
  ups: { name: string; status: string | null; charge: number | null; runtimeSeconds: number | null; load: number | null } | null;
  vms: { name: string; state: string }[] | null;
  notifications: { unread: number; warnings: number; alerts: number; latest: { id: string; title: string; subject: string | null; importance: string; timestamp: string | null }[] } | null;
}

export interface AdguardData {
  protectionEnabled: boolean | null;
  version: string | null;
  queries: number;
  blocked: number;
  avgProcessingMs: number;
  timeUnit: "hours" | "days";
  series: { queries: number[]; blocked: number[] };
  topBlocked: { name: string; count: number }[];
  topClients: { name: string; count: number }[];
}

export interface PlexItem {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  library: string | null;
  year: number | null;
  addedAt: number; // unix ms
  image: string | null;
}

export interface PlexSession {
  id: string;
  title: string;
  subtitle: string | null;
  user: string | null;
  player: string | null;
  state: string | null;
  progress: number | null; // 0..1
  image: string | null;
}

export interface PlexData {
  recent: PlexItem[];
  sessions: PlexSession[];
}

export type CalendarSource = "sonarr" | "radarr" | "bookshelf";

export interface CalendarItem {
  id: string;
  source: CalendarSource;
  date: string; // ISO
  allDay: boolean;
  title: string;
  subtitle: string | null;
  kind: string | null;
  hasFile: boolean;
  image: string | null;
}

export interface CalendarData {
  items: CalendarItem[];
  sources: { source: CalendarSource; ok: boolean; error?: string; queue?: number | null }[];
  start: string;
  end: string;
}

export interface ImmichData {
  version: string | null;
  photos: number;
  videos: number;
  usageBytes: number;
  disk: Meter | null;
  users: { name: string; photos: number; videos: number; usageBytes: number }[];
}

export interface TdarrWorker {
  id: string;
  node: string;
  type: string;
  file: string | null;
  percent: number | null;
}

export interface TdarrData {
  files: number | null;
  transcodes: number | null;
  healthChecks: number | null;
  queued: number | null;
  processed: number | null;
  errored: number | null;
  savedGb: number | null;
  nodes: number;
  workers: TdarrWorker[];
}

// ---------- Home Assistant ----------

export interface HaControl {
  id: string;
  name: string;
  domain: string;
  state: string;
  on: boolean;
}

export interface HaWeather {
  name: string;
  condition: string;
  temperature: number | null;
  unit: string;
  humidity: number | null;
  wind: number | null;
  windUnit: string;
  forecast: { date: string; condition: string; high: number | null; low: number | null; precip: number | null }[];
  sunrise: string | null;
  sunset: string | null;
}

export interface HaEnergy {
  unit: string;
  now: { solar: number | null; grid: number | null; home: number | null; battery: number | null };
  history: { start: number; stepMs: number; solar: (number | null)[]; home: (number | null)[]; grid: (number | null)[] };
}

export interface HomeAssistantData {
  garage: { id: string; name: string; state: string; since: string }[];
  people: { id: string; name: string; state: string; picture: string | null; since: string }[];
  openings: { id: string; name: string; kind: string; open: boolean; since: string }[];
  locks: { id: string; name: string; state: string }[];
  controls: HaControl[];
  weather: HaWeather | null;
  energy: HaEnergy | null;
  cameras: { id: string; name: string; image: string }[];
}

// ---------- Downloads & *arr health ----------

export interface QueueItem {
  id: string;
  source: CalendarSource | "qbittorrent" | "sabnzbd";
  title: string;
  subtitle: string | null;
  progress: number | null; // 0..1
  status: string;
  eta: string | null; // "12m", "2h 3m"
  size: number | null; // bytes
  warning: string | null;
}

export interface DownloadsData {
  queue: QueueItem[];
  clients: { id: "qbittorrent" | "sabnzbd"; name: string; ok: boolean; error?: string; downBps: number | null; upBps: number | null; active: number | null; paused: boolean }[];
  arrs: { source: CalendarSource; ok: boolean; missing: number | null; health: { type: string; message: string }[] }[];
}

// ---------- Overseerr / Jellyseerr ----------

export interface RequestsData {
  counts: { pending: number; approved: number; processing: number; available: number; total: number };
  recent: { id: number; title: string; year: string | null; type: "movie" | "tv"; status: "pending" | "approved" | "declined" | "unknown"; mediaStatus: string | null; user: string | null; createdAt: string; image: string | null }[];
}

// ---------- Tautulli ----------

export interface TautulliData {
  days: number;
  streams: number;
  bandwidthKbps: number | null;
  topUsers: { name: string; plays: number; hours: number }[];
  topMovies: { name: string; plays: number }[];
  topShows: { name: string; plays: number }[];
}

// ---------- Uptime Kuma ----------

export interface UptimeData {
  title: string;
  monitors: { id: number; name: string; group: string | null; status: "up" | "down" | "pending" | "maintenance" | "unknown"; uptime24h: number | null; ping: number | null; beats: number[] }[];
}
