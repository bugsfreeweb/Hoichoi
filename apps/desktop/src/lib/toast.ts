export type ToastTone = "ok" | "err" | "info" | "busy";

export interface ToastMsg {
  id: number;
  tone: ToastTone;
  title: string;
  body?: string;
  ttl: number;
}

type ToastListener = (t: ToastMsg) => void;

let seq = 1;
const listeners = new Set<ToastListener>();

export function onToast(fn: ToastListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(tone: ToastTone, title: string, body?: string, ttl = 4200): number {
  const id = seq++;
  const msg: ToastMsg = { id, tone, title, body, ttl };
  for (const fn of listeners) fn(msg);
  return id;
}

export const toast = {
  ok: (title: string, body?: string) => emit("ok", title, body),
  err: (title: string, body?: string) => emit("err", title, body, 6000),
  info: (title: string, body?: string) => emit("info", title, body),
  busy: (title: string, body?: string) => emit("busy", title, body, 0),
};