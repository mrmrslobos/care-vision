"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ServiceState<T> {
  refresh?: () => void;
  data: T | null;
  error: string | null;
  notConfigured: boolean;
  loading: boolean;
  updatedAt: number | null;
}

/** Polls /api/<service>, pausing while the tab is hidden. Keeps the last good data on error. */
export function useService<T>(service: string, intervalMs: number): ServiceState<T> {
  const [state, setState] = useState<ServiceState<T>>({
    data: null,
    error: null,
    notConfigured: false,
    loading: true,
    updatedAt: null,
  });
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch(`/api/${service}`, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) {
        setState((s) => ({
          ...s,
          loading: false,
          error: body.error ?? `HTTP ${res.status}`,
          notConfigured: !!body.notConfigured,
        }));
      } else {
        setState({ data: body as T, error: null, notConfigured: false, loading: false, updatedAt: Date.now() });
      }
    } catch {
      setState((s) => ({ ...s, loading: false, error: "Dashboard server unreachable" }));
    } finally {
      inFlight.current = false;
    }
  }, [service]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      clearInterval(timer);
      timer = setInterval(load, intervalMs);
    };
    const onVisibility = () => {
      if (document.hidden) clearInterval(timer);
      else {
        load();
        start();
      }
    };
    const first = setTimeout(load, 0);
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load, intervalMs]);

  return { ...state, refresh: load };
}
