"use client";

import type { SourceType } from "@hoichoi/shared-types";
export { inferSourceType } from "@/lib/source-type";
import { useT } from "@/components/i18n/LocaleProvider";
import type { MessageKey } from "@hoichoi/i18n";

/**
 * What kind of source this story came from. Kept separate from the verification
 * badge: "Facebook post" is provenance, "যাচাই বাকি" is review state.
 */
export default function SourceTypeBadge({
  type,
  compact = false,
}: {
  type: SourceType;
  compact?: boolean;
}) {
  const t = useT();
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-ink/25 bg-paper/70 px-2.5 py-1 font-mono-x font-bold tracking-[0.1em] text-ink-soft uppercase ${
        compact ? "text-[9px]" : "text-[10px]"
      }`}
    >
      {t(`site.source.${type}` as MessageKey)}
    </span>
  );
}
