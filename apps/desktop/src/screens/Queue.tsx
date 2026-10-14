import { useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, Eye, ExternalLink, CircleCheck, Clock3, Ban, Pencil, Trash2, X, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { POST_STATUS_LABEL, bnTime, toBn } from "../lib/format";
import { categoryLabel, categoryTint, bySortOrder, type CatMeta } from "../lib/category-style";
import { deskCategories, deskQueueBulk, deskQueueGenerateImage, deskQueueMediaCandidates, deskQueueRemove, deskQueueSet, deskQueueUpdate, deskImageProviders, openAdmin, isTauri, type DeskCategory, type DeskMediaCandidate, type DeskProvider, type DeskQueueRow } from "../lib/tauri";
import { getRunEnv } from "../lib/vault";
import { toast } from "../lib/toast";
import { SITE_URL } from "../lib/site";

/** Same resolution rule as mediaUrl() in the web app, for the editor preview. */
function deskMediaSrc(p: string): string {
  return /^https?:\/\//i.test(p) ? p : `/uploads/${p.replace(/\\/g, "/")}`;
}

type Tab = "all" | "published" | "pending_review" | "approved" | "duplicate";

const TAB_LABEL: Record<string, string> = {
  all: "সব",
  published: "প্রকাশিত",
  pending_review: "রিভিউ অপেক্ষায়",
  approved: "দ্বিতীয় অনুমোদন",
  duplicate: "বাতিল / সরানো",
};

const STATUS_STYLE: Record<string, { bg: string; tx: string; icon: typeof CircleCheck; bn: string }> = {
  published: { bg: "bg-lime/15", tx: "text-lime", icon: CircleCheck, bn: "প্রকাশিত" },
  // `approved` is its own state: a category with requires_double_approval holds
  // a post here after the first sign-off. It used to fall through to the
  // pending_review style, so approving looked like nothing had changed.
  approved: { bg: "bg-sky-300/15", tx: "text-sky-300", icon: ShieldCheck, bn: "দ্বিতীয় অনুমোদনের অপেক্ষায়" },
  pending_review: { bg: "bg-amberx/15", tx: "text-amberx", icon: Clock3, bn: "রিভিউ অপেক্ষায়" },
  rejected: { bg: "bg-rose-500/12", tx: "text-rose-300", icon: Ban, bn: "বাতিল" },
  removed: { bg: "bg-white/8", tx: "text-white/50", icon: Ban, bn: "সরানো হয়েছে" },
};

function EditModal({
  row,
  onClose,
  onSaved,
}: {
  row: DeskQueueRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(row.title_bn);
  const [summary, setSummary] = useState(row.summary_bn ?? "");
  const [body, setBody] = useState(row.body_bn ?? "");
  const [category, setCategory] = useState(row.category);
  const [media, setMedia] = useState(row.media_path ?? "");
  const [candidates, setCandidates] = useState<DeskMediaCandidate[] | null>(null);
  const [cats, setCats] = useState<DeskCategory[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Manual AI image generation (used when the pipeline produced no image).
  const [genProviders, setGenProviders] = useState<DeskProvider[]>([]);
  const [genProvider, setGenProvider] = useState("");
  const [genPrompt, setGenPrompt] = useState("");
  const [genRatio, setGenRatio] = useState("16:9");
  const [genBusy, setGenBusy] = useState(false);
  const [genMsg, setGenMsg] = useState<string | null>(null);
  const [genErr, setGenErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const env = await getRunEnv();
        const r = await deskQueueMediaCandidates(env, row.id);
        if (live) setCandidates(r.candidates);
      } catch {
        // Candidates are an optional convenience; the manual URL field still works.
        if (live) setCandidates([]);
      }
    })();
    return () => {
      live = false;
    };
  }, [row.id]);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const env = await getRunEnv();
        if (live) setCats(await deskCategories(env));
      } catch {
        if (live) setErr("ক্যাটাগরি লোড ব্যর্থ।");
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const env = await getRunEnv();
        const list = await deskImageProviders(env);
        if (!live) return;
        setGenProviders(list);
        const usable = list.find((p) => Boolean(p.api_key) || Boolean(p.api_key_env_var));
        setGenProvider(usable?.id ?? list[0]?.id ?? "");
      } catch {
        /* generator is optional; the manual URL field still works */
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  async function generateImage() {
    setGenBusy(true);
    setGenErr(null);
    setGenMsg(null);
    try {
      const env = await getRunEnv();
      const r = await deskQueueGenerateImage(env, row.id, {
        prompt: genPrompt.trim() || undefined,
        providerId: genProvider || undefined,
        aspectRatio: genRatio || undefined,
        attach: true,
      });
      setMedia(r.media_path);
      setGenMsg(`✓ ছবি তৈরি হয়েছে (${r.provider} · ${r.model}) ও যুক্ত হয়েছে`);
    } catch (e) {
      setGenErr(e instanceof Error ? e.message : "ছবি তৈরি ব্যর্থ।");
    } finally {
      setGenBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const env = await getRunEnv();
      await deskQueueUpdate(env, row.id, {
        title: title.trim(),
        summary: summary.trim() === "" ? null : summary.trim(),
        body,
        category,
        // Sent every save so the image field and the text fields are one write.
        // Empty clears it.
        media: media.trim(),
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "সংরক্ষণ ব্যর্থ।");
    } finally {
      setSaving(false);
    }
  }

  const field =
    "mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12.5px] text-white/90 outline-none focus:border-amberx/50 placeholder:text-white/30";

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-night/70 p-4 backdrop-blur-sm">
      <form
        onSubmit={save}
        className="scroll-slim flex max-h-[92vh] w-full max-w-xl flex-col overflow-auto rounded-2xl border border-white/12 bg-panel p-5"
      >
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-bold text-white">পোস্ট সম্পাদনা</p>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/60 hover:text-white">
            <X size={13} />
          </button>
        </div>
        <label className="mt-4 block">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">শিরোনাম</span>
          <input required className={field} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="mt-3 block">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">সারাংশ (ফাঁকা = মুছবে)</span>
          <textarea rows={2} className={field} value={summary} onChange={(e) => setSummary(e.target.value)} />
        </label>
        <label className="mt-3 block">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">বিস্তারিত (body)</span>
          <textarea rows={8} className={`${field} font-sans-bn`} value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
        <label className="mt-3 block">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">বিভাগ</span>
          <select className={field} value={category} onChange={(e) => setCategory(e.target.value)}>
            {bySortOrder<CatMeta>(
              cats ?? [{ slug: row.category, displayNameBn: categoryLabel(row.category, cats) }],
            ).map((c) => (
              <option key={c.slug} value={c.slug} className="bg-panel text-white">
                {c.displayNameBn}
              </option>
            ))}
          </select>
        </label>
        {/*
          Image block. The URL field is authoritative (it is saved with the rest
          of the form); the candidate strip is a shortcut that fills that field.
          Dead fbcdn links are shown greyed out rather than hidden, so an
          operator can tell "the collector saw no image" apart from "every link
          it saw has expired".
        */}
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">ছবি</p>
          <div className="mt-2 flex gap-3">
            {media.trim() !== "" && (
              <img
                src={deskMediaSrc(media.trim())}
                alt=""
                className="h-24 w-auto max-w-[160px] shrink-0 rounded-lg border border-white/10 object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <input
                className={field}
                value={media}
                placeholder="https://… অথবা /uploads/… (ফাঁকা = ছবি নেই)"
                onChange={(e) => setMedia(e.target.value)}
              />
              {media.trim() !== "" && (
                <button
                  type="button"
                  onClick={() => setMedia("")}
                  className="mt-1.5 text-[11px] font-bold text-rose-300 underline"
                >
                  ছবি মুছে ফেলুন
                </button>
              )}
            </div>
          </div>
          {candidates === null && <p className="mt-2 text-[11px] text-white/35">ছবি খোঁজা হচ্ছে…</p>}
          {candidates !== null && candidates.length === 0 && (
            <p className="mt-2 text-[11px] text-white/35">
              সংগ্রাহক কোনো ছবি সংরক্ষণ করেনি — উপরে সরাসরি লিঙ্ক বসান।
            </p>
          )}
          {candidates !== null && candidates.length > 0 && (
            <div className="mt-2.5 grid grid-cols-4 gap-2">
              {candidates.map((c) => (
                <button
                  key={c.url}
                  type="button"
                  onClick={() => setMedia(c.url)}
                  title={c.ok ? c.url : `অনুপলব্ধ (HTTP ${c.status})`}
                  className="min-w-0"
                >
                  <img
                    src={c.url}
                    alt=""
                    loading="lazy"
                    className={`h-16 w-full rounded-md border object-cover ${
                      c.ok ? "border-white/15" : "border-rose-400/60 opacity-40"
                    }`}
                  />
                  <span className="mt-1 block truncate text-[9.5px] text-white/40">
                    {c.ok ? "এটি নিন" : "মরা লিঙ্ক"}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Manual AI image generation — the pipeline twin of the web panel. */}
          <div className="mt-3 border-t border-white/10 pt-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">✨ এআই দিয়ে ছবি তৈরি করুন</p>
              <span className="text-[9.5px] text-white/30">
                {genProviders.length === 0 ? "প্রোভাইডার নেই" : `${genProviders.length} প্রোভাইডার`}
              </span>
            </div>
            <textarea
              rows={2}
              className={`${field} mt-2`}
              value={genPrompt}
              placeholder="প্রম্পট (খালি = শিরোনাম/সারাংশ থেকে স্বয়ংক্রিয়)"
              onChange={(e) => setGenPrompt(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select className={`${field} mt-0 flex-1`} value={genProvider} onChange={(e) => setGenProvider(e.target.value)}>
                <option value="">স্বয়ংক্রিয় (ফ্রি আগে)</option>
                {genProviders.map((p) => (
                  <option key={p.id} value={p.id} className="bg-panel text-white">
                    {p.display_name} · {p.model_name}
                  </option>
                ))}
              </select>
              <select className={`${field} mt-0 w-24`} value={genRatio} onChange={(e) => setGenRatio(e.target.value)}>
                {["1:1", "16:9", "9:16", "4:3", "3:4", "3:2"].map((r) => (
                  <option key={r} value={r} className="bg-panel text-white">
                    {r}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void generateImage()}
                disabled={genBusy}
                className="flex items-center gap-1.5 rounded-lg bg-lime px-3 py-2 text-[11.5px] font-bold text-night transition-colors hover:bg-lime/85 disabled:opacity-50"
              >
                {genBusy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                {genBusy ? "তৈরি হচ্ছে…" : "তৈরি + যুক্ত"}
              </button>
            </div>
            {genMsg && <p className="mt-2 text-[11px] font-bold text-lime">{genMsg}</p>}
            {genErr && <p className="mt-2 text-[11px] text-rose-300">{genErr}</p>}
          </div>
        </div>
        {err && <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-300">{err}</p>}
        <div className="mt-5 flex items-center gap-2.5">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-lime px-4 py-2 text-[12px] font-bold text-night transition-colors hover:bg-lime/85 disabled:opacity-50"
          >
            ✓ সংরক্ষণ
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/12 px-4 py-2 text-[12px] font-semibold text-white/70 hover:text-white"
          >
            বাতিল
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Queue({
  rows,
  refresh,
  cats,
}: {
  rows: DeskQueueRow[];
  refresh: () => Promise<unknown> | void;
  cats?: DeskCategory[] | null;
}) {
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<DeskQueueRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focusIdx, setFocusIdx] = useState(0);
  const [bulk, setBulk] = useState<"approved" | "rejected" | "published" | "remove" | null>(null);
  const [bulkNote, setBulkNote] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function removeRow(r: DeskQueueRow) {
    if (!window.confirm(`"${r.title_bn}" পোস্টটি মুছে ফেলবেন? এটি ফেরানো যাবে না।`)) return;
    setBusyId(r.id);
    try {
      await deskQueueRemove(await getRunEnv(), r.id);
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function setStatus(r: DeskQueueRow, status: "approved" | "rejected" | "published") {
    setBusyId(r.id);
    try {
      await deskQueueSet(await getRunEnv(), r.id, status);
      await refresh();
    } catch {
      /* non-fatal */
    } finally {
      setBusyId(null);
    }
  }

  async function bulkAct(status: "approved" | "rejected" | "published" | "remove") {
    if (selected.size === 0) return;
    const ids = [...selected];
    const label =
      status === "approved"
        ? "অনুমোদন"
        : status === "published"
          ? "সরাসরি প্রকাশ"
          : status === "rejected"
            ? "বাতিল"
            : "মুছে ফেলা";
    if (
      !window.confirm(
        `${toBn(ids.length)}টি আইটেম ${label} করবেন? ${status === "remove" ? "এটি ফেরানো যাবে না।" : ""}`,
      )
    )
      return;
    setBulk(status);
    setBulkNote(null);
    setErr(null);
    // busy toasts have no TTL, so hold the id and close it explicitly in the
    // finally block — otherwise this spinner outlives the operation forever.
    const busyId = toast.busy(
      `${toBn(ids.length)}টি আইটেম ${label} হচ্ছে…`,
      "ডেটাবেসে লেখা হচ্ছে, একটু অপেক্ষা করুন",
    );
    try {
      const res = await deskQueueBulk(
        await getRunEnv(),
        ids,
        status === "remove" ? "remove" : status,
      );
      const done =
        status === "remove"
          ? (res.deleted?.length ?? 0)
          : status === "approved"
            ? res.published.length + res.needsSecondApproval.length
            : res.updated.length;
      const held = res.needsSecondApproval.length;
      const parts = [`${toBn(done)}টি আপডেট হয়েছে`];
      if (held > 0) {
        parts.push(
          `${toBn(held)}টি দ্বিতীয় অনুমোদনের অপেক্ষায় আছে (ক্যাটাগরি নিয়ম অনুযায়ী)`,
        );
      }
      if (res.missing.length > 0) parts.push(`${toBn(res.missing.length)}টি পাওয়া যায়নি`);
      setBulkNote(parts.join(" · "));
      if (status === "remove" && done > 0) setSelected(new Set());
      if (held > 0) {
        toast.info(
          `${toBn(held)}টি দ্বিতীয় অনুমোদনের অপেক্ষায়`,
          "এই ক্যাটাগরিতে দুই অনুমোদন প্রয়োজন — ★ বাল্ক প্রকাশ দিয়ে সরাসরি প্রকাশ করুন",
        );
      } else {
        toast.ok(
          `${toBn(done)}টি আইটেম ${label} সম্পন্ন`,
          res.missing.length > 0 ? `${toBn(res.missing.length)}টি পাওয়া যায়নি` : undefined,
        );
      }
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
      setBulkNote(null);
      toast.err("বাল্ক অ্যাকশন ব্যর্থ", msg);
    } finally {
      toast.dismiss(busyId);
      setBulk(null);
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (editing) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || t.closest("input, textarea, select"))) return;
      const list = shown;
      if (list.length === 0) return;
      const r = list[Math.min(focusIdx, list.length - 1)];
      if (!r) return;
      if (e.key === "j" || e.key === "J") {
        if (r.status !== "published") void setStatus(r, "approved");
      } else if (e.key === "k" || e.key === "K") {
        void setStatus(r, "rejected");
      } else if (e.key === "ArrowDown" || e.key === "s") {
        setFocusIdx((i) => Math.min(list.length - 1, i + 1));
      } else if (e.key === "ArrowUp" || e.key === "w") {
        setFocusIdx((i) => Math.max(0, i - 1));
      } else if (e.key === " ") {
        e.preventDefault();
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(r.id)) next.delete(r.id);
          else next.add(r.id);
          return next;
        });
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (e.key === "Backspace" && (e.metaKey || e.ctrlKey)) void removeRow(r);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q, tab, focusIdx, editing]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: rows.length,
      published: 0,
      pending_review: 0,
      approved: 0,
      duplicate: 0,
    };
    rows.forEach((r) => {
      if (r.status === "published") c.published++;
      else if (r.status === "pending_review") c.pending_review++;
      else if (r.status === "approved") c.approved++;
      else if (r.status === "rejected" || r.status === "removed") c.duplicate++;
    });
    return c;
  }, [rows]);

  const shown = rows.filter((r) => {
    const bucket =
      r.status === "published"
        ? "published"
        : r.status === "pending_review"
          ? "pending_review"
          : r.status === "approved"
            ? "approved"
            : "duplicate";
    const matchTab = tab === "all" || bucket === tab;
    const matchQ =
      q.trim() === "" ||
      r.title_bn.toLowerCase().includes(q.trim().toLowerCase()) ||
      r.source_name.toLowerCase().includes(q.trim().toLowerCase());
    return matchTab && matchQ;
  });

  const view = (r: DeskQueueRow) => {
    if (isTauri()) void openAdmin(`${SITE_URL}/news/${r.slug}`);
    else window.open(`${SITE_URL}/news/${r.slug}`, "_blank");
  };

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/8 px-5 py-4">
        <p className="font-serif-bn text-[17px] font-bold text-white">কনটেন্ট সারি</p>
        <span className="font-mono-x text-[10px] tracking-[0.2em] text-white/35 uppercase">
          CONTENT QUEUE · AUTO-FEED
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5">
            <Search size={12} className="text-white/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="শিরোনাম / সোর্স খুঁজুন…"
              className="w-44 bg-transparent text-[11.5px] text-white/85 outline-none placeholder:text-white/30"
            />
          </div>
          <button
            onClick={() => void refresh()}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/70 hover:border-lime/50 hover:text-lime"
            title="রিফ্রেশ"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-white/8 px-5 py-3">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3.5 py-1.5 text-[11.5px] font-medium transition-all duration-300 ${
              tab === t ? "bg-white text-night" : "text-white/50 hover:bg-white/8 hover:text-white"
            }`}
          >
            {TAB_LABEL[t]}{" "}
            <span className={`font-mono-x text-[9.5px] ${tab === t ? "text-night/60" : "text-white/35"}`}>
              {toBn(counts[t])}
            </span>
          </button>
        ))}
      </div>

      <div className="scroll-slim flex-1 overflow-auto">
        <table className="w-full min-w-[860px] text-left">
          <thead>
            <tr className="font-mono-x text-[9.5px] tracking-[0.18em] text-white/35 uppercase">
              <th className="w-10 px-2 py-3 font-medium">
                <input
                  type="checkbox"
                  className="accent-lime"
                  checked={shown.length > 0 && shown.every((r) => selected.has(r.id))}
                  onChange={(e) => setSelected(e.target.checked ? new Set(shown.map((r) => r.id)) : new Set())}
                />
              </th>
              <th className="px-5 py-3 font-medium"># আইটেম</th>
              <th className="px-3 py-3 font-medium">সোর্স</th>
              <th className="px-3 py-3 font-medium">সংগ্রহ</th>
              <th className="px-3 py-3 font-medium">হ্যাশ</th>
              <th className="px-3 py-3 font-medium">স্ট্যাটাস</th>
              <th className="px-5 py-3 text-right font-medium">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="grid-pop divide-y divide-white/6">
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center text-[12.5px] text-white/35">
                  কোনো আইটেম মিললো না — ফিল্টার বদলে দেখুন।
                </td>
              </tr>
            )}
            {shown.map((r, i) => {
              const s = STATUS_STYLE[r.status] ?? STATUS_STYLE.pending_review;
              const Icon = s.icon;
              return (
                <tr key={r.id} className={`group transition-colors duration-200 hover:bg-white/[0.035] ${i === focusIdx ? "bg-white/[0.04]" : ""}`}>
                  <td className="px-2 py-3.5">
                    <input
                      type="checkbox"
                      className="accent-lime"
                      checked={selected.has(r.id)}
                      onChange={() =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(r.id)) next.delete(r.id);
                          else next.add(r.id);
                          return next;
                        })
                      }
                    />
                  </td>
                  <td className="max-w-[340px] px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="font-mono-x text-[10px] text-white/30">
                        {toBn(r.id.slice(0, 4).toUpperCase())}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-medium text-white/90">{r.title_bn}</p>
                        <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2 py-0.5 text-[9.5px] text-white/55">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: categoryTint(r.category, cats) }}
                          />
                          {categoryLabel(r.category, cats)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-[11.5px] text-white/60">{r.source_name}</td>
                  <td className="px-3 py-3.5 font-mono-x text-[11px] text-white/60">
                    {bnTime(r.created_at)}
                  </td>
                  <td className="px-3 py-3.5 font-mono-x text-[10.5px] text-amberx/80">
                    {r.id.slice(0, 8)}
                  </td>
                  <td className="px-3 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${s.bg} ${s.tx}`}
                    >
                      <Icon size={10.5} />
                      {POST_STATUS_LABEL[r.status] ?? s.bn}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1.5 opacity-40 transition-opacity duration-200 group-hover:opacity-100">
                      {r.status === "published" && (
                        <button
                          onClick={() => view(r)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/70 transition-colors hover:border-lime/60 hover:text-lime"
                          title="দেখুন"
                        >
                          <Eye size={12} />
                        </button>
                      )}
                      <button
                        onClick={() => view(r)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/70 transition-colors hover:border-amberx/60 hover:text-amberx"
                        title="মূল পোস্ট"
                      >
                        <ExternalLink size={12} />
                      </button>
                      <button
                        onClick={() => setEditing(r)}
                        disabled={busyId !== null}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/70 transition-colors hover:border-lime/60 hover:text-lime disabled:opacity-40"
                        title="সম্পাদনা"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => void removeRow(r)}
                        disabled={busyId !== null}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/70 transition-colors hover:border-rose-400/70 hover:text-rose-300 disabled:opacity-40"
                        title="মুছুন"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-white/8 px-5 py-2">
        <label className="flex items-center gap-1.5 text-[10.5px] font-semibold text-white/45">
          <input
            type="checkbox"
            className="accent-lime"
            checked={shown.length > 0 && shown.every((r) => selected.has(r.id))}
            onChange={(e) => setSelected(e.target.checked ? new Set(shown.map((r) => r.id)) : new Set())}
          />
          সব নির্বাচন
        </label>
        <span className="font-mono-x text-[10px] text-white/35">{toBn(selected.size)} নির্বাচিত</span>

        {bulk && (
          <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-lime">
            <Loader2 size={11} className="animate-spin" />
            {toBn(selected.size)}টি প্রক্রিয়া হচ্ছে…
            <span className="h-1 w-24 overflow-hidden rounded-full bg-white/10">
              <span className="block h-full w-1/3 animate-pulse rounded-full bg-lime" />
            </span>
          </span>
        )}
        {bulkNote && !bulk && (
          <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-lime/80">
            <ShieldCheck size={11} />
            {bulkNote}
          </span>
        )}
        {err && <span className="text-[10.5px] font-semibold text-rose-300">✕ {err}</span>}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {selected.size > 0 && (
            <>
              <button
                onClick={() => void bulkAct("approved")}
                disabled={busyId !== null || bulk !== null}
                className="flex items-center gap-1 rounded-lg bg-lime px-3 py-1 text-[10.5px] font-bold text-night disabled:opacity-40"
              >
                {bulk === "approved" ? <Loader2 size={11} className="animate-spin" /> : null}✓ বাল্ক অনুমোদন
              </button>
              <button
                onClick={() => void bulkAct("published")}
                disabled={busyId !== null || bulk !== null}
                title="দ্বিতীয় অনুমোদন — সরাসরি প্রকাশ করুন"
                className="flex items-center gap-1 rounded-lg border border-lime/40 px-3 py-1 text-[10.5px] font-bold text-lime disabled:opacity-40"
              >
                {bulk === "published" ? <Loader2 size={11} className="animate-spin" /> : null}★ বাল্ক প্রকাশ
              </button>
              <button
                onClick={() => void bulkAct("rejected")}
                disabled={busyId !== null || bulk !== null}
                className="flex items-center gap-1 rounded-lg border border-rose-400/50 px-3 py-1 text-[10.5px] font-bold text-rose-300 disabled:opacity-40"
              >
                {bulk === "rejected" ? <Loader2 size={11} className="animate-spin" /> : null}✕ বাল্ক বাতিল
              </button>
              <button
                onClick={() => void bulkAct("remove")}
                disabled={busyId !== null || bulk !== null}
                className="flex items-center gap-1 rounded-lg bg-rose-500/80 px-3 py-1 text-[10.5px] font-bold text-white disabled:opacity-40"
              >
                {bulk === "remove" ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />} বাল্ক ডিলিট
              </button>
            </>
          )}
          <span className="font-mono-x text-[9.5px] text-white/30">j=অনুমোদন · k=বাতিল · space=নির্বাচন · ↑↓/w-s=চালনা</span>
        </div>
      </div>

      {editing && (
        <EditModal
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void refresh();
          }}
        />
      )}
    </div>
  );
}