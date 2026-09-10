import { useEffect, useState } from "react";
import { ShieldCheck, Check, Ban, RefreshCw, MessageSquareText } from "lucide-react";
import { toBn, bnTime } from "../lib/format";
import { deskModeration, deskModerationSet, type DeskComment } from "../lib/tauri";
import { getRunEnv } from "../lib/vault";

type Filter = "all" | "pending" | "approved" | "blocked";

const FILTER_BN: Record<Filter, string> = {
  all: "সব",
  pending: "অপেক্ষমান",
  approved: "অনুমোদিত",
  blocked: "ব্লকড",
};

const STATUS_PILL: Record<string, string> = {
  pending: "bg-amberx/15 text-amberx",
  approved: "bg-lime/15 text-lime",
  blocked: "bg-rose-500/12 text-rose-300",
};

export default function Moderation() {
  const [rows, setRows] = useState<DeskComment[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    try {
      setMsg(null);
      setErr(null);
      setRows(await deskModeration(await getRunEnv()));
    } catch (e) {
      setErr(String(e));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const act = async (c: DeskComment, status: "approved" | "blocked") => {
    setBusy(c.id);
    setErr(null);
    try {
      await deskModerationSet(await getRunEnv(), c.id, status);
      setMsg(status === "approved" ? `মন্তব্যটি অনুমোদিত হয়েছে।` : `মন্তব্যটি ব্লক হয়েছে।`);
      await load();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(null);
    }
  };

  const counts: Record<Filter, number> = {
    all: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
    blocked: rows.filter((r) => r.status === "blocked").length,
  };
  const shown = rows.filter((r) => filter === "all" || r.status === filter);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/8 px-5 py-3.5">
        <p className="flex items-center gap-2 font-serif-bn text-[17px] font-bold text-white">
          <ShieldCheck size={16} className="text-lime" />
          মন্তব্য মডারেশন
        </p>
        <span className="font-mono-x text-[9.5px] tracking-[0.2em] text-white/35 uppercase">
          PENDING → APPROVED · BLOCKED
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {(Object.keys(FILTER_BN) as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-medium ${
                filter === f ? "bg-white text-night" : "text-white/50 hover:bg-white/8"
              }`}
            >
              {FILTER_BN[f]}{" "}
              <span className={`font-mono-x text-[9.5px] ${filter === f ? "text-night/60" : "text-white/35"}`}>
                {toBn(counts[f])}
              </span>
            </button>
          ))}
          <button
            onClick={() => void load()}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/70 hover:border-lime/50 hover:text-lime"
            title="রিফ্রেশ"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {msg && (
        <div className="border-b border-white/8 bg-lime/10 px-5 py-2 text-[11.5px] font-semibold text-lime">
          ✓ {msg}
        </div>
      )}
      {err && (
        <div className="border-b border-white/8 bg-rose-500/10 px-5 py-2 text-[11.5px] font-semibold text-rose-300">
          ✕ {err}
        </div>
      )}

      <div className="scroll-slim flex-1 overflow-auto">
        {shown.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <MessageSquareText size={28} className="text-white/25" />
            <p className="text-[12.5px] text-white/35">কোনো মন্তব্য নেই — নতুন মন্তব্য ওয়েব সাইটে জমা হলে এখানে ধরা পড়বে।</p>
          </div>
        )}
        <ul className="divide-y divide-white/6">
          {shown.map((c) => (
            <li key={c.id} className="flex items-start gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono-x text-[11px] font-bold text-white/80">{c.author}</span>
                  <span className="font-mono-x text-[10px] text-white/30">{bnTime(c.created_at)}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 font-mono-x text-[9px] font-semibold uppercase ${
                      STATUS_PILL[c.status] ?? "bg-white/10 text-white/50"
                    }`}
                  >
                    {c.status}
                  </span>
                  {c.postTitle && (
                    <span className="max-w-[260px] truncate text-[10.5px] text-white/40">{c.postTitle}</span>
                  )}
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-white/75">{c.body}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                {c.status !== "approved" && (
                  <button
                    onClick={() => void act(c, "approved")}
                    disabled={busy === c.id}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/60 transition-colors hover:border-lime/60 hover:text-lime disabled:opacity-40"
                    title="অনুমোদন"
                  >
                    <Check size={12} />
                  </button>
                )}
                {c.status !== "blocked" && (
                  <button
                    onClick={() => void act(c, "blocked")}
                    disabled={busy === c.id}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/60 transition-colors hover:border-rose-400/60 hover:text-rose-300 disabled:opacity-40"
                    title="ব্লক"
                  >
                    <Ban size={12} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}