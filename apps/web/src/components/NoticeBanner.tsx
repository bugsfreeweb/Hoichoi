"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Notice, NoticeTone } from "@hoichoi/shared-types";
import { Megaphone, X } from "lucide-react";

const TONE = {
  info: { bar: "bg-[#22d3ee]", text: "text-[#22d3ee]", label: "খবর" },
  success: { bar: "bg-[#c8f65d]", text: "text-[#c8f65d]", label: "সফল" },
  warn: { bar: "bg-[#ffb454]", text: "text-[#ffb454]", label: "সতর্কতা" },
  alert: { bar: "bg-[#ff6b6b]", text: "text-[#ff6b6b]", label: "জরুরি" },
} as const;

const DISMISS_KEY = "hoichoi.notice.dismissed";

function readDismissed(): Record<string, string> {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** স্পেশাল নোটিশ ব্যানার — পিন করা active নোটিশ (desktop/ওয়েব অ্যাডমিন থেকে)। */
export function NoticeBanner({ notice }: { notice: Notice | null }) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (!notice) {
      setHidden(true);
      return;
    }
    const dismissed = readDismissed();
    setHidden(dismissed[notice.id] === notice.updated_at);
  }, [notice]);

  if (!notice || hidden) return null;

  const tone = TONE[notice.tone as NoticeTone];
  const inner = (
    <div className="flex items-center gap-3">
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${tone.bar} text-[#0a0c10]`}>
        <Megaphone size={13} />
      </span>
      <span className={`hidden shrink-0 text-[10px] font-black uppercase tracking-[0.2em] sm:inline ${tone.text}`}>
        {tone.label}
      </span>
      <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-[#f3eee1]/90">
        {notice.body ? `${notice.title} — ${notice.body}` : notice.title}
      </span>
    </div>
  );

  return (
    <div className="relative bg-black/70">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: tone.bar }} />
      {notice.url ? (
        <Link href={notice.url} className="flex items-center gap-3 py-1.5 pl-4 pr-9 transition-opacity hover:opacity-80">
          {inner}
        </Link>
      ) : (
        <div className="flex items-center gap-3 py-1.5 pl-4 pr-9">{inner}</div>
      )}
      <button
        type="button"
        aria-label="নোটিশ বন্ধ করুন"
        onClick={() => {
          try {
            const d = readDismissed();
            d[notice.id] = notice.updated_at;
            localStorage.setItem(DISMISS_KEY, JSON.stringify(d));
          } catch {
            /* private mode */
          }
          setHidden(true);
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X size={13} />
      </button>
    </div>
  );
}