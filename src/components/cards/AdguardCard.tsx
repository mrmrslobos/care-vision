"use client";

import { ShieldCheck } from "lucide-react";
import type { AdguardData } from "@/lib/types";
import { compact, int, pct } from "../format";
import { Card, Stat, StatusBadge } from "../ui";
import { useService } from "../useService";
import { QueryChart } from "./QueryChart";

export function AdguardCard({ href }: { href?: string | null }) {
  const state = useService<AdguardData>("adguard", 30_000);
  return (
    <Card
      title="AdGuard Home"
      icon={<ShieldCheck size={16} />}
      accent="var(--brand-adguard)"
      href={href}
      state={state}
      className="span-adguard"
      meta={
        state.data && state.data.protectionEnabled !== null ? (
          <StatusBadge level={state.data.protectionEnabled ? "good" : "critical"}>
            {state.data.protectionEnabled ? "Protected" : "Protection off"}
          </StatusBadge>
        ) : null
      }
    >
      {(d) => {
        const maxBlocked = Math.max(...d.topBlocked.map((t) => t.count), 1);
        return (
          <div className="adguard">
            <div className="stat-row">
              <Stat label="DNS queries" value={compact(d.queries)} />
              <Stat
                label="Blocked"
                value={pct(d.queries ? (d.blocked / d.queries) * 100 : 0, 1)}
                sub={`${compact(d.blocked)} requests`}
              />
              <Stat label="Avg response" value={`${d.avgProcessingMs.toFixed(1)} ms`} />
            </div>
            <QueryChart queries={d.series.queries} blocked={d.series.blocked} unit={d.timeUnit} />
            {d.topBlocked.length ? (
              <div className="toplist">
                <h3>Top blocked</h3>
                <ol>
                  {d.topBlocked.map((t) => (
                    <li key={t.name}>
                      <span className="toplist-bar" style={{ width: `${(t.count / maxBlocked) * 100}%` }} />
                      <span className="toplist-name">{t.name}</span>
                      <span className="toplist-count">{int(t.count)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
        );
      }}
    </Card>
  );
}
