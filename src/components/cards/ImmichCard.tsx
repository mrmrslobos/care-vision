"use client";

import { Images } from "lucide-react";
import type { ImmichData } from "@/lib/types";
import { bytes, compact, int, pct } from "../format";
import { Card, Meter, Stat } from "../ui";
import { useService } from "../useService";

export function ImmichCard({ href }: { href?: string | null }) {
  const state = useService<ImmichData>("immich", 5 * 60_000);
  return (
    <Card
      title="Immich"
      icon={<Images size={16} />}
      accent="var(--brand-immich)"
      href={href}
      state={state}
      meta={state.data?.version ? <span className="muted small">{state.data.version}</span> : null}
    >
      {(d) => (
        <div className="stack">
          <div className="stat-row">
            <Stat label="Photos" value={compact(d.photos)} />
            <Stat label="Videos" value={compact(d.videos)} />
            <Stat label="Library" value={bytes(d.usageBytes)} />
          </div>
          {d.disk ? (
            <Meter
              label="Storage"
              ratio={d.disk.used / d.disk.total}
              value={pct((d.disk.used / d.disk.total) * 100)}
              detail={`${bytes(d.disk.total - d.disk.used)} free`}
              warn={0.85}
              crit={0.95}
            />
          ) : null}
          {d.users.length > 1 ? (
            <ul className="mini-table">
              {d.users.map((u) => (
                <li key={u.name}>
                  <span>{u.name}</span>
                  <span className="muted">{int(u.photos + u.videos)} items</span>
                  <span>{bytes(u.usageBytes)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </Card>
  );
}
