"use client";

let memorySid = "";
let memoryName = "";

/** One anonymous session, including browsers that block localStorage in previews. */
export function getSid(): string {
  if (typeof window === "undefined") return "";
  if (memorySid) return memorySid;
  try { memorySid = localStorage.getItem("hc-sid") || ""; } catch {}
  if (!memorySid) {
    memorySid = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    try { localStorage.setItem("hc-sid", memorySid); } catch {}
  }
  return memorySid;
}

export function getReferrer(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("utm_source") || document.referrer || "";
}

export function getStoredName(): string {
  try { return localStorage.getItem("hc-name") || memoryName; } catch { return memoryName; }
}

export function storeName(name: string) {
  memoryName = name;
  try { localStorage.setItem("hc-name", name); } catch {}
}

/** Clipboard API may be disabled inside an embedded preview. Use a copy fallback. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
  document.body.appendChild(field);
  const focus = document.activeElement;
  field.select();
  let copied = false;
  try { copied = document.execCommand("copy"); } catch {}
  field.remove();
  if (focus instanceof HTMLElement) focus.focus({ preventScroll: true });
  return copied;
}

export async function postJSON<T = { ok?: boolean; error?: string }>(url: string, body: unknown): Promise<T & { status: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok && !data.error) data.error = "সংরক্ষণ করা যায়নি — আবার চেষ্টা করুন";
    return { ...data, status: res.status } as T & { status: number };
  } catch (error) {
    return {
      error: error instanceof Error && error.name === "AbortError"
        ? "সংযোগে সময় লাগছে — আবার চেষ্টা করুন"
        : "নেটওয়ার্ক সমস্যা — আবার চেষ্টা করুন",
      status: 0,
    } as unknown as T & { status: number };
  } finally {
    clearTimeout(timeout);
  }
}
