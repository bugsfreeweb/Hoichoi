"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Cookie, ShieldCheck } from "lucide-react";
import { readConsent, writeConsent, type ConsentLevel } from "@/lib/consent";

/**
 * Standard consent bar: shown once until the reader chooses, then remembered
 * (versioned). Two buttons only — "সব গ্রহণ" and "শুধু প্রয়োজনীয়" — plus links
 * to the cookie policy and terms. Refusing measurement keeps the site fully
 * readable; nothing is gated behind consent.
 *
 * The banner is deliberately rendered *after* hydration (mounted flag) so the
 * static HTML does not flash for returning visitors.
 */
export default function ConsentBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!readConsent()) setOpen(true);
  }, []);

  function choose(level: ConsentLevel) {
    writeConsent(level);
    setOpen(false);
    // Let measurement components react without a reload.
    window.dispatchEvent(new CustomEvent("hc-consent", { detail: level }));
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="কুকি ও শর্তাবলির সম্মতি"
      className="fixed inset-x-0 bottom-0 z-[90] border-t border-ink/20 bg-paper/95 px-4 py-4 backdrop-blur-md md:px-8"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:gap-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] text-ink">
            <Cookie size={16} />
          </span>
          <div>
            <p className="font-serif-bn text-[14px] font-bold text-ink">কুকি ও শর্তাবলি</p>
            <p className="mt-1 max-w-3xl text-[12.5px] leading-relaxed text-ink-soft">
              আমরা তৃতীয় পক্ষের বিজ্ঞাপন-ট্র্যাকার বা ক্রস-সাইট প্রোফাইলিং ব্যবহার করি না। কেবল
              সাইট পরিচালনার জন্য প্রয়োজনীয় কুকি সবসময় সক্রিয় থাকে; পাঠ-পরিসংখ্যান ও বিজ্ঞাপন
              পরিমাপ আপনার সম্মতিতে চলে। বিস্তারিত{" "}
              <Link href="/cookies" className="font-bold text-alizarin hover:underline">
                কুকি নীতি
              </Link>{" "}
              ও{" "}
              <Link href="/terms" className="font-bold text-alizarin hover:underline">
                ব্যবহারের শর্তাবলি
              </Link>
              -তে।
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 md:ml-auto">
          <button
            type="button"
            onClick={() => choose("essential")}
            className="flex items-center gap-1.5 border border-ink/30 px-4 py-2 text-[12px] font-bold text-ink transition-colors hover:border-ink"
          >
            <ShieldCheck size={13} /> শুধু প্রয়োজনীয়
          </button>
          <button
            type="button"
            onClick={() => choose("all")}
            className="bg-alizarin px-4 py-2 text-[12px] font-bold text-paper transition-colors hover:bg-alizarin-deep"
          >
            সব গ্রহণ করুন
          </button>
        </div>
      </div>
    </div>
  );
}
