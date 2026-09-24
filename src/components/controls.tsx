"use client";

import { Lock, X } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState, type FormEvent, type ReactNode } from "react";

// Shared plumbing for every button that changes something: posts to
// /api/action, asks for the PIN when the server wants one (remembered on
// this device), and shows errors as a toast.

type ActionBody = Record<string, unknown> & { service: string };

interface ControlsApi {
  pinRequired: boolean;
  sensitive: boolean;
  demo: boolean;
  run: (body: ActionBody) => Promise<boolean>;
}

const Ctx = createContext<ControlsApi | null>(null);
const PIN_KEY = "dashboard-pin";

const readPin = () => {
  try {
    return localStorage.getItem(PIN_KEY);
  } catch {
    return null;
  }
};
const writePin = (pin: string | null) => {
  try {
    if (pin) localStorage.setItem(PIN_KEY, pin);
    else localStorage.removeItem(PIN_KEY);
  } catch {
    /* storage blocked — PIN is asked for each time */
  }
};

export function ControlsProvider({
  pinRequired,
  sensitive,
  demo,
  children,
}: {
  pinRequired: boolean;
  sensitive: boolean;
  demo: boolean;
  children: ReactNode;
}) {
  const [toast, setToast] = useState<string | null>(null);
  const [asking, setAsking] = useState<{ error: string | null } | null>(null);
  const pinResolver = useRef<((pin: string | null) => void) | null>(null);
  const memoryPin = useRef<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const askPin = (error: string | null) =>
    new Promise<string | null>((resolve) => {
      pinResolver.current = resolve;
      setAsking({ error });
    });

  const run = useCallback(
    async (body: ActionBody) => {
      if (demo) {
        showToast("Demo mode — buttons don't do anything yet");
        return false;
      }
      let pin = memoryPin.current ?? readPin();
      if (pinRequired && !pin) pin = await askPin(null);
      if (pinRequired && !pin) return false;

      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await fetch("/api/action", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(pin ? { "x-dashboard-pin": pin } : {}) },
          body: JSON.stringify(body),
        }).catch(() => null);
        if (!res) {
          showToast("Dashboard server unreachable");
          return false;
        }
        const out = await res.json().catch(() => ({}));
        if (res.ok) {
          memoryPin.current = pin;
          writePin(pin);
          return true;
        }
        if (res.status === 401 && out.pin) {
          writePin(null);
          memoryPin.current = null;
          pin = await askPin(out.error === "Wrong PIN" ? "Wrong PIN, try again" : null);
          if (!pin) return false;
          continue;
        }
        showToast(out.error ?? `Failed (HTTP ${res.status})`);
        return false;
      }
      return false;
    },
    [demo, pinRequired, showToast],
  );

  const submitPin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const pin = String(new FormData(e.currentTarget).get("pin") ?? "").trim();
    setAsking(null);
    pinResolver.current?.(pin || null);
  };
  const cancelPin = () => {
    setAsking(null);
    pinResolver.current?.(null);
  };

  return (
    <Ctx.Provider value={{ pinRequired, sensitive, demo, run }}>
      {children}
      {asking ? (
        <div className="modal-backdrop" onClick={cancelPin}>
          <form className="pin-dialog" onClick={(e) => e.stopPropagation()} onSubmit={submitPin} role="dialog" aria-modal="true" aria-labelledby="pin-title">
            <div className="pin-head">
              <Lock size={16} aria-hidden />
              <h2 id="pin-title">Enter PIN</h2>
              <button type="button" className="icon-btn" onClick={cancelPin} aria-label="Cancel">
                <X size={16} />
              </button>
            </div>
            <input name="pin" type="password" inputMode="numeric" autoComplete="off" autoFocus aria-label="PIN" />
            {asking.error ? <div className="pin-error">{asking.error}</div> : null}
            <button type="submit" className="btn btn-primary">
              Unlock controls
            </button>
          </form>
        </div>
      ) : null}
      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}
    </Ctx.Provider>
  );
}

export function useControls() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useControls outside ControlsProvider");
  return ctx;
}

/** Runs an action, tracks its busy state, and refreshes the card afterwards. */
export function useAction(refresh?: () => void) {
  const { run } = useControls();
  const [busy, setBusy] = useState<string | null>(null);
  const act = async (key: string, body: ActionBody) => {
    setBusy(key);
    const ok = await run(body);
    setBusy(null);
    if (ok && refresh) {
      refresh();
      // Devices often report their new state a moment later.
      setTimeout(refresh, 1500);
    }
    return ok;
  };
  return { busy, act };
}
