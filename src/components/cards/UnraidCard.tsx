"use client";

import { Box, Clock, HardDrive, Server, Thermometer } from "lucide-react";
import type { UnraidData } from "@/lib/types";
import { bytes, duration, pct } from "../format";
import { Card, Meter, StatusBadge } from "../ui";
import { useService } from "../useService";

// Spinning disks get warm past ~45°C; NVMe/SSD caches run hotter.
const tempLevel = (t: number, role: string) =>
  t >= (role === "cache" ? 65 : 50) ? "critical" : t >= (role === "cache" ? 55 : 45) ? "warning" : "good";

export function UnraidCard({ href }: { href?: string | null }) {
  const state = useService<UnraidData>("unraid", 10_000);
  const d = state.data;
  return (
    <Card
      title={d?.hostname ? `Unraid · ${d.hostname}` : "Unraid"}
      icon={<Server size={16} />}
      accent="var(--brand-unraid)"
      href={href}
      state={state}
      meta={
        d ? (
          <>
            {d.array.state ? (
              <StatusBadge level={d.array.state === "STARTED" ? "good" : "warning"}>
                Array {d.array.state.toLowerCase()}
              </StatusBadge>
            ) : null}
          </>
        ) : null
      }
    >
      {(d) => (
        <div className="unraid">
          <div className="meter-grid">
            <Meter
              label="CPU"
              ratio={d.cpu.percent === null ? null : d.cpu.percent / 100}
              value={pct(d.cpu.percent)}
              detail={d.cpu.model ? `${d.cpu.model}${d.cpu.threads ? ` · ${d.cpu.threads} threads` : ""}` : null}
            />
            <Meter
              label="Memory"
              ratio={d.memory ? d.memory.used / d.memory.total : null}
              value={d.memory ? pct((d.memory.used / d.memory.total) * 100) : "—"}
              detail={d.memory ? `${bytes(d.memory.used)} of ${bytes(d.memory.total)}` : null}
            />
            <Meter
              label="Array"
              ratio={d.array.capacity ? d.array.capacity.used / d.array.capacity.total : null}
              value={d.array.capacity ? pct((d.array.capacity.used / d.array.capacity.total) * 100) : "—"}
              detail={
                d.array.capacity
                  ? `${bytes(d.array.capacity.total - d.array.capacity.used)} free of ${bytes(d.array.capacity.total)}`
                  : null
              }
              warn={0.85}
              crit={0.95}
            />
          </div>

          <div className="unraid-facts">
            <div className="fact">
              <Clock size={14} aria-hidden />
              <span>Up {duration(d.uptimeSeconds)}</span>
            </div>
            {d.containers ? (
              <div className="fact" title={d.containers.stopped.length ? `Stopped: ${d.containers.stopped.join(", ")}` : undefined}>
                <Box size={14} aria-hidden />
                <span>
                  <strong>{d.containers.running}</strong>/{d.containers.total} containers running
                </span>
              </div>
            ) : null}
            {d.version ? <div className="fact muted">Unraid {d.version}</div> : null}
          </div>

          {d.warnings.length ? (
            <div className="warn-list">
              {d.warnings.map((w) => (
                <StatusBadge key={w} level="critical">
                  {w}
                </StatusBadge>
              ))}
            </div>
          ) : null}

          {d.disks.length ? (
            <ul className="disks" aria-label="Disks">
              {d.disks.map((disk) => {
                const ratio = disk.size && disk.used !== null ? disk.used / disk.size : null;
                const tl = disk.temp !== null ? tempLevel(disk.temp, disk.role) : null;
                return (
                  <li key={`${disk.role}-${disk.name}`} className="disk">
                    <div className="disk-head">
                      <HardDrive size={13} aria-hidden />
                      <span className="disk-name">{disk.name}</span>
                      {disk.temp !== null ? (
                        <span className={`disk-temp temp-${tl}`}>
                          <Thermometer size={11} aria-hidden />
                          {disk.temp}°C
                        </span>
                      ) : (
                        <span className="disk-temp muted" title="Spun down">
                          *
                        </span>
                      )}
                    </div>
                    {ratio !== null ? (
                      <div className="disk-bar" role="meter" aria-valuenow={Math.round(ratio * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${disk.name} usage`}>
                        <div style={{ width: `${ratio * 100}%` }} />
                      </div>
                    ) : (
                      <div className="disk-bar disk-bar-empty" />
                    )}
                    <div className="disk-sub">
                      {disk.role === "parity"
                        ? `Parity · ${bytes(disk.size, 0)}`
                        : ratio !== null
                          ? `${bytes(disk.used)} / ${bytes(disk.size, 0)}`
                          : bytes(disk.size, 0)}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      )}
    </Card>
  );
}
