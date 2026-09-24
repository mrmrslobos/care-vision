"use client";

import { Pause, Play, Clapperboard } from "lucide-react";
import type { PlexData } from "@/lib/types";
import { ago } from "../format";
import { Card, Poster } from "../ui";
import { useService } from "../useService";

const typeLabel: Record<string, string> = { movie: "Movie", season: "TV", episode: "TV", album: "Music", show: "TV" };

export function PlexCard({ href }: { href?: string | null }) {
  const state = useService<PlexData>("plex", 60_000);
  return (
    <Card
      title="Recently added to Plex"
      icon={<Clapperboard size={16} />}
      accent="var(--brand-plex)"
      href={href}
      state={state}
      className="span-full"
      meta={
        state.data?.sessions.length ? (
          <span className="badge badge-accent">
            <Play size={12} aria-hidden /> {state.data.sessions.length} streaming
          </span>
        ) : null
      }
    >
      {(d) => (
        <div className="plex">
          {d.sessions.length ? (
            <ul className="sessions" aria-label="Now playing">
              {d.sessions.map((s) => (
                <li key={s.id} className="session">
                  <Poster src={s.image} title={s.title} className="poster-xs" />
                  <div className="session-text">
                    <div className="session-title">
                      {s.state === "paused" ? <Pause size={12} aria-label="Paused" /> : <Play size={12} aria-label="Playing" />}
                      {s.title}
                    </div>
                    <div className="session-sub">
                      {[s.subtitle, s.user, s.player].filter(Boolean).join(" · ")}
                    </div>
                    {s.progress !== null ? (
                      <div className="session-progress">
                        <div style={{ width: `${s.progress * 100}%` }} />
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          {d.recent.length ? (
            <ul className="rail" aria-label="Recently added">
              {d.recent.map((item) => (
                <li key={item.id} className="rail-item">
                  <Poster src={item.image} title={item.title} />
                  <span className="rail-tag">{typeLabel[item.type] ?? item.library ?? item.type}</span>
                  <div className="rail-title" title={item.title}>
                    {item.title}
                  </div>
                  <div className="rail-sub">
                    {item.subtitle ?? item.year ?? item.library}
                  </div>
                  <div className="rail-when">{ago(item.addedAt)}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="card-empty">Nothing added recently.</div>
          )}
        </div>
      )}
    </Card>
  );
}
