import { useEffect, useState } from "react";
import { ShieldCheck, Check, Ban, RefreshCw, MessageSquareText, Loader2, Database } from "lucide-react";
import { toBn, bnTime } from "../lib/format";
import { deskModeration, deskModerationSet, type DeskComment } from "../lib/tauri";
import { getRunEnv, isCloudSync } from "../lib/vault";
import { toast } from "../lib/toast";

type Filter = "all" | "pending" | "approved" | "blocked";

const FILTER_BN: Record<Filter, string> = {
  all: "à¦¸à¦¬",
  pending: "à¦…à¦ªà§‡à¦•à§à¦·à¦®à¦¾à¦¨",
  approved: "à¦…à¦¨à§à¦®à§‹à¦¦à¦¿à¦¤",
  blocked: "à¦¬à§à¦²à¦•à¦¡",
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
  const [loading, setLoading] = useState(false);
  const [driver, setDriver] = useState<"cloud" | "local" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focusIdx, setFocusIdx] = useState(0);
  /** Counted progress for bulk actions; null when nothing is in flight. */
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  const load = async () => {
    setLoading(true);
    setMsg(null);
    setErr(null);
    try {
      const env = await getRunEnv();
      const cloud = await isCloudSync();
      setDriver(cloud ? "cloud" : "local");
      const comments = await deskModeration(env);
      setRows(comments);
      setSelected(new Set());
    } catch (e) {
      setErr(String(e));
      toast.err("à¦®à¦¨à§à¦¤à¦¬à§à¦¯ à¦²à§‹à¦¡ à¦¬à§à¦¯à¦°à§à¦¥", String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      // Auto-pull so new site comments surface without a manual refresh.
      void getRunEnv()
        .then((env) => deskModeration(env))
        .then((comments) => setRows(comments))
        .catch(() => {});
    }, 20000);
    return () => clearInterval(timer);
  }, []);

  const act = async (c: DeskComment, status: "approved" | "blocked") => {
    setBusy(c.id);
    setErr(null);
    try {
      await deskModerationSet(await getRunEnv(), c.id, status);
      setMsg(status === "approved" ? `à¦®à¦¨à§à¦¤à¦¬à§à¦¯à¦Ÿà¦¿ à¦…à¦¨à§à¦®à§‹à¦¦à¦¿à¦¤ à¦¹à¦¯à¦¼à§‡à¦›à§‡à¥¤` : `à¦®à¦¨à§à¦¤à¦¬à§à¦¯à¦Ÿà¦¿ à¦¬à§à¦²à¦• à¦¹à¦¯à¦¼à§‡à¦›à§‡à¥¤`);
      toast.ok(status === "approved" ? "à¦®à¦¨à§à¦¤à¦¬à§à¦¯ à¦…à¦¨à§à¦®à§‹à¦¦à¦¿à¦¤" : "à¦®à¦¨à§à¦¤à¦¬à§à¦¯ à¦¬à§à¦²à¦•", c.author);
      await load();
    } catch (e) {
      setErr(String(e));
      toast.err(status === "approved" ? "à¦…à¦¨à§à¦®à§‹à¦¦à¦¨ à¦¬à§à¦¯à¦°à§à¦¥" : "à¦¬à§à¦²à¦• à¦¬à§à¦¯à¦°à§à¦¥", String(e));
    } finally {
      setBusy(null);
    }
  };

  const bulkAct = async (status: "approved" | "blocked") => {
    if (selected.size === 0) return;
    if (!window.confirm(`${toBn(selected.size)}à¦Ÿà¦¿ à¦®à¦¨à§à¦¤à¦¬à§à¦¯ ${status === "approved" ? "à¦…à¦¨à§à¦®à§‹à¦¦à¦¨" : "à¦¬à§à¦²à¦•"} à¦•à¦°à¦¬à§‡à¦¨?`)) return;
    setBusy("bulk");
    setErr(null);
    setBulkProgress({ done: 0, total: selected.size });
    const verb = status === "approved" ? "à¦…à¦¨à§à¦®à§‹à¦¦à¦¨" : "à¦¬à§à¦²à¦•";
    // Each comment is a separate write, so a failure halfway through leaves a
    // partial result. Report exactly what landed rather than a blanket "failed"
    // that hides which items still need attention.
    let done = 0;
    const failed: string[] = [];
    try {
      const env = await getRunEnv();
      for (const id of selected) {
        try {
          await deskModerationSet(env, id, status);
          done++;
        } catch (e) {
          failed.push(String(e));
        }
        setBulkProgress({ done, total: selected.size });
      }
      const okCount = done;
      if (failed.length === 0) {
        setMsg(`${toBn(okCount)}à¦Ÿà¦¿ à¦®à¦¨à§à¦¤à¦¬à§à¦¯ ${verb} à¦¹à¦¯à¦¼à§‡à¦›à§‡à¥¤`);
        toast.ok(`à¦†à¦‡à¦Ÿà§‡à¦® ${toBn(okCount)}à¦Ÿà¦¿à¦° ${verb} à¦¸à¦®à§à¦ªà¦¨à§à¦¨`, "à¦®à¦¡à¦¾à¦°à§‡à¦¶à¦¨ à¦…à¦¬à¦¸à§à¦¥à¦¾ à¦¹à¦¾à¦²à¦¨à¦¾à¦—à¦¾à¦¦");
      } else {
        setErr(
          `${toBn(okCount)}à¦Ÿà¦¿ ${verb} à¦¹à¦¯à¦¼à§‡à¦›à§‡, ${toBn(failed.length)}à¦Ÿà¦¿ à¦¬à§à¦¯à¦°à§à¦¥à¥¤ à¦¬à¦¾à¦•à¦¿à¦—à§à¦²à§‹ à¦†à¦¬à¦¾à¦° à¦šà§‡à¦·à§à¦Ÿà¦¾ à¦•à¦°à§à¦¨à¥¤`,
        );
        toast.err(
          `à¦†à¦‚à¦¶à¦¿à¦• à¦¸à¦«à¦² â€” ${toBn(failed.length)}à¦Ÿà¦¿ à¦¬à§à¦¯à¦°à§à¦¥`,
          `${toBn(okCount)}à¦Ÿà¦¿ ${verb} à¦¹à¦¯à¦¼à§‡à¦›à§‡à¥¤`,
        );
      }
      await load();
    } catch (e) {
      setErr(String(e));
      toast.err("à¦¬à¦¾à¦²à§à¦• à¦…à§à¦¯à¦¾à¦•à¦¶à¦¨ à¦¬à§à¦¯à¦°à§à¦¥", String(e));
    } finally {
      setBulkProgress(null);
      setBusy(null);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || t.closest("input, textarea, select"))) return;
      const list = shown;
      if (list.length === 0) return;
      if (e.key === "j" || e.key === "J") {
        const c = list[Math.min(focusIdx, list.length - 1)];
        if (c && c.status !== "approved") void act(c, "approved");
      } else if (e.key === "k" || e.key === "K") {
        const c = list[Math.min(focusIdx, list.length - 1)];
        if (c && c.status !== "blocked") void act(c, "blocked");
      } else if (e.key === "ArrowDown" || e.key === "s") {
        setFocusIdx((i) => Math.min(list.length - 1, i + 1));
      } else if (e.key === "ArrowUp" || e.key === "w") {
        setFocusIdx((i) => Math.max(0, i - 1));
      } else if (e.key === " ") {
        e.preventDefault();
        const c = list[Math.min(focusIdx, list.length - 1)];
        if (!c) return;
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(c.id)) next.delete(c.id);
          else next.add(c.id);
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, focusIdx, filter]);

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
          à¦®à¦¨à§à¦¤à¦¬à§à¦¯ à¦®à¦¡à¦¾à¦°à§‡à¦¶à¦¨
        </p>
        <span className="font-mono-x text-[9.5px] tracking-[0.2em] text-white/35 uppercase">
          PENDING â†’ APPROVED Â· BLOCKED
        </span>
        <span
          className={`flex items-center gap-1 rounded-full px-2 py-1 font-mono-x text-[9.5px] ${
            driver === "cloud" ? "bg-lime/15 text-lime" : "bg-sky-400/12 text-sky-300"
          }`}
          title={driver === "cloud" ? "Turso à¦•à§à¦²à¦¾à¦‰à¦¡ DB â€” à¦¸à¦¾à¦‡à¦Ÿà§‡à¦° à¦¸à¦¾à¦¥à§‡ à¦¶à§‡à¦¯à¦¼à¦¾à¦°à¦¡" : "à¦²à§‹à¦•à¦¾à¦² file DB"}
        >
          <Database size={10} /> {driver === "cloud" ? "CLOUD SYNC" : "LOCAL DB"}
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
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/70 hover:border-lime/50 hover:text-lime disabled:opacity-50"
            title="à¦°à¦¿à¦«à§à¦°à§‡à¦¶"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          </button>
        </div>
      </div>

      {msg && (
        <div className="border-b border-white/8 bg-lime/10 px-5 py-2 text-[11.5px] font-semibold text-lime">
          âœ“ {msg}
        </div>
      )}
      {err && (
        <div className="border-b border-white/8 bg-rose-500/10 px-5 py-2 text-[11.5px] font-semibold text-rose-300">
          âœ• {err}
        </div>
      )}

      <div className="scroll-slim flex-1 overflow-auto">
        {shown.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <MessageSquareText size={28} className="text-white/25" />
            <p className="text-[12.5px] text-white/35">à¦•à§‹à¦¨à§‹ à¦®à¦¨à§à¦¤à¦¬à§à¦¯ à¦¨à§‡à¦‡ â€” à¦¨à¦¤à§à¦¨ à¦®à¦¨à§à¦¤à¦¬à§à¦¯ à¦“à¦¯à¦¼à§‡à¦¬ à¦¸à¦¾à¦‡à¦Ÿà§‡ à¦œà¦®à¦¾ à¦¹à¦²à§‡ à¦à¦–à¦¾à¦¨à§‡ à¦§à¦°à¦¾ à¦ªà¦¡à¦¼à¦¬à§‡à¥¤</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/8 px-5 py-2">
          <label className="flex items-center gap-1.5 text-[10.5px] font-semibold text-white/45">
            <input
              type="checkbox"
              className="accent-lime"
              checked={shown.length > 0 && shown.every((c) => selected.has(c.id))}
              onChange={(e) =>
                setSelected(
                  e.target.checked ? new Set(shown.map((c) => c.id)) : new Set(),
                )
              }
            />
            à¦¸à¦¬ à¦¨à¦¿à¦°à§à¦¬à¦¾à¦šà¦¨
          </label>
          <span className="font-mono-x text-[10px] text-white/35">{toBn(selected.size)} à¦¨à¦¿à¦°à§à¦¬à¦¾à¦šà¦¿à¦¤</span>
          <div className="ml-auto flex items-center gap-2">
            {bulkProgress && (
              <span className="flex items-center gap-1.5 font-mono-x text-[10px] text-lime">
                <Loader2 size={11} className="animate-spin" />
                {toBn(bulkProgress.done)}/{toBn(bulkProgress.total)}
              </span>
            )}
            {selected.size > 0 && (
              <>
                <button
                  onClick={() => void bulkAct("approved")}
                  disabled={busy !== null}
                  className="flex items-center gap-1 rounded-lg bg-lime px-3 py-1 text-[10.5px] font-bold text-night disabled:opacity-40"
                >
                  <Check size={11} /> à¦¬à¦¾à¦²à§à¦• à¦…à¦¨à§à¦®à§‹à¦¦à¦¨
                </button>
                <button
                  onClick={() => void bulkAct("blocked")}
                  disabled={busy !== null}
                  className="flex items-center gap-1 rounded-lg bg-rose-500/80 px-3 py-1 text-[10.5px] font-bold text-white disabled:opacity-40"
                >
                  <Ban size={11} /> à¦¬à¦¾à¦²à§à¦• à¦¬à§à¦²à¦•
                </button>
              </>
            )}
            <span className="font-mono-x text-[9.5px] text-white/30">j=à¦…à¦¨à§à¦®à§‹à¦¦à¦¨ Â· k=à¦¬à§à¦²à¦• Â· space=à¦¨à¦¿à¦°à§à¦¬à¦¾à¦šà¦¨ Â· â†‘â†“/w-s=à¦šà¦¾à¦²à¦¨à¦¾</span>
          </div>
        </div>

        <ul className="divide-y divide-white/6">
          {shown.map((c, i) => (
            <li
              key={c.id}
              className={`flex items-start gap-3 px-5 py-3.5 ${i === focusIdx ? "bg-white/[0.05]" : ""}`}
            >
              <input
                type="checkbox"
                className="mt-1 accent-lime"
                checked={selected.has(c.id)}
                onChange={() =>
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (next.has(c.id)) next.delete(c.id);
                    else next.add(c.id);
                    return next;
                  })
                }
                onClick={(e) => e.stopPropagation()}
              />
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
                    title="à¦…à¦¨à§à¦®à§‹à¦¦à¦¨"
                  >
                    <Check size={12} />
                  </button>
                )}
                {c.status !== "blocked" && (
                  <button
                    onClick={() => void act(c, "blocked")}
                    disabled={busy === c.id}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/60 transition-colors hover:border-rose-400/60 hover:text-rose-300 disabled:opacity-40"
                    title="à¦¬à§à¦²à¦•"
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