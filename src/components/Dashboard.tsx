"use client";

import { useEffect, useState } from "react";
import type { DashboardConfig } from "@/lib/types";
import { AdguardCard } from "./cards/AdguardCard";
import { CalendarCard } from "./cards/CalendarCard";
import { ImmichCard } from "./cards/ImmichCard";
import { PlexCard } from "./cards/PlexCard";
import { TdarrCard } from "./cards/TdarrCard";
import { UnraidCard } from "./cards/UnraidCard";

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

export function Dashboard({ config }: { config: DashboardConfig }) {
  const svc = Object.fromEntries(config.services.map((s) => [s.id, s]));
  const on = (id: string) => !!svc[id]?.enabled;
  const link = (id: string) => svc[id]?.url ?? null;
  const calendarOn = on("sonarr") || on("radarr") || on("bookshelf");
  const missing = config.services.filter((s) => !s.enabled);
  const anyOn = config.services.some((s) => s.enabled);

  return (
    <main className="shell">
      <header className="top">
        <Clock />
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
          </nav>
        </div>
      </header>

      {config.demo ? (
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

      <div className="grid">
        {(on("unraid") || on("immich") || on("tdarr")) && (
          <div className={`col-main${on("adguard") ? "" : " col-wide"}`}>
            {on("unraid") && <UnraidCard href={link("unraid")} />}
            {(on("immich") || on("tdarr")) && (
              <div className="pair">
                {on("immich") && <ImmichCard href={link("immich")} />}
                {on("tdarr") && <TdarrCard href={link("tdarr")} />}
              </div>
            )}
          </div>
        )}
        {on("adguard") && <AdguardCard href={link("adguard")} />}
        {on("plex") && <PlexCard href={link("plex")} />}
        {calendarOn && (
          <CalendarCard
            links={{
              sonarr: on("sonarr") ? link("sonarr") : null,
              radarr: on("radarr") ? link("radarr") : null,
              bookshelf: on("bookshelf") ? link("bookshelf") : null,
            }}
          />
        )}
      </div>

      {anyOn && missing.length ? (
        <footer className="foot">Not configured: {missing.map((s) => s.name).join(", ")}</footer>
      ) : null}
    </main>
  );
}
