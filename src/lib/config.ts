import "server-only";

// All settings come from environment variables at runtime, so a single
// Docker image works for any server. See .env.example for the full list.

const env = (key: string): string | undefined => {
  const v = process.env[key]?.trim();
  return v ? v : undefined;
};

const stripSlash = (url: string) => url.replace(/\/+$/, "");

export const HOST = env("SERVER_HOST") ?? "10.10.10.10";

const list = (key: string) =>
  (env(key) ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const url = (key: string, port: number | null) =>
  stripSlash(env(key) ?? `http://${HOST}${port ? `:${port}` : ""}`);

export const config = {
  title: env("DASHBOARD_TITLE") ?? "Unraid",
  demo: env("DEMO_MODE") === "true",
  calendarDays: Math.min(Math.max(Number(env("CALENDAR_DAYS") ?? 14) || 14, 1), 60),
  calendarPastDays: Math.min(Math.max(Number(env("CALENDAR_PAST_DAYS") ?? 1) || 0, 0), 14),

  unraid: { url: url("UNRAID_URL", null), apiKey: env("UNRAID_API_KEY") },
  adguard: {
    url: url("ADGUARD_URL", 3000),
    username: env("ADGUARD_USERNAME"),
    password: env("ADGUARD_PASSWORD"),
    enabled: !!env("ADGUARD_URL") || !!env("ADGUARD_USERNAME"),
  },
  plex: { url: url("PLEX_URL", 32400), token: env("PLEX_TOKEN") },
  sonarr: { url: url("SONARR_URL", 8989), apiKey: env("SONARR_API_KEY") },
  radarr: { url: url("RADARR_URL", 7878), apiKey: env("RADARR_API_KEY") },
  bookshelf: { url: url("BOOKSHELF_URL", 8787), apiKey: env("BOOKSHELF_API_KEY") },
  immich: { url: url("IMMICH_URL", 2283), apiKey: env("IMMICH_API_KEY") },
  tdarr: {
    url: url("TDARR_URL", 8265),
    apiKey: env("TDARR_API_KEY"),
    enabled: !!env("TDARR_URL") || !!env("TDARR_API_KEY"),
  },

  homeassistant: {
    url: url("HA_URL", 8123),
    token: env("HA_TOKEN"),
    controls: list("HA_CONTROLS"),
    cameras: list("HA_CAMERAS"),
    exclude: list("HA_EXCLUDE"),
    weather: env("HA_WEATHER_ENTITY"),
    energy: {
      solar: env("HA_SOLAR_POWER"),
      grid: env("HA_GRID_POWER"),
      home: env("HA_HOME_POWER"),
      battery: env("HA_BATTERY_LEVEL"),
    },
  },
  qbittorrent: {
    url: url("QBITTORRENT_URL", 8080),
    username: env("QBITTORRENT_USERNAME"),
    password: env("QBITTORRENT_PASSWORD"),
    enabled: !!env("QBITTORRENT_URL"),
  },
  sabnzbd: { url: url("SABNZBD_URL", 8080), apiKey: env("SABNZBD_API_KEY") },
  overseerr: { url: url("OVERSEERR_URL", 5055), apiKey: env("OVERSEERR_API_KEY") },
  tautulli: { url: url("TAUTULLI_URL", 8181), apiKey: env("TAUTULLI_API_KEY") },
  uptimekuma: { url: url("UPTIME_KUMA_URL", 3001), slug: env("UPTIME_KUMA_SLUG") },

  // Guards buttons that change things. Sensitive actions (unlocking, the
  // garage door, starting/stopping containers) are only offered when set.
  controlPin: env("CONTROL_PIN"),
};

// Links shown in card headers. PUBLIC_*_URL overrides let you point the
// browser at a different address (e.g. a reverse proxy) than the server uses.
const link = (key: string, fallback: string) => stripSlash(env(`PUBLIC_${key}_URL`) ?? fallback);

export const serviceLinks = {
  unraid: link("UNRAID", config.unraid.url),
  adguard: link("ADGUARD", config.adguard.url),
  plex: link("PLEX", "https://app.plex.tv/desktop"),
  sonarr: link("SONARR", config.sonarr.url),
  radarr: link("RADARR", config.radarr.url),
  bookshelf: link("BOOKSHELF", config.bookshelf.url),
  immich: link("IMMICH", config.immich.url),
  tdarr: link("TDARR", config.tdarr.url),
  homeassistant: link("HA", config.homeassistant.url),
  qbittorrent: link("QBITTORRENT", config.qbittorrent.url),
  sabnzbd: link("SABNZBD", config.sabnzbd.url),
  overseerr: link("OVERSEERR", config.overseerr.url),
  tautulli: link("TAUTULLI", config.tautulli.url),
  uptimekuma: link("UPTIME_KUMA", `${config.uptimekuma.url}/status/${config.uptimekuma.slug ?? ""}`),
};

export const enabled = {
  unraid: !!config.unraid.apiKey,
  adguard: config.adguard.enabled,
  plex: !!config.plex.token,
  sonarr: !!config.sonarr.apiKey,
  radarr: !!config.radarr.apiKey,
  bookshelf: !!config.bookshelf.apiKey,
  immich: !!config.immich.apiKey,
  tdarr: config.tdarr.enabled,
  homeassistant: !!config.homeassistant.token,
  qbittorrent: config.qbittorrent.enabled,
  sabnzbd: !!config.sabnzbd.apiKey,
  overseerr: !!config.overseerr.apiKey,
  tautulli: !!config.tautulli.apiKey,
  uptimekuma: !!config.uptimekuma.slug,
};
