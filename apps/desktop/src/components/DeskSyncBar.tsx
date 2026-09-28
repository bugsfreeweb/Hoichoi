import { useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpToLine, Loader2, Zap } from "lucide-react";
import { agoBn, toBn } from "../lib/format";
import { syncDb, type DeskQueueRow } from "../lib/tauri";
import { getCloudEnv, isCloudSync } from "../lib/vault";

type Direction = "push" | "pull";
type Action = Direction | "auto";

const SYNC_KEY = "hoichoi-sync-state";
const DIR_LABEL: Record<Direction, string> = { push: "ডেস্ক→ওয়েব", pull: "ওয়েব→ডেস্ক" };

/**
 * Desk-side resync bar (mockup parity) — wired to the real sync_db command:
 * push = local file DB → shared Turso; pull = shared Turso → local file DB.
 * Shares the mockup's localStorage key so last-sync times stick around.
 *
 * The sync always uses the vault's cloud credentials (`getCloudEnv`), never
 * `getRunEnv` — a manual resync is precisely the local-only → Turso hop, so
 * stripping the Turso URL/token here is what made "desk to web" fail.
 *
 * In cloud-sync mode the desktop writes straight to the shared DB, so the two
 * buttons are disabled: pushing the (unused) local file DB would clobber
 * production with a stale snapshot.
 */
export default function DeskSyncBar({
  queueRows,
  onSynced,
}: {
  queueRows: DeskQueueRow[];
  onSynced: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState<Action | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [last, setLast] = useState<Partial<Record<Direction, string>>>({});
  const [cloud, setCloud] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SYNC_KEY);
      if (raw) setLast(JSON.parse(raw) as Partial<Record<Direction, string>>);
    } catch {
      /* private mode */
    }
    void isCloudSync().then(setCloud, () => setCloud(false));
  }, []);

  const pending = queueRows.filter(
    (r) => r.status === "pending_review" || r.status === "approved",
  ).length;

  const remember = (d: Direction) => {
    const next = { ...last, [d]: new Date().toISOString() };
    setLast(next);
    try {
      localStorage.setItem(SYNC_KEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
  };

  const run = async (action: Action) => {
    if (busy) return;
    if (cloud) {
      setError("ক্লাউড মোড সক্রিয় — ডেস্ক সরাসরি ওয়েব ডেটাবেসেই লেখে, আলাদা সিঙ্ক লাগে না।");
      setNote("");
      return;
    }
    const dir: Direction = action === "auto" ? (pending > 0 ? "push" : "pull") : action;
    setBusy(action);
    setError("");
    setNote("");
    try {
      const res = await syncDb(dir, await getCloudEnv());
      const tables = res.tablesSynced ?? res.syncedTables ?? 0;
      const rows = res.rowsAffected ?? 0;
      setNote(
        `${DIR_LABEL[dir]} সম্পন্ন · ${toBn(tables)} টেবিল · ${toBn(rows)} রো${
          pending > 0 && dir === "push" ? ` · ${toBn(pending)} প্রকাশিত` : ""
        }`,
      );
      remember(dir);
      await onSynced();
    } catch (e) {
      setError(e instanceof Error ? e.message : "রিসিঙ্ক সম্পন্ন হয়নি।");
    } finally {
      setBusy(null);
    }
  };

  const chip = (count: number) => (
    <span className="ml-1 rounded bg-[var(--win)] px-1.5 py-px font-mono-x text-[9px] text-lime">
      {toBn(count)}
    </span>
  );

  const disabled = busy !== null || cloud;

  return (
    <div className="flex h-9 shrink-0 items-center gap-3 border-b border-white/8 bg-[var(--win-2)] px-3">
      <span className="hidden font-mono-x text-[9px] tracking-[0.18em] text-white/50 uppercase md:inline">
        SYNC · DESK ⇄ WEB
      </span>

      <button
        type="button"
        onClick={() => void run("auto")}
        disabled={disabled}
        title={cloud ? "ক্লাউড মোড সক্রিয়" : undefined}
        className={`relative flex items-center gap-1.5 rounded border px-3 py-1 text-[11px] font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${
          pending > 0
            ? "border-lime bg-lime text-night shadow-[0_6px_18px_rgba(200,246,93,0.25)] hover:brightness-110"
            : "border-lime/40 bg-lime/15 text-lime hover:border-lime hover:bg-lime hover:text-night"
        }`}
      >
        {busy === "auto" ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
        স্মার্ট রিসিঙ্ক
        {pending > 0 && !busy && chip(pending)}
      </button>

      <button
        type="button"
        onClick={() => void run("push")}
        disabled={disabled}
        title={cloud ? "ক্লাউড মোড সক্রিয়" : undefined}
        className="flex items-center gap-1.5 rounded border border-lime/40 bg-lime/15 px-2.5 py-1 text-[11px] font-bold text-lime transition-colors hover:border-lime hover:bg-lime hover:text-night disabled:opacity-50"
      >
        {busy === "push" ? <Loader2 size={11} className="animate-spin" /> : <ArrowUpToLine size={11} />}
        ডেস্ক → ওয়েব প্রকাশ
      </button>

      <button
        type="button"
        onClick={() => void run("pull")}
        disabled={disabled}
        title={cloud ? "ক্লাউড মোড সক্রিয়" : undefined}
        className="flex items-center gap-1.5 rounded border border-white/15 px-2.5 py-1 text-[11px] font-bold text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
      >
        {busy === "pull" ? <Loader2 size={11} className="animate-spin" /> : <ArrowDownToLine size={11} />}
        ওয়েব → ডেস্ক
      </button>

      {note && <span className="truncate text-[11px] text-lime">{note}</span>}
      {error && <span className="truncate text-[11px] text-rose-300">{error}</span>}

      <span className="ml-auto hidden truncate font-mono-x text-[9px] tracking-[0.12em] text-white/35 uppercase sm:inline">
        {cloud ? "CLOUD MODE · SHARED DB" : ""}
        {cloud && (last.push || last.pull) ? " · " : ""}
        {last.push ? `ডেস্ক→ওয়েব ${agoBn(last.push)}` : ""}
        {last.push && last.pull ? " · " : ""}
        {last.pull ? `ওয়েব→ডেস্ক ${agoBn(last.pull)}` : ""}
        {!cloud && !last.push && !last.pull ? "সর্বশেষ রিসিঙ্ক · —" : ""}
      </span>
    </div>
  );
}
