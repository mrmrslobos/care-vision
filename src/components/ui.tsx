"use client";

import { AlertTriangle, ArrowUpRight, CircleCheck, CircleX, Loader2, PlugZap } from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";
import { initials } from "./format";
import type { ServiceState } from "./useService";

export function Card<T>({
  title,
  icon,
  accent,
  href,
  meta,
  state,
  className = "",
  children,
}: {
  title: string;
  icon: ReactNode;
  accent: string;
  href?: string | null;
  meta?: ReactNode;
  state: ServiceState<T>;
  className?: string;
  children: (data: T) => ReactNode;
}) {
  const { data, error, loading, notConfigured } = state;
  return (
    <section className={`card ${className}`} style={{ "--accent": accent } as CSSProperties}>
      <header className="card-head">
        <span className="card-icon" aria-hidden>
          {icon}
        </span>
        <h2>
          {href ? (
            <a href={href} target="_blank" rel="noreferrer">
              {title}
              <ArrowUpRight size={14} className="card-link-icon" aria-hidden />
            </a>
          ) : (
            title
          )}
        </h2>
        <div className="card-meta">
          {error && data ? (
            <span className="badge badge-warning" title={error}>
              <AlertTriangle size={12} aria-hidden /> Stale
            </span>
          ) : null}
          {meta}
        </div>
      </header>
      <div className="card-body">
        {data ? (
          children(data)
        ) : loading ? (
          <div className="card-empty">
            <Loader2 size={18} className="spin" aria-hidden /> Loading…
          </div>
        ) : notConfigured ? (
          <div className="card-empty">
            <PlugZap size={18} aria-hidden />
            <span>
              Not configured yet — add its settings to your <code>.env</code>.
            </span>
          </div>
        ) : (
          <div className="card-empty card-error">
            <CircleX size={18} aria-hidden />
            <span>{error}</span>
          </div>
        )}
      </div>
    </section>
  );
}

export type Level = "good" | "warning" | "critical";

export const levelFor = (ratio: number, warn = 0.8, crit = 0.92): Level =>
  ratio >= crit ? "critical" : ratio >= warn ? "warning" : "good";

export function StatusBadge({ level, children }: { level: Level; children: ReactNode }) {
  const Icon = level === "good" ? CircleCheck : level === "warning" ? AlertTriangle : CircleX;
  return (
    <span className={`badge badge-${level}`}>
      <Icon size={12} aria-hidden /> {children}
    </span>
  );
}

/** A single ratio against a limit. Turns to a status colour (with label) only when high. */
export function Meter({
  label,
  value,
  detail,
  ratio,
  warn,
  crit,
}: {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  ratio: number | null;
  warn?: number;
  crit?: number;
}) {
  const r = ratio === null ? 0 : Math.min(1, Math.max(0, ratio));
  const level = ratio === null ? "good" : levelFor(r, warn, crit);
  return (
    <div className={`meter meter-${level}`}>
      <div className="meter-row">
        <span className="meter-label">{label}</span>
        <span className="meter-value">
          {level !== "good" ? (
            <AlertTriangle size={12} aria-label={level === "critical" ? "Critical" : "High"} />
          ) : null}
          {value}
        </span>
      </div>
      <div
        className="meter-track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(r * 100)}
        aria-label={typeof label === "string" ? label : undefined}
      >
        <div className="meter-fill" style={{ width: `${r * 100}%` }} />
      </div>
      {detail ? <div className="meter-detail">{detail}</div> : null}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub ? <div className="stat-sub">{sub}</div> : null}
    </div>
  );
}

export function Poster({
  src,
  title,
  className = "",
}: {
  src: string | null;
  title: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  // Deterministic gradient per title so placeholders don't all look alike.
  let h = 0;
  for (const c of title) h = (h * 31 + c.charCodeAt(0)) % 360;
  return (
    <div className={`poster ${className}`} style={{ "--h": h } as CSSProperties}>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- proxied LAN images, no optimisation wanted
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="poster-fallback" aria-hidden>
          {initials(title)}
        </span>
      )}
    </div>
  );
}
