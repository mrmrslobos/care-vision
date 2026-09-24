"use client";

import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  BookOpen,
  Check,
  Download,
  Film,
  Inbox,
  Pause,
  Tv,
  X,
  type LucideIcon,
} from "lucide-react";
import type { DownloadsData, RequestsData, TautulliData, UptimeData } from "@/lib/types";
import { useAction } from "../controls";
import { ago, bytes, int } from "../format";
import { Card, Poster, StatusBadge } from "../ui";
import { useService } from "../useService";

const speed = (bps: number | null) => (bps === null ? "—" : `${bytes(bps)}/s`);

const SOURCE: Record<string, { label: string; icon: LucideIcon }> = {
  sonarr: { label: "TV", icon: Tv },
  radarr: { label: "Movie", icon: Film },
  bookshelf: { label: "Book", icon: BookOpen },
  qbittorrent: { label: "Torrent", icon: Download },
  sabnzbd: { label: "Usenet", icon: Download },
};

// ---------- Downloads ----------

export function DownloadsCard({ links }: { links: Record<string, string | null> }) {
  const state = useService<DownloadsData>("downloads", 10_000);
  const d = state.data;
  const issues = d ? d.arrs.reduce((n, a) => n + a.health.length, 0) + d.queue.filter((q) => q.warning).length : 0;
  return (
    <Card
      title="Downloads"
      icon={<Download size={16} />}
      accent="var(--series-1)"
      state={state}
      meta={issues ? <StatusBadge level="warning">{issues} {issues === 1 ? "issue" : "issues"}</StatusBadge> : null}
    >
      {(d) => (
        <div className="stack">
          {d.clients.length ? (
            <div className="clients">
              {d.clients.map((c) => (
                <a key={c.id} className="client" href={links[c.id] ?? undefined} target="_blank" rel="noreferrer" title={c.error}>
                  <span className="client-name">
                    {c.name}
                    {c.paused ? <Pause size={11} aria-label="Paused" /> : null}
                  </span>
                  {c.ok ? (
                    <span className="client-speed">
                      <span>
                        <ArrowDown size={13} aria-label="Download" />
                        {speed(c.downBps)}
                      </span>
                      {c.upBps !== null ? (
                        <span className="muted">
                          <ArrowUp size={13} aria-label="Upload" />
                          {speed(c.upBps)}
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="card-error small">Unreachable</span>
                  )}
                </a>
              ))}
            </div>
          ) : null}

          {d.queue.length ? (
            <ul className="queue">
              {d.queue.map((q) => {
                const src = SOURCE[q.source];
                const Icon = src?.icon ?? Download;
                return (
                  <li key={q.id} className={`queue-item event-${q.source}`}>
                    <div className="queue-head">
                      <Icon size={13} aria-label={src?.label} />
                      <span className="queue-title" title={q.title}>
                        {q.title}
                      </span>
                      <span className="queue-meta">
                        {q.eta ?? q.status}
                        {q.progress !== null ? ` · ${Math.round(q.progress * 100)}%` : ""}
                      </span>
                    </div>
                    {q.subtitle ? <div className="queue-sub">{q.subtitle}</div> : null}
                    <div className="session-progress queue-bar">
                      <div style={{ width: `${(q.progress ?? 0) * 100}%` }} />
                    </div>
                    {q.warning ? (
                      <div className="queue-warn">
                        <AlertTriangle size={12} aria-hidden /> {q.warning}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="muted small">Nothing downloading.</div>
          )}

          {d.arrs.length ? (
            <div className="arr-health">
              {d.arrs.map((a) => (
                <a key={a.source} href={links[a.source] ?? undefined} target="_blank" rel="noreferrer" className={`chip chip-${a.source}`}>
                  <i className="chip-dot" aria-hidden />
                  {a.source[0].toUpperCase() + a.source.slice(1)}
                  <span className="chip-count">{a.ok ? (a.missing !== null ? `${int(a.missing)} missing` : "ok") : "unreachable"}</span>
                </a>
              ))}
              {d.arrs.flatMap((a) =>
                a.health.map((h, i) => (
                  <div key={`${a.source}-${i}`} className={`health health-${h.type}`}>
                    <AlertTriangle size={12} aria-hidden />
                    <span>
                      <strong>{a.source[0].toUpperCase() + a.source.slice(1)}:</strong> {h.message}
                    </span>
                  </div>
                )),
              )}
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}

// ---------- Overseerr / Jellyseerr ----------

const REQUEST_BADGE = {
  pending: ["warning", "Pending"],
  approved: ["good", "Approved"],
  declined: ["critical", "Declined"],
  unknown: ["warning", "Unknown"],
} as const;

export function RequestsCard({ href }: { href?: string | null }) {
  const state = useService<RequestsData>("overseerr", 60_000);
  const { busy, act } = useAction(state.refresh);
  return (
    <Card
      title="Requests"
      icon={<Inbox size={16} />}
      accent="var(--brand-overseerr)"
      href={href}
      state={state}
      meta={state.data?.counts.pending ? <StatusBadge level="warning">{state.data.counts.pending} to approve</StatusBadge> : null}
    >
      {(d) => (
        <div className="stack">
          <div className="req-counts">
            <span>
              <strong>{int(d.counts.pending)}</strong> pending
            </span>
            <span>
              <strong>{int(d.counts.processing)}</strong> processing
            </span>
            <span>
              <strong>{int(d.counts.available)}</strong> available
            </span>
          </div>
          <ul className="requests">
            {d.recent.map((r) => {
              const [level, label] = REQUEST_BADGE[r.status];
              return (
                <li key={r.id} className="request">
                  <Poster src={r.image} title={r.title} className="poster-sm" />
                  <div className="event-text">
                    <div className="event-title">
                      {r.title} {r.year ? <span className="muted">({r.year})</span> : null}
                    </div>
                    <div className="event-sub">
                      {r.type === "tv" ? "TV" : "Movie"} · {r.user ?? "someone"} · {ago(Date.parse(r.createdAt))}
                    </div>
                  </div>
                  {r.status === "pending" ? (
                    <div className="req-actions">
                      <button
                        type="button"
                        className="icon-btn icon-btn-good"
                        aria-label={`Approve ${r.title}`}
                        title="Approve"
                        disabled={busy === `a${r.id}`}
                        onClick={() => act(`a${r.id}`, { service: "overseerr", requestId: r.id, action: "approve" })}
                      >
                        <Check size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn-bad"
                        aria-label={`Decline ${r.title}`}
                        title="Decline"
                        disabled={busy === `d${r.id}`}
                        onClick={() => confirm(`Decline ${r.title}?`) && act(`d${r.id}`, { service: "overseerr", requestId: r.id, action: "decline" })}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <StatusBadge level={level}>{r.mediaStatus === "Available" ? "Available" : label}</StatusBadge>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}

// ---------- Tautulli ----------

function RankList({ title, rows, unit }: { title: string; rows: { name: string; plays: number }[]; unit: string }) {
  if (!rows.length) return null;
  const max = Math.max(...rows.map((r) => r.plays), 1);
  return (
    <div className="toplist">
      <h3>{title}</h3>
      <ol>
        {rows.map((r) => (
          <li key={r.name}>
            <span className="toplist-bar toplist-bar-plex" style={{ width: `${(r.plays / max) * 100}%` }} />
            <span className="toplist-name">{r.name}</span>
            <span className="toplist-count">
              {int(r.plays)} {unit}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function TautulliCard({ href }: { href?: string | null }) {
  const state = useService<TautulliData>("tautulli", 5 * 60_000);
  return (
    <Card
      title="Plex stats"
      icon={<BarChart3 size={16} />}
      accent="var(--brand-plex)"
      href={href}
      state={state}
      meta={state.data ? <span className="muted small">last {state.data.days} days</span> : null}
    >
      {(d) => (
        <div className="stack">
          <RankList title="Top viewers" rows={d.topUsers} unit="plays" />
          <div className="rank-pair">
            <RankList title="Top shows" rows={d.topShows} unit="" />
            <RankList title="Top movies" rows={d.topMovies} unit="" />
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------- Uptime Kuma ----------

const UP_LABEL = { up: "Up", down: "Down", pending: "Pending", maintenance: "Maintenance", unknown: "Unknown" };

export function UptimeCard({ href }: { href?: string | null }) {
  const state = useService<UptimeData>("uptimekuma", 30_000);
  const down = state.data?.monitors.filter((m) => m.status === "down").length ?? 0;
  return (
    <Card
      title={state.data?.title ? `Status · ${state.data.title}` : "Status"}
      icon={<Activity size={16} />}
      accent="var(--good)"
      href={href}
      state={state}
      meta={
        state.data ? (
          down ? (
            <StatusBadge level="critical">{down} down</StatusBadge>
          ) : (
            <StatusBadge level="good">All systems up</StatusBadge>
          )
        ) : null
      }
    >
      {(d) => (
        <ul className="monitors">
          {[...d.monitors]
            .sort((a, b) => Number(b.status === "down") - Number(a.status === "down"))
            .map((m) => (
              <li key={m.id} className={`monitor monitor-${m.status}`}>
                <div className="monitor-head">
                  <i className="status-dot" aria-hidden />
                  <span className="monitor-name">{m.name}</span>
                  <span className="monitor-state">{UP_LABEL[m.status]}</span>
                </div>
                <div className="beats" aria-hidden>
                  {m.beats.map((b, i) => (
                    <i key={i} className={b === 1 ? "b-up" : b === 0 ? "b-down" : "b-other"} />
                  ))}
                </div>
                <div className="monitor-sub">
                  {m.uptime24h !== null ? `${(m.uptime24h * 100).toFixed(m.uptime24h > 0.999 ? 2 : 1)}% · 24h` : ""}
                  {m.ping !== null ? ` · ${m.ping} ms` : ""}
                </div>
              </li>
            ))}
        </ul>
      )}
    </Card>
  );
}
