"use client";

import { useRef, useState } from "react";
import type { CategoryMeta } from "@hoichoi/shared-types";

const Icons = {
  Plus: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
  ),
  Trash: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6M14 11v6"/></svg>
  ),
  Edit: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
  ),
  Grip: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/></svg>
  ),
  Close: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
  ),
};

interface NewCategoryForm {
  slug: string;
  displayNameBn: string;
  displayNameEn: string;
  descriptionBn: string;
  descriptionEn: string;
  dot: string;
  showInFooter: boolean;
}

export function CategoryManager({ initial }: { initial: CategoryMeta[] }) {
  const [categories, setCategories] = useState<CategoryMeta[]>(initial);
  const [form, setForm] = useState<NewCategoryForm>({
    slug: "",
    displayNameBn: "",
    displayNameEn: "",
    descriptionBn: "",
    descriptionEn: "",
    dot: "#d2202c",
    showInFooter: true,
  });
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<NewCategoryForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const flash = (type: "ok" | "err", text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 3500);
  };

  const openCreate = () => {
    setForm({ slug: "", displayNameBn: "", displayNameEn: "", descriptionBn: "", descriptionEn: "", dot: "#d2202c", showInFooter: true });
    dialogRef.current?.showModal();
  };

  const handleCreate = async () => {
    if (!form.slug || !form.displayNameBn || !form.displayNameEn) {
      flash("err", "স্লাগ, বাংলা নাম ও ইংরেজি নাম আবশ্যক");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      dialogRef.current?.close();
      setCategories(await refresh());
      flash("ok", "বিভাগ তৈরি হয়েছে");
    } catch (err) {
      flash("err", err instanceof Error ? err.message : "তৈরি ব্যর্থ");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (cat: CategoryMeta) => {
    setEditingSlug(cat.slug);
    setEditForm({
      slug: cat.slug,
      displayNameBn: cat.displayNameBn,
      displayNameEn: cat.displayNameEn,
      descriptionBn: cat.descriptionBn,
      descriptionEn: cat.descriptionEn,
      dot: cat.dot,
      showInFooter: cat.showInFooter,
    });
  };

  const handleSave = async () => {
    if (!editingSlug || !editForm) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/categories/${editingSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayNameBn: editForm.displayNameBn,
          displayNameEn: editForm.displayNameEn,
          descriptionBn: editForm.descriptionBn,
          descriptionEn: editForm.descriptionEn,
          dot: editForm.dot,
          showInFooter: editForm.showInFooter,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setEditingSlug(null);
      setEditForm(null);
      setCategories(await refresh());
      flash("ok", "আপডেট হয়েছে");
    } catch (err) {
      flash("err", err instanceof Error ? err.message : "আপডেট ব্যর্থ");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (cat: CategoryMeta) => {
    if (!window.confirm(`"${cat.displayNameBn}" বিভাগটি মুছতে চান? এটি ফিরে পাওয়া যাবে না।`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/categories/${cat.slug}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setCategories(await refresh());
      flash("ok", "মুছে ফেলা হয়েছে");
    } catch (err) {
      flash("err", err instanceof Error ? err.message : "মুছতে ব্যর্থ");
    } finally {
      setBusy(false);
    }
  };

  const refresh = async (): Promise<CategoryMeta[]> => {
    const res = await fetch("/api/admin/categories", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.categories ?? [];
  };

  return (
    <>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif-bn text-[28px] font-black text-ink">বিভাগ ব্যবস্থাপনা</h1>
          <p className="mt-1 text-ink-soft">সাইটের বিভাগগুলো তৈরি, সম্পাদনা ও সাজান। প্রতিটি বিভাগের আচরণ কনফিগার করুন।</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-alizarin px-5 py-2.5 text-[13px] font-bold text-paper hover:bg-alizarin-deep"
        >
          {Icons.Plus} নতুন বিভাগ
        </button>
      </div>

      {notice && (
        <div
          className={`mb-4 px-4 py-3 text-[13px] font-bold ${
            notice.type === "ok" ? "bg-lime text-night" : "bg-alizarin text-paper"
          }`}
        >
          {notice.text}
        </div>
      )}

      <dialog ref={dialogRef} className="modal">
        <form
          method="dialog"
          className="max-w-md space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
        >
          <h2 className="font-serif-bn text-[20px] font-bold">নতুন বিভাগ</h2>
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-ink-700">স্লাগ (ইংরেজি, ছোট হাতের অক্ষর)</span>
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                required
                className="mt-1 w-full rounded-lg border border-ink/30 bg-paper px-3 py-2 font-mono-x text-[13px] focus:border-alizarin focus:outline-none"
                placeholder="e.g., viral-news"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink-700">বাংলা নাম</span>
              <input
                value={form.displayNameBn}
                onChange={(e) => setForm({ ...form, displayNameBn: e.target.value })}
                required
                className="mt-1 w-full rounded-lg border border-ink/30 bg-paper px-3 py-2 text-[13px] focus:border-alizarin focus:outline-none"
                placeholder="ভাইরাল সংবাদ"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink-700">ইংরেজি নাম</span>
              <input
                value={form.displayNameEn}
                onChange={(e) => setForm({ ...form, displayNameEn: e.target.value })}
                required
                className="mt-1 w-full rounded-lg border border-ink/30 bg-paper px-3 py-2 font-mono-x text-[13px] focus:border-alizarin focus:outline-none"
                placeholder="Viral News"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink-700">বর্ণনা (বাংলা)</span>
              <textarea
                value={form.descriptionBn}
                onChange={(e) => setForm({ ...form, descriptionBn: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-lg border border-ink/30 bg-paper px-3 py-2 text-[13px] focus:border-alizarin focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink-700">বর্ণনা (ইংরেজি)</span>
              <textarea
                value={form.descriptionEn}
                onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-lg border border-ink/30 bg-paper px-3 py-2 text-[13px] focus:border-alizarin focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink-700">ডট রঙ (hex, উদাহরণ: #fbbf24)</span>
              <input
                value={form.dot}
                onChange={(e) => setForm({ ...form, dot: e.target.value })}
                className="mt-1 w-full rounded-lg border border-ink/30 bg-paper px-3 py-2 font-mono-x text-[13px] focus:border-alizarin focus:outline-none"
                placeholder="#fbbf24"
              />
            </label>
            <label className="flex items-center gap-2 text-[13px] font-medium text-ink-700">
              <input
                type="checkbox"
                checked={form.showInFooter}
                onChange={(e) => setForm({ ...form, showInFooter: e.target.checked })}
                className="h-4 w-4 accent-alizarin"
              />
              পাবলিক ফুটারে দেখান (footer nav)
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              className="border border-ink/30 px-4 py-2 text-[13px] font-bold hover:bg-ink hover:text-paper"
              onClick={() => dialogRef.current?.close()}
            >
              বাতিল
            </button>
            <button type="submit" disabled={busy} className="bg-alizarin px-5 py-2.5 text-[13px] font-bold text-paper hover:bg-alizarin-deep disabled:opacity-60">
              তৈরি করুন
            </button>
          </div>
        </form>
      </dialog>

      <div className="space-y-4">
        {categories.map((cat, i) => (
          <div key={cat.slug} className="rounded-xl border border-ink/20 bg-paper/50 p-5">
            <div className="flex items-center gap-3">
              <span className="font-mono-x text-[10px] text-ink-soft">{i + 1}</span>
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-white"
                style={{ background: cat.dot }}
              >
                {cat.slug.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                {editingSlug === cat.slug && editForm ? (
                  <>
                    <input
                      value={editForm.displayNameBn}
                      onChange={(e) => setEditForm({ ...editForm, displayNameBn: e.target.value })}
                      className="w-full rounded-lg border border-ink/30 bg-paper px-3 py-1.5 text-[14px] focus:border-alizarin"
                    />
                    <input
                      value={editForm.displayNameEn}
                      onChange={(e) => setEditForm({ ...editForm, displayNameEn: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-ink/30 bg-paper px-3 py-1.5 font-mono-x text-[13px] focus:border-alizarin"
                    />
                    <textarea
                      value={editForm.descriptionBn}
                      onChange={(e) => setEditForm({ ...editForm, descriptionBn: e.target.value })}
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-ink/30 bg-paper px-3 py-1.5 text-[13px] focus:border-alizarin"
                    />
                    <textarea
                      value={editForm.descriptionEn}
                      onChange={(e) => setEditForm({ ...editForm, descriptionEn: e.target.value })}
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-ink/30 bg-paper px-3 py-1.5 text-[13px] focus:border-alizarin"
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1.5 text-sm text-ink-700">
                        ডট রঙ:
                        <input
                          type="color"
                          value={editForm.dot}
                          onChange={(e) => setEditForm({ ...editForm, dot: e.target.value })}
                          className="h-8 w-8 cursor-pointer rounded border-0 p-0"
                        />
                      </label>
                      <label className="flex items-center gap-1.5 text-sm text-ink-700">
                        <input
                          type="checkbox"
                          checked={editForm.showInFooter}
                          onChange={(e) => setEditForm({ ...editForm, showInFooter: e.target.checked })}
                          className="h-4 w-4 accent-alizarin"
                        />
                        ফুটারে দেখান
                      </label>
                      <span className="font-mono-x text-[10px] text-ink-soft">স্লাগ: {cat.slug}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="font-serif-bn text-[18px] font-bold text-ink">{cat.displayNameBn}</p>
                    <p className="font-mono-x text-sm text-ink-soft">{cat.displayNameEn} · {cat.slug}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{cat.descriptionBn || cat.descriptionEn || "বর্ণনা নেই"}</p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {editingSlug === cat.slug ? (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={busy}
                      className="bg-alizarin px-4 py-1.5 text-[12px] font-bold text-paper hover:bg-alizarin-deep disabled:opacity-60"
                    >
                      সংরক্ষণ
                    </button>
                    <button
                      onClick={() => {
                        setEditingSlug(null);
                        setEditForm(null);
                      }}
                      className="border border-ink/30 px-4 py-1.5 text-[12px] font-bold hover:bg-ink hover:text-paper"
                    >
                      বাতিল
                    </button>
                  </>
                ) : (
                  <button onClick={() => startEdit(cat)} className="rounded-lg p-2 text-ink-soft hover:bg-ink/10" title="সম্পাদনা">
                    {Icons.Edit}
                  </button>
                )}
                <button
                  onClick={() => handleDelete(cat)}
                  disabled={busy}
                  className="rounded-lg p-2 text-alizarin hover:bg-alizarin/10"
                  title="মুছুন"
                >
                  {Icons.Trash}
                </button>
                {!editingSlug && (
                  <span className="p-2 text-ink-soft" title="কড়ে সাজান">{Icons.Grip}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="py-12 text-center text-ink-soft">
          কোনো বিভাগ নেই। উপরের বোতামে ক্লিক করে প্রথমটি তৈরি করুন।
        </div>
      )}
    </>
  );
}