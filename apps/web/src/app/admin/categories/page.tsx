import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Trash2, Edit2, GripVertical, ArrowUpDown } from "lucide-react";
import { getSettings, listCategories, createCategory, updateCategory, deleteCategory } from "@hoichoi/db";
import { requireAdminSession } from "@/lib/auth";
import { PageSection } from "@/components/PageSection";
import { toast } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "বিভাগ ব্যবস্থাপনা",
};

export default async function CategoriesPage() {
  const session = await requireAdminSession();
  const [settings, categories] = await Promise.all([getSettings(), listCategories()]);

  return (
    <PageSection>
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-serif-bn text-[28px] font-black text-ink">বিভাগ ব্যবস্থাপনা</h1>
            <p className="mt-1 text-ink-soft">সাইটের বিভাগগুলো তৈরি, সম্পাদনা ও সাজান। প্রতিটি বিভাগের আচরণ কনফিগার করুন।</p>
          </div>
          <button
            onClick={() => document.getElementById("create-category-dialog")?.showModal()}
            className="flex items-center gap-2 bg-alizarin px-5 py-2.5 text-[13px] font-bold text-paper hover:bg-alizarin-deep"
          >
            <Plus size={14} /> নতুন বিভাগ
          </button>
        </div>

        <dialog id="create-category-dialog" className="modal">
          <form method="dialog" className="p-6 space-y-4 max-w-md">
            <h2 className="font-serif-bn text-[20px] font-bold">নতুন বিভাগ</h2>
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-ink-700">স্লাগ (ইংরেজি, ছোট হাতের অক্ষর)</span>
                <input id="new-slug" required className="mt-1 w-full rounded-lg border border-ink/30 bg-paper px-3 py-2 text-[13px] font-mono-x focus:border-alizarin focus:outline-none" placeholder="e.g., viral-news" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink-700">বাংলা নাম</span>
                <input id="new-name-bn" required className="mt-1 w-full rounded-lg border border-ink/30 bg-paper px-3 py-2 text-[13px] focus:border-alizarin focus:outline-none" placeholder="ভাইরাল সংবাদ" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink-700">ইংরেজি নাম</span>
                <input id="new-name-en" required className="mt-1 w-full rounded-lg border border-ink/30 bg-paper px-3 py-2 text-[13px] font-mono-x focus:border-alizarin focus:outline-none" placeholder="Viral News" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink-700">বর্ণনা (বাংলা)</span>
                <textarea id="new-desc-bn" className="mt-1 w-full rounded-lg border border-ink/30 bg-paper px-3 py-2 text-[13px] focus:border-alizarin focus:outline-none" rows={2} />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink-700">বর্ণনা (ইংরেজি)</span>
                <textarea id="new-desc-en" className="mt-1 w-full rounded-lg border border-ink/30 bg-paper px-3 py-2 text-[13px] focus:border-alizarin focus:outline-none" rows={2} />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink-700">ডট রঙ (Tailwind rgb, উদাহরণ: #fbbf24)</span>
                <input id="new-dot" className="mt-1 w-full rounded-lg border border-ink/30 bg-paper px-3 py-2 text-[13px] font-mono-x focus:border-alizarin focus:outline-none" placeholder="#fbbf24" />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="border border-ink/30 px-4 py-2 text-[13px] font-bold hover:bg-ink hover:text-paper" onClick={() => document.getElementById("create-category-dialog")?.close()}>
                বাতিল
              </button>
              <button className="bg-alizarin px-5 py-2.5 text-[13px] font-bold text-paper hover:bg-alizarin-deep" onClick={handleCreateCategory}>
                তৈরি করুন
              </button>
            </div>
          </form>
        </dialog>

        <div className="space-y-4">
          {categories.map((cat, i) => (
            <CategoryRow key={cat.slug} cat={cat} index={i} categories={categories} />
          ))}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-12 text-ink-soft">
            কোনো বিভাগ নেই। উপরের বোতামে ক্লিক করে প্রথমটি তৈরি করুন।
          </div>
        )}
      </div>
    </PageSection>
  );
}

async function handleCreateCategory() {
  const slug = (document.getElementById("new-slug") as HTMLInputElement).value.trim();
  const displayNameBn = (document.getElementById("new-name-bn") as HTMLInputElement).value.trim();
  const displayNameEn = (document.getElementById("new-name-en") as HTMLInputElement).value.trim();
  const descriptionBn = (document.getElementById("new-desc-bn") as HTMLTextAreaElement).value.trim();
  const descriptionEn = (document.getElementById("new-desc-en") as HTMLTextAreaElement).value.trim();
  const dot = (document.getElementById("new-dot") as HTMLInputElement).value.trim() || "#d2202c";

  if (!slug || !displayNameBn || !displayNameEn) {
    alert("স্লাগ, বাংলা নাম ও ইংরেজি নাম আবশ্যক");
    return;
  }

  try {
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, displayNameBn, displayNameEn, descriptionBn, descriptionEn, dot }),
    });
    if (!res.ok) throw new Error(await res.text());
    toast.success("বিভাগ তৈরি হয়েছে");
    window.location.reload();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "তैयারি ব্যর্থ");
  }
}

function CategoryRow({ cat, index, categories }: { cat: any; index: number; categories: any[] }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayNameBn: cat.displayNameBn,
    displayNameEn: cat.displayNameEn,
    descriptionBn: cat.descriptionBn,
    descriptionEn: cat.descriptionEn,
    dot: cat.dot,
    isActive: cat.isActive,
    sortOrder: cat.sortOrder,
  });

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/admin/categories/${cat.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("আপডেট হয়েছে");
      setEditing(false);
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "আপডেট ব্যর্থ");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`"${cat.displayNameBn}" বিভাগটি মুছতে চান? এটি ফিরে পাওয়া যাবে না।`)) return;
    try {
      const res = await fetch(`/api/admin/categories/${cat.slug}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      toast.success("মুছে ফেলা হয়েছে");
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "মুছতে ব্যর্থ");
    }
  };

  return (
    <div className="border border-ink/20 rounded-xl bg-paper/50 p-5">
      <div className="flex items-center gap-3">
        <span className="font-mono-x text-[10px] text-ink-soft">{index + 1}</span>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-white"
          style={{ background: cat.dot }}
        >
          {cat.slug.charAt(0).toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          {editing ? (
            <>
              <input
                value={formData.displayNameBn}
                onChange={e => setFormData({...formData, displayNameBn: e.target.value})}
                className="w-full rounded-lg border border-ink/30 bg-paper px-3 py-1.5 text-[14px] focus:border-alizarin"
              />
              <input
                value={formData.displayNameEn}
                onChange={e => setFormData({...formData, displayNameEn: e.target.value})}
                className="mt-1 w-full rounded-lg border border-ink/30 bg-paper px-3 py-1.5 text-[13px] font-mono-x focus:border-alizarin"
              />
              <textarea
                value={formData.descriptionBn}
                onChange={e => setFormData({...formData, descriptionBn: e.target.value})}
                className="mt-1 w-full rounded-lg border border-ink/30 bg-paper px-3 py-1.5 text-[13px] focus:border-alizarin"
                rows={2}
              />
              <textarea
                value={formData.descriptionEn}
                onChange={e => setFormData({...formData, descriptionEn: e.target.value})}
                className="mt-1 w-full rounded-lg border border-ink/30 bg-paper px-3 py-1.5 text-[13px] focus:border-alizarin"
                rows={2}
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-sm text-ink-700">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={e => setFormData({...formData, isActive: e.target.checked})}
                    className="rounded border-ink/30 text-alizarin focus:ring-alizarin"
                  />
                  সক্রিয়
                </label>
                <label className="flex items-center gap-1.5 text-sm text-ink-700">
                  সর্ট অর্ডার:
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={e => setFormData({...formData, sortOrder: Number(e.target.value)})}
                    className="w-20 rounded-lg border border-ink/30 bg-paper px-2 py-1 text-[12px] font-mono-x focus:border-alizarin"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-sm text-ink-700">
                  ডট রঙ:
                  <input
                    type="color"
                    value={formData.dot}
                    onChange={e => setFormData({...formData, dot: e.target.value})}
                    className="w-8 h-8 rounded border-0 p-0 cursor-pointer"
                  />
                </label>
              </div>
            </>
          ) : (
            <>
              <p className="font-serif-bn text-[18px] font-bold text-ink">{cat.displayNameBn}</p>
              <p className="text-sm text-ink-soft font-mono-x">{cat.displayNameEn} · {cat.slug}</p>
              <p className="mt-1 text-sm text-ink-soft line-clamp-2">{cat.descriptionBn || cat.descriptionEn || "বর্ণনা নেই"}</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!editing && (
            <button onClick={() => setEditing(true)} className="p-2 rounded-lg hover:bg-ink/10 text-ink-soft" title="স্পাদনা">
              <Edit2 size={16} />
            </button>
          )}
          {editing && (
            <>
              <button onClick={handleSave} className="bg-alizarin px-4 py-1.5 text-[12px] font-bold text-paper hover:bg-alizarin-deep">
                সংরক্ষণ
              </button>
              <button onClick={() => setEditing(false)} className="border border-ink/30 px-4 py-1.5 text-[12px] font-bold hover:bg-ink hover:text-paper">
                বাতিল
              </button>
            </>
          )}
          <button onClick={handleDelete} className="p-2 rounded-lg hover:bg-alizarin/10 text-alizarin" title="মুছুন">
            <Trash2 size={16} />
          </button>
          {(index > 0 || index < categories.length - 1) && !editing && (
            <span className="p-2 text-ink-soft" title="খেনে সাজান">
              <GripVertical size={16} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";