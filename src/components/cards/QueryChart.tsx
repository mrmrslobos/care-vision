"use client";

import { useMemo, useRef, useState, type PointerEvent } from "react";
import { int } from "../format";

const W = 600;
const H = 150;
const PAD = { top: 10, right: 8, bottom: 20, left: 36 };

function niceMax(v: number) {
  if (v <= 0) return 10;
  const exp = 10 ** Math.floor(Math.log10(v));
  const f = v / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
}

/** Queries (area) and blocked (line) on one shared count axis, with a crosshair tooltip. */
export function QueryChart({
  queries,
  blocked,
  unit,
}: {
  queries: number[];
  blocked: number[];
  unit: "hours" | "days";
}) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const n = queries.length;

  const geo = useMemo(() => {
    const max = niceMax(Math.max(...queries, ...blocked, 1));
    const iw = W - PAD.left - PAD.right;
    const ih = H - PAD.top - PAD.bottom;
    const x = (i: number) => PAD.left + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
    const y = (v: number) => PAD.top + ih - (v / max) * ih;
    const line = (s: number[]) => s.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
    const area = `${line(queries)}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`;
    const ticks = [0, max / 2, max];
    return { x, y, line, area, ticks, iw };
  }, [queries, blocked, n]);

  // Label each point relative to now: "-23h" … "now".
  const label = (i: number) => {
    const back = n - 1 - i;
    if (back === 0) return unit === "hours" ? "This hour" : "Today";
    return unit === "hours" ? `${back}h ago` : `${back}d ago`;
  };

  const onMove = (e: PointerEvent) => {
    const svg = svgRef.current;
    if (!svg || n === 0) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD.left) / geo.iw) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  if (n === 0) return <div className="chart-empty">No data yet</div>;

  const tipLeft = hover !== null ? (geo.x(hover) / W) * 100 : 0;

  return (
    <figure className="qchart">
      <div className="legend" aria-hidden>
        <span><i className="swatch swatch-area" /> Queries</span>
        <span><i className="swatch swatch-line" /> Blocked</span>
        <span className="legend-note">last {n} {unit}</span>
      </div>
      <div className="qchart-plot">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`DNS queries and blocked queries over the last ${n} ${unit}`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {geo.ticks.map((t) => (
            <g key={t}>
              <line className="grid" x1={PAD.left} x2={W - PAD.right} y1={geo.y(t)} y2={geo.y(t)} />
              <text className="tick" x={PAD.left - 6} y={geo.y(t) + 3} textAnchor="end">
                {t >= 1000 ? `${+(t / 1000).toFixed(1)}k` : t}
              </text>
            </g>
          ))}
          <path className="q-area" d={geo.area} />
          <path className="q-line" d={geo.line(queries)} />
          <path className="b-line" d={geo.line(blocked)} />
          {hover !== null ? (
            <g>
              <line className="crosshair" x1={geo.x(hover)} x2={geo.x(hover)} y1={PAD.top} y2={H - PAD.bottom} />
              <circle className="dot-q" cx={geo.x(hover)} cy={geo.y(queries[hover])} r={4} />
              <circle className="dot-b" cx={geo.x(hover)} cy={geo.y(blocked[hover] ?? 0)} r={4} />
            </g>
          ) : null}
          <text className="tick" x={PAD.left} y={H - 4}>
            {label(0)}
          </text>
          <text className="tick" x={W - PAD.right} y={H - 4} textAnchor="end">
            {label(n - 1)}
          </text>
        </svg>
        {hover !== null ? (
          <div
            className="tooltip"
            style={{ left: `${tipLeft}%`, transform: `translateX(${tipLeft > 60 ? "-105%" : "5%"})` }}
          >
            <div className="tooltip-title">{label(hover)}</div>
            <div className="tooltip-row">
              <i className="swatch swatch-area" /> Queries <strong>{int(queries[hover])}</strong>
            </div>
            <div className="tooltip-row">
              <i className="swatch swatch-line" /> Blocked <strong>{int(blocked[hover] ?? 0)}</strong>
            </div>
          </div>
        ) : null}
      </div>
    </figure>
  );
}
