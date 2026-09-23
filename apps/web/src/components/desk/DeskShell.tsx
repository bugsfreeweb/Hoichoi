"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import DeskSources from "@/components/desk/DeskSources";
import type { Post, CommentWithPost } from "@hoichoi/shared-types";
import type { RecentPipelineRun } from "@hoichoi/db";

function toBn(v: number | string): string {
  return String(v).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d);
}

function bnTime(d: string) {
  return new Intl.DateTimeFormat("bn-BD", {
    timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(new Date(d));
}

function bnFull(d: string) {
  return new Intl.DateTimeFormat("bn-BD", {
    timeZone: "Asia/Dhaka", day: "numeric", month: "long", year: "numeric",
  }).format(new Date(d));
}

function runDur(r: RecentPipelineRun): number | null {
  if (!r.finished_at) return null;
  return Math.max(0, Math.round((new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 1000));
}

function durText(sec: number | null): string {
  if (sec === null || sec <= 0) return "—";
  return `${toBn(Math.floor(sec / 60))} মি ${toBn(String(sec % 60).padStart(2, "0"))} সে`;
}

function rs(r: RecentPipelineRun) {
  const s = (r.stats ?? {}) as Record<string, unknown>;
  return { collected: Number(s.collected ?? s.scraped ?? 0), duplicates: Number(s.duplicatesBlocked ?? 0), published: Number(s.published ?? 0) };
}

type Tab = "dashboard" | "watchlist" | "queue" | "collector" | "vault" | "settings" | "moderation" | "ads";

const NAV: { id: Tab; label: string; k: string }[] = [
  { id: "dashboard", label: "মনিটর", k: "1" },
  { id: "watchlist", label: "ওয়াচলিস্ট", k: "2" },
  { id: "queue", label: "কনটেন্ট সারি", k: "3" },
  { id: "collector", label: "কালেক্টর", k: "4" },
  { id: "vault", label: "API ভল্ট", k: "5" },
  { id: "settings", label: "সেটিংস", k: "6" },
  { id: "moderation", label: "মডারেশন", k: "7" },
  { id: "ads", label: "বিজ্ঞাপন", k: "8" },
];

const TAB_ICONS: Record<Tab, React.ReactNode> = {
  dashboard: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>,
  watchlist: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>,
  queue: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>,
  collector: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>,
  vault: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  settings: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
  moderation: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  ads: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>,
};

export default function DeskShell({
  stats,
  runs,
  comments,
  posts,
  sourcesCount,
}: {
  stats: { collectedToday: number; published: number; duplicatesBlocked: number; avgRunDurationSec: number; pendingReview: number };
  runs: RecentPipelineRun[];
  comments: CommentWithPost[];
  posts: Post[];
  sourcesCount: number;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("bn-BD", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target instanceof HTMLElement && (e.target.closest("input, textarea") || e.target.isContentEditable))) return;
      const hit = NAV.find((n) => n.k === e.key);
      if (hit) setTab(hit.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const lastRun = runs[0] ?? null;
  const avgDur = stats.avgRunDurationSec;
  const avgDurText = avgDur > 0 ? `${Math.floor(avgDur / 60).toLocaleString("bn")} মি ${String(avgDur % 60).padStart(2, "0")} সে` : "—";
  const lastCollected = lastRun ? rs(lastRun).collected : 0;

  const modCounts = { pending: 0, approved: 0, blocked: 0 };
  comments.forEach((c) => { modCounts[c.status as keyof typeof modCounts]++; });

  return (
    <div className="desk-scene flex min-h-[100dvh] items-center justify-center overflow-hidden p-1 md:p-4">
      <div className="tauri-win flex h-[min(900px,calc(100dvh-32px))] w-full max-w-[1440px] flex-col overflow-hidden rounded-xl">

        {/* ── titlebar ── */}
        <div className="titlebar flex h-10 shrink-0 items-center bg-[var(--ds-titlebar)] px-3">
          <div className="flex items-center gap-2">
            <Link href="/" className="traffic bg-[#ff5f57]" title="সাইটে ফিরুন" />
            <span className="traffic bg-[#febc2e]" title="মিনিমাইজ" />
            <span className="traffic bg-[#28c840]" title="ম্যাক্সিমাইজ" />
          </div>
          <div className="flex flex-1 items-center justify-center gap-2">
            <img src="/logo.png" alt="" className="h-4 w-4 rounded-full object-cover" />
            <span className="font-serif-bn text-[12.5px] font-bold text-[var(--ds-t1)]">হৈচৈ ডেস্ক</span>
            <span className="hidden font-mono-x text-[9px] tracking-[0.2em] text-[var(--ds-t5)] uppercase sm:inline">TAURI WEB VIEW</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--ds-t4)]">
            <ThemeToggle />
            <span className="font-mono-x text-[10px] text-[var(--ds-t5)]">{clock}</span>
          </div>
        </div>

        {/* ── menubar ── */}
        <div className="flex h-8 shrink-0 items-center gap-1 border-b border-[var(--ds-bd)] bg-[var(--ds-menubar)] px-2 text-[11.5px] text-[var(--ds-t3)]">
          {[
            { l: "ফাইল", a: () => router.push("/") },
            { l: "সোর্স", a: () => setTab("watchlist") },
            { l: "রান", a: () => setTab("collector") },
            { l: "ভল্ট", a: () => setTab("vault") },
            { l: "সাহায্য", a: () => router.push("/system") },
          ].map((m) => (
            <button key={m.l} onClick={m.a} className="rounded px-2.5 py-1 hover:bg-[var(--ds-kb8)] hover:text-[var(--ds-t1)]">{m.l}</button>
          ))}
          <span className="ml-auto hidden pr-2 font-mono-x text-[9.5px] tracking-[0.16em] text-[var(--ds-t5)] uppercase sm:inline">1–8 TABS</span>
        </div>

        {/* ── sync bar ── */}
        <div className="flex h-7 shrink-0 items-center gap-3 border-b border-[var(--ds-bd)] bg-[var(--ds-menubar)] px-3 font-mono-x text-[9px] tracking-[0.16em] text-[var(--ds-t5)] uppercase">
          <span className="flex items-center gap-1.5 text-lime"><span className="h-1.5 w-1.5 rounded-full bg-lime" /> WEB VIEW · TURSO · CONNECTED</span>
          <span className="hidden sm:inline">ISR 300s · EDGE CACHE ON</span>
          <span className="ml-auto text-[var(--ds-acc)]">DESKTOP APP IS PRIMARY</span>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* ── sidebar ── */}
          <aside className="hidden w-52 shrink-0 flex-col border-r border-[var(--ds-bd)] bg-[var(--ds-side)] sm:flex">
            <nav className="flex-1 space-y-0.5 p-2">
              {NAV.map((n) => {
                const active = tab === n.id;
                return (
                  <button key={n.id} onClick={() => setTab(n.id)} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium transition-colors ${active ? "bg-[var(--ds-active)] text-[var(--ds-active-tx)]" : "text-[var(--ds-t3)] hover:bg-[var(--ds-kb8)] hover:text-[var(--ds-t1)]"}`}>
                    {TAB_ICONS[n.id]}
                    <span className="flex-1 text-left">{n.label}</span>
                    <span className={`font-mono-x text-[9px] ${active ? "opacity-40" : "text-[var(--ds-t6)]"}`}>{n.k}</span>
                  </button>
                );
              })}
            </nav>
            <div className="border-t border-[var(--ds-bd)] p-3">
              <p className="font-mono-x text-[9px] tracking-[0.18em] text-lime uppercase">● CONTROLLER ONLINE</p>
              <p className="mt-1 text-[10.5px] text-[var(--ds-t4)]">{toBn(sourcesCount)} সোর্স সক্রিয়</p>
            </div>
          </aside>

          {/* ── content ── */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* mobile tabs */}
            <div className="flex gap-1 overflow-x-auto border-b border-[var(--ds-bd)] bg-[var(--ds-menubar)] px-2 py-1.5 sm:hidden">
              {NAV.map((n) => (
                <button key={n.id} onClick={() => setTab(n.id)} className={`shrink-0 rounded-full px-3 py-1 text-[11px] ${tab === n.id ? "bg-[var(--ds-active)] text-[var(--ds-active-tx)]" : "text-[var(--ds-t4)]"}`}>{n.label}</button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-[var(--ds-main)] p-4">
              {tab === "dashboard" && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      { label: "আজ সংগৃহীত", value: toBn(stats.collectedToday), sub: `সর্বশেষ রানে +${toBn(lastCollected)}`, bar: "bg-lime" },
                      { label: "প্রকাশিত (লাইভ)", value: toBn(stats.published), sub: "AI Agent → Web সিঙ্কড", bar: "bg-sky-400" },
                      { label: "ডুপ্লিকেট ব্লকড", value: toBn(stats.duplicatesBlocked), sub: "SHA-256 + SimHash মিল", bar: "bg-amberx" },
                      { label: "গড় রান সময়", value: avgDurText, sub: "কালেক্ট → কমিট → ডিপ্লয়", bar: "bg-rose-400" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl border border-[var(--ds-bd)] bg-[var(--ds-card)] p-4">
                        <p className="text-[11px] text-[var(--ds-t4)]">{s.label}</p>
                        <p className="mt-2 font-serif-bn text-[24px] leading-none font-black text-[var(--ds-t1)]">{s.value}</p>
                        <div className="mt-3 flex items-center gap-2">
                          <span className={`h-1 w-5 rounded-full ${s.bar}`} />
                          <span className="font-mono-x text-[9px] text-[var(--ds-t5)]">{s.sub}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* runs mini-log */}
                  <div className="rounded-xl border border-[var(--ds-bd)] bg-[var(--ds-card)]">
                    <div className="flex items-center gap-2 border-b border-[var(--ds-bd)] px-4 py-3">
                      <p className="font-serif-bn text-[14px] font-bold text-[var(--ds-t1)]">সাম্প্রতিক রান</p>
                      <span className="ml-auto font-mono-x text-[9px] text-[var(--ds-t5)] uppercase">{bnFull(new Date().toISOString())}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px] text-left">
                        <thead>
                          <tr className="font-mono-x text-[9px] tracking-[0.14em] text-[var(--ds-t5)] uppercase">
                            <th className="px-4 py-2 font-medium">সময়</th>
                            <th className="px-3 py-2 font-medium">সংগৃহীত</th>
                            <th className="px-3 py-2 font-medium">ডুপ</th>
                            <th className="px-3 py-2 font-medium">প্রকাশিত</th>
                            <th className="px-3 py-2 font-medium">সময়কাল</th>
                            <th className="px-4 py-2 text-right font-medium">স্ট্যাটাস</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--ds-bd)]">
                          {runs.slice(0, 6).map((r) => {
                            const s = rs(r); const dur = runDur(r);
                            return (
                              <tr key={r.id} className="text-[11px] hover:bg-[var(--ds-kb8)]">
                                <td className="px-4 py-2 text-[var(--ds-t2)]">{bnTime(r.started_at)}</td>
                                <td className="px-3 py-2 text-[var(--ds-t2)]">{toBn(s.collected)}</td>
                                <td className="px-3 py-2 text-amberx">{toBn(s.duplicates)}</td>
                                <td className="px-3 py-2 text-lime">{toBn(s.published)}</td>
                                <td className="px-3 py-2 text-[var(--ds-t4)]">{dur !== null ? durText(dur) : "…"}</td>
                                <td className="px-4 py-2 text-right"><span className={`rounded-full border px-2 py-0.5 font-mono-x text-[8.5px] ${r.status === "completed" ? "border-lime/30 text-lime" : "border-amberx/30 text-amberx"}`}>{r.status}</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* mod summary */}
                  <div className="rounded-xl border border-[var(--ds-bd)] bg-[var(--ds-card)] p-4">
                    <p className="font-serif-bn text-[14px] font-bold text-[var(--ds-t1)]">মন্তব্য মডারেশন</p>
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      {([["অপেক্ষমান", modCounts.pending, "text-amberx"], ["অনুমোদিত", modCounts.approved, "text-lime"], ["প্রত্যাখ্যাত", modCounts.blocked, "text-rose-300"]] as const).map(([l, v, c]) => (
                        <div key={l} className="rounded-lg border border-[var(--ds-bd)] p-3">
                          <p className="text-[10px] text-[var(--ds-t5)]">{l}</p>
                          <p className={`mt-1 font-serif-bn text-[20px] font-black ${c}`}>{toBn(v)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === "watchlist" && <DeskSources />}
              {tab === "queue" && <Placeholder title="কনটেন্ট সারি" desc={`${toBn(posts.length)} আইটেম — সম্পূর্ণ সারি ওয়েব অ্যাডমিনে দেখুন।`} />}
              {tab === "collector" && <Placeholder title="কালেক্টর" desc="স্ক্র্যাপার লগ ও রান হিস্ট্রি — ডেস্কটপে ফুল অ্যাক্সেস।" />}
              {tab === "vault" && <Placeholder title="API ভল্ট" desc="কী ম্যানেজমেন্ট — এনক্রিপশন ডেস্কটপ এনভায়রনমেন্টে।" />}
              {tab === "settings" && <Placeholder title="সেটিংস" desc="অটোমেশন ও ডেস্কটপ কনফিগ — ডেস্কটপ অ্যাপে।" />}
              {tab === "moderation" && <Placeholder title="মডারেশন" desc="মন্তব্য মডারেশন — ওয়েব অ্যাডমিনে সম্পূর্ণ সারি।" />}
              {tab === "ads" && <Placeholder title="বিজ্ঞাপন" desc="বিজ্ঞাপন প্যানেল — ওয়েব অ্যাডমিনে দেখুন।" />}
            </div>
          </div>
        </div>

        {/* ── statusbar ── */}
        <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-[var(--ds-bd)] bg-[var(--ds-status)] px-3 font-mono-x text-[9.5px] tracking-[0.12em] text-[var(--ds-t4)] uppercase">
          <span className="flex items-center gap-1.5 text-lime">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" x2="12.01" y1="20" y2="20"/></svg>
            WEB
          </span>
          <span className="flex items-center gap-1.5 text-lime">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
            TURSO · CONNECTED
          </span>
          <span className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"/><path d="M8 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M21 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M6 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="m6 15 12-6"/><path d="m6 9 12 6"/></svg>
            HOICHOI-CONTENT
          </span>
          <span className="ml-auto">{clock} · ঢাকা</span>
        </footer>
      </div>
    </div>
  );
}

function Placeholder({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="font-serif-bn text-[22px] font-bold text-[var(--ds-t1)]">{title}</p>
      <p className="mt-2 max-w-sm text-[13px] text-[var(--ds-t4)]">{desc}</p>
      <p className="mt-4 font-mono-x text-[10px] tracking-[0.18em] text-[var(--ds-t5)] uppercase">DESKTOP APP IS PRIMARY · THIS IS A WEB PREVIEW</p>
    </div>
  );
}