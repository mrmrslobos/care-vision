"use client";

import { Cpu, Workflow } from "lucide-react";
import type { TdarrData } from "@/lib/types";
import { bytes, compact } from "../format";
import { Card, Stat, StatusBadge } from "../ui";
import { useService } from "../useService";

const workerLabel = (type: string) =>
  `${/health/i.test(type) ? "Health check" : "Transcode"}${/gpu/i.test(type) ? " · GPU" : /cpu/i.test(type) ? " · CPU" : ""}`;

export function TdarrCard({ href }: { href?: string | null }) {
  const state = useService<TdarrData>("tdarr", 15_000);
  return (
    <Card
      title="Tdarr"
      icon={<Workflow size={16} />}
      accent="var(--brand-tdarr)"
      href={href}
      state={state}
      meta={
        state.data?.errored ? (
          <StatusBadge level="warning">{state.data.errored} errors</StatusBadge>
        ) : null
      }
    >
      {(d) => (
        <div className="stack">
          <div className="stat-row">
            <Stat label="Queued" value={compact(d.queued)} />
            <Stat label="Processed" value={compact(d.processed)} />
            <Stat label="Space saved" value={d.savedGb === null ? "—" : bytes(d.savedGb * 1024 ** 3)} />
          </div>
          {d.workers.length ? (
            <ul className="workers" aria-label="Active workers">
              {d.workers.map((w) => (
                <li key={w.id} className="worker">
                  <div className="worker-head">
                    <Cpu size={12} aria-hidden />
                    <span className="worker-type">{workerLabel(w.type)}</span>
                    <span className="worker-pct">{w.percent !== null ? `${Math.round(w.percent)}%` : ""}</span>
                  </div>
                  <div className="worker-file" title={w.file ?? undefined}>
                    {w.file ?? "Idle"}
                  </div>
                  <div className="session-progress">
                    <div style={{ width: `${w.percent ?? 0}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="muted small">
              {d.nodes ? `${d.nodes} node${d.nodes > 1 ? "s" : ""} idle` : "No nodes connected"}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
