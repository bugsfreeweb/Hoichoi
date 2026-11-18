"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ImageOff, X } from "lucide-react";

/**
 * ছবি অনুমোদন — এক ছবি, এক রেকর্ড।
 *
 * পোস্ট অনুমোদন আর ছবি অনুমোদন এক জিনিস নয়: একটি পোস্টে পাঁচটি ছবি থাকতে পারে,
 * আর কোনটি কে দেখেছে তার কোনো রেকর্ড ছিল না। এখানে প্রতিটি ছবির জন্য একজন
 * মানুষ একটি সিদ্ধান্ত দেন, সেটি সারিতে বসে, আর কোনও সারি না থাকলে অবস্থা
 * "দেখা হয়নি" — যা অনুমোদন নয়। প্রত্যাখ্যাত ছবি থাকলে পোস্ট প্রকাশ আটকে যায়।
 */

interface ImageState {
  path: string;
  standing: "approved" | "rejected" | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reason: string | null;
  history: number;
}

interface Payload {
  images: ImageState[];
  reasons: string[];
}

const STATE_BN: Record<string, { label: string; cls: string }> = {
  approved: { label: "অনুমোদিত", cls: "border-cat-teal text-ink" },
  rejected: { label: "প্রত্যাখ্যাত", cls: "border-alizarin text-alizarin" },
  unreviewed: { label: "দেখা হয়নি", cls: "border-ink/25 text-ink-soft" },
};

export default function ImageReviewPanel({
  postId,
  canEdit,
}: {
  postId: string;
  canEdit: boolean;
}) {
  const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );
  const [reason, setReason] = useState("");

  const flash = (type: "ok" | "err", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/posts/${encodeURIComponent(postId)}/image-reviews`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("লোড ব্যর্থ");
      setData((await res.json()) as Payload);
    } catch (e) {
      flash("err", (e as Error).message);
    }
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (path: string, verdict: "approved" | "rejected") => {
    if (
      verdict === "rejected" &&
      !window.confirm(
        "এই ছবিটি প্রত্যাখ্যান করলে পোস্টটি প্রকাশ করা যাবে না যতক্ষণ না নতুন সিদ্ধান্ত দেওয়া হয়। চালিয়ে যাবেন?",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/posts/${encodeURIComponent(postId)}/image-reviews`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            path,
            verdict,
            reason: verdict === "rejected" ? reason || null : null,
          }),
        },
      );
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "ব্যর্থ");
      await load();
      flash("ok", "সিদ্ধান্ত রেকর্ড হয়েছে");
    } catch (e) {
      flash("err", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const images = data?.images ?? [];
  if (!data) return null;

  return (
    <section className="mt-8 border-t border-ink/15 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-mono-x text-[11px] font-bold uppercase tracking-[0.18em] text-ink-soft">
            ছবি অনুমোদন
          </h2>
          <p className="mt-1 font-mono-x text-[10.5px] text-ink-soft">
            প্রত্যাখ্যাত ছবি থাকলে প্রকাশ আটকে থাকবে — সিদ্ধান্ত প্রতিটি ছবির জন্য
            আলাদা।
          </p>
        </div>
        {canEdit && (
          <label className="font-mono-x text-[10.5px] text-ink-soft">
            প্রত্যাখ্যানের কারণ (ঐচ্ছিক)
            <select
              className="mt-1 block border border-ink/25 bg-paper px-2 py-1 font-mono-x text-[10.5px] text-ink"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="">—</option>
              {(data.reasons ?? []).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {msg && (
        <p className="mt-2 font-mono-x text-[11.5px] font-bold text-alizarin">
          {msg.text}
        </p>
      )}

      {images.length === 0 ? (
        <p className="mt-3 inline-flex items-center gap-1.5 font-mono-x text-[11px] text-ink-soft">
          <ImageOff className="h-3.5 w-3.5" /> এই পোস্টে কোনো ছবি নেই।
        </p>
      ) : (
        <div className="mt-3 space-y-1.5">
          {images.map((image) => {
            const state = image.standing ?? "unreviewed";
            const badge = STATE_BN[state] ?? STATE_BN.unreviewed!;
            const name = image.path.split("/").pop() ?? image.path;
            return (
              <div
                key={image.path}
                className="flex flex-wrap items-center justify-between gap-2 border border-ink/20 bg-paper-deep px-2.5 py-1.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono-x text-[11px] text-ink">
                    {name}
                  </p>
                  <p className="font-mono-x text-[9.5px] text-ink-soft">
                    {image.reviewed_by
                      ? `${image.reviewed_by} · ${new Date(image.reviewed_at ?? "").toLocaleDateString("bn-BD")}`
                      : "কেউ দেখেননি"}
                    {image.reason ? ` · ${image.reason}` : ""}
                    {image.history > 1 ? ` · ${image.history}টি সিদ্ধান্ত` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={`border px-1.5 py-0.5 font-mono-x text-[9px] tracking-[0.12em] uppercase ${badge.cls}`}
                  >
                    {badge.label}
                  </span>
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        onClick={() => void decide(image.path, "approved")}
                        disabled={busy}
                        className="border border-ink/25 p-1 text-ink disabled:opacity-50"
                        aria-label={`${name} অনুমোদন করুন`}
                        title="অনুমোদন"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void decide(image.path, "rejected")}
                        disabled={busy}
                        className="border border-ink/25 p-1 text-alizarin disabled:opacity-50"
                        aria-label={`${name} প্রত্যাখ্যান করুন`}
                        title="প্রত্যাখ্যান"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
