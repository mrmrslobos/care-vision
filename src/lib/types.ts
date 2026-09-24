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

export interface UnraidData {
  hostname: string | null;
  version: string | null;
  uptimeSeconds: number | null;
  cpu: { percent: number | null; model: string | null; threads: number | null };
  memory: Meter | null; // bytes
  array: { state: string | null; capacity: Meter | null }; // bytes
  disks: UnraidDisk[];
  containers: { running: number; total: number; stopped: string[] } | null;
  warnings: string[];
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
