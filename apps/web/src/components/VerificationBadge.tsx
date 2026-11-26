"use client";

import type { VerificationStatus } from "@hoichoi/shared-types";
import { useLocale, useT } from "@/components/i18n/LocaleProvider";
import type { MessageKey } from "@hoichoi/i18n";

/**
 * Verification badge.
 *
 * The label comes from the human/source grade only. `unverified` is shown as
 * "যাচাই বাকি" rather than hidden: a reader is entitled to know that no human
 * review has happened. Legacy grades kept their own label so old rows cannot
 * silently become "verified".
 */
const LABEL: Record<VerificationStatus, MessageKey> = {
  unverified: "site.verify.unverified",
  source_claimed: "site.verify.sourceClaimed",
  partially_verified: "site.verify.partiallyVerified",
  verified: "site.verify.verified",
  disputed: "site.verify.disputed",
  retracted: "site.verify.retracted",
  single_source: "site.verify.singleSource",
  multi_source: "site.verify.multiSource",
  human_verified: "site.verify.humanVerified",
  corrected: "site.verify.corrected",
};

const TONE: Record<VerificationStatus, string> = {
  unverified: "border border-ink/30 text-ink-soft",
  source_claimed: "bg-amberx text-paper",
  partially_verified: "bg-cat-teal text-paper",
  verified: "bg-ink text-paper",
  disputed: "bg-alizarin text-paper",
  retracted: "bg-alizarin-deep text-paper",
  single_source: "bg-amberx text-paper",
  multi_source: "bg-cat-teal text-paper",
  human_verified: "bg-ink text-paper",
  corrected: "bg-amberx text-paper",
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
  const t = useT();
  const { locale } = useLocale();
  if (!status || !(status in TONE)) return null;

  const title = [
    note?.trim(),
    verifier ? `${t("site.verify.humanReviewed")}: ${verifier}` : null,
    at
      ? new Date(at).toLocaleDateString(locale === "en" ? "en-GB" : "bn-BD")
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <span
      title={title || undefined}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono-x font-bold uppercase tracking-[0.12em] ${TONE[status]} ${
        compact ? "text-[9px]" : "text-[10px]"
      }`}
    >
      {status === "unverified" ||
      status === "disputed" ||
      status === "retracted" ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="9.5"
          height="9.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5" />
          <path d="M12 16h.01" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="9.5"
          height="9.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
      {t(LABEL[status])}
    </span>
  );
}
