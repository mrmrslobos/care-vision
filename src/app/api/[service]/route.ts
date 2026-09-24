import { config, enabled } from "@/lib/config";
import { dashboardConfig } from "@/lib/dashboard-config";
import { demo } from "@/lib/demo";
import { getAdguard } from "@/lib/services/adguard";
import { getCalendar } from "@/lib/services/calendar";
import { getImmich } from "@/lib/services/immich";
import { getPlex } from "@/lib/services/plex";
import { getTdarr } from "@/lib/services/tdarr";
import { getUnraid } from "@/lib/services/unraid";
import { getDownloads } from "@/lib/services/downloads";
import { getHomeAssistant } from "@/lib/services/homeassistant";
import { getRequests } from "@/lib/services/overseerr";
import { getTautulli } from "@/lib/services/tautulli";
import { getUptime } from "@/lib/services/uptimekuma";

export const dynamic = "force-dynamic";

const handlers = {
  unraid: { get: getUnraid, on: () => enabled.unraid },
  adguard: { get: getAdguard, on: () => enabled.adguard },
  plex: { get: getPlex, on: () => enabled.plex },
  calendar: { get: getCalendar, on: () => enabled.sonarr || enabled.radarr || enabled.bookshelf },
  immich: { get: getImmich, on: () => enabled.immich },
  tdarr: { get: getTdarr, on: () => enabled.tdarr },
  homeassistant: { get: getHomeAssistant, on: () => enabled.homeassistant },
  downloads: {
    get: getDownloads,
    on: () => enabled.sonarr || enabled.radarr || enabled.bookshelf || enabled.qbittorrent || enabled.sabnzbd,
  },
  overseerr: { get: getRequests, on: () => enabled.overseerr },
  tautulli: { get: getTautulli, on: () => enabled.tautulli },
  uptimekuma: { get: getUptime, on: () => enabled.uptimekuma },
} as const;

type HandlerId = keyof typeof handlers;

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(_req: Request, ctx: RouteContext<"/api/[service]">) {
  const { service } = await ctx.params;
  if (service === "config") return json(dashboardConfig());
  if (!Object.hasOwn(handlers, service)) return json({ error: "Unknown service" }, 404);

  const id = service as HandlerId;
  if (config.demo) return json(demo[id]());
  if (!handlers[id].on()) return json({ error: "Not configured", notConfigured: true }, 503);

  try {
    return json(await handlers[id].get());
  } catch (err) {
    console.error(`[${id}]`, err);
    return json({ error: (err as Error).message }, 502);
  }
}
