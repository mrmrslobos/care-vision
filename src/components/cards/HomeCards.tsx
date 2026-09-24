"use client";

import {
  BatteryMedium,
  Camera,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  DoorClosed,
  DoorOpen,
  Droplets,
  Fan,
  Home,
  House,
  Lightbulb,
  LockKeyhole,
  LockKeyholeOpen,
  Moon,
  Play,
  Power,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  UtilityPole,
  Warehouse,
  Wind,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { HaEnergy, HomeAssistantData } from "@/lib/types";
import { useAction, useControls } from "../controls";
import { ago, initials } from "../format";
import { TimeChart } from "../TimeChart";
import { Card, StatusBadge } from "../ui";
import type { ServiceState } from "../useService";

type HaState = ServiceState<HomeAssistantData>;

const WEATHER: Record<string, [LucideIcon, string]> = {
  "clear-night": [Moon, "Clear"],
  cloudy: [Cloud, "Cloudy"],
  exceptional: [Zap, "Severe"],
  fog: [CloudFog, "Fog"],
  hail: [CloudSnow, "Hail"],
  lightning: [CloudLightning, "Storms"],
  "lightning-rainy": [CloudLightning, "Storms"],
  partlycloudy: [CloudSun, "Partly cloudy"],
  pouring: [CloudRain, "Heavy rain"],
  rainy: [CloudDrizzle, "Rain"],
  snowy: [CloudSnow, "Snow"],
  "snowy-rainy": [CloudSnow, "Sleet"],
  sunny: [Sun, "Sunny"],
  windy: [Wind, "Windy"],
  "windy-variant": [Wind, "Windy"],
};
const weatherOf = (c: string, night = false): [LucideIcon, string] => {
  if (night && c === "partlycloudy") return [CloudMoon, "Partly cloudy"];
  return WEATHER[c] ?? [Cloud, c.replace(/-/g, " ")];
};
const time = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "—";

// ---------- Weather ----------

export function WeatherCard({ state, href }: { state: HaState; href?: string | null }) {
  return (
    <Card title="Weather" icon={<CloudSun size={16} />} accent="var(--series-1)" href={href} state={state}>
      {(d) => {
        const w = d.weather;
        if (!w) return <div className="card-empty">No weather entity found in Home Assistant.</div>;
        const hour = new Date().getHours();
        const [Icon, label] = weatherOf(w.condition, hour < 6 || hour >= 19);
        return (
          <div className="weather">
            <div className="weather-now">
              <Icon size={54} strokeWidth={1.5} className="weather-icon" aria-hidden />
              <div>
                <div className="weather-temp">
                  {w.temperature === null ? "—" : Math.round(w.temperature)}
                  <span>{w.unit}</span>
                </div>
                <div className="weather-label">{label}</div>
              </div>
              <ul className="weather-facts">
                {w.humidity !== null ? (
                  <li>
                    <Droplets size={13} aria-hidden /> {Math.round(w.humidity)}%
                  </li>
                ) : null}
                {w.wind !== null ? (
                  <li>
                    <Wind size={13} aria-hidden /> {Math.round(w.wind)} {w.windUnit}
                  </li>
                ) : null}
                <li>
                  <Sunrise size={13} aria-hidden /> {time(w.sunrise)}
                </li>
                <li>
                  <Sunset size={13} aria-hidden /> {time(w.sunset)}
                </li>
              </ul>
            </div>
            {w.forecast.length ? (
              <ol className="forecast">
                {w.forecast.map((f, i) => {
                  const [FIcon, flabel] = weatherOf(f.condition);
                  return (
                    <li key={f.date || i} title={flabel}>
                      <span className="forecast-day">
                        {i === 0 ? "Today" : new Date(f.date).toLocaleDateString(undefined, { weekday: "short" })}
                      </span>
                      <FIcon size={20} strokeWidth={1.75} aria-label={flabel} />
                      <span className="forecast-hi">{f.high === null ? "—" : `${Math.round(f.high)}°`}</span>
                      <span className="forecast-lo">{f.low === null ? "" : `${Math.round(f.low)}°`}</span>
                      {f.precip ? <span className="forecast-rain">{Math.round(f.precip)}mm</span> : <span className="forecast-rain" />}
                    </li>
                  );
                })}
              </ol>
            ) : null}
          </div>
        );
      }}
    </Card>
  );
}

// ---------- Home: people, garage, locks, doors ----------

const GARAGE_LABEL: Record<string, string> = { open: "Open", closed: "Closed", opening: "Opening…", closing: "Closing…" };

export function HomeStatusCard({ state, href }: { state: HaState; href?: string | null }) {
  const { sensitive } = useControls();
  const { busy, act } = useAction(state.refresh);
  const d = state.data;
  const openCount = d ? d.openings.filter((o) => o.open).length + d.garage.filter((g) => g.state !== "closed").length : 0;
  const unlocked = d ? d.locks.filter((l) => l.state !== "locked").length : 0;

  return (
    <Card
      title="Home"
      icon={<House size={16} />}
      accent="var(--brand-ha)"
      href={href}
      state={state}
      meta={
        d ? (
          openCount || unlocked ? (
            <StatusBadge level="warning">
              {[openCount ? `${openCount} open` : null, unlocked ? `${unlocked} unlocked` : null].filter(Boolean).join(" · ")}
            </StatusBadge>
          ) : (
            <StatusBadge level="good">All secure</StatusBadge>
          )
        ) : null
      }
    >
      {(d) => (
        <div className="stack">
          {d.people.length ? (
            <ul className="people">
              {d.people.map((p) => {
                const home = p.state === "home";
                return (
                  <li key={p.id} className={home ? "is-home" : "is-away"} title={`${p.name}: ${home ? "home" : p.state.replace(/_/g, " ")} since ${ago(Date.parse(p.since))}`}>
                    <Avatar name={p.name} picture={p.picture} />
                    <span className="person-name">{p.name}</span>
                    <span className="person-state">{home ? "Home" : p.state === "not_home" ? "Away" : p.state}</span>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {d.garage.map((g) => {
            const open = g.state !== "closed";
            return (
              <div key={g.id} className={`garage${open ? " is-open" : ""}`}>
                <Warehouse size={22} aria-hidden />
                <div className="garage-text">
                  <div className="garage-name">{g.name}</div>
                  <div className="garage-state">
                    {GARAGE_LABEL[g.state] ?? g.state} · {ago(Date.parse(g.since))}
                  </div>
                </div>
                {sensitive ? (
                  <button
                    type="button"
                    className={`btn ${open ? "btn-primary" : ""}`}
                    disabled={busy === g.id}
                    onClick={() => act(g.id, { service: "homeassistant", entityId: g.id, action: open ? "close" : "open" })}
                  >
                    {busy === g.id ? "…" : open ? "Close" : "Open"}
                  </button>
                ) : null}
              </div>
            );
          })}

          {d.locks.length ? (
            <ul className="locks">
              {d.locks.map((l) => {
                const locked = l.state === "locked";
                const canToggle = locked ? sensitive : true; // unlocking needs the PIN to be configured
                return (
                  <li key={l.id} className={locked ? "is-locked" : "is-unlocked"}>
                    {locked ? <LockKeyhole size={16} aria-hidden /> : <LockKeyholeOpen size={16} aria-hidden />}
                    <span className="lock-name">{l.name}</span>
                    <span className="lock-state">{locked ? "Locked" : l.state === "unlocked" ? "Unlocked" : l.state}</span>
                    {canToggle && (l.state === "locked" || l.state === "unlocked") ? (
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={busy === l.id}
                        onClick={() => act(l.id, { service: "homeassistant", entityId: l.id, action: locked ? "unlock" : "lock" })}
                      >
                        {busy === l.id ? "…" : locked ? "Unlock" : "Lock"}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}

          {d.openings.length ? (
            <ul className="openings">
              {[...d.openings]
                .sort((a, b) => Number(b.open) - Number(a.open))
                .map((o) => (
                  <li key={o.id} className={o.open ? "is-open" : ""}>
                    {o.open ? <DoorOpen size={14} aria-hidden /> : <DoorClosed size={14} aria-hidden />}
                    <span>{o.name}</span>
                    <span className="opening-state">{o.open ? `Open ${ago(Date.parse(o.since)).replace(" ago", "")}` : "Closed"}</span>
                  </li>
                ))}
            </ul>
          ) : null}

          {!d.people.length && !d.garage.length && !d.locks.length && !d.openings.length ? (
            <div className="card-empty">No people, doors, locks or garage doors found.</div>
          ) : null}
        </div>
      )}
    </Card>
  );
}

function Avatar({ name, picture }: { name: string; picture: string | null }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="avatar">
      {picture && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- proxied HA image
        <img src={picture} alt="" onError={() => setFailed(true)} />
      ) : (
        initials(name)
      )}
      <i className="avatar-dot" aria-hidden />
    </span>
  );
}

// ---------- Quick controls ----------

const CONTROL_ICON: Record<string, LucideIcon> = {
  light: Lightbulb,
  switch: Power,
  input_boolean: Power,
  fan: Fan,
  scene: Sparkles,
  script: Play,
};

export function ControlsCard({ state, href }: { state: HaState; href?: string | null }) {
  const { busy, act } = useAction(state.refresh);
  // Optimistic flip so taps feel instant; cleared when fresh data lands.
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const updatedAt = state.updatedAt;
  const [seen, setSeen] = useState(updatedAt);
  if (updatedAt !== seen) {
    setSeen(updatedAt);
    setFlipped({});
  }

  return (
    <Card title="Quick controls" icon={<Home size={16} />} accent="var(--brand-ha)" href={href} state={state}>
      {(d) =>
        d.controls.length ? (
          <ul className="controls">
            {d.controls.map((c) => {
              const Icon = CONTROL_ICON[c.domain] ?? Power;
              const runnable = c.domain === "scene" || c.domain === "script";
              const on = runnable ? false : (flipped[c.id] ?? c.on);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    className={`control${on ? " is-on" : ""}${runnable ? " is-run" : ""}`}
                    aria-pressed={runnable ? undefined : on}
                    disabled={busy === c.id}
                    onClick={async () => {
                      if (!runnable) setFlipped((f) => ({ ...f, [c.id]: !on }));
                      const ok = await act(c.id, { service: "homeassistant", entityId: c.id, action: runnable ? "run" : "toggle" });
                      if (!ok) setFlipped((f) => ({ ...f, [c.id]: on }));
                    }}
                  >
                    <Icon size={18} aria-hidden />
                    <span className="control-name">{c.name}</span>
                    <span className="control-state">{runnable ? (c.domain === "scene" ? "Scene" : "Script") : on ? "On" : "Off"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="card-empty">No lights or scenes found. Set HA_CONTROLS to pick entities.</div>
        )
      }
    </Card>
  );
}

// ---------- Energy ----------

const power = (w: number | null, unit: string) => {
  if (w === null) return "—";
  if (unit.toLowerCase() === "kw") return `${w.toFixed(2)} kW`;
  return Math.abs(w) >= 1000 ? `${(w / 1000).toFixed(2)} kW` : `${Math.round(w)} W`;
};

export function EnergyCard({ state, href }: { state: HaState; href?: string | null }) {
  return (
    <Card title="Energy" icon={<Zap size={16} />} accent="var(--series-2)" href={href} state={state}>
      {(d) => (d.energy ? <EnergyBody e={d.energy} /> : <div className="card-empty">Set HA_SOLAR_POWER / HA_HOME_POWER to show energy.</div>)}
    </Card>
  );
}

function EnergyBody({ e }: { e: HaEnergy }) {
  const exporting = e.now.grid !== null && e.now.grid < 0;
  const series = [
    e.history.home.length ? { key: "home", label: "Home use", values: e.history.home, kind: "line" as const, color: "var(--series-1)" } : null,
    e.history.solar.length ? { key: "solar", label: "Solar", values: e.history.solar, kind: "area" as const, color: "var(--series-2)" } : null,
  ].filter((s) => s !== null);
  return (
    <div className="stack">
      <div className="energy-now">
        {e.now.solar !== null ? (
          <div className="energy-tile">
            <Sun size={16} aria-hidden />
            <div className="energy-value">{power(e.now.solar, e.unit)}</div>
            <div className="energy-label">Solar</div>
          </div>
        ) : null}
        {e.now.home !== null ? (
          <div className="energy-tile">
            <House size={16} aria-hidden />
            <div className="energy-value">{power(e.now.home, e.unit)}</div>
            <div className="energy-label">Home</div>
          </div>
        ) : null}
        {e.now.grid !== null ? (
          <div className="energy-tile">
            <UtilityPole size={16} aria-hidden />
            <div className="energy-value">{power(Math.abs(e.now.grid), e.unit)}</div>
            <div className="energy-label">{exporting ? "Exporting" : "From grid"}</div>
          </div>
        ) : null}
        {e.now.battery !== null ? (
          <div className="energy-tile">
            <BatteryMedium size={16} aria-hidden />
            <div className="energy-value">{Math.round(e.now.battery)}%</div>
            <div className="energy-label">Battery</div>
          </div>
        ) : null}
      </div>
      {series.length ? (
        <TimeChart
          series={series}
          start={e.history.start}
          stepMs={e.history.stepMs}
          format={(v) => power(v, e.unit)}
          label="Solar production and home power use over the last 24 hours"
        />
      ) : null}
    </div>
  );
}

// ---------- Cameras ----------

function useTick(ms: number) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => !document.hidden && setT(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return t;
}

function Snapshot({ src, name, tick }: { src: string; name: string; tick: number }) {
  const [shown, setShown] = useState<string | null>(null);
  const url = src ? `${src}&t=${tick}` : "";
  // Preload the next frame so the image never flashes blank.
  useEffect(() => {
    if (!url) return;
    const img = new Image();
    img.onload = () => setShown(url);
    img.src = url;
    return () => {
      img.onload = null;
    };
  }, [url]);
  return shown ? (
    // eslint-disable-next-line @next/next/no-img-element -- live proxied snapshot
    <img src={shown} alt={`${name} camera`} />
  ) : (
    <span className="camera-empty">
      <Camera size={22} aria-hidden />
    </span>
  );
}

export function CamerasCard({ state, href }: { state: HaState; href?: string | null }) {
  const tick = useTick(10_000);
  const fastTick = useTick(2_000);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <Card title="Cameras" icon={<Camera size={16} />} accent="var(--brand-ha)" href={href} state={state}>
      {(d) => {
        const current = d.cameras.find((c) => c.id === open);
        return d.cameras.length ? (
          <>
            <ul className={`cameras cameras-${Math.min(d.cameras.length, 4)}`}>
              {d.cameras.map((c) => (
                <li key={c.id}>
                  <button type="button" className="camera" onClick={() => setOpen(c.id)} aria-label={`Enlarge ${c.name}`}>
                    <Snapshot src={c.image} name={c.name} tick={tick} />
                    <span className="camera-name">{c.name}</span>
                  </button>
                </li>
              ))}
            </ul>
            {current
              ? createPortal(
              <div className="modal-backdrop" onClick={() => setOpen(null)}>
                <div className="camera-modal" role="dialog" aria-modal="true" aria-label={current.name} onClick={(e) => e.stopPropagation()}>
                  <Snapshot src={current.image} name={current.name} tick={fastTick} />
                  <div className="camera-modal-bar">
                    <span>{current.name}</span>
                    <button type="button" className="icon-btn" onClick={() => setOpen(null)} aria-label="Close">
                      <X size={18} />
                    </button>
                  </div>
                </div>
              </div>,
                document.body,
              )
              : null}
          </>
        ) : (
          <div className="card-empty">No cameras found in Home Assistant.</div>
        );
      }}
    </Card>
  );
}
