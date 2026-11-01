import type { MouseEventHandler, ReactNode } from "react";
import { adCreativePalette } from "@/lib/ad-creative-style";

export function AdCreativePreview({
  name,
  headline,
  body,
  cta,
  templateId,
  palette: paletteKey,
  href,
  onClick,
}: {
  name: string;
  headline: string;
  body: string;
  cta: string;
  templateId: string;
  palette: string;
  href?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}) {
  const palette = adCreativePalette(paletteKey);
  const strip = templateId === "strip";
  const story = templateId === "story";
  const content: ReactNode = (
    <div className={strip ? "min-w-0 flex-1" : undefined}>
      <span className="font-mono-x text-[8px] font-bold tracking-[0.18em] uppercase" style={{ color: palette.accent }}>
        SPONSORED · {name || "YOUR BRAND"}
      </span>
      <strong className="mt-1 block font-serif-bn text-[16px] leading-snug font-black">{headline || "আপনার বিজ্ঞাপনের শিরোনাম"}</strong>
      {body && <span className="mt-1 block text-[11px] leading-relaxed opacity-75">{body}</span>}
    </div>
  );
  const style = {
    background: palette.background,
    color: palette.foreground,
    borderColor: `${palette.accent}66`,
    borderLeftColor: story ? palette.accent : undefined,
  };
  const className = `block min-h-[132px] border p-4 ${story ? "border-l-4" : ""} ${strip ? "flex min-h-[96px] flex-wrap items-center justify-between gap-3" : ""}`;

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer sponsored" onClick={onClick} className={className} style={style}>
        {content}
        <span className={`mt-3 inline-flex items-center px-3 py-1.5 text-[10px] font-bold ${strip ? "mt-0 shrink-0" : ""}`} style={{ background: palette.accent, color: palette.accentText }}>
          {cta || "আরও জানুন"} →
        </span>
      </a>
    );
  }
  return (
    <article aria-label="বিজ্ঞাপন creative preview" className={className} style={style}>
      {content}
      <span className={`mt-3 inline-flex items-center px-3 py-1.5 text-[10px] font-bold ${strip ? "mt-0 shrink-0" : ""}`} style={{ background: palette.accent, color: palette.accentText }}>
        {cta || "আরও জানুন"} →
      </span>
    </article>
  );
}
