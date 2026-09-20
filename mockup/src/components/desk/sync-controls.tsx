"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowUpToLine, Loader2, Zap } from "lucide-react";
import { agoBn, toBn } from "@/lib/format";

type Direction = "desktop-to-web" | "web-to-desktop";
type Action = Direction | "auto";
type SyncState = Partial<Record<Direction, string>>;

const SYNC_KEY = "hoichoi-sync-state";

/**
 * Desk-side resync controls (slim bar under the menubar).
 *  • স্মার্ট রিসিঙ্ক: one click — desk still holding pending? publish to web,
 *    otherwise pull the latest back from the web.
 *  • explicit direction buttons kept for precise control.
 * Shares the same /api/sync endpoint and localStorage key as the web admin.
 */
export default function DeskSyncControls() {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [last, setLast] = useState<SyncState>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SYNC_KEY);
      if (raw) setLast(JSON.parse(raw) as SyncState);
    } catch {
      /* private mode */
    }
  }, []);

  const [pending, setPending] = useState(0);
  const [latestPublishedAt, setLatestPublishedAt] = useState<string | null>(null);

  // Keep the pending badge honest — new items may land while this bar is open.
  useEffect(() => {
    let alive = true;
    const pull = () =>
      fetch("/api/sync", { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => {
          if (!alive || !j?.ok) return;
          if (typeof j?.counts?.pending === "number") setPending(j.counts.pending);
          if (typeof j.latestPublishedAt === "string") setLatestPublishedAt(j.latestPublishedAt);
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
    setLast((prev) => {
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
      setNote("");
      try {
        const response = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ direction: action }),
        });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || "রিসিঙ্ক সম্পন্ন হয়নি।");
        setNote(data.message ?? "রিসিঙ্ক সম্পন্ন।");
        if (typeof data?.counts?.pending === "number") setPending(data.counts.pending);
        if (typeof data.latestPublishedAt === "string") setLatestPublishedAt(data.latestPublishedAt);
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

  return (
    <div className="flex h-9 shrink-0 items-center gap-3 border-b border-[var(--ds-bd)] bg-[var(--ds-menubar)] px-3">
      <span className="hidden font-mono-x text-[9px] tracking-[0.18em] text-[var(--ds-t5)] uppercase md:inline">
        SYNC · DESK ⇄ WEB
      </span>
      <button
        type="button"
        onClick={() => run("auto")}
        disabled={busy !== null}
        className={`relative flex items-center gap-1.5 rounded border px-3 py-1 text-[11px] font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${
          pending > 0
            ? "border-[var(--ds-acc)] bg-[var(--ds-acc)] text-[var(--ds-active-tx)] shadow-[0_6px_18px_color-mix(in_srgb,var(--ds-acc)_35%,transparent)] hover:brightness-110"
            : "border-[var(--ds-acc)]/40 bg-[var(--ds-acc-soft)] text-[var(--ds-acc)] hover:bg-[var(--ds-acc)] hover:text-[var(--ds-active-tx)]"
        }`}
      >
        {busy === "auto" ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
        স্মার্ট রিসিঙ্ক
        {pending > 0 && !busy && (
          <span className="ml-1 rounded bg-[var(--ds-main)] px-1.5 py-px font-mono-x text-[9px] text-[var(--ds-acc)]">
            {toBn(pending)}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => run("desktop-to-web")}
        disabled={busy !== null}
        className="flex items-center gap-1.5 rounded border border-[var(--ds-acc)]/40 bg-[var(--ds-acc-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--ds-acc)] transition-colors hover:bg-[var(--ds-acc)] hover:text-[var(--ds-active-tx)] disabled:opacity-50"
      >
        {busy === "desktop-to-web" ? <Loader2 size={11} className="animate-spin" /> : <ArrowUpToLine size={11} />}
        ডেস্ক → ওয়েব প্রকাশ
      </button>
      <button
        type="button"
        onClick={() => run("web-to-desktop")}
        disabled={busy !== null}
        className="flex items-center gap-1.5 rounded border border-[var(--ds-bd-15)] px-2.5 py-1 text-[11px] font-bold text-[var(--ds-t2)] transition-colors hover:bg-[var(--ds-kb10)] hover:text-[var(--ds-t1)] disabled:opacity-50"
      >
        {busy === "web-to-desktop" ? <Loader2 size={11} className="animate-spin" /> : <ArrowDownToLine size={11} />}
        ওয়েব → ডেস্ক
      </button>
      {note && <span className="truncate text-[11px] text-[var(--ds-acc)]">{note}</span>}
      {error && <span className="truncate text-[11px] text-[var(--ds-rose)]">{error}</span>}
      <span className="ml-auto hidden truncate font-mono-x text-[9px] tracking-[0.12em] text-[var(--ds-t6)] uppercase sm:inline">
        {last["desktop-to-web"] ? `ডেস্ক→ওয়েব ${agoBn(last["desktop-to-web"])}` : ""}
        {last["desktop-to-web"] && last["web-to-desktop"] ? " · " : ""}
        {last["web-to-desktop"] ? `ওয়েব→ডেস্ক ${agoBn(last["web-to-desktop"])}` : ""}
        {latestPublishedAt ? ` · ওয়েব সর্বশেষ ${agoBn(latestPublishedAt)}` : ""}
        {!last["desktop-to-web"] && !last["web-to-desktop"] && !latestPublishedAt ? "সর্বশেষ রিসিঙ্ক · —" : ""}
      </span>
    </div>
  );
}
