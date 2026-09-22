"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Notice } from "@hoichoi/shared-types";
import { Bell, Check, ExternalLink } from "lucide-react";

const TONE_DOT: Record<Notice["tone"], string> = {
  info: "#22d3ee",
  success: "#c8f65d",
  warn: "#ffb454",
  alert: "#ff6b6b",
};

const READ_KEY = "hoichoi.notice.read";

function readRead(): Record<string, string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function bnTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "এইমাত্র";
  if (diff < 3_600_000) {
    const m = Math.floor(diff / 60_000);
    return `${m} মিনিট আগে`;
  }
  if (diff < 86_400_000) {
    const h = Math.floor(diff / 3_600_000);
    return `${h} ঘণ্টা আগে`;
  }
  return d.toLocaleDateString("bn-BD", { day: "numeric", month: "short" });
}

/** নোটিফিকেশন ঘণ্টা — active notices (desktop ও web অ্যাডমিন থেকে আসা)। */
export function NotificationsBell() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notices", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { notices: Notice[] };
        setNotices(data.notices ?? []);
      }
    } catch {
      /* offline */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const unread = notices.filter((n) => {
    const read = readRead();
    return read[n.id] !== n.updated_at;
  }).length;

  const markAllRead = () => {
    try {
      const map: Record<string, string> = {};
      for (const n of notices) map[n.id] = n.updated_at;
      localStorage.setItem(READ_KEY, JSON.stringify(map));
      setOpen(false);
    } catch {
      /* private mode */
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="নোটিফিকেশন"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          if (!loaded) void refresh();
        }}
        className="relative flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70 transition-colors hover:border-white/40 hover:text-white"
      >
        <Bell size={14} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-alizarin px-1 text-[9px] font-black text-paper">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 w-[clamp(16rem,88vw,24rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#10141b] shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
            <p className="text-[11.5px] font-bold tracking-wide text-white/80 uppercase">নোটিফিকেশন</p>
            {notices.length > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-[10.5px] font-bold text-lime hover:underline"
              >
                <Check size={11} /> সব দেখা হয়েছে
              </button>
            )}
          </div>

          <div className="scroll-slim max-h-80 overflow-auto">
            {!loaded && <p className="px-4 py-8 text-center text-[12px] text-white/40">লোড হচ্ছে…</p>}
            {loaded && notices.length === 0 && (
              <p className="px-4 py-8 text-center text-[12px] text-white/40">কোনো নোটিফিকেশন নেই</p>
            )}
            {notices.map((n) => {
              const read = readRead();
              const isRead = read[n.id] === n.updated_at;
              const body = (
                <>
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/10" style={{ background: TONE_DOT[n.tone] }} />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[12.5px] font-bold ${isRead ? "text-white/55" : "text-white"}`}>{n.title}</span>
                    {n.body && <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-white/45">{n.body}</span>}
                    <span className="mt-1 block text-[9.5px] font-mono-x text-white/30 uppercase">{bnTime(n.updated_at)}</span>
                  </span>
                  {n.url && <ExternalLink size={11} className="shrink-0 text-white/30" />}
                </>
              );
              return n.url ? (
                <Link
                  key={n.id}
                  href={n.url}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-2.5 px-4 py-3 transition-colors hover:bg-white/[0.04]"
                >
                  {body}
                </Link>
              ) : (
                <div key={n.id} className="flex items-start gap-2.5 px-4 py-3 transition-colors hover:bg-white/[0.04]">
                  {body}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}