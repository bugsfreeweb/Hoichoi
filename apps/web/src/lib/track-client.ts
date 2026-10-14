"use client";

/**
 * Client-side beacon for the cookie-less traffic tracker. Session id is a
 * random per-tab value in sessionStorage (cleared when the tab closes); the
 * server derives the daily visitor fingerprint from IP+UA. Fails silently.
 */

function sessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let s = sessionStorage.getItem("hoichoi-sid");
    if (!s) {
      s = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      sessionStorage.setItem("hoichoi-sid", s);
    }
    return s;
  } catch {
    return "";
  }
}

export function slugFromPath(path: string): string | null {
  const m = path.match(/^\/post\/([^/?#]+)/);
  return m && m[1] ? decodeURIComponent(m[1]) : null;
}

function send(payload: Record<string, unknown>): void {
  try {
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

export function trackPageView(path: string, referrer?: string): void {
  if (!path) return;
  send({ path, postSlug: slugFromPath(path), sessionId: sessionId(), referrer: referrer ?? "" });
}

export function trackAd(slot: string, event: "view" | "click", postSlug?: string | null): void {
  if (!slot) return;
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  send({
    path,
    postSlug: postSlug ?? slugFromPath(path),
    adSlot: slot,
    adEvent: event,
    sessionId: sessionId(),
  });
}
