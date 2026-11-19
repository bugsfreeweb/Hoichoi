import { useCallback, useEffect, useState } from "react";
import { Archive as ArchiveIcon, RotateCw, Trash2, TriangleAlert, Lock } from "lucide-react";
import { toBn, bnTime } from "../lib/format";
import {
  deskArchive,
  deskArchiveDelete,
  deskArchivePurge,
  type DeskArchivePayload,
} from "../lib/tauri";
import { getRunEnv, isCloudSync } from "../lib/vault";
import { toast } from "../lib/toast";

/**
 * The archive, on the desk.
 *
 * The web console has had this screen for a while; the desk did not, so an
 * operator working locally could see the seven-day window but had no way to
 * inspect what had left it, and no way to delete content past retention without
 * opening a browser. This is the same lifecycle, read from the same runner verbs
 * (`archive:list` / `archive:delete` / `archive:purge`) over the same database.
 *
 * Two blocks, in the order the lifecycle runs:
 *   1. **মেয়াদোত্তীর্ণ** — every post older than the retention setting, archived
 *      or not. A database that has never been rolled over shows up here, which is
 *      exactly how a site ends up serving two-month-old news without anyone
 *      noticing. One button deletes the lot; a legal hold and an active
 *      missing-children case are reported as kept, never silently swept.
 *   2. **আর্কাইভড** — the posts that already left the window, each with its own
 *      permanent-delete control.
 */
/**
 * The runner's refusal, said in the desk's language.
 *
 * The database layer raises a typed reason (`not_found`, `not_archived`,
 * `legal_hold`) and the CLI prints its English message; the screen is the place
 * that turns it into a sentence an operator can act on. An unrecognised error is
 * passed through untouched rather than hidden behind a generic line.
 */
function deleteRefusal(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/not found/i.test(raw)) return "পোস্টটি পাওয়া যায়নি।";
  if (/not archived/i.test(raw)) return "এই পোস্টটি আর্কাইভড নয় — স্থায়ীভাবে মোছা যাবে না।";
  if (/legal hold/i.test(raw)) return "এই পোস্টে legal hold আছে — মোছা যাবে না।";
  return raw;
}

export default function Archive() {
  const [data, setData] = useState<DeskArchivePayload | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [driver, setDriver] = useState<"cloud" | "local" | null>(null);

  const load = useCallback(async (target: number) => {
    setLoading(true);
    setErr(null);
    try {
      const env = await getRunEnv();
      setDriver((await isCloudSync()) ? "cloud" : "local");
      setData(await deskArchive(env, target));
      setPage(target);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "আর্কাইভ পড়া যায়নি");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  async function removeOne(row: { id: string; title_bn: string }) {
    if (!window.confirm(`"${row.title_bn.slice(0, 60)}" স্থায়ীভাবে মুছে ফেলা হবে। ফেরানো যাবে না।`)) return;
    setBusy(row.id);
    setErr(null);
    try {
      await deskArchiveDelete(await getRunEnv(), row.id);
      toast.ok("মুছে ফেলা হয়েছে");
      await load(page);
    } catch (e) {
      const msg = deleteRefusal(e);
      setErr(msg);
      toast.err(msg);
    } finally {
      setBusy(null);
    }
  }

  async function purgeExpired() {
    if (!data) return;
    if (
      !window.confirm(
        `${toBn(data.retentionDays)} দিনের বেশি পুরনো ${toBn(data.expiredCount)}টি পোস্ট স্থায়ীভাবে মুছে যাবে। legal hold ও সক্রিয় নিখোঁজ মামলা বাদ যাবে। নিশ্চিত?`,
      )
    )
      return;
    setBusy("purge");
    setErr(null);
    try {
      const res = await deskArchivePurge(await getRunEnv(), data.retentionDays);
      const kept = res.skippedLegalHold + res.skippedActiveCase;
      toast.ok(
        `${toBn(res.deleted)}টি মুছে ফেলা হয়েছে` +
          (kept ? ` · ${toBn(kept)}টি সুরক্ষায় রাখা হয়েছে` : ""),
      );
      await load(1);
    } catch (e) {
      const msg = deleteRefusal(e);
      setErr(msg);
      toast.err(msg);
    } finally {
      setBusy(null);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const dangerBtn =
    "flex items-center gap-1.5 rounded-lg border border-rose-500/40 px-3 py-1.5 text-[11px] font-semibold text-rose-300 transition hover:border-rose-400 hover:bg-rose-500/10 disabled:opacity-40";
  const ghostBtn =
    "flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/70 transition hover:border-lime/50 hover:text-lime disabled:opacity-50";

  return (
    <div className="scroll-slim flex flex-1 flex-col gap-3 overflow-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono-x text-[9.5px] tracking-[0.2em] text-white/35 uppercase">RETENTION</p>
          <h2 className="mt-1 flex items-center gap-2 font-serif-bn text-[17px] font-bold text-white">
            <ArchiveIcon size={16} aria-hidden className="text-white/50" /> আর্কাইভ
          </h2>
          <p className="mt-1 max-w-[62ch] text-[12.5px] leading-relaxed text-white/60">
            ওয়েবসাইটে কেবল {toBn(data?.visibleDays ?? 7)} দিনের পোস্ট দেখায়; তার পুরনো পোস্ট এখানে জমা হয়, আর{" "}
            {toBn(data?.retentionDays ?? 30)} দিনের বেশি পুরনো হলে স্থায়ীভাবে মুছে যায়।
            {driver && <span className="ml-2 text-white/35">· DB: {driver === "cloud" ? "Turso" : "লোকাল"}</span>}
          </p>
        </div>
        <button className={ghostBtn} onClick={() => void load(page)} disabled={loading}>
          <RotateCw size={14} className={loading ? "animate-spin" : ""} /> রিফ্রেশ
        </button>
      </div>

      {err && (
        <p className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[12px] font-semibold text-rose-200">
          <TriangleAlert size={14} /> {err}
        </p>
      )}

      <section className="rounded-xl border border-white/10 bg-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
          <h3 className="font-mono-x text-[10px] tracking-[0.16em] text-white/45 uppercase">
            মেয়াদোত্তীর্ণ · {toBn(data?.retentionDays ?? 30)} দিনের বেশি পুরনো · {toBn(data?.expiredCount ?? 0)}টি
          </h3>
          <button
            className={dangerBtn}
            onClick={() => void purgeExpired()}
            disabled={busy === "purge" || (data?.expiredCount ?? 0) === 0}
          >
            <Trash2 size={14} /> সবগুলো মুছুন
          </button>
        </div>
        {(data?.expired.length ?? 0) === 0 ? (
          <p className="px-3 py-5 text-center text-[12px] text-white/40">
            মেয়াদোত্তীর্ণ কিছু নেই — সব পোস্ট {toBn(data?.retentionDays ?? 30)} দিনের ভিতরে।
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {data!.expired.map((row) => (
              <li key={row.id} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-semibold text-white/85">{row.title_bn}</p>
                  <p className="font-mono-x text-[10px] text-white/40">
                    {toBn(row.age_days)} দিন · {row.category}
                    {row.archived_at ? " · আর্কাইভড" : " · এখনো লাইভ"}
                    {row.legal_hold ? " · legal hold" : ""}
                    {row.is_active_case ? " · সক্রিয় মামলা" : ""}
                  </p>
                </div>
                {row.legal_hold || row.is_active_case ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] font-semibold text-white/40">
                    <Lock size={11} /> সুরক্ষিত
                  </span>
                ) : (
                  <button
                    className={dangerBtn}
                    onClick={() => void removeOne(row)}
                    disabled={busy === row.id}
                  >
                    <Trash2 size={13} /> মুছুন
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
          <h3 className="font-mono-x text-[10px] tracking-[0.16em] text-white/45 uppercase">
            আর্কাইভড · {toBn(data?.total ?? 0)}টি
          </h3>
          <div className="flex items-center gap-2">
            <button className={ghostBtn} disabled={page <= 1 || loading} onClick={() => void load(page - 1)}>
              পূর্ববর্তী
            </button>
            <span className="font-mono-x text-[10.5px] text-white/40">
              {toBn(page)} / {toBn(totalPages)}
            </span>
            <button
              className={ghostBtn}
              disabled={page >= totalPages || loading}
              onClick={() => void load(page + 1)}
            >
              পরবর্তী
            </button>
          </div>
        </div>
        {(data?.rows.length ?? 0) === 0 ? (
          <p className="px-3 py-5 text-center text-[12px] text-white/40">
            আর্কাইভ খালি। উইন্ডো থেকে বের হওয়া পোস্ট স্বয়ংক্রিয়ভাবে এখানে আসবে।
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {data!.rows.map((row) => (
              <li key={row.id} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-semibold text-white/85">{row.title_bn}</p>
                  <p className="font-mono-x text-[10px] text-white/40">
                    {row.archived_at ? bnTime(row.archived_at) : "—"} · {row.archive_reason ?? "—"} · {row.category}
                  </p>
                </div>
                {row.legal_hold ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] font-semibold text-white/40">
                    <Lock size={11} /> legal hold
                  </span>
                ) : (
                  <button
                    className={dangerBtn}
                    onClick={() => void removeOne(row)}
                    disabled={busy === row.id}
                  >
                    <Trash2 size={13} /> স্থায়ীভাবে মুছুন
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
