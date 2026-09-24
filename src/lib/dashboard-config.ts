import "server-only";
import { config, enabled, HOST, serviceLinks } from "./config";
import type { DashboardConfig } from "./types";

const NAMES: Record<keyof typeof enabled, string> = {
  unraid: "Unraid",
  adguard: "AdGuard Home",
  plex: "Plex",
  sonarr: "Sonarr",
  radarr: "Radarr",
  bookshelf: "Bookshelf",
  immich: "Immich",
  tdarr: "Tdarr",
  homeassistant: "Home Assistant",
  qbittorrent: "qBittorrent",
  sabnzbd: "SABnzbd",
  overseerr: "Requests",
  tautulli: "Tautulli",
  uptimekuma: "Uptime Kuma",
};

export function dashboardConfig(): DashboardConfig {
  return {
    title: config.title,
    host: HOST,
    demo: config.demo,
    // In demo mode buttons are shown but the action route refuses them.
    controls: { pinRequired: !!config.controlPin, sensitive: !!config.controlPin || config.demo },
    services: (Object.keys(NAMES) as (keyof typeof enabled)[]).map((id) => ({
      id,
      name: NAMES[id],
      enabled: config.demo || enabled[id],
      url: serviceLinks[id],
    })),
  };
}
