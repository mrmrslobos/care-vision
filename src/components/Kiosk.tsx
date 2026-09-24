"use client";

import { Maximize } from "lucide-react";
import { useEffect, useState } from "react";

// Wall-tablet helpers, active with ?kiosk:
// - nudges the page a few pixels every couple of minutes (burn-in protection)
// - hides the cursor when idle
// - dims the screen overnight (?dim=22-6 to change the hours, ?dim=off to disable)
// - keeps the screen awake where the browser allows it (needs HTTPS or localhost)
// - reloads every 6 hours so a long-running tablet picks up updates

function dimmed(spec: string | null, hour: number) {
  if (spec === "off") return false;
  const [from, to] = (spec ?? "22-6").split("-").map(Number);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return false;
  return from > to ? hour >= from || hour < to : hour >= from && hour < to;
}

export function Kiosk() {
  const [dim, setDim] = useState(false);
  const [showFs, setShowFs] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("kiosk");
    const spec = new URLSearchParams(location.search).get("dim");

    const shift = () => {
      const x = Math.round((Math.random() - 0.5) * 8);
      const y = Math.round((Math.random() - 0.5) * 8);
      root.style.setProperty("--shift", `translate(${x}px, ${y}px)`);
      setDim(dimmed(spec, new Date().getHours()));
    };
    shift();
    const shiftTimer = setInterval(shift, 120_000);

    let idle: ReturnType<typeof setTimeout>;
    const wake = () => {
      root.classList.remove("cursor-hidden");
      setShowFs(!document.fullscreenElement && !!document.fullscreenEnabled);
      clearTimeout(idle);
      idle = setTimeout(() => {
        root.classList.add("cursor-hidden");
        setShowFs(false);
      }, 4000);
    };
    wake();
    window.addEventListener("pointermove", wake);
    window.addEventListener("pointerdown", wake);

    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    const requestLock = () => nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    requestLock();
    const onVis = () => !document.hidden && requestLock();
    document.addEventListener("visibilitychange", onVis);

    const reload = setTimeout(() => location.reload(), 6 * 3600_000);

    return () => {
      root.classList.remove("kiosk", "cursor-hidden");
      clearInterval(shiftTimer);
      clearTimeout(idle);
      clearTimeout(reload);
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("pointerdown", wake);
      document.removeEventListener("visibilitychange", onVis);
      lock?.release().catch(() => {});
    };
  }, []);

  return (
    <>
      {dim ? <div className="kiosk-dim" aria-hidden /> : null}
      {showFs ? (
        <button type="button" className="kiosk-fs" onClick={() => document.documentElement.requestFullscreen().catch(() => {})}>
          <Maximize size={16} aria-hidden /> Fullscreen
        </button>
      ) : null}
    </>
  );
}
