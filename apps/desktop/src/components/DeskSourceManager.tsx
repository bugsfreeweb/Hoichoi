import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ExternalLink,
  FolderPlus,
  Pencil,
  Power,
  RefreshCw,
  Rss,
  Trash2,
  X,
} from "lucide-react";
import {
  deskSources,
  deskAddSource,
  deskUpdateSource,
  deskToggleSource,
  deskRemoveSource,
  deskCategories,
  openAdmin,
  isTauri,
  type DeskSource,
  type DeskCategory,
} from "../lib/tauri";
import { getRunEnv } from "../lib/vault";
import { autoPush } from "../lib/autosync";
import { bnTime, toBn } from "../lib/format";

interface Form {
  pageUrl: string;
  pageName: string;
  kind: "page" | "group";
  selected: string[];
  topics: string;
}

const EMPTY: Form = { pageUrl: "", pageName: "", kind: "page", selected: [], topics: "" };

/**
 * Source (Facebook page/group) manager for the desk Settings screen. Adding a
 * source here writes to the same `sources` + `source_categories` tables the
 * pipeline reads, so the next run scrapes it on both desktop and web.
 */
export default function DeskSourceManager() {
  const [sources, setSources] = useState<DeskSource[]>([]);
  const [categories, setCategories] = useState<DeskCategory[]>([]);
  const [form, setForm] = useState<Form>(EMPTY);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Form | null>(null);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.slug, c])), [categories]);

  const flash = (type: "ok" | "err", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const refresh = useCallback(async () => {
    try {
      const env = await getRunEnv();
      const [srcs, cats] = await Promise.all([deskSources(env), deskCategories(env)]);
      setSources(srcs);
      setCategories(cats);
    } catch (e) {
      flash("err", e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleCat = (slug: string) => {
    setForm((f) => ({
      ...f,
      selected: f.selected.includes(slug)
        ? f.selected.filter((s) => s !== slug)
        : [...f.selected, slug],
    }));
  };

  const toggleEditCat = (slug: string) => {
    setEditForm((f) =>
      f
        ? {
            ...f,
            selected: f.selected.includes(slug)
              ? f.selected.filter((s) => s !== slug)
              : [...f.selected, slug],
          }
        : f,
    );
  };

  const startEdit = (s: DeskSource) => {
    setEditingId(s.id);
    setEditForm({
      pageUrl: s.page_url,
      pageName: s.page_name,
      kind: s.kind,
      selected: s.categories?.length ? s.categories : s.category ? [s.category] : [],
      topics: (s.topics ?? []).join(", "),
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editForm) return;
    if (!editForm.pageUrl.trim() || !editForm.pageName.trim()) {
      flash("err", "পেজ URL ও নাম দুটোই দিতে হবে");
      return;
    }
    if (!/facebook\.com/i.test(editForm.pageUrl)) {
      flash("err", "URL টি facebook.com পেজ/গ্রুপের হতে হবে");
      return;
    }
    setBusy(true);
    try {
      await deskUpdateSource(await getRunEnv(), editingId, {
        pageUrl: editForm.pageUrl.trim(),
        pageName: editForm.pageName.trim(),
        kind: editForm.kind,
        categories: editForm.selected,
        topics: editForm.topics.trim() || undefined,
      });
      setEditingId(null);
      setEditForm(null);
      await refresh();
      await autoPush();
      flash("ok", "সোর্স হালনাগাদ হয়েছে");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "হালনাগাদ ব্যর্থ");
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async () => {
    if (!form.pageUrl.trim() || !form.pageName.trim()) {
      flash("err", "পেজ URL ও নাম দুটোই দিতে হবে");
      return;
    }
    if (!/facebook\.com/i.test(form.pageUrl)) {
      flash("err", "URL টি facebook.com পেজ/গ্রুপের হতে হবে");
      return;
    }
    setBusy(true);
    try {
      await deskAddSource(await getRunEnv(), {
        pageUrl: form.pageUrl.trim(),
        pageName: form.pageName.trim(),
        kind: form.kind,
        categories: form.selected,
        category: form.selected[0],
        topics: form.topics.trim() || undefined,
      });
      setForm(EMPTY);
      setOpen(false);
      await refresh();
      await autoPush();
      flash("ok", "সোর্স যোগ হয়েছে — পরের পাইপলাইন রানে এটিই প্রথমে স্ক্র্যাপ হবে");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "সোর্স যোগ ব্যর্থ");
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async (s: DeskSource) => {
    setBusy(true);
    try {
      await deskToggleSource(await getRunEnv(), s.id);
      await refresh();
      await autoPush();
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "টগল ব্যর্থ");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (s: DeskSource) => {
    if (!window.confirm(`"${s.page_name}" সোর্সটি মুছতে চান? এর raw পোস্টও মুছে যাবে।`)) return;
    setBusy(true);
    try {
      await deskRemoveSource(await getRunEnv(), s.id);
      await refresh();
      await autoPush();
      flash("ok", "সোর্স মুছে ফেলা হয়েছে");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "মুছতে ব্যর্থ");
    } finally {
      setBusy(false);
    }
  };

  const openUrl = (url: string) => {
    if (isTauri()) void openAdmin(url);
    else window.open(url, "_blank");
  };

  return (
    <div className="panel">
      <p className="flex items-center gap-2 panel-title">
        <Rss size={14} className="text-lime" /> সোর্স ব্যবস্থাপনা · sources
      </p>
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
        ফেসবুক পেজ/গ্রুপ যোগ করুন, বিভাগ বাছুন ও সক্রিয়/নিষ্ক্রিয় করুন। নতুন সোর্স পরের
        পাইপলাইন রানে সবার আগে স্ক্র্যাপ হয় এবং ডেস্কটপ ও ওয়েব — দুই জায়গাতেই কনটেন্ট দেখায়।
      </p>

      {msg && (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-[12px] font-bold ${
            msg.type === "ok" ? "bg-lime text-night" : "bg-alizarin text-paper"
          }`}
        >
          {msg.type === "ok" ? "✓ " : "✕ "}
          {msg.text}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!open && (
          <button className="btn" onClick={() => setOpen(true)}>
            <FolderPlus size={14} /> নতুন সোর্স
          </button>
        )}
        <button className="btn-ghost" onClick={() => void refresh()}>
          <RefreshCw size={13} /> refresh
        </button>
        <span className="ml-auto font-mono-x text-[10px] tracking-wide text-ink-soft uppercase">
          {toBn(sources.filter((s) => s.is_active).length)}/{toBn(sources.length)} সক্রিয়
        </span>
      </div>

      {open && (
        <div className="mt-4 space-y-3 rounded-xl border border-lime/30 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between">
            <p className="font-serif-bn text-[15px] font-bold text-white">নতুন সোর্স</p>
            <button className="rounded p-1 text-white/50 hover:text-white" onClick={() => setOpen(false)}>
              <X size={14} />
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">পেজ / গ্রুপ URL</span>
              <input
                className="field mt-1 w-full"
                value={form.pageUrl}
                onChange={(e) => setForm({ ...form, pageUrl: e.target.value })}
                placeholder="https://facebook.com/yourpage"
              />
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">নাম</span>
              <input
                className="field mt-1 w-full"
                value={form.pageName}
                onChange={(e) => setForm({ ...form, pageName: e.target.value })}
                placeholder="অপরাধ সচেতনতা পেজ"
              />
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">ধরন</span>
              <select
                className="field mt-1 w-full"
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value === "group" ? "group" : "page" })}
              >
                <option value="page">পেজ (page)</option>
                <option value="group">গ্রুপ (group)</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
                টপিক (কমা দিয়ে, ঐচ্ছিক)
              </span>
              <input
                className="field mt-1 w-full"
                value={form.topics}
                onChange={(e) => setForm({ ...form, topics: e.target.value })}
                placeholder="অপরাধ, উদ্ধার"
              />
            </label>
          </div>

          <div>
            <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">বিভাগ (একাধিক বাছাই করা যাবে)</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {categories.length === 0 && (
                <span className="text-[11px] text-ink-soft">কোনো বিভাগ নেই — আগে "বিভাগ" ট্যাবে তৈরি করুন।</span>
              )}
              {categories.map((c) => {
                const on = form.selected.includes(c.slug);
                return (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => toggleCat(c.slug)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                      on ? "border-lime/60 bg-lime/15 text-lime" : "border-white/12 text-white/60 hover:border-white/35 hover:text-white"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: c.dot }} />
                    {c.displayNameBn}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button className="btn-ghost" onClick={() => setOpen(false)}>
              বাতিল
            </button>
            <button className="btn" disabled={busy} onClick={() => void handleCreate()}>
              <Check size={14} /> যোগ করুন
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {sources.map((s) => {
          const editing = editingId === s.id && editForm;
          const cats = [...new Set((s.categories?.length ? s.categories : [s.category]).filter(Boolean))];
          return (
            <div key={s.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              {editing ? (
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">পেজ / গ্রুপ URL</span>
                      <input
                        className="field mt-1 w-full"
                        value={editForm.pageUrl}
                        onChange={(e) => setEditForm({ ...editForm, pageUrl: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">নাম</span>
                      <input
                        className="field mt-1 w-full"
                        value={editForm.pageName}
                        onChange={(e) => setEditForm({ ...editForm, pageName: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">ধরন</span>
                      <select
                        className="field mt-1 w-full"
                        value={editForm.kind}
                        onChange={(e) => setEditForm({ ...editForm, kind: e.target.value === "group" ? "group" : "page" })}
                      >
                        <option value="page">পেজ (page)</option>
                        <option value="group">গ্রুপ (group)</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">টপিক (কমা দিয়ে)</span>
                      <input
                        className="field mt-1 w-full"
                        value={editForm.topics}
                        onChange={(e) => setEditForm({ ...editForm, topics: e.target.value })}
                      />
                    </label>
                  </div>
                  <div>
                    <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">বিভাগ</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {categories.map((c) => {
                        const on = editForm.selected.includes(c.slug);
                        return (
                          <button
                            key={c.slug}
                            type="button"
                            onClick={() => toggleEditCat(c.slug)}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                              on ? "border-lime/60 bg-lime/15 text-lime" : "border-white/12 text-white/60 hover:border-white/35 hover:text-white"
                            }`}
                          >
                            <span className="h-2 w-2 rounded-full" style={{ background: c.dot }} />
                            {c.displayNameBn}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      className="btn-ghost"
                      onClick={() => {
                        setEditingId(null);
                        setEditForm(null);
                      }}
                    >
                      বাতিল
                    </button>
                    <button className="btn" disabled={busy} onClick={() => void handleSaveEdit()}>
                      <Check size={14} /> সংরক্ষণ
                    </button>
                  </div>
                </div>
              ) : (
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[9px] font-bold uppercase ${
                    s.is_active ? "border-lime/30 bg-lime/12 text-lime" : "border-white/10 bg-white/[0.05] text-white/40"
                  }`}
                >
                  {s.kind === "group" ? "GR" : "PG"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-bold text-white">{s.page_name}</p>
                  <button
                    onClick={() => openUrl(s.page_url)}
                    className="mt-0.5 flex max-w-full items-center gap-1 font-mono-x text-[10px] text-white/40 hover:text-lime"
                    title="মূল সোর্স খুলুন"
                  >
                    <ExternalLink size={10} className="shrink-0" />
                    <span className="truncate">{s.page_url}</span>
                  </button>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {cats.map((slug) => {
                      const c = catMap.get(slug);
                      return (
                        <span
                          key={slug}
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2 py-0.5 text-[9.5px] text-white/60"
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: c?.dot ?? "#fbbf24" }} />
                          {c?.displayNameBn ?? slug}
                        </span>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono-x text-[10px] text-white/40">
                    <span>আজ: {toBn(s.posts_today)}</span>
                    <span>হেলথ: {toBn(s.health)}%</span>
                    <span>স্ক্র্যাপ: {s.last_scraped_at ? bnTime(s.last_scraped_at) : "কখনো নয়"}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-center gap-1.5">
                  <button
                    onClick={() => startEdit(s)}
                    disabled={busy}
                    className="rounded-lg p-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white"
                    title="সম্পাদনা"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => void handleToggle(s)}
                    disabled={busy}
                    className={`rounded-lg p-2 transition-colors ${
                      s.is_active ? "text-lime hover:bg-lime/12" : "text-white/45 hover:bg-white/10 hover:text-white"
                    }`}
                    title={s.is_active ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}
                  >
                    <Power size={13} />
                  </button>
                  <button
                    onClick={() => void handleRemove(s)}
                    disabled={busy}
                    className="rounded-lg p-2 text-alizarin transition-colors hover:bg-alizarin/12"
                    title="মুছুন"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              )}
            </div>
          );
        })}
      </div>

      {sources.length === 0 && !open && (
        <div className="py-10 text-center text-ink-soft">
          কোনো সোর্স নেই। উপরের "নতুন সোর্স" বোতামে ক্লিক করে প্রথম পেজটি যোগ করুন।
        </div>
      )}
    </div>
  );
}
