"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { POLL_MS, useQueueCounts } from "./queue-counts";

/**
 * Live queue badge in the header.
 *
 * There was no notification affordance at all: the sidebar's queue rows showed a
 * literal "?" and the header had nothing, so the only way to learn that work had
 * arrived was to open each queue. The counts and this dropdown read from the
 * shell's single poll, so they cannot drift apart.
 */

function toBn(v: number): string {
  return String(v).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d);
}

export function NotificationBell() {
  const { urgent, stale, refresh } = useQueueCounts();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

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

  const total = urgent.reduce((sum, i) => sum + i.count, 0);

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
        aria-label={`কিউ আপডেট${total > 0 ? ` (${toBn(total)}টি অপেক্ষমাণ)` : ""}`}
        aria-expanded={open}
        aria-controls="queue-bell-panel"
        className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 text-white/70 transition-colors hover:border-white/40 hover:text-white"
      >
        <Bell size={15} />
        {total > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-alizarin px-1 font-mono-x text-[9px] font-bold text-white">
            {total > 99 ? "৯৯+" : toBn(total)}
          </span>
        )}
        {stale && (
          <span
            className="absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full bg-amberx"
            title="সর্বশেষ হালনাগাদ করা যায়নি"
          />
        )}
      </button>

      {open && (
        <div
          id="queue-bell-panel"
          role="group"
          aria-label="কিউ আপডেট"
          className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-ink/20 bg-paper p-2 shadow-2xl text-ink"
        >
          <p className="px-2 py-1.5 font-mono-x text-[9.5px] tracking-[0.18em] text-ink-soft uppercase">
            কিউ আপডেট{stale ? " (অসাময়িক)" : ""}
          </p>
          {urgent.length === 0 && (
            <p className="px-2 py-3 text-[12px] text-ink-soft">
              {stale ? "সংযোগ ব্যর্থ — আপডেট আনা যায়নি।" : "কোনো তথ্য পাওয়া যায়নি।"}
            </p>
          )}
          {urgent.map((i) => (
            <Link
              key={i.key}
              href={i.href}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-ink/5"
            >
              <span className="text-[12.5px] font-semibold text-ink">{i.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 font-mono-x text-[10px] font-bold ${
                  i.count > 0 ? "bg-alizarin text-paper" : "bg-ink/10 text-ink-soft"
                }`}
              >
                {toBn(i.count)}
              </span>
            </Link>
          ))}
          <p className="border-t border-ink/10 px-2 pt-2 pb-1 font-mono-x text-[9.5px] text-ink-soft">
            {stale ? "সংযোগ ফিরে এলে হালনাগাদ হবে" : `${POLL_MS / 1000}s পরপর হালনাগাদ হয়`}
          </p>
        </div>
      )}
    </div>
  );
}
