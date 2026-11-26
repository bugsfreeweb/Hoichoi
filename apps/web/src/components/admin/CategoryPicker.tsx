"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { useAdminAction } from "@/lib/admin-api";
import { useBi } from "@/components/i18n/LocaleProvider";

export interface CategoryOption {
  slug: string;
  label: string;
  /** English label for the console's EN mode; falls back to the Bangla one. */
  labelEn?: string;
}

/**
 * Correct a story's desk without leaving moderation.
 *
 * Category is a filing decision, not a fact, and the classifier gets it wrong
 * often enough that making an editor open a second page turned a one-field fix
 * into a detour. This PATCHes the same endpoint the full editor uses, so the
 * server's validation and the admin audit trail are unchanged.
 */
export function CategoryPicker({
  postId,
  value,
  categories,
  compact = false,
}: {
  postId: string;
  value: string;
  categories: CategoryOption[];
  compact?: boolean;
}) {
  const b = useBi();
  const router = useRouter();
  const run = useAdminAction();
  const [current, setCurrent] = useState(value);
  const [saving, setSaving] = useState(false);

  async function save(next: string) {
    if (next === current || saving) return;
    setSaving(true);
    const data = await run({
      path: `/api/posts/${postId}`,
      init: { method: "PATCH", body: JSON.stringify({ category: next }) },
      busy: b("বিভাগ বদলানো হচ্ছে…", "Changing the desk…"),
      success: b("✓ বিভাগ হালনাগাদ হয়েছে", "✓ Desk updated"),
      detail: b(`নতুন বিভাগ: ${next}`, `New desk: ${next}`),
    });
    setSaving(false);
    if (data) {
      setCurrent(next);
      // The queue query is server-side, so refresh keeps filters and pages honest.
      router.refresh();
    }
  }

  const known = categories.some((c) => c.slug === current);
  return (
    <label
      className={`flex items-center gap-1 ${compact ? "" : "mt-1"}`}
      title={b("ভুল বিভাগ হলে এখানেই বদলান", "Correct a wrong desk here")}
    >
      <select
        value={current}
        disabled={saving}
        onChange={(e) => void save(e.target.value)}
        aria-label={b("পোস্টের বিভাগ", "Post desk")}
        className={`border border-ink/30 bg-paper font-bold text-ink focus:border-alizarin focus:outline-none ${
          compact ? "max-w-[118px] px-1 py-0.5 text-[10px]" : "w-full px-1.5 py-1 text-[11px]"
        }`}
      >
        {!known && (
          <option value={current}>
            {current} · {b("পুরোনো", "legacy")}
          </option>
        )}
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>
            {compact
              ? b(c.label, c.labelEn ?? c.label)
              : `${b(c.label, c.labelEn ?? c.label)} (${c.slug})`}
          </option>
        ))}
      </select>
      {saving ? (
        <Loader2 size={12} className="shrink-0 animate-spin text-ink-soft" />
      ) : (
        <Check size={12} className="shrink-0 text-cat-teal" />
      )}
    </label>
  );
}
