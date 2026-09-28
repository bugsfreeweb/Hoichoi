export type ToastTone = "ok" | "err" | "info" | "busy";

export interface ToastMsg {
  id: number;
  tone: ToastTone;
  title: string;
  body?: string;
  ttl: number;
}

type ToastListener = (t: ToastMsg) => void;
type DismissListener = (id: number) => void;

let seq = 1;
const listeners = new Set<ToastListener>();
const dismissListeners = new Set<DismissListener>();

export function onToast(fn: ToastListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function onToastDismiss(fn: DismissListener): () => void {
  dismissListeners.add(fn);
  return () => dismissListeners.delete(fn);
}

function emit(tone: ToastTone, title: string, body?: string, ttl = 4200): number {
  const id = seq++;
  const msg: ToastMsg = { id, tone, title, body, ttl };
  for (const fn of listeners) fn(msg);
  return id;
}

/**
 * Close a toast early.
 *
 * `busy` toasts are created with `ttl: 0` (they must outlive a long operation),
 * which also means they never auto-expire — so the caller that started the work
 * is responsible for calling this when the work settles. Without it, a spinner
 * stays on screen forever.
 */
export function dismissToast(id: number): void {
  for (const fn of dismissListeners) fn(id);
}

export const toast = {
  ok: (title: string, body?: string) => emit("ok", title, body),
  err: (title: string, body?: string) => emit("err", title, body, 6000),
  info: (title: string, body?: string) => emit("info", title, body),
  busy: (title: string, body?: string) => emit("busy", title, body, 0),
  dismiss: dismissToast,
};
