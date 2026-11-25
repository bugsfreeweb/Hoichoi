"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, Trash2 } from "lucide-react";
import { POLL_MS, useQueueCounts } from "./queue-counts";
import { useBi, useLocale, useT } from "@/components/i18n/LocaleProvider";

/**
 * Live queue badge and alert panel in the header.
 *
 * Two problems this fixes, both about the same thing — a panel nobody can read:
 *
 *  1. Every alert rendered its full body, so eight events made a dropdown taller
 *     than the screen, with no way to skim. Rows are now one line (severity dot,
 *     title, age), with the body behind a chevron and per-item dismissal.
 *  2. Reading was the only thing you could do. Old events accumulated forever, so
 *     the panel grew monotonically and the bell stopped meaning "something needs
 *     you now". It can now dismiss one alert or clear everything already read.
 *
 * The panel itself is capped and scrolls; the queue counts and alert list still
 * come from the shell's single poll, so badge and panel cannot disagree.
 */

function toBn(v: number): string {
  return String(v).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d);
}

/** Bangla digits only in Bangla; an English reader keeps Latin numerals. */
function num(v: number, en: boolean): string {
  return en ? String(v) : toBn(v);
}

const SEVERITY_STYLE: Record<string, { dot: string; text: string }> = {
  critical: { dot: "bg-alizarin", text: "text-alizarin" },
  warn: { dot: "bg-amberx", text: "text-amberx" },
  info: { dot: "bg-cat-blue", text: "text-cat-blue" },
};

/** "৩ মিনিট" / "3m" — a bell is about when, not what date. */
function ageLabel(iso: string, en: boolean): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (mins < 1) return en ? "now" : "এইমাত্র";
  if (mins < 60) return en ? `${mins}m` : `${toBn(mins)} মিনিট`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return en ? `${hours}h` : `${toBn(hours)} ঘণ্টা`;
  return en ? `${Math.round(hours / 24)}d` : `${toBn(Math.round(hours / 24))} দিন`;
}

export function NotificationBell() {
  const t = useT();
  const b = useBi();
  const { locale } = useLocale();
  const en = locale === "en";
  const { urgent, alerts, unread, stale, refresh } = useQueueCounts();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  async function post(body: Record<string, unknown>): Promise<void> {
    setBusy(true);
    try {
      await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      refresh();
    } finally {
      setBusy(false);
    }
  }

  async function dismiss(id: string): Promise<void> {
    setBusy(true);
    try {
      await fetch(`/api/admin/notifications?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setExpanded((cur) => (cur === id ? null : cur));
      refresh();
    } finally {
      setBusy(false);
    }
  }

  // Close on outside click and on Escape; both are expected of a dropdown.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent): void => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Queue depth and unread alerts are different things: a queue of 40 pending
  // posts and one "provider cooling down" both deserve a badge.
  const total = urgent.reduce((sum, i) => sum + i.count, 0) + unread;
  const unreadAlerts = alerts.filter((a) => !a.read_at).length;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          // Opening the panel is a read, so re-check rather than showing whatever
          // the last background poll saw.
          refresh();
        }}
        aria-label={`${b("কিউ আপডেট", "Queue updates")}${total > 0 ? ` (${num(total, en)} ${b("অপেক্ষমাণ", "waiting")})` : ""}`}
        aria-expanded={open}
        aria-controls="queue-bell-panel"
        className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-ink/20 text-ink-soft transition-colors hover:border-ink/45 hover:bg-ink/5 hover:text-ink"
      >
        <Bell size={15} />
        {total > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-alizarin px-1 font-mono-x text-[9px] font-bold text-white">
            {total > 99 ? "99+" : num(total, en)}
          </span>
        )}
        {stale && (
          <span
            className="absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full bg-amberx"
            title={b("সর্বশেষ হালনাগাদ করা যায়নি", "Could not refresh the latest counts")}
          />
        )}
      </button>

      {open && (
        <div
          id="queue-bell-panel"
          role="group"
          aria-label={b("কিউ আপডেট", "Queue updates")}
          className="absolute right-0 z-50 mt-2 flex w-[min(22rem,calc(100vw-2rem))] flex-col rounded-xl border border-ink/20 bg-paper shadow-2xl text-ink"
        >
          <div className="flex items-center justify-between gap-2 border-b border-ink/10 px-3 py-2">
            <p className="font-mono-x text-[9.5px] tracking-[0.18em] text-ink-soft uppercase">
              {t("notify.queues")}
              {stale ? (en ? " (stale)" : " (অসাময়িক)") : ""}
            </p>
            <Link
              href="/admin/notifications"
              onClick={() => setOpen(false)}
              className="font-mono-x text-[9.5px] text-alizarin underline"
            >
              {b("সব দেখুন", "See all")}
            </Link>
          </div>

          {/* Queues first: they are the work, and they are one line each. */}
          <div className="max-h-[30vh] overflow-y-auto px-1.5 py-1">
            {urgent.length === 0 && (
              <p className="px-2 py-2 text-[12px] text-ink-soft">
                {stale ? t("notify.stale") : b("কোনো তথ্য পাওয়া যায়নি।", "Nothing to show yet.")}
              </p>
            )}
            {urgent.map((i) => (
              <Link
                key={i.key}
                href={i.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-ink/5"
              >
                <span className="text-[12.5px] font-semibold text-ink">{i.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 font-mono-x text-[10px] font-bold ${
                    i.count > 0 ? "bg-alizarin text-on-accent" : "bg-ink/10 text-ink-soft"
                  }`}
                >
                  {num(i.count, en)}
                </span>
              </Link>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-ink/10 px-3 py-1.5">
            <p className="font-mono-x text-[9.5px] tracking-[0.18em] text-ink-soft uppercase">
              {t("notify.events")}
              {alerts.length ? ` · ${num(alerts.length, en)}` : ""}
              {unreadAlerts ? ` · ${num(unreadAlerts, en)} ${b("নতুন", "new")}` : ""}
            </p>
            <div className="flex items-center gap-1.5">
              {unreadAlerts > 0 && (
                <button
                  type="button"
                  onClick={() => void post({ all: true })}
                  disabled={busy}
                  className="rounded-md border border-ink/25 px-1.5 py-0.5 font-mono-x text-[9px] font-bold whitespace-nowrap text-ink-soft hover:border-ink hover:text-ink disabled:opacity-50"
                >
                  {b("সব পড়া", "Mark read")}
                </button>
              )}
              {alerts.length > 0 && (
                <button
                  type="button"
                  onClick={() => void post({ clear: true })}
                  disabled={busy}
                  title={b("যেগুলো পড়া হয়েছে সেগুলো সরিয়ে ফেলুন", "Clear the alerts you have already read")}
                  className="rounded-md border border-alizarin/60 px-1.5 py-0.5 font-mono-x text-[9px] font-bold whitespace-nowrap text-alizarin hover:bg-alizarin hover:text-on-accent disabled:opacity-50"
                >
                  {b("পরিষ্কার", "Clear")}
                </button>
              )}
            </div>
          </div>

          {/* Events: one line each, body on demand, dismiss per row. This is the
              part that used to be a wall of text. */}
          <div className="max-h-[45vh] overflow-y-auto px-1.5 pb-1.5">
            {alerts.length === 0 ? (
              <p className="px-2 py-3 text-[12px] text-ink-soft">{t("notify.empty")}</p>
            ) : (
              alerts.map((a) => {
                const sev = SEVERITY_STYLE[a.severity] ?? SEVERITY_STYLE.info!;
                const isOpen = expanded === a.id;
                return (
                  <div
                    key={a.id}
                    className={`group rounded-lg transition-colors hover:bg-ink/5 ${a.read_at ? "opacity-70" : ""}`}
                  >
                    {/* One line per alert: severity dot, title, age, chevron. The age
                        sits inline rather than under the title so eight events are
                        eight rows to skim, not sixteen lines to wade through. */}
                    <div className="flex items-center gap-1.5 px-2 py-1.5">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${sev.dot}`} aria-hidden="true" />
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : a.id)}
                        aria-expanded={isOpen}
                        className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                      >
                        <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink">
                          {a.title_bn}
                        </span>
                        <span className="shrink-0 font-mono-x text-[9.5px] whitespace-nowrap text-ink-soft">
                          {ageLabel(a.created_at, en)}
                        </span>
                        <ChevronDown
                          size={12}
                          className={`shrink-0 text-ink-soft transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => void dismiss(a.id)}
                        disabled={busy}
                        title={b("মুছে ফেলুন", "Dismiss")}
                        aria-label={`${a.title_bn} — ${b("মুছে ফেলুন", "Dismiss")}`}
                        className="shrink-0 rounded p-1 text-ink-soft opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:text-alizarin"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    {isOpen && (
                      <div className="px-2 pb-2 pl-[1.35rem]">
                        {a.body_bn ? (
                          <p className="text-[11.5px] leading-relaxed text-ink-soft">{a.body_bn}</p>
                        ) : null}
                        <div className="mt-1.5 flex items-center gap-3">
                          {a.href ? (
                            <Link
                              href={a.href}
                              onClick={() => setOpen(false)}
                              className="text-[11.5px] font-bold text-alizarin underline"
                            >
                              {b("খুলুন", "Open")}
                            </Link>
                          ) : null}
                          {!a.read_at ? (
                            <button
                              type="button"
                              onClick={() => void post({ id: a.id })}
                              disabled={busy}
                              className="text-[11.5px] text-ink-soft underline hover:text-ink"
                            >
                              {b("পড়া হয়েছে", "Mark read")}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <p className="border-t border-ink/10 px-3 py-1.5 font-mono-x text-[9.5px] text-ink-soft">
            {stale
              ? b("সংযোগ ফিরে এলে হালনাগাদ হবে", "Updates resume when the connection returns")
              : b(`${POLL_MS / 1000}s পরপর হালনাগাদ হয়`, `Refreshes every ${POLL_MS / 1000}s`)}
          </p>
        </div>
      )}
    </div>
  );
}
