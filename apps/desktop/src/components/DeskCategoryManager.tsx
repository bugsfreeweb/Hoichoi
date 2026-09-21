import { useCallback, useEffect, useState } from "react";
import { Check, FolderPlus, Pencil, RefreshCw, Tags, Trash2, X } from "lucide-react";
import { deskAddCategory, deskUpdateCategory, deskDeleteCategory, deskCategories, type DeskCategory } from "../lib/tauri";
import { getRunEnv } from "../lib/vault";
import { autoPush } from "../lib/autosync";

interface Form {
  slug: string;
  displayNameBn: string;
  displayNameEn: string;
  descriptionBn: string;
  descriptionEn: string;
  dot: string;
}

const EMPTY: Form = {
  slug: "",
  displayNameBn: "",
  displayNameEn: "",
  descriptionBn: "",
  descriptionEn: "",
  dot: "#d64541",
};

/** Category CRUD for the desk — mirrors the web admin's CategoryManager, dark console styling. */
export default function DeskCategoryManager() {
  const [categories, setCategories] = useState<DeskCategory[]>([]);
  const [form, setForm] = useState<Form>(EMPTY);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Form | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const flash = (type: "ok" | "err", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const refresh = useCallback(async () => {
    try {
      setCategories(await deskCategories(await getRunEnv()));
    } catch (e) {
      flash("err", String(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const resetForm = () => {
    setForm(EMPTY);
    setEditingSlug(null);
    setEditForm(null);
    setOpen(false);
  };

  const handleCreate = async () => {
    if (!form.slug.trim() || !form.displayNameBn.trim() || !form.displayNameEn.trim()) {
      flash("err", "স্লাগ, বাংলা নাম ও ইংরেজি নাম আবশ্যক");
      return;
    }
    setBusy(true);
    try {
      await deskAddCategory(await getRunEnv(), {
        slug: form.slug,
        displayNameBn: form.displayNameBn,
        displayNameEn: form.displayNameEn,
        descriptionBn: form.descriptionBn || undefined,
        descriptionEn: form.descriptionEn || undefined,
        dot: form.dot || undefined,
      });
      resetForm();
      await refresh();
      await autoPush();
      flash("ok", "বিভাগ তৈরি হয়েছে");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "তৈরি ব্যর্থ");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (cat: DeskCategory) => {
    setEditingSlug(cat.slug);
    setEditForm({
      slug: cat.slug,
      displayNameBn: cat.displayNameBn,
      displayNameEn: cat.displayNameEn,
      descriptionBn: cat.descriptionBn ?? "",
      descriptionEn: cat.descriptionEn ?? "",
      dot: cat.dot ?? "#d64541",
    });
  };

  const handleSave = async () => {
    if (!editingSlug || !editForm) return;
    setBusy(true);
    try {
      await deskUpdateCategory(await getRunEnv(), editingSlug, {
        displayNameBn: editForm.displayNameBn,
        displayNameEn: editForm.displayNameEn,
        descriptionBn: editForm.descriptionBn,
        descriptionEn: editForm.descriptionEn,
        dot: editForm.dot || undefined,
      });
      setEditingSlug(null);
      setEditForm(null);
      await refresh();
      await autoPush();
      flash("ok", "আপডেট হয়েছে");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "আপডেট ব্যর্থ");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (cat: DeskCategory) => {
    if (!window.confirm(`"${cat.displayNameBn}" বিভাগটি মুছতে চান? এটি ফিরে পাওয়া যাবে না।`)) return;
    setBusy(true);
    try {
      await deskDeleteCategory(await getRunEnv(), cat.slug);
      await refresh();
      await autoPush();
      flash("ok", "মুছে ফেলা হয়েছে");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "মুছতে ব্যর্থ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel mt-5">
      <p className="flex items-center gap-2 panel-title">
        <Tags size={14} className="text-lime" /> বিভাগ ব্যবস্থাপনা · category_configs
      </p>
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
        সাইটের বিভাগ তৈরি, সম্পাদনা ও মুছুন। ওয়াচলিস্টে সোর্স যোগ করার সময় এই তালিকা থেকেই
        বিভাগ বাছাই হবে; Web অ্যাডমিনের /admin/categories-এর সঙ্গে একই টেবিল।
      </p>

      {msg && (
        <p className={`mt-3 px-3 py-2 text-[12px] font-bold ${msg.type === "ok" ? "bg-lime text-night" : "bg-alizarin text-paper"}`}>
          {msg.type === "ok" ? "✓ " : "✕ "}
          {msg.text}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!open && !editingSlug && (
          <button className="btn" onClick={() => setOpen(true)}>
            <FolderPlus size={14} /> নতুন বিভাগ
          </button>
        )}
        <button className="btn-ghost" onClick={() => void refresh()}>
          <RefreshCw size={13} /> refresh
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3 rounded-xl border border-lime/30 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between">
            <p className="font-serif-bn text-[15px] font-bold text-white">নতুন বিভাগ</p>
            <button className="rounded p-1 text-white/50 hover:text-white" onClick={() => setOpen(false)}>
              <X size={14} />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">স্লাগ (ইংরেজি, ছোট হাতের)</span>
              <input
                className="field mt-1 w-full"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="e.g., viral-news"
              />
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">ডট রঙ (hex)</span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                  value={form.dot}
                  onChange={(e) => setForm({ ...form, dot: e.target.value })}
                />
                <span className="font-mono-x text-[10px] text-white/50">{form.dot}</span>
              </div>
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">বাংলা নাম</span>
              <input
                className="field mt-1 w-full"
                value={form.displayNameBn}
                onChange={(e) => setForm({ ...form, displayNameBn: e.target.value })}
                placeholder="ভাইরাল সংবাদ"
              />
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">ইংরেজি নাম</span>
              <input
                className="field mt-1 w-full"
                value={form.displayNameEn}
                onChange={(e) => setForm({ ...form, displayNameEn: e.target.value })}
                placeholder="Viral News"
              />
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">বর্ণনা (বাংলা)</span>
              <textarea
                className="field mt-1 h-16 w-full resize-none text-[12px]"
                value={form.descriptionBn}
                onChange={(e) => setForm({ ...form, descriptionBn: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">বর্ণনা (ইংরেজি)</span>
              <textarea
                className="field mt-1 h-16 w-full resize-none text-[12px]"
                value={form.descriptionEn}
                onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
              />
            </label>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button className="btn-ghost" onClick={() => setOpen(false)}>
              বাতিল
            </button>
            <button className="btn" disabled={busy} onClick={() => void handleCreate()}>
              <Check size={14} /> তৈরি করুন
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {categories.map((cat) => {
          const editing = editingSlug === cat.slug && editForm;
          return (
            <div key={cat.slug} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              {editing ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">বাংলা নাম</span>
                      <input
                        className="field mt-1 w-full"
                        value={editForm.displayNameBn}
                        onChange={(e) => setEditForm({ ...editForm, displayNameBn: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">ইংরেজি নাম</span>
                      <input
                        className="field mt-1 w-full"
                        value={editForm.displayNameEn}
                        onChange={(e) => setEditForm({ ...editForm, displayNameEn: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">বর্ণনা (বাংলা)</span>
                      <textarea
                        className="field mt-1 h-16 w-full resize-none text-[12px]"
                        value={editForm.descriptionBn}
                        onChange={(e) => setEditForm({ ...editForm, descriptionBn: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">বর্ণনা (ইংরেজি)</span>
                      <textarea
                        className="field mt-1 h-16 w-full resize-none text-[12px]"
                        value={editForm.descriptionEn}
                        onChange={(e) => setEditForm({ ...editForm, descriptionEn: e.target.value })}
                      />
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                      value={editForm.dot}
                      onChange={(e) => setEditForm({ ...editForm, dot: e.target.value })}
                    />
                    <span className="font-mono-x text-[10px] text-white/50">{editForm.dot}</span>
                    <span className="ml-auto font-mono-x text-[10px] text-ink-soft">স্লাগ: {cat.slug}</span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      className="btn-ghost"
                      onClick={() => {
                        setEditingSlug(null);
                        setEditForm(null);
                      }}
                    >
                      বাতিল
                    </button>
                    <button className="btn" disabled={busy} onClick={() => void handleSave()}>
                      <Check size={14} /> সংরক্ষণ
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[13px] font-black text-white" style={{ background: cat.dot }}>
                    {cat.displayNameBn.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-bold text-white">{cat.displayNameBn}</p>
                    <p className="font-mono-x text-[10px] text-white/40">
                      {cat.displayNameEn} · {cat.slug}
                    </p>
                    {(cat.descriptionBn || cat.descriptionEn) && (
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-white/45">
                        {cat.descriptionBn || cat.descriptionEn}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => startEdit(cat)}
                      disabled={busy}
                      className="rounded-lg p-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white"
                      title="সম্পাদনা"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => void handleDelete(cat)}
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

      {categories.length === 0 && !open && (
        <div className="py-10 text-center text-ink-soft">
          কোনো বিভাগ নেই। উপরের "নতুন বিভাগ" বোতামে ক্লিক করে প্রথমটি তৈরি করুন।
        </div>
      )}
    </div>
  );
}