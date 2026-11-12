"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2 } from "lucide-react";
import { useToast } from "./ui/toast";

/**
 * One-click AI image for a post, straight from the list.
 *
 * The content manager used to require opening the full editor to regenerate a
 * picture — a page load, a panel, a provider picker, a submit — to fix a queue of
 * twenty posts. This button posts the same request the editor does
 * (`/api/posts/[id]/generate-image` with `useTitle`), shows progress, reports the
 * real outcome and refreshes the list.
 *
 * With a hosted deployment the route hands the job to the Actions runner and
 * answers `{ queued: true }`; the toast says so instead of pretending the image
 * already exists.
 */
export function QuickImageButton({
  postId,
  hasImage,
  compact = false,
}: {
  postId: string;
  hasImage: boolean;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function generate() {
    if (busy) return;
    setBusy(true);
    const id = toast.busy("ছবি তৈরি হচ্ছে…", "প্রম্পট পোস্টের শিরোনাম থেকে তৈরি হয়");
    try {
      const res = await fetch(`/api/posts/${postId}/generate-image`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ useTitle: true }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; queued?: boolean; error?: string; provider?: string; media_path?: string }
        | null;
      if (!res.ok || !data?.ok) {
        toast.error("ছবি তৈরি ব্যর্থ", data?.error ?? `HTTP ${res.status}`);
        return;
      }
      if (data.queued) {
        toast.success("কিউতে পাঠানো হয়েছে", "GitHub Actions-এ ছবি তৈরি হচ্ছে — ১–৩ মিনিট পর তালিকা হালনাগাদ করুন");
      } else {
        toast.success("ছবি তৈরি হয়েছে", `${data.provider ?? "প্রোভাইডার"} · ${data.media_path ?? ""}`);
      }
      router.refresh();
    } catch (e) {
      toast.error("ছবি তৈরি ব্যর্থ", e instanceof Error ? e.message : String(e));
    } finally {
      toast.dismiss(id);
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void generate()}
      disabled={busy}
      title={hasImage ? "এই পোস্টের ছবি আবার তৈরি করুন (AI)" : "এই পোস্টের জন্য AI ছবি তৈরি করুন"}
      className={`inline-flex items-center gap-1.5 border border-ink/25 bg-paper px-2 py-1 text-[10.5px] font-bold text-ink transition-colors hover:border-alizarin hover:text-alizarin disabled:opacity-50 ${
        compact ? "" : "px-2.5"
      }`}
    >
      {busy ? <Loader2 size={11} className="animate-spin" /> : <ImagePlus size={11} />}
      {busy ? "তৈরি হচ্ছে…" : hasImage ? "নতুন ছবি" : "ছবি তৈরি"}
    </button>
  );
}
