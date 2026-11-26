"use client";

import { useMemo, useState } from "react";
import { useAdminAction } from "@/lib/admin-api";
import { useBi } from "@/components/i18n/LocaleProvider";
import type { Post } from "@hoichoi/shared-types";
import { ModerationCard } from "./ModerationCard";
import type { CategoryOption } from "./CategoryPicker";

/**
 * A queue you can clear in one decision.
 *
 * The page rendered one card per draft with its own two buttons, so a backlog of
 * forty drafts was forty decisions, forty requests and forty reloads. This holds
 * the selection for a whole queue and sends it once to
 * `POST /api/moderation/bulk`.
 *
 * Three limits, on purpose:
 *
 *   - **the grid is six across**, matching the post editor, because a reviewer's
 *     job is comparing stories, and three rows of three showed nine of twenty.
 *   - **a locked card cannot be selected.** A desk that requires a second
 *     signature is not satisfied by a checkbox, so those cards are checked-out
 *     and the server refuses them as well — the UI is not the guard.
 *   - **the result is reported per post.** "৩টি অনুমোদন হয়েছে, ১টি বাদ পড়েছে"
 *     with the reason, rather than reloading and letting the operator infer what
 *     happened from which cards vanished.
 */
export function ModerationGrid({
  posts,
  queue,
  lockedIds,
  categories,
}: {
  posts: Post[];
  queue: "pending" | "approved";
  /** Post ids whose desk requires a second approval signature. */
  lockedIds: string[];
  /** Active desks available for a one-click category correction. */
  categories: CategoryOption[];
}) {
  const b = useBi();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<null | "approve" | "reject">(null);
  const run = useAdminAction();
  const locked = useMemo(() => new Set(lockedIds), [lockedIds]);
  const selectable = posts.filter((p) => !locked.has(p.id));
  const allSelected = selectable.length > 0 && selectable.every((p) => selected.has(p.id));

  function toggle(id: string, next: boolean) {
    setSelected((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectable.map((p) => p.id)));
  }

  async function bulk(action: "approve" | "reject") {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBusy(action);
    const data = (await run({
      path: "/api/moderation/bulk",
      init: { method: "POST", body: JSON.stringify({ ids, action, note: note || undefined }) },
      busy:
        action === "approve"
          ? b("বাল্ক অনুমোদন চলছে…", "Bulk approval running…")
          : b("বাল্ক প্রত্যাখ্যান চলছে…", "Bulk rejection running…"),
      success:
        action === "approve"
          ? b("✓ বাল্ক অনুমোদন সম্পন্ন", "✓ Bulk approval finished")
          : b("✓ বাল্ক প্রত্যাখ্যান সম্পন্ন", "✓ Bulk rejection finished"),
      detail: (d) => {
        const r = d as { approved?: number; rejected?: number; skipped?: unknown[]; failed?: unknown[] } | null;
        if (!r) return undefined;
        const done = r.approved ?? r.rejected ?? 0;
        const skipped = r.skipped?.length ?? 0;
        const failed = r.failed?.length ?? 0;
        const tail = [
          skipped
            ? b(`${skipped}টি বাদ (দ্বিতীয় অনুমোদন বা ভুল অবস্থা)`, `${skipped} skipped (needs a second approval, or wrong state)`)
            : "",
          failed ? b(`${failed}টি ব্যর্থ`, `${failed} failed`) : "",
        ].filter(Boolean);
        return b(
          `${done}টি সম্পন্ন${tail.length ? " · " + tail.join(" · ") : ""}`,
          `${done} done${tail.length ? " · " + tail.join(" · ") : ""}`,
        );
      },
    })) as { approved?: number; failed?: unknown[] } | null;
    setBusy(null);
    if (data) {
      setSelected(new Set());
      setTimeout(() => window.location.reload(), 900);
    }
  }

  return (
    <div>
      <div className="mt-2 flex flex-wrap items-center gap-2 border border-ink/20 bg-paper-deep px-2.5 py-2">
        <label className="flex items-center gap-1.5 text-[11.5px] font-bold text-ink">
          <input
            type="checkbox"
            checked={allSelected}
            disabled={selectable.length === 0}
            onChange={toggleAll}
            className="h-4 w-4 border border-ink/50 accent-alizarin disabled:opacity-40"
          />
          {b("সব নির্বাচন", "Select all")}
        </label>
        <span className="font-mono-x text-[10.5px] text-ink-soft">
          {b(
            `${selected.size.toLocaleString("bn-BD")} নির্বাচিত`,
            `${selected.size.toLocaleString("en-US")} selected`,
          )}
          {" · "}
          {b(
            `${selectable.length.toLocaleString("bn-BD")} নির্বাচনযোগ্য`,
            `${selectable.length.toLocaleString("en-US")} selectable`,
          )}
          {/* A locked card is not a bug in the count: it is a story that needs a
              second signature, and saying so is kinder than a silent 0. */}
          {locked.size > 0
            ? b(
                ` · ${locked.size.toLocaleString("bn-BD")}টি 🔒 এককভাবে সই করুন`,
                ` · ${locked.size.toLocaleString("en-US")} 🔒 need a signature of their own`,
              )
            : ""}
        </span>
        {selected.size > 0 && (
          <>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={b(
                "নোট (ঐচ্ছিক, সব নির্বাচিত পোস্টে যুক্ত হবে)",
                "Note (optional, added to every selected post)",
              )}
              className="min-w-[160px] flex-1 border border-ink/30 bg-paper px-2 py-1 text-[11.5px] focus:outline-none"
            />
            {queue === "pending" ? (
              <button
                onClick={() => bulk("approve")}
                disabled={busy !== null}
                className="border-2 border-ink bg-cat-teal px-3 py-1 text-[11.5px] font-bold text-ink transition hover:brightness-95 disabled:opacity-50"
              >
                {busy === "approve" ? b("চলছে…", "Working…") : b(`✓ ${selected.size}টি অনুমোদন`, `✓ Approve ${selected.size}`)}
              </button>
            ) : null}
            <button
              onClick={() => bulk("reject")}
              disabled={busy !== null}
              className="border-2 border-ink bg-alizarin px-3 py-1 text-[11.5px] font-bold text-ink transition hover:brightness-95 disabled:opacity-50"
            >
              {busy === "reject" ? b("চলছে…", "Working…") : b(`✗ ${selected.size}টি প্রত্যাখ্যান`, `✗ Reject ${selected.size}`)}
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="border border-ink/30 bg-paper px-2 py-1 text-[11px] font-bold text-ink-soft hover:border-ink"
            >
              {b("বাতিল", "Clear")}
            </button>
          </>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {posts.map((p) => (
          <ModerationCard
            key={p.id}
            post={p}
            queue={queue}
            locked={locked.has(p.id)}
            selected={selected.has(p.id)}
            onSelect={toggle}
            categories={categories}
          />
        ))}
      </div>
    </div>
  );
}
