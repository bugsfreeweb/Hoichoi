"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Radio,
  ListOrdered,
  ScrollText,
  KeyRound,
  Settings,
  Megaphone,
  Minus,
  Square,
  X,
  Wifi,
  Database,
  GitBranch,
} from "lucide-react";
import ThemeToggle from "@/components/theme-toggle";
import DeskDashboard from "@/components/desk/dashboard";
import DeskSyncControls from "@/components/desk/sync-controls";
import Watchlist from "@/components/desk/watchlist";
import Collector from "@/components/desk/collector";
import SettingsPanel from "@/components/desk/settings-panel";
import AdsPanel from "@/components/admin/ads-panel";
import QueueTable from "@/components/admin/queue-table";
import KeyVault from "@/components/admin/key-vault";
import ModerationPanel from "@/components/admin/moderation-panel";
import { BRAND } from "@/lib/brand";
import { toBn } from "@/lib/format";
import type { ArticleLite, ApiKey, LogLite, RunLite, SourceLite } from "@/lib/data";

type Tab = "dashboard" | "watchlist" | "queue" | "collector" | "vault" | "settings" | "moderation" | "ads";
type Win = "normal" | "max" | "min";

const NAV: { id: Tab; label: string; icon: typeof LayoutDashboard; k: string }[] = [
  { id: "dashboard", label: "মনিটর", icon: LayoutDashboard, k: "1" },
  { id: "watchlist", label: "ওয়াচলিস্ট", icon: Radio, k: "2" },
  { id: "queue", label: "কনটেন্ট সারি", icon: ListOrdered, k: "3" },
  { id: "collector", label: "কালেক্টর", icon: ScrollText, k: "4" },
  { id: "vault", label: "API ভল্ট", icon: KeyRound, k: "5" },
  { id: "settings", label: "সেটিংস", icon: Settings, k: "6" },
  { id: "moderation", label: "মন্তব্য মডারেশন", icon: ListOrdered, k: "7" },
  { id: "ads", label: "বিজ্ঞাপন", icon: Megaphone, k: "8" },
];

export default function DeskShell({
  articles,
  runs,
  keys,
  sources,
  logs,
  dbDriver = "TURSO",
  commentCounts = { pending: 0, approved: 0, rejected: 0, spam: 0 },
}: {
  articles: ArticleLite[];
  runs: RunLite[];
  keys: ApiKey[];
  sources: SourceLite[];
  logs: LogLite[];
  dbDriver?: string;
  commentCounts?: { pending: number; approved: number; rejected: number; spam: number };
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [win, setWin] = useState<Win>("normal");
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("bn-BD", {
          timeZone: "Asia/Dhaka",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target instanceof HTMLElement && (e.target.closest("input, textarea, select, hoichoi-moderation") || e.target.isContentEditable))) return;
      const hit = NAV.find((n) => n.k === e.key);
      if (hit) setTab(hit.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const watching = sources.filter((s) => s.status === "watching").length;

  return (
    <div className="desk-scene relative flex min-h-[100dvh] items-center justify-center overflow-hidden p-3 md:p-6">
      {win === "min" && (
        <button
          onClick={() => setWin("normal")}
          className="dock-bounce absolute bottom-8 flex items-center gap-3 rounded-2xl border border-white/15 bg-black/50 px-4 py-3 text-white backdrop-blur-md"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.mark} alt="" className="h-10 w-10 rounded-xl object-cover" />
          <div className="text-left">
            <p className="font-serif-bn text-[15px] font-bold">{BRAND.desk}</p>
            <p className="font-mono-x text-[9px] tracking-[0.18em] text-white/45 uppercase">
              CLICK TO RESTORE
            </p>
          </div>
        </button>
      )}

      {win !== "min" && (
        <div
          className={`tauri-win flex flex-col overflow-hidden ${
            win === "max"
              ? "h-[calc(100dvh-24px)] w-[calc(100vw-24px)] rounded-xl"
              : "h-[min(900px,calc(100dvh-48px))] w-full max-w-[1440px] rounded-2xl"
          }`}
        >
          {/* titlebar */}
          <div className="titlebar flex h-10 shrink-0 items-center bg-[var(--ds-titlebar)] px-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/")}
                className="traffic bg-[#ff5f57]"
                title="বন্ধ · সাইটে ফিরুন"
              />
              <button
                onClick={() => setWin("min")}
                className="traffic bg-[#febc2e]"
                title="মিনিমাইজ"
              />
              <button
                onClick={() => setWin(win === "max" ? "normal" : "max")}
                className="traffic bg-[#28c840]"
                title="ম্যাক্সিমাইজ"
              />
            </div>
            <div className="flex flex-1 items-center justify-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={BRAND.mark} alt="" className="h-4 w-4 rounded-full object-cover" />
              <span className="font-serif-bn text-[12.5px] font-bold text-[var(--ds-t1)]">
                {BRAND.desk}
              </span>
              <span className="hidden font-mono-x text-[9px] tracking-[0.2em] text-[var(--ds-t5)] uppercase sm:inline">
                TAURI 2.1
              </span>
            </div>
            <div className="flex items-center gap-1 text-[var(--ds-t4)]">
              <ThemeToggle />
              <span className="mx-1 h-4 w-px bg-[var(--ds-bd-2)]" />
              <button onClick={() => setWin("min")} className="rounded p-1 hover:bg-[var(--ds-kb10)]">
                <Minus size={12} />
              </button>
              <button
                onClick={() => setWin(win === "max" ? "normal" : "max")}
                className="rounded p-1 hover:bg-[var(--ds-kb10)]"
              >
                <Square size={10} />
              </button>
              <Link href="/" className="rounded p-1 hover:bg-alizarin/80 hover:text-white">
                <X size={12} />
              </Link>
            </div>
          </div>

          {/* menubar */}
          <div className="flex h-8 shrink-0 items-center gap-1 border-b border-[var(--ds-bd)] bg-[var(--ds-menubar)] px-2 text-[11.5px] text-[var(--ds-t3)]">
            {[
              { l: "ফাইল", a: () => router.push("/") },
              { l: "সোর্স", a: () => setTab("watchlist") },
              { l: "রান", a: () => setTab("collector") },
              { l: "ভল্ট", a: () => setTab("vault") },
              { l: "সাহায্য", a: () => router.push("/system") },
            ].map((m) => (
              <button
                key={m.l}
                onClick={m.a}
                className="rounded px-2.5 py-1 hover:bg-[var(--ds-kb8)] hover:text-[var(--ds-t1)]"
              >
                {m.l}
              </button>
            ))}
            <span className="ml-auto hidden pr-2 font-mono-x text-[9.5px] tracking-[0.16em] text-[var(--ds-t5)] uppercase sm:inline">
              1–8 TABS
            </span>
          </div>

          {/* web ⇄ desktop resync bar */}
          <DeskSyncControls />

          <div className="flex min-h-0 flex-1">
            {/* sidebar */}
            <aside className="hidden w-52 shrink-0 flex-col border-r border-[var(--ds-bd)] bg-[var(--ds-side)] sm:flex">
              <nav className="flex-1 space-y-0.5 p-2">
                {NAV.map((n) => {
                  const active = tab === n.id;
                  return (
                    <button
                      key={n.id}
                      onClick={() => setTab(n.id)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium transition-colors ${
                        active
                          ? "bg-[var(--ds-active)] text-[var(--ds-active-tx)]"
                          : "text-[var(--ds-t3)] hover:bg-[var(--ds-kb8)] hover:text-[var(--ds-t1)]"
                      }`}
                    >
                      <n.icon size={14} />
                      <span className="flex-1 text-left">{n.label}</span>
                      <span
                        className={`font-mono-x text-[9px] ${
                          active ? "opacity-40" : "text-[var(--ds-t6)]"
                        }`}
                      >
                        {n.k}
                      </span>
                    </button>
                  );
                })}
              </nav>
              <div className="border-t border-[var(--ds-bd)] p-3">
                <p className="font-mono-x text-[9px] tracking-[0.18em] text-[var(--ds-acc)] uppercase">
                  ● CONTROLLER ONLINE
                </p>
                <p className="mt-1 text-[10.5px] text-[var(--ds-t4)]">
                  {toBn(watching)} সোর্স সক্রিয়
                </p>
              </div>
            </aside>

            {/* mobile tabs */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex gap-1 overflow-x-auto border-b border-[var(--ds-bd)] bg-[var(--ds-menubar)] px-2 py-1.5 sm:hidden">
                {NAV.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setTab(n.id)}
                    className={`shrink-0 rounded-full px-3 py-1 text-[11px] ${
                      tab === n.id
                        ? "bg-[var(--ds-active)] text-[var(--ds-active-tx)]"
                        : "text-[var(--ds-t4)]"
                    }`}
                  >
                    {n.label}
                  </button>
                ))}
              </div>

              <div className="min-h-0 flex-1 bg-[var(--ds-main)]">
                {tab === "dashboard" && (
                  <DeskDashboard
                    articles={articles}
                    runs={runs}
                    sources={sources}
                    logs={logs}
                    commentCounts={commentCounts}
                    onOpen={(t) => setTab(t as Tab)}
                  />
                )}
                {tab === "watchlist" && <Watchlist sources={sources} />}
                {tab === "queue" && (
                  <div className="scroll-slim h-full overflow-auto p-4">
                    <QueueTable rows={articles} />
                  </div>
                )}
                {tab === "collector" && <Collector logs={logs} />}
                {tab === "vault" && (
                  <div className="scroll-slim h-full overflow-auto p-4">
                    <KeyVault keys={keys} />
                  </div>
                )}
                {tab === "settings" && <SettingsPanel />}
                {tab === "moderation" && <div className="scroll-slim h-full overflow-auto p-4"><ModerationPanel origin="desktop" /></div>}
                {tab === "ads" && (
                  <div className="scroll-slim h-full overflow-auto p-4">
                    <AdsPanel />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* statusbar */}
          <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-[var(--ds-bd)] bg-[var(--ds-status)] px-3 font-mono-x text-[9.5px] tracking-[0.12em] text-[var(--ds-t4)] uppercase">
            <span className="flex items-center gap-1.5 text-[var(--ds-acc)]">
              <Wifi size={10} /> TAURI 2.1
            </span>
            <span className="flex items-center gap-1.5 text-[var(--ds-acc)]">
              <Database size={10} /> {dbDriver} · CONNECTED
            </span>
            <span className="flex items-center gap-1.5">
              <GitBranch size={10} /> HOICHOI-CONTENT
            </span>
            <span className="ml-auto">{clock} · ঢাকা</span>
          </footer>
        </div>
      )}
    </div>
  );
}