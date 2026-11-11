"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, Loader2, TriangleAlert, Info, X } from "lucide-react";

/**
 * Admin toast system.
 *
 * Why: every action in the console used to be a bare `await fetch(...)` followed
 * by `window.location.reload()`. A failed request (401/500) reloaded silently,
 * so a click looked like it did nothing. Operators had no way to tell "still
 * running" from "failed" from "nothing happened".
 *
 * A toast has three liveness states:
 *   busy    — spinner, stays until the caller settles it (real progress)
 *   success — green check, auto-dismisses
 *   error   — red, stays longer and can be dismissed by hand
 */

export type ToastTone = "busy" | "success" | "error" | "info";

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  detail?: string;
  /** 0-100 when the server reports progress, otherwise indeterminate. */
  progress?: number;
  createdAt: number;
}

type ToastApi = {
  busy: (title: string, detail?: string) => number;
  success: (title: string, detail?: string) => number;
  error: (title: string, detail?: string) => number;
  info: (title: string, detail?: string) => number;
  /** Settle a pending toast in place (no new toast, no flicker). */
  settle: (id: number, tone: Exclude<ToastTone, "busy">, title: string, detail?: string) => void;
  progress: (id: number, value: number) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const clearTimer = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  const dismiss = useCallback(
    (id: number) => {
      clearTimer(id);
      setToasts((list) => list.filter((t) => t.id !== id));
    },
    [clearTimer],
  );

  const scheduleDismiss = useCallback(
    (id: number, ms: number) => {
      clearTimer(id);
      timers.current.set(
        id,
        setTimeout(() => {
          timers.current.delete(id);
          setToasts((list) => list.filter((t) => t.id !== id));
        }, ms),
      );
    },
    [clearTimer],
  );

  const push = useCallback(
    (tone: ToastTone, title: string, detail?: string) => {
      const id = nextId++;
      setToasts((list) => [...list.slice(-4), { id, tone, title, detail, createdAt: Date.now() }]);
      if (tone === "success" || tone === "info") scheduleDismiss(id, 4200);
      if (tone === "error") scheduleDismiss(id, 9000);
      return id;
    },
    [scheduleDismiss],
  );

  const settle = useCallback(
    (id: number, tone: Exclude<ToastTone, "busy">, title: string, detail?: string) => {
      setToasts((list) => list.map((t) => (t.id === id ? { ...t, tone, title, detail, progress: undefined } : t)));
      scheduleDismiss(id, tone === "error" ? 9000 : 4200);
    },
    [scheduleDismiss],
  );

  const setProgress = useCallback((id: number, value: number) => {
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, progress: Math.max(0, Math.min(100, value)) } : t)));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      busy: (title, detail) => push("busy", title, detail),
      success: (title, detail) => push("success", title, detail),
      error: (title, detail) => push("error", title, detail),
      info: (title, detail) => push("info", title, detail),
      settle,
      progress: setProgress,
      dismiss,
    }),
    [push, settle, setProgress, dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-3 bottom-3 z-[200] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[360px]"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => (
          <ToastLine key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastLine({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const palette: Record<ToastTone, { ring: string; icon: ReactNode; bar: string }> = {
    busy: { ring: "border-ink/25 bg-paper", icon: <Loader2 size={15} className="animate-spin text-ink-soft" />, bar: "bg-ink/50" },
    success: { ring: "border-cat-teal bg-paper", icon: <CheckCircle2 size={15} className="text-cat-teal" />, bar: "bg-cat-teal" },
    error: { ring: "border-alizarin bg-paper", icon: <TriangleAlert size={15} className="text-alizarin" />, bar: "bg-alizarin" },
    info: { ring: "border-ink/25 bg-paper", icon: <Info size={15} className="text-cat-blue" />, bar: "bg-cat-blue" },
  };
  const p = palette[toast.tone];
  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      className={`pointer-events-auto w-full border-2 px-3 py-2.5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.45)] ${p.ring}`}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0">{p.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] leading-snug font-bold text-ink">{toast.title}</p>
          {toast.detail && <p className="mt-0.5 text-[11.5px] leading-snug break-words text-ink-soft">{toast.detail}</p>}
        </div>
        {toast.tone !== "busy" && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="বন্ধ করুন"
            className="-mr-1 shrink-0 rounded p-1 text-ink-soft transition-colors hover:text-ink"
          >
            <X size={12} />
          </button>
        )}
      </div>
      {toast.tone === "busy" && (
        <div className="mt-2 h-[3px] w-full overflow-hidden bg-ink/10">
          {typeof toast.progress === "number" ? (
            <div className={`h-full transition-[width] duration-300 ${p.bar}`} style={{ width: `${toast.progress}%` }} />
          ) : (
            <div className={`h-full w-1/3 animate-pulse ${p.bar}`} />
          )}
        </div>
      )}
    </div>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
