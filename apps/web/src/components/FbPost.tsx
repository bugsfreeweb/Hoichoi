import { sourceVisual, sourcePhraseBn } from "@/lib/source-meta";

/**
 * Archived original post card.
 *
 * This used to be a faux **Facebook** screenshot for every article — complete
 * with a blue `f` avatar and invented engagement counts ("২.১ হাজার",
 * "৪৮৬ কমেন্ট") — even when the content came from an RSS/YouTube/X source.
 * It now adapts to the real platform and shows only real data: the platform,
 * the source name, the collection time and the captured text. Fabricated
 * reaction numbers are gone.
 */
export function SourceArchive({
  author,
  sourceName,
  text,
  time,
  hash,
  sourceUrl,
}: {
  author: string;
  sourceName: string;
  text: string;
  time: string;
  hash: string;
  /** Drives platform detection + the archive badge wording. */
  sourceUrl?: string | null;
}) {
  const v = sourceVisual({ source_url: sourceUrl, source_name: sourceName });
  return (
    <div className="relative overflow-hidden rounded-xl border border-ink/25 bg-white text-[#1c1e21]">
      {/* screenshot archive ribbon */}
      <div className="flex items-center justify-between border-b border-black/10 bg-black/[0.035] px-3.5 py-2">
        <span className="flex items-center gap-1.5 font-mono-x text-[10px] tracking-[0.18em] uppercase opacity-70">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
          স্ক্রিনশট · আর্কাইভড
        </span>
        <span className="font-mono-x text-[10px] opacity-50">#{hash.slice(0, 8)}</span>
      </div>

      <div className="p-4">
        {/* header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-sans text-[13px] font-bold text-white ${v.ring}`}
              aria-hidden
            >
              {v.glyph}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] leading-tight font-semibold">
                {author} <span className="font-normal opacity-60">· মূল পোস্ট</span>
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] opacity-55">
                {time} ·{" "}
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                <span className="truncate font-sans">{sourceName}</span>
              </p>
            </div>
          </div>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 font-mono-x text-[9px] font-bold tracking-[0.14em] uppercase"
            style={{ background: `${v.tint}1a`, color: v.tint }}
          >
            {v.labelBn}
          </span>
        </div>

        {/* raw text */}
        <p className="mt-3 text-[13.5px] leading-relaxed whitespace-pre-line">{text}</p>

        {/* provenance — real values only, no invented engagement counts */}
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-black/10 pt-2.5 font-mono-x text-[10px] tracking-[0.12em] uppercase opacity-60">
          <span>{sourcePhraseBn({ source_url: sourceUrl, source_name: sourceName })}</span>
          <span className="truncate">{sourceName}</span>
        </div>
      </div>
    </div>
  );
}
