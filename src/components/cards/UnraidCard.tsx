"use client";

import { BatteryCharging, Bell, Box, Clock, HardDrive, Monitor, Play, Server, ShieldCheck, Square, Thermometer } from "lucide-react";
import type { UnraidData } from "@/lib/types";
import { useAction, useControls } from "../controls";
import { ago, bytes, duration, pct } from "../format";
import { TimeChart } from "../TimeChart";
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
            {d.notifications && (d.notifications.alerts || d.notifications.warnings) ? (
              <StatusBadge level={d.notifications.alerts ? "critical" : "warning"}>
                {d.notifications.alerts + d.notifications.warnings} alerts
              </StatusBadge>
            ) : null}
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

          {d.history.filter((h) => h.cpu !== null || h.mem !== null).length > 2 ? (
            <TimeChart
              label="CPU and memory use over the last hour"
              series={[
                { key: "cpu", label: "CPU", values: d.history.map((h) => h.cpu), kind: "area", color: "var(--series-1)" },
                { key: "mem", label: "Memory", values: d.history.map((h) => h.mem), kind: "line", color: "var(--series-3)" },
              ]}
              start={d.history[0].t}
              stepMs={(d.history[d.history.length - 1].t - d.history[0].t) / Math.max(1, d.history.length - 1)}
              format={(v) => `${Math.round(v)}%`}
              fixedMax={100}
              height={96}
            />
          ) : null}

          {d.parity ? (
            <Meter
              label={
                <>
                  <ShieldCheck size={12} aria-hidden /> {d.parity.action} in progress
                </>
              }
              ratio={d.parity.progress}
              value={pct(d.parity.progress * 100, 1)}
              warn={2}
              crit={2}
            />
          ) : null}

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
            {d.ups ? (
              <div className="fact" title={d.ups.name}>
                <BatteryCharging size={14} aria-hidden />
                <span>
                  UPS {d.ups.status?.toLowerCase() ?? ""} · {d.ups.charge !== null ? `${Math.round(d.ups.charge)}%` : "—"}
                  {d.ups.runtimeSeconds ? ` · ${duration(d.ups.runtimeSeconds)}` : ""}
                  {d.ups.load !== null ? ` · ${Math.round(d.ups.load)}% load` : ""}
                </span>
              </div>
            ) : null}
            {d.vms?.length ? (
              <div className="fact" title={d.vms.map((v) => `${v.name}: ${v.state}`).join("\n")}>
                <Monitor size={14} aria-hidden />
                <span>
                  <strong>{d.vms.filter((v) => v.state === "running").length}</strong>/{d.vms.length} VMs running
                </span>
              </div>
            ) : null}
            {d.version ? <div className="fact muted">Unraid {d.version}</div> : null}
          </div>

          {d.notifications?.latest.length ? (
            <ul className="notes" aria-label="Unread notifications">
              {d.notifications.latest.map((n) => (
                <li key={n.id} className={`note note-${n.importance}`}>
                  <Bell size={13} aria-hidden />
                  <span className="note-title">{n.title}</span>
                  {n.subject ? <span className="note-sub">{n.subject}</span> : null}
                  {n.timestamp && !Number.isNaN(Date.parse(n.timestamp)) ? (
                    <span className="note-when">{ago(Date.parse(n.timestamp))}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

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

          {d.containers?.list.length ? <Containers list={d.containers.list} refresh={state.refresh} /> : null}
        </div>
      )}
    </Card>
  );
}

function Containers({ list, refresh }: { list: NonNullable<UnraidData["containers"]>["list"]; refresh?: () => void }) {
  const { sensitive } = useControls();
  const { busy, act } = useAction(refresh);
  return (
    <details className="containers">
      <summary>
        <Box size={13} aria-hidden /> Containers
      </summary>
      <ul>
        {list.map((c) => (
          <li key={c.id || c.name} className={c.running ? "is-running" : "is-stopped"}>
            <i className="status-dot" aria-hidden />
            <span className="container-name">{c.name}</span>
            <span className="container-state">{c.running ? "Running" : "Stopped"}</span>
            {sensitive && c.id ? (
              <button
                type="button"
                className="icon-btn"
                disabled={busy === c.id}
                aria-label={`${c.running ? "Stop" : "Start"} ${c.name}`}
                title={c.running ? "Stop" : "Start"}
                onClick={() => {
                  if (c.running && !confirm(`Stop ${c.name}?`)) return;
                  act(c.id, { service: "unraid", containerId: c.id, action: c.running ? "stop" : "start" });
                }}
              >
                {c.running ? <Square size={13} /> : <Play size={13} />}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </details>
  );
}
