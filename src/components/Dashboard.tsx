"use client";

import { Children, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { DashboardConfig, HomeAssistantData } from "@/lib/types";
import { AdguardCard } from "./cards/AdguardCard";
import { CalendarCard } from "./cards/CalendarCard";
import { CamerasCard, ControlsCard, EnergyCard, HomeStatusCard, WeatherCard } from "./cards/HomeCards";
import { ImmichCard } from "./cards/ImmichCard";
import { DownloadsCard, RequestsCard, TautulliCard, UptimeCard } from "./cards/MediaOpsCards";
import { PlexCard } from "./cards/PlexCard";
import { TdarrCard } from "./cards/TdarrCard";
import { UnraidCard } from "./cards/UnraidCard";
import { ControlsProvider } from "./controls";
import { Kiosk } from "./Kiosk";
import { useService } from "./useService";

function greeting(h: number) {
  return h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return <div className="clock" />;
  return (
    <div className="clock">
      <div className="clock-greeting">{greeting(now.getHours())}</div>
      <time className="clock-time" dateTime={now.toISOString()}>
        {now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
      </time>
      <div className="clock-date">
        {now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
      </div>
    </div>
  );
}

/**
 * A row of columns. Empty slots are dropped and the rest share the width,
 * so the layout adapts to whichever services are configured.
 */
function Row({ spans, children }: { spans: number[]; children: ReactNode }) {
  // Read the raw children array so empty slots keep their position.
  const slots = Array.isArray(children) ? children : [children];
  const present = spans.filter((_, i) => slots[i] !== null && slots[i] !== false && slots[i] !== undefined);
  const items = Children.toArray(children);
  if (!items.length) return null;
  const total = present.reduce((a, b) => a + b, 0);
  const cols = present.map((n) => `minmax(0, ${n / total}fr)`).join(" ");
  return (
    <div className={`row row-${items.length}`} style={{ "--cols": cols } as CSSProperties}>
      {items}
    </div>
  );
}

const Stack = ({ children }: { children: ReactNode }) =>
  Children.toArray(children).length ? <div className="col">{children}</div> : null;

function HomeAssistantRow({ link }: { link: (id: string) => string | null }) {
  const state = useService<HomeAssistantData>("homeassistant", 10_000);
  const d = state.data;
  const href = link("homeassistant");
  const hasHome = !d || d.people.length + d.garage.length + d.locks.length + d.openings.length > 0;
  return (
    <>
      <Row spans={[4, 4, 4]}>
        {!d || d.weather ? <WeatherCard state={state} href={href} /> : null}
        {hasHome ? <HomeStatusCard state={state} href={href} /> : null}
        {!d || d.controls.length ? <ControlsCard state={state} href={href} /> : null}
      </Row>
      {d && (d.cameras.length || d.energy) ? (
        <Row spans={[7, 5]}>
          {d.cameras.length ? <CamerasCard state={state} href={href} /> : null}
          {d.energy ? <EnergyCard state={state} href={href} /> : null}
        </Row>
      ) : null}
    </>
  );
}

export function Dashboard({ config, kiosk }: { config: DashboardConfig; kiosk: boolean }) {
  const svc = Object.fromEntries(config.services.map((s) => [s.id, s]));
  const on = (id: string) => !!svc[id]?.enabled;
  const link = (id: string) => svc[id]?.url ?? null;
  const arrOn = on("sonarr") || on("radarr") || on("bookshelf");
  const downloadsOn = arrOn || on("qbittorrent") || on("sabnzbd");
  const missing = config.services.filter((s) => !s.enabled);
  const anyOn = config.services.some((s) => s.enabled);

  return (
    <ControlsProvider {...config.controls} demo={config.demo}>
      {kiosk ? <Kiosk /> : null}
      <main className={`shell${kiosk ? " is-kiosk" : ""}`}>
        <header className="top">
          <Clock />
          {!kiosk ? (
            <div className="top-right">
              <div className="host">
                <span className="host-dot" aria-hidden />
                {config.title} · {config.host}
              </div>
              <nav className="quicklinks" aria-label="Open apps">
                {config.services
                  .filter((s) => s.enabled && s.url)
                  .map((s) => (
                    <a key={s.id} href={s.url!} target="_blank" rel="noreferrer" className={`ql ql-${s.id}`}>
                      {s.name}
                    </a>
                  ))}
                <a href="?kiosk" className="ql" title="Fullscreen wall-tablet layout">
                  Kiosk
                </a>
              </nav>
            </div>
          ) : null}
        </header>

        {config.demo && !kiosk ? (
          <div className="notice">
            Demo mode — showing sample data. Set <code>DEMO_MODE=false</code> and add your API keys to go live.
          </div>
        ) : null}

        {!anyOn ? (
          <div className="notice">
            Nothing is configured yet. Copy <code>.env.example</code> to <code>.env</code>, fill in your API keys and
            restart the container — or set <code>DEMO_MODE=true</code> to preview.
          </div>
        ) : null}

        <div className="rows">
          {on("homeassistant") ? <HomeAssistantRow link={link} /> : null}

          <Row spans={[7, 5]}>
            {on("unraid") ? <UnraidCard href={link("unraid")} /> : null}
            {on("adguard") || on("immich") || on("tdarr") ? (
              <Stack>
                {on("adguard") ? <AdguardCard href={link("adguard")} /> : null}
                {on("immich") || on("tdarr") ? (
                  <div className="pair">
                    {on("immich") ? <ImmichCard href={link("immich")} /> : null}
                    {on("tdarr") ? <TdarrCard href={link("tdarr")} /> : null}
                  </div>
                ) : null}
              </Stack>
            ) : null}
          </Row>

          {on("uptimekuma") ? (
            <Row spans={[12]}>
              <UptimeCard href={link("uptimekuma")} />
            </Row>
          ) : null}

          {on("plex") ? (
            <Row spans={[12]}>
              <PlexCard href={link("plex")} />
            </Row>
          ) : null}

          <Row spans={[7, 5]}>
            {downloadsOn ? (
              <DownloadsCard
                links={{
                  sonarr: link("sonarr"),
                  radarr: link("radarr"),
                  bookshelf: link("bookshelf"),
                  qbittorrent: link("qbittorrent"),
                  sabnzbd: link("sabnzbd"),
                }}
              />
            ) : null}
            {on("overseerr") || on("tautulli") ? (
              <Stack>
                {on("overseerr") ? <RequestsCard href={link("overseerr")} /> : null}
                {on("tautulli") ? <TautulliCard href={link("tautulli")} /> : null}
              </Stack>
            ) : null}
          </Row>

          {arrOn ? (
            <Row spans={[12]}>
              <CalendarCard
                links={{
                  sonarr: on("sonarr") ? link("sonarr") : null,
                  radarr: on("radarr") ? link("radarr") : null,
                  bookshelf: on("bookshelf") ? link("bookshelf") : null,
                }}
              />
            </Row>
          ) : null}
        </div>

        {anyOn && missing.length && !kiosk ? (
          <footer className="foot">Not configured: {missing.map((s) => s.name).join(", ")}</footer>
        ) : null}
      </main>
    </ControlsProvider>
  );
}
