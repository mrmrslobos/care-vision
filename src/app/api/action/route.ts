import { timingSafeEqual } from "node:crypto";
import { config, enabled } from "@/lib/config";
import { callService, getStates, resolveAction } from "@/lib/services/homeassistant";
import { requestAction } from "@/lib/services/overseerr";
import { containerAction } from "@/lib/services/unraid";

export const dynamic = "force-dynamic";

// Every button on the dashboard posts here. Requests are checked against an
// allow-list built from live state, so only entities the dashboard is showing
// can be touched. Sensitive actions need CONTROL_PIN to be configured.

type Body =
  | { service: "homeassistant"; entityId: string; action: string }
  | { service: "unraid"; containerId: string; action: string }
  | { service: "overseerr"; requestId: number; action: string };

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Simple brute-force guard: 5 wrong PINs locks actions for 5 minutes.
let failures: number[] = [];
const LOCKOUT_MS = 5 * 60_000;

function checkPin(given: string | null): "ok" | "missing" | "wrong" | "locked" {
  const pin = config.controlPin;
  if (!pin) return "ok";
  failures = failures.filter((t) => Date.now() - t < LOCKOUT_MS);
  if (failures.length >= 5) return "locked";
  if (!given) return "missing";
  const a = Buffer.from(given);
  const b = Buffer.from(pin);
  if (a.length === b.length && timingSafeEqual(a, b)) return "ok";
  failures.push(Date.now());
  return "wrong";
}

export async function POST(req: Request) {
  // Block cross-site form posts: browsers always send Origin on POST.
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return json({ error: "Cross-origin request refused" }, 403);
  if (!req.headers.get("content-type")?.includes("application/json")) return json({ error: "Expected JSON" }, 415);
  if (config.demo) return json({ error: "Controls are disabled in demo mode" }, 403);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: "Bad request" }, 400);
  }

  const pin = checkPin(req.headers.get("x-dashboard-pin"));
  if (pin === "locked") return json({ error: "Too many wrong PINs — try again in a few minutes" }, 429);
  if (pin !== "ok") return json({ error: pin === "missing" ? "PIN required" : "Wrong PIN", pin: true }, 401);

  try {
    switch (body.service) {
      case "homeassistant": {
        if (!enabled.homeassistant) return json({ error: "Home Assistant is not configured" }, 503);
        const resolved = resolveAction(await getStates(), String(body.entityId), String(body.action));
        if (!resolved) return json({ error: "That action isn't allowed" }, 403);
        if (resolved.sensitive && !config.controlPin) {
          return json({ error: "Set CONTROL_PIN to enable locks and the garage door" }, 403);
        }
        await callService(resolved.domain, resolved.service, body.entityId);
        return json({ ok: true });
      }
      case "unraid": {
        if (!enabled.unraid) return json({ error: "Unraid is not configured" }, 503);
        if (!config.controlPin) return json({ error: "Set CONTROL_PIN to control containers" }, 403);
        if (body.action !== "start" && body.action !== "stop") return json({ error: "Bad action" }, 400);
        await containerAction(String(body.containerId), body.action);
        return json({ ok: true });
      }
      case "overseerr": {
        if (!enabled.overseerr) return json({ error: "Overseerr is not configured" }, 503);
        if (body.action !== "approve" && body.action !== "decline") return json({ error: "Bad action" }, 400);
        await requestAction(Number(body.requestId), body.action);
        return json({ ok: true });
      }
      default:
        return json({ error: "Unknown service" }, 404);
    }
  } catch (err) {
    console.error("[action]", err);
    return json({ error: (err as Error).message }, 502);
  }
}
