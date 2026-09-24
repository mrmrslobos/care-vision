"use client";

import { useMemo, useRef, useState, type PointerEvent } from "react";

export interface Series {
  key: string;
  label: string;
  values: (number | null)[];
  kind: "area" | "line";
  color: string; // a CSS var, e.g. var(--series-1)
}

function niceStep(range: number) {
  if (range <= 0) return 1;
  const raw = range / 2;
  const exp = 10 ** Math.floor(Math.log10(raw));
  const f = raw / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
}

/**
 * Shared-axis time series with a crosshair tooltip. `compact` drops the axes
 * for sparkline use inside a stat.
 */
export function TimeChart({
  series,
  start,
  stepMs,
  format,
  height = 150,
  compact = false,
  fixedMax,
  label,
}: {
  series: Series[];
  start: number;
  stepMs: number;
  format: (v: number) => string;
  height?: number;
  compact?: boolean;
  fixedMax?: number;
  label: string;
}) {
  const W = 600;
  const H = height;
  const PAD = compact ? { top: 3, right: 0, bottom: 3, left: 0 } : { top: 10, right: 8, bottom: 20, left: 40 };
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const n = Math.max(0, ...series.map((s) => s.values.length));

  const geo = useMemo(() => {
    const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
    const rawMax = fixedMax ?? Math.max(1, ...all);
    const rawMin = Math.min(0, ...all);
    const step = niceStep(rawMax - rawMin);
    const max = fixedMax ?? Math.ceil(rawMax / step) * step;
    const min = rawMin < 0 ? Math.floor(rawMin / step) * step : 0;
    const iw = W - PAD.left - PAD.right;
    const ih = H - PAD.top - PAD.bottom;
    const x = (i: number) => PAD.left + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
    const y = (v: number) => PAD.top + ih - ((v - min) / (max - min || 1)) * ih;
    // Gaps (null) break the path rather than dropping to zero.
    const line = (vals: (number | null)[]) => {
      let d = "";
      let pen = false;
      vals.forEach((v, i) => {
        if (v === null) return void (pen = false);
        d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
        pen = true;
      });
      return d;
    };
    const area = (vals: (number | null)[]) => {
      const pts = vals.map((v, i) => [i, v] as const).filter((p): p is readonly [number, number] => p[1] !== null);
      if (!pts.length) return "";
      const base = y(Math.max(min, 0));
      return `M${x(pts[0][0])},${base}${pts.map(([i, v]) => `L${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("")}L${x(pts[pts.length - 1][0])},${base}Z`;
    };
    const ticks = [];
    for (let t = min; t <= max + 1e-9; t += (max - min) / 2) ticks.push(t);
    return { x, y, line, area, ticks, iw, min, max };
  }, [series, n, fixedMax, H, PAD.left, PAD.right, PAD.top, PAD.bottom]);

  const time = (i: number) =>
    new Date(start + i * stepMs).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  const onMove = (e: PointerEvent) => {
    const svg = svgRef.current;
    if (!svg || n === 0) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    setHover(Math.max(0, Math.min(n - 1, Math.round(((px - PAD.left) / geo.iw) * (n - 1)))));
  };

  if (n === 0) return <div className="chart-empty">Collecting data…</div>;
  const tipLeft = hover !== null ? (geo.x(hover) / W) * 100 : 0;

  return (
    <figure className={`tchart${compact ? " tchart-compact" : ""}`}>
      {!compact && series.length > 1 ? (
        <div className="legend" aria-hidden>
          {series.map((s) => (
            <span key={s.key}>
              <i className={`swatch ${s.kind === "area" ? "swatch-area" : ""}`} style={{ background: s.color }} /> {s.label}
            </span>
          ))}
        </div>
      ) : null}
      <div className="qchart-plot">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={label}
          style={{ height: H }}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {!compact
            ? geo.ticks.map((t) => (
                <g key={t}>
                  <line className={t === 0 && geo.min < 0 ? "zero" : "grid"} x1={PAD.left} x2={W - PAD.right} y1={geo.y(t)} y2={geo.y(t)} />
                  <text className="tick" x={PAD.left - 6} y={geo.y(t) + 3} textAnchor="end">
                    {format(t)}
                  </text>
                </g>
              ))
            : null}
          {series.map((s) =>
            s.kind === "area" ? (
              <path key={`${s.key}-a`} d={geo.area(s.values)} style={{ fill: `color-mix(in srgb, ${s.color} 22%, transparent)` }} />
            ) : null,
          )}
          {series.map((s) => (
            <path key={s.key} className="series-line" d={geo.line(s.values)} style={{ stroke: s.color }} />
          ))}
          {hover !== null ? (
            <g>
              <line className="crosshair" x1={geo.x(hover)} x2={geo.x(hover)} y1={PAD.top} y2={H - PAD.bottom} />
              {series.map((s) =>
                s.values[hover] !== null && s.values[hover] !== undefined ? (
                  <circle key={s.key} className="dot" cx={geo.x(hover)} cy={geo.y(s.values[hover]!)} r={4} style={{ fill: s.color }} />
                ) : null,
              )}
            </g>
          ) : null}
          {!compact ? (
            <>
              <text className="tick" x={PAD.left} y={H - 4}>
                {time(0)}
              </text>
              <text className="tick" x={W - PAD.right} y={H - 4} textAnchor="end">
                Now
              </text>
            </>
          ) : null}
        </svg>
        {hover !== null ? (
          <div className="tooltip" style={{ left: `${tipLeft}%`, transform: `translateX(${tipLeft > 60 ? "-105%" : "5%"})` }}>
            <div className="tooltip-title">{time(hover)}</div>
            {series.map((s) => (
              <div className="tooltip-row" key={s.key}>
                <i className="swatch" style={{ background: s.color }} /> {s.label}
                <strong>{s.values[hover] === null || s.values[hover] === undefined ? "—" : format(s.values[hover]!)}</strong>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </figure>
  );
}
