import { config } from "@/lib/config";
import { IMAGE_SERVICES, isSafePath, type ImageService } from "@/lib/images";

export const dynamic = "force-dynamic";

// Proxies poster artwork so tokens never reach the browser. Only artwork
// paths are allowed through — this is not a general-purpose proxy.
function upstream(
  service: ImageService,
  path: string,
): { url: string; headers: HeadersInit; live?: boolean } | null {
  if (service === "plex") {
    if (!path.startsWith("/library/")) return null;
    const { url, token } = config.plex;
    const q = new URLSearchParams({ width: "300", height: "450", minSize: "1", upscale: "1", url: path });
    return { url: `${url}/photo/:/transcode?${q}`, headers: { "X-Plex-Token": token ?? "" } };
  }
  if (service === "homeassistant") {
    const camera = /^\/api\/camera_proxy\/camera\.[a-z0-9_]+$/.test(path);
    if (!camera && !/^\/(api\/image\/serve|local)\//.test(path)) return null;
    const { url, token } = config.homeassistant;
    return { url: `${url}${path}`, headers: { Authorization: `Bearer ${token ?? ""}` }, live: camera };
  }
  if (!/\/MediaCover\//i.test(path)) return null;
  const { url, apiKey } = config[service];
  return { url: `${url}${path}`, headers: { "X-Api-Key": apiKey ?? "" } };
}

export async function GET(req: Request, ctx: RouteContext<"/api/img/[service]">) {
  const { service } = await ctx.params;
  const path = new URL(req.url).searchParams.get("p");
  if (!IMAGE_SERVICES.includes(service as ImageService) || !isSafePath(path)) {
    return new Response("Bad request", { status: 400 });
  }
  const target = upstream(service as ImageService, path);
  if (!target) return new Response("Bad request", { status: 400 });

  try {
    const res = await fetch(target.url, {
      headers: target.headers,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/")) return new Response("Not found", { status: 404 });
    return new Response(res.body, {
      headers: {
        "Content-Type": type,
        "Cache-Control": target.live ? "no-store" : "public, max-age=86400",
      },
    });
  } catch {
    return new Response("Upstream unavailable", { status: 502 });
  }
}
