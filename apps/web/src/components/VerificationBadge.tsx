import type { VerificationStatus } from "@hoichoi/shared-types";

/**
 * Verification badge.
 *
 * Rendered **only** when the grade is strong enough to be worth showing
 * (`showsBadge`), and every grade says exactly what was done — "একাধিক সূত্র"
 * means two independent sources agreed, "সম্পাদক যাচাইকৃত" means a named editor
 * looked at it. There is no generic "verified" tick, because a tick with no
 * method behind it is the thing this component replaced.
 */

const COPY: Record<Exclude<VerificationStatus, "unverified" | "single_source">, { bn: string; en: string; tone: string }> = {
  multi_source: { bn: "একাধিক সূত্র", en: "MULTI-SOURCE", tone: "bg-cat-teal text-paper" },
  human_verified: { bn: "সম্পাদক যাচাইকৃত", en: "EDITOR VERIFIED", tone: "bg-ink text-paper" },
  corrected: { bn: "সংশোধিত", en: "CORRECTED", tone: "bg-amberx text-paper" },
};

export default function VerificationBadge({
  status,
  note,
  verifier,
  at,
  compact = false,
}: {
  status?: VerificationStatus | null;
  note?: string | null;
  verifier?: string | null;
  at?: string | null;
  compact?: boolean;
}) {
  if (!status || status === "unverified" || status === "single_source") return null;
  const copy = COPY[status as keyof typeof COPY];
  if (!copy) return null;

  const title = [note?.trim(), verifier ? `যাচাই: ${verifier}` : null, at ? new Date(at).toLocaleDateString("bn-BD") : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <span
      title={title || undefined}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono-x font-bold uppercase tracking-[0.12em] ${copy.tone} ${
        compact ? "text-[9px]" : "text-[10px]"
      }`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
      {copy.bn}
    </span>
  );
}
