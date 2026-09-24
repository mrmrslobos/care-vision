import "server-only";
import { config } from "../config";
import { cached, fetchJson, settle } from "../http";
import { imageUrl } from "../images";
import type { HaControl, HaEnergy, HaWeather, HomeAssistantData } from "../types";

// Home Assistant REST API with a long-lived access token
// (Profile → Security → Long-lived access tokens).

export interface HaState {
  entity_id: string;
  state: string;
  last_changed: string;
  attributes: Record<string, unknown> & {
    friendly_name?: string;
    device_class?: string;
    entity_picture?: string;
    unit_of_measurement?: string;
    hidden?: boolean;
  };
}

const ha = config.homeassistant;
const headers = () => ({ Authorization: `Bearer ${ha.token ?? ""}`, "Content-Type": "application/json" });

export const haFetch = <T>(path: string, init: RequestInit = {}) =>
  fetchJson<T>(`${ha.url}${path}`, { ...init, headers: { ...headers(), ...init.headers }, label: "Home Assistant" });

export const getStates = () => haFetch<HaState[]>("/api/states");

const UNAVAILABLE = new Set(["unavailable", "unknown"]);
const domainOf = (id: string) => id.split(".")[0];
const nameOf = (s: HaState) => s.attributes.friendly_name ?? s.entity_id.split(".")[1].replace(/_/g, " ");
const num = (v: unknown) => {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

const TOGGLE_DOMAINS = ["light", "switch", "fan", "input_boolean"];
const RUN_DOMAINS = ["scene", "script"];
const OPENING_CLASSES = new Set(["door", "window", "garage_door", "opening"]);

const isGarage = (s: HaState) =>
  domainOf(s.entity_id) === "cover" &&
  (s.attributes.device_class === "garage" || s.attributes.device_class === "gate" || /garage/i.test(s.entity_id));

/** Entities the dashboard exposes as buttons — also the allow-list for actions. */
export function controlEntities(states: HaState[]): HaState[] {
  const usable = (s: HaState) => !UNAVAILABLE.has(s.state) && !ha.exclude.includes(s.entity_id);
  if (ha.controls.length) {
    const byId = new Map(states.map((s) => [s.entity_id, s]));
    return ha.controls.map((id) => byId.get(id)).filter((s): s is HaState => !!s && usable(s));
  }
  // No list configured: lights and scenes, capped so a big house doesn't flood the card.
  const pick = (domain: string, n: number) =>
    states.filter((s) => domainOf(s.entity_id) === domain && usable(s) && !s.attributes.hidden).slice(0, n);
  return [...pick("light", 16), ...pick("scene", 8)];
}

export const garageEntities = (states: HaState[]) => states.filter(isGarage);
export const lockEntities = (states: HaState[]) => states.filter((s) => domainOf(s.entity_id) === "lock");

/** Which service a button press calls. Returns null for anything not allowed. */
export function resolveAction(
  states: HaState[],
  entityId: string,
  action: string,
): { domain: string; service: string; sensitive: boolean } | null {
  const domain = domainOf(entityId);
  if (controlEntities(states).some((s) => s.entity_id === entityId)) {
    if (TOGGLE_DOMAINS.includes(domain) && action === "toggle") return { domain, service: "toggle", sensitive: false };
    if (RUN_DOMAINS.includes(domain) && action === "run") return { domain, service: "turn_on", sensitive: false };
  }
  if (garageEntities(states).some((s) => s.entity_id === entityId)) {
    if (action === "open") return { domain: "cover", service: "open_cover", sensitive: true };
    if (action === "close") return { domain: "cover", service: "close_cover", sensitive: true };
  }
  if (lockEntities(states).some((s) => s.entity_id === entityId)) {
    if (action === "lock") return { domain: "lock", service: "lock", sensitive: false };
    if (action === "unlock") return { domain: "lock", service: "unlock", sensitive: true };
  }
  return null;
}

// Person/camera images are served by HA behind auth, so they go through our proxy.
const haImage = (path: unknown) =>
  typeof path === "string" && path.startsWith("/") ? imageUrl("homeassistant", path) : typeof path === "string" ? path : null;

type Forecast = { datetime?: string; condition?: string; temperature?: number; templow?: number; precipitation?: number };

async function weather(states: HaState[]): Promise<HaWeather | null> {
  const w = ha.weather
    ? states.find((s) => s.entity_id === ha.weather)
    : states.find((s) => domainOf(s.entity_id) === "weather" && !UNAVAILABLE.has(s.state));
  if (!w) return null;
  const a = w.attributes;

  // Forecasts moved from attributes to the weather.get_forecasts service in HA 2024.3.
  const forecast = await cached(`ha-forecast-${w.entity_id}`, 15 * 60_000, async () => {
    const res = await settle(
      haFetch<{ service_response?: Record<string, { forecast?: Forecast[] }> }>(
        "/api/services/weather/get_forecasts?return_response",
        { method: "POST", body: JSON.stringify({ entity_id: w.entity_id, type: "daily" }) },
      ),
    );
    return res?.service_response?.[w.entity_id]?.forecast ?? (a.forecast as Forecast[] | undefined) ?? [];
  });

  const sun = states.find((s) => s.entity_id === "sun.sun")?.attributes;
  return {
    name: nameOf(w),
    condition: w.state,
    temperature: num(a.temperature),
    unit: (a.temperature_unit as string) ?? "°",
    humidity: num(a.humidity),
    wind: num(a.wind_speed),
    windUnit: (a.wind_speed_unit as string) ?? "",
    forecast: forecast.slice(0, 6).map((f) => ({
      date: f.datetime ?? "",
      condition: f.condition ?? "",
      high: num(f.temperature),
      low: num(f.templow),
      precip: num(f.precipitation),
    })),
    sunrise: (sun?.next_rising as string) ?? null,
    sunset: (sun?.next_setting as string) ?? null,
  };
}

const STEP_MS = 10 * 60_000;
const BUCKETS = 144; // 24h of 10-minute steps

async function energy(states: HaState[]): Promise<HaEnergy | null> {
  const ids = ha.energy;
  const powerIds = [ids.solar, ids.grid, ids.home].filter((x): x is string => !!x);
  if (!powerIds.length && !ids.battery) return null;
  const val = (id?: string) => (id ? num(states.find((s) => s.entity_id === id)?.state) : null);
  const unit =
    (powerIds.map((id) => states.find((s) => s.entity_id === id)?.attributes.unit_of_measurement).find(Boolean) as string) ?? "W";

  const now = Date.now();
  const start = Math.floor((now - BUCKETS * STEP_MS) / STEP_MS) * STEP_MS;
  const history = await cached(`ha-energy-${powerIds.join()}`, 5 * 60_000, async () => {
    const empty = { solar: [], home: [], grid: [] } as Record<"solar" | "home" | "grid", (number | null)[]>;
    if (!powerIds.length) return empty;
    type Point = { entity_id?: string; state: string; last_changed: string };
    const raw = await settle(
      haFetch<Point[][]>(
        `/api/history/period/${new Date(start).toISOString()}?filter_entity_id=${powerIds.join(",")}&minimal_response&no_attributes`,
      ),
    );
    // Sample each series at the end of every bucket (last known value).
    const series = (id?: string) => {
      const points = raw?.find((p) => p[0]?.entity_id === id) ?? [];
      const out: (number | null)[] = [];
      let i = 0;
      let last: number | null = null;
      for (let b = 1; b <= BUCKETS; b++) {
        const edge = start + b * STEP_MS;
        while (i < points.length && Date.parse(points[i].last_changed) <= edge) last = num(points[i++].state);
        out.push(last);
      }
      return out;
    };
    return { solar: ids.solar ? series(ids.solar) : [], home: ids.home ? series(ids.home) : [], grid: ids.grid ? series(ids.grid) : [] };
  });

  return {
    unit,
    now: { solar: val(ids.solar), grid: val(ids.grid), home: val(ids.home), battery: val(ids.battery) },
    history: { start: start + STEP_MS, stepMs: STEP_MS, ...history },
  };
}

export async function getHomeAssistant(): Promise<HomeAssistantData> {
  const states = await getStates();
  const visible = states.filter((s) => !ha.exclude.includes(s.entity_id));

  const controls: HaControl[] = controlEntities(visible).map((s) => ({
    id: s.entity_id,
    name: nameOf(s),
    domain: domainOf(s.entity_id),
    state: s.state,
    on: s.state === "on",
  }));

  const cameraStates = ha.cameras.length
    ? ha.cameras.map((id) => visible.find((s) => s.entity_id === id)).filter((s): s is HaState => !!s)
    : visible.filter((s) => domainOf(s.entity_id) === "camera" && !UNAVAILABLE.has(s.state)).slice(0, 4);

  const [w, e] = await Promise.all([settle(weather(visible)), settle(energy(visible))]);

  return {
    garage: garageEntities(visible).map((s) => ({ id: s.entity_id, name: nameOf(s), state: s.state, since: s.last_changed })),
    people: visible
      .filter((s) => domainOf(s.entity_id) === "person")
      .map((s) => ({
        id: s.entity_id,
        name: nameOf(s),
        state: s.state,
        picture: haImage(s.attributes.entity_picture),
        since: s.last_changed,
      })),
    openings: visible
      .filter(
        (s) =>
          domainOf(s.entity_id) === "binary_sensor" &&
          OPENING_CLASSES.has(s.attributes.device_class ?? "") &&
          !UNAVAILABLE.has(s.state),
      )
      .map((s) => ({
        id: s.entity_id,
        name: nameOf(s),
        kind: s.attributes.device_class ?? "opening",
        open: s.state === "on",
        since: s.last_changed,
      })),
    locks: lockEntities(visible)
      .filter((s) => !UNAVAILABLE.has(s.state))
      .map((s) => ({ id: s.entity_id, name: nameOf(s), state: s.state })),
    controls,
    weather: w,
    energy: e,
    cameras: cameraStates.map((s) => ({
      id: s.entity_id,
      name: nameOf(s),
      image: imageUrl("homeassistant", `/api/camera_proxy/${s.entity_id}`),
    })),
  };
}

export async function callService(domain: string, service: string, entityId: string) {
  await haFetch(`/api/services/${domain}/${service}`, { method: "POST", body: JSON.stringify({ entity_id: entityId }) });
}
