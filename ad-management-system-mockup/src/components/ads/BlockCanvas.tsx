import type { PaletteKey } from "@/lib/ads/types";
import { PALETTES } from "@/lib/ads/templates";
import { resolveStyle, type CreativeStyle, type ResolvedStyle } from "@/lib/ads/style";
import type { Block, BlockLayout } from "@/lib/ads/blocks";

/* ==================================================================
 * Renders a drag-and-drop block layout inside the slot footprint.
 * Pure presentational — safe on the server and in the studio preview.
 * ================================================================== */

function textCls(variant?: string) {
  return variant && variant !== "plain" ? `tv tv-${variant}` : "";
}

/** Per-character treatments need one element per glyph. */
const CHAR_VARIANTS: string[] = ["letter-in", "wavy"];

function SmartText({ text, variant }: { text?: string; variant?: string }) {
  const value = text ?? "";
  if (!variant || !CHAR_VARIANTS.includes(variant)) return <>{value}</>;
  return (
    <>
      {Array.from(value).map((ch, i) => (
        <span key={i} style={{ animationDelay: `${Math.min(i * 45, 1400)}ms` }}>
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </>
  );
}

function blockStyle(b: Block, r: ResolvedStyle): React.CSSProperties {
  const s: React.CSSProperties = {};
  if (b.size) s.fontSize = b.size;
  if (b.weight) s.fontWeight = b.weight;
  if (b.color) s.color = b.color;
  if (b.bg) s.background = b.bg;
  if (b.pad != null) s.padding = b.pad;
  if (b.radius != null) s.borderRadius = b.radius;
  if (b.align) s.textAlign = b.align;
  return s;
}

function BlockView({ b, r, accent }: { b: Block; r: ResolvedStyle; accent: string }) {
  const st = blockStyle(b, r);

  switch (b.kind) {
    case "badge":
      return (
        <span
          className={`inline-flex items-center gap-1 self-start px-2 py-[3px] font-mono-x text-[8.5px] font-bold tracking-[0.18em] uppercase ${textCls(b.variant)}`}
          style={{ ...st, background: st.background ?? accent, color: st.color ?? r.colors.accentFg }}
        >
          {b.text}
        </span>
      );

    case "headline":
      return (
        <p
          className={`adx-head font-serif-bn leading-[1.2] ${textCls(b.variant)}`}
          style={{ fontSize: 18, fontWeight: 900, ...st }}
          data-text={b.variant === "glitch" ? b.text : undefined}
        >
          <SmartText text={b.text} variant={b.variant} />
        </p>
      );

    case "sub":
      return (
        <p className={textCls(b.variant)} style={{ ...r.body, fontSize: 11.5, ...st }}>
          <SmartText text={b.text} variant={b.variant} />
        </p>
      );

    case "body":
      return (
        <p className={`leading-relaxed ${textCls(b.variant)}`} style={{ ...r.body, fontSize: 12, ...st }}>
          <SmartText text={b.text} variant={b.variant} />
        </p>
      );

    case "quote":
      return (
        <p className={`font-serif-bn italic ${textCls(b.variant)}`} style={{ fontSize: 13, ...st, color: st.color ?? r.colors.muted }}>
          ❝ <SmartText text={b.text} variant={b.variant} /> ❞
        </p>
      );

    case "image":
      return (
        <div className="adx-img relative w-full overflow-hidden" style={{ aspectRatio: "16/9", borderRadius: r.imageStyle.borderRadius, ...st }}>
          <div
            className="absolute inset-0"
            style={{
              ...r.imageStyle,
              backgroundImage: b.url
                ? `url(${b.url})`
                : `repeating-linear-gradient(135deg, ${r.colors.border} 0 1px, transparent 1px 10px)`,
            }}
          />
          {!b.url ? (
            <span className="absolute inset-0 flex items-center justify-center font-mono-x text-[8px] tracking-[0.2em] uppercase" style={{ color: r.colors.muted }}>
              ছবি যোগ করুন
            </span>
          ) : null}
        </div>
      );

    case "logo":
      return b.url ? (
        <img src={b.url} alt="" className="h-10 w-10 object-contain" style={st} />
      ) : (
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[14px] font-black ${textCls(b.variant)}`}
          style={{ ...st, borderColor: r.colors.border, background: accent, color: r.colors.accentFg }}
        >
          {(b.text || "হ").slice(0, 1)}
        </span>
      );

    case "price":
      return (
        <span className={`font-serif-bn font-black ${textCls(b.variant)}`} style={{ fontSize: 22, color: accent, ...st }}>
          {b.text}
        </span>
      );

    case "strikethrough":
      return (
        <span className="text-[12px] line-through" style={{ color: r.colors.muted, ...st }}>
          {b.text}
        </span>
      );

    case "discount":
      return (
        <span
          className={`inline-flex self-start px-2 py-1 font-mono-x text-[10px] font-black ${textCls(b.variant)}`}
          style={{ background: accent, color: r.colors.accentFg, ...st }}
        >
          −{b.text}
        </span>
      );

    case "coupon":
      return (
        <span
          className={`inline-flex self-start border-[1.5px] border-dashed px-3 py-2 font-mono-x text-[13px] font-bold tracking-[0.14em] ${textCls(b.variant)}`}
          style={{ borderColor: accent, color: accent, ...st }}
        >
          {b.text}
        </span>
      );

    case "cta":
      return (
        <span
          className={`inline-flex items-center gap-1.5 self-start px-3.5 py-2 text-[11.5px] font-bold whitespace-nowrap transition-transform duration-300 group-hover:translate-x-0.5 ${textCls(b.variant)}`}
          style={{ background: accent, color: r.colors.accentFg, ...st }}
        >
          {b.text}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </span>
      );

    case "phone":
      return (
        <span className={`font-mono-x text-[14px] font-bold ${textCls(b.variant)}`} style={{ color: accent, ...st }}>
          ☎ {b.text}
        </span>
      );

    case "divider":
      return <span className="block h-px w-full" style={{ background: r.colors.border, ...st }} />;

    case "spacer":
      return <span className="block w-full" style={{ height: Number(b.text || 16) }} />;

    case "bullets":
      return (
        <ul className="space-y-1">
          {(b.items ?? []).map((it, i) => (
            <li key={i} className="flex items-start gap-2 text-[11.5px] leading-snug">
              <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rotate-45" style={{ background: accent }} />
              <span>{it.k}</span>
            </li>
          ))}
        </ul>
      );

    case "tags":
      return (
        <div className="flex flex-wrap gap-1.5">
          {(b.items ?? []).map((it, i) => (
            <span key={i} className="border px-2 py-0.5 text-[10px] font-bold" style={{ borderColor: r.colors.border, color: r.colors.muted }}>
              {it.k}
            </span>
          ))}
        </div>
      );

    case "rows":
      return (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          {(b.items ?? []).map((it, i) => (
            <div key={i} className="flex justify-between gap-2 border-b pb-0.5" style={{ borderColor: r.colors.border }}>
              <dt style={{ color: r.colors.muted }}>{it.k}</dt>
              <dd className="font-semibold">{it.v}</dd>
            </div>
          ))}
        </dl>
      );

    case "stats":
      return (
        <div className="grid grid-cols-3 gap-2">
          {(b.items ?? []).map((it, i) => (
            <div key={i} className="border p-2 text-center" style={{ borderColor: r.colors.border }}>
              <div className="font-serif-bn text-[16px] leading-none font-black" style={{ color: accent }}>
                {it.k}
              </div>
              <div className="mt-1 font-mono-x text-[8px] tracking-[0.12em] uppercase" style={{ color: r.colors.muted }}>
                {it.v}
              </div>
            </div>
          ))}
        </div>
      );

    case "countdown":
      return (
        <div className={`flex gap-1.5 ${textCls(b.variant)}`}>
          {(b.items ?? []).map((it, i) => (
            <div key={i} className="px-2 py-1 text-center" style={{ border: `1.5px solid ${r.colors.border}` }}>
              <div className="font-mono-x text-[16px] leading-none font-bold" style={{ color: accent }}>
                {it.k}
              </div>
              <div className="font-mono-x text-[7.5px] tracking-[0.12em] uppercase" style={{ color: r.colors.muted }}>
                {it.v}
              </div>
            </div>
          ))}
        </div>
      );

    case "progress": {
      const pct = Math.max(0, Math.min(100, Number(b.text || 0)));
      return (
        <div className="w-full">
          <div className="h-2 w-full overflow-hidden" style={{ background: r.colors.border }}>
            <div className="h-full transition-[width] duration-700" style={{ width: `${pct}%`, background: accent }} />
          </div>
          <p className="mt-1 font-mono-x text-[9px] tracking-[0.14em] uppercase" style={{ color: r.colors.muted }}>
            {pct}% অর্জিত
          </p>
        </div>
      );
    }

    case "ribbon":
      return (
        <span
          className={`inline-flex self-start px-3 py-1 text-[10px] font-black tracking-[0.14em] uppercase ${textCls(b.variant)}`}
          style={{ background: accent, color: r.colors.accentFg, ...st, clipPath: "polygon(0 0,100% 0,94% 50%,100% 100%,0 100%)" }}
        >
          {b.text}
        </span>
      );

    case "html":
      return <div className="w-full" dangerouslySetInnerHTML={{ __html: b.text ?? "" }} />;

    default:
      return null;
  }
}

export default function BlockCanvas({
  layout,
  palette,
  style,
  still,
}: {
  layout: BlockLayout;
  palette: PaletteKey;
  style?: CreativeStyle | null;
  still?: boolean;
}) {
  const base = PALETTES[palette] ?? PALETTES.newsprint;
  const r = resolveStyle(style, {
    bg: base.bg,
    fg: base.fg,
    accent: base.accent,
    accentFg: base.accentFg,
    muted: base.muted,
    border: base.border,
  });

  const visible = layout.blocks.filter((b) => !b.hidden);
  if (!visible.length) {
    return (
      <div className="flex h-full min-h-[120px] items-center justify-center border border-dashed p-6 text-center" style={{ borderColor: r.colors.border }}>
        <p className="font-mono-x text-[9.5px] tracking-[0.2em] uppercase" style={{ color: r.colors.muted }}>
          খালি ক্যানভাস — বাঁ দিক থেকে ব্লক টেনে আনুন
        </p>
      </div>
    );
  }

  const shell: React.CSSProperties = {
    ...r.shell,
    display: "grid",
    gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
    gap: layout.gap,
    padding: layout.padding,
    alignContent:
      layout.valign === "center" ? "center" : layout.valign === "bottom" ? "end" : "start",
    justifyItems: layout.align === "center" ? "center" : layout.align === "right" ? "end" : "start",
    textAlign: layout.align,
  };

  return (
    <div className={`group relative h-full w-full overflow-hidden ${still ? "" : r.animClass}`} style={shell}>
      {r.textureLayer ? <div className="pointer-events-none absolute inset-0" style={r.textureLayer} /> : null}
      {visible.map((b) => {
        const span = Math.max(1, Math.min(layout.cols, b.span ?? layout.cols));
        return (
          <div
            key={b.id}
            className="relative flex min-w-0 flex-col"
            style={{
              gridColumn: `span ${span} / span ${span}`,
              alignItems: b.align === "center" ? "center" : b.align === "right" ? "flex-end" : "flex-start",
              justifyContent: layout.direction === "row" ? "center" : "flex-start",
            }}
          >
            <BlockView b={b} r={r} accent={r.colors.accent} />
          </div>
        );
      })}
    </div>
  );
}
