import Link from "next/link";
import { Hash, Timer, Rss } from "lucide-react";
import {
  CATEGORY_LABEL,
  CATEGORY_TINT,
  agoBn,
  toBn,
} from "@/lib/format";
import type { ArticleLite } from "@/lib/data";

export default function ArticleCard({
  a,
  index,
}: {
  a: ArticleLite;
  index: number;
}) {
  const tint = CATEGORY_TINT[a.category] ?? "#d2202c";
  return (
    <Link href={`/news/${a.id}`} className="group flex h-full flex-col">
      <div className="relative overflow-hidden border-[1.5px] border-ink">
        <div className="aspect-[16/10] w-full overflow-hidden bg-paper-deep">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={a.imageUrl}
            alt={a.title}
            className="photo-grade h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <span
          className="absolute bottom-0 left-0 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-white"
          style={{ background: tint }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
          {CATEGORY_LABEL[a.category] ?? a.category}
        </span>
        <span className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full bg-ink/75 px-2.5 py-1 font-mono-x text-[9.5px] tracking-[0.14em] text-paper uppercase backdrop-blur-sm">
          <Rss size={9} /> FB ARCHIVE
        </span>
      </div>

      <div className="mt-4 flex items-baseline justify-between border-b border-ink/15 pb-2">
        <span className="text-outline-ink font-serif-bn text-3xl leading-none font-black">
          {toBn(String(index + 1).padStart(2, "0"))}
        </span>
        <span className="font-mono-x text-[10px] tracking-[0.14em] text-ink-soft uppercase">
          {agoBn(a.publishedAt ?? a.collectedAt)}
        </span>
      </div>

      <h3 className="link-sweep mt-3 inline font-serif-bn text-[21px] leading-snug font-bold text-ink">
        {a.title}
      </h3>
      <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-ink-soft">
        {a.dek}
      </p>

      <div className="mt-auto flex items-center gap-3 pt-4 text-[10.5px] text-ink-soft/90">
        <span className="flex items-center gap-1 font-mono-x tracking-wide">
          <Hash size={10} />
          {a.hash.slice(0, 6)}
        </span>
        <span className="h-3 w-px bg-ink/20" />
        <span className="flex items-center gap-1">
          <Timer size={10.5} />
          {toBn(a.readingMinutes)} মিনিট পড়া
        </span>
        <span className="h-3 w-px bg-ink/20" />
        <span className="truncate">{a.sourceName}</span>
      </div>
    </Link>
  );
}
