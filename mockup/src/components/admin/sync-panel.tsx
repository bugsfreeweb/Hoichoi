"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowDownUp, ArrowUpToLine, Loader2, MonitorSmartphone, RefreshCw, Zap } from "lucide-react";
import { agoBn, toBn } from "@/lib/format";

type Counts = { published: number; pending: number; duplicate: number };
type Direction = "desktop-to-web" | "web-to-desktop";
type Action = Direction | "auto";
type SyncState = Partial<Record<Direction, string>>;

const SYNC_KEY = "hoichoi-sync-state";

/**
 * One-click resync between the desktop controller and the web app.
 *  • desktop → web: everything still pending on the desk is published live
 *  • web → desktop: the latest published articles are pulled back to the desk
 * The last sync per direction is remembered locally; the web view refreshes
 * after a successful desktop → web publish.
 */
export default function SyncPanel({ counts, driver }: { counts: Counts; driver: string }) {
  const router = useRouter();
  const [live, setLive] = useState<Counts>(counts);
  const [latestPublishedAt, setLatestPublishedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState<Action | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastSync, setLastSync] = useState<SyncState>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SYNC_KEY);
      if (raw) setLastSync(JSON.parse(raw) as SyncState);
    } catch {
      /* private mode */
    }
  }, []);

  // Keep the counts honest — the desk may publish while this tab is open.
  useEffect(() => {
    let alive = true;
    const pull = () =>
      fetch("/api/sync", { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => {
          if (alive && j?.ok && j.counts) {
            setLive(j.counts);
            if (typeof j.latestPublishedAt === "string") setLatestPublishedAt(j.latestPublishedAt);
          }
        })
        .catch(() => {});
    pull();
    const t = setInterval(pull, 20_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const remember = useCallback((direction: Direction) => {
    setLastSync((prev) => {
      const next = { ...prev, [direction]: new Date().toISOString() };
      try {
        localStorage.setItem(SYNC_KEY, JSON.stringify(next));
      } catch {
        /* private mode */
      }
      return next;
    });
  }, []);

  const run = useCallback(
    async (action: Action) => {
      if (busy) return;
      setBusy(action);
      setError("");
      setMessage("");
      try {
        const response = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ direction: action }),
        });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || "রিসিঙ্ক সম্পন্ন হয়নি।");
        if (data.counts) setLive(data.counts);
        if (typeof data.latestPublishedAt === "string") setLatestPublishedAt(data.latestPublishedAt);
        setMessage(data.message ?? "রিসিঙ্ক সম্পন্ন।");
        if (action !== "auto") remember(action);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "আবার চেষ্টা করুন।");
      } finally {
        setBusy(null);
      }
    },
    [busy, remember, router],
  );

  const chips: [string, number, string][] = [
    ["প্রকাশিত", live.published, "text-lime"],
    ["অপেক্ষমাণ", live.pending, "text-amberx"],
    ["ডুপ্লিকেট", live.duplicate, "text-white/45"],
  ];

  return (
    <div className="panel panel-hover rounded-2xl p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-lime/15 text-lime">
          <MonitorSmartphone size={17} />
        </span>
        <div>
          <p className="font-serif-bn text-[17px] font-bold text-white">ওয়েব ⇄ ডেস্কটপ রিসিঙ্ক</p>
          <p className="mt-0.5 text-[12px] text-white/50">
            ডেস্কটপে নতুন থাকলে এক ক্লিকে ওয়েবে প্রকাশ — ওয়েবের সর্বশেষ ডেস্কটপে নিন।
          </p>
        </div>
        <span className="ml-auto flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 font-mono-x text-[9px] tracking-[0.16em] text-white/45 uppercase">
          <RefreshCw size={10} /> {driver} · LIVE
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {chips.map(([label, value, color]) => (
          <span key={label} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11.5px] text-white/55">
            {label} <b className={`ml-1 font-mono-x text-[13px] ${color}`}>{toBn(value)}</b>
          </span>
        ))}
      </div>

      {live.pending > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-amberx/30 bg-amberx/10 px-3 py-2 text-[12.5px] text-amberx">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amberx opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amberx" />
          </span>
          ডেস্কে {toBn(live.pending)} টি অপেক্ষমাণ প্রতিবেদন — স্মার্ট রিসিঙ্ক এক ক্লিকে ওয়েবে প্রকাশ করবে।
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => run("auto")}
          disabled={busy !== null}
          className="flex items-center gap-2 rounded-lg bg-lime px-5 py-2.5 text-[12px] font-bold text-night shadow-[0_10px_28px_rgba(200,246,93,0.28)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
        >
          {busy === "auto" ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          স্মার্ট রিসিঙ্ক — এক ক্লিক
        </button>
        <button
          type="button"
          onClick={() => run("desktop-to-web")}
          disabled={busy !== null}
          className="flex items-center gap-2 rounded-lg bg-lime/15 px-4 py-2.5 text-[12px] font-bold text-lime transition-all hover:bg-lime/25 disabled:opacity-50"
        >
          {busy === "desktop-to-web" ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpToLine size={14} />}
          ডেস্ক → ওয়েব প্রকাশ
        </button>
        <button
          type="button"
          onClick={() => run("web-to-desktop")}
          disabled={busy !== null}
          className="flex items-center gap-2 rounded-lg border border-lime/40 px-4 py-2.5 text-[12px] font-bold text-lime transition-colors hover:bg-lime/10 disabled:opacity-50"
        >
          {busy === "web-to-desktop" ? <Loader2 size={14} className="animate-spin" /> : <ArrowDownToLine size={14} />}
          ওয়েব → ডেস্ক রিসিঙ্ক
        </button>
        <span className="font-mono-x text-[9.5px] tracking-[0.14em] text-white/35 uppercase">
          সর্বশেষ রিসিঙ্ক ·{" "}
          {lastSync["desktop-to-web"] ? `ডেস্ক→ওয়েব ${agoBn(lastSync["desktop-to-web"])}` : "—"}
          {lastSync["web-to-desktop"] ? ` · ওয়েব→ডেস্ক ${agoBn(lastSync["web-to-desktop"])}` : ""}
          {latestPublishedAt ? ` · ওয়েবের সর্বশেষ প্রকাশ ${agoBn(latestPublishedAt)}` : ""}
        </span>
      </div>

      {message && (
        <p role="status" className="mt-4 flex items-center gap-2 rounded-lg border border-lime/25 bg-lime/10 px-3 py-2 text-[12.5px] text-lime">
          <ArrowDownUp size={13} /> {message}
        </p>
      )}
      {error && <p role="alert" className="mt-4 text-[12.5px] text-rose-300">{error}</p>}
    </div>
  );
}

