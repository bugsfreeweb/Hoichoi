import type { AdFormat, CreativeData, CreativeKind, PaletteKey } from "@/lib/ads/types";
import { PALETTES } from "@/lib/ads/templates";
import { resolveStyle, type CreativeStyle, type ResolvedStyle } from "@/lib/ads/style";
import BlockCanvas from "./BlockCanvas";
import type { BlockLayout } from "@/lib/ads/blocks";

export interface CreativeProps {
  kind: CreativeKind;
  palette: PaletteKey;
  data: CreativeData;
  format: AdFormat;
  style?: CreativeStyle | null;
  /** drag-and-drop block layout; when present it replaces the fixed template */
  layout?: BlockLayout | null;
  dense?: boolean;
  /** disables animation (used in dense chrome spots) */
  still?: boolean;
}

function pal(k: PaletteKey) {
  return PALETTES[k] ?? PALETTES.newsprint;
}

/* ------------------------------ atoms ------------------------------ */

function Cta({ r, label }: { r: ResolvedStyle; label?: string }) {
  if (!label) return null;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 px-3.5 py-2 text-[11.5px] font-bold whitespace-nowrap transition-transform duration-300 group-hover:translate-x-0.5"
      style={{ background: r.colors.accent, color: r.colors.accentFg, borderRadius: Math.min(6, Number(r.shell.borderRadius) || 0) }}
    >
      {label}
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    </span>
  );
}

function Badge({ r, text }: { r: ResolvedStyle; text?: string }) {
  if (!text) return null;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-[3px] font-mono-x text-[8.5px] font-bold tracking-[0.18em] uppercase"
      style={{ background: r.colors.accent, color: r.colors.accentFg }}
    >
      {text}
    </span>
  );
}

function Logo({ r, text }: { r: ResolvedStyle; text?: string }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[13px] font-black"
      style={{ borderColor: r.colors.border, background: r.colors.accent, color: r.colors.accentFg }}
    >
      {(text || "হ").slice(0, 1)}
    </span>
  );
}

function Head({ r, children, size }: { r: ResolvedStyle; children: React.ReactNode; size?: number }) {
  return (
    <p className="adx-head" style={{ ...r.head, ...(size ? { fontSize: size } : {}) }}>
      {children}
    </p>
  );
}

function Body({ r, children, clamp }: { r: ResolvedStyle; children: React.ReactNode; clamp?: number }) {
  if (!children) return null;
  return (
    <p className={clamp ? `line-clamp-${clamp}` : ""} style={r.body}>
      {children}
    </p>
  );
}

function ImageBox({
  r,
  url,
  className,
  style,
}: {
  r: ResolvedStyle;
  url?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`adx-img relative overflow-hidden ${className ?? ""}`} style={{ borderRadius: r.imageStyle.borderRadius, ...style }}>
      <div
        className="absolute inset-0"
        style={{
          ...r.imageStyle,
          backgroundImage: url
            ? `url(${url})`
            : `repeating-linear-gradient(135deg, ${r.colors.border} 0 1px, transparent 1px 10px)`,
        }}
      />
      {!url ? (
        <span className="absolute inset-0 flex items-center justify-center font-mono-x text-[8.5px] tracking-[0.2em] uppercase" style={{ color: r.colors.muted }}>
          IMAGE
        </span>
      ) : null}
    </div>
  );
}

function Texture({ r }: { r: ResolvedStyle }) {
  if (!r.textureLayer) return null;
  return <div className="pointer-events-none absolute inset-0" style={r.textureLayer} />;
}

/* ================================================================== */

export default function Creative({ kind, palette, data, format, style, layout, dense, still }: CreativeProps) {
  /* A saved block layout always wins — this is how "customise any template"
     becomes a first-class custom creative. */
  if (layout && Array.isArray(layout.blocks) && layout.blocks.length) {
    return <BlockCanvas layout={layout} palette={palette} style={style} still={still} />;
  }

  const base = pal(palette);
  const r = resolveStyle(style, {
    bg: base.bg,
    fg: base.fg,
    accent: base.accent,
    accentFg: base.accentFg,
    muted: base.muted,
    border: base.border,
  });

  const horizontal = format === "leaderboard" || format === "strip" || format === "anchor" || format === "native";
  const tall = format === "sky";

  const shell: React.CSSProperties = {
    ...r.shell,
    ...(dense || format === "anchor" ? { padding: 8 } : {}),
    ...(horizontal && !dense ? { padding: Math.min(Number(r.shell.padding) || 16, 14) } : {}),
  };
  const cls = `group relative h-full w-full ${still ? "" : r.animClass}`;

  /* ---------------- NATIVE / sponsor one-liner ---------------- */
  if (format === "native" || kind === "sponsor-bar") {
    return (
      <div className={`${cls} flex items-center gap-3`} style={shell}>
        <Texture r={r} />
        <Logo r={r} text={data.logoText || data.brand} />
        <div className="relative min-w-0 flex-1">
          <Head r={r} size={Math.min(Number(r.head.fontSize) || 14, 14)}>
            <span className="truncate">{data.headline}</span>
            {data.brand ? <span className="ml-1.5 opacity-70">· {data.brand}</span> : null}
          </Head>
          {data.sub ? <p className="truncate" style={{ ...r.body, fontSize: 10.5 }}>{data.sub}</p> : null}
        </div>
        <Cta r={r} label={data.cta} />
      </div>
    );
  }

  /* ---------------- ALERT · MISSING ---------------- */
  if (kind === "alert-missing") {
    return (
      <div className={`${cls} flex ${horizontal ? "flex-row items-center gap-4" : "flex-col gap-3"}`} style={shell}>
        <Texture r={r} />
        <div className="relative flex items-center gap-3">
          {data.imageUrl ? (
            <ImageBox r={r} url={data.imageUrl} className="h-14 w-14 shrink-0" />
          ) : (
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[2px] text-[18px]"
              style={{ borderColor: r.colors.accent, color: r.colors.accent }}
            >
              !
            </span>
          )}
          <div>
            <Badge r={r} text={data.badge} />
            <Head r={r} size={(Number(r.head.fontSize) || 17) + 1}>{data.headline}</Head>
            <Body r={r}>{data.sub}</Body>
          </div>
        </div>
        {!horizontal && data.rows?.length ? (
          <dl className="relative grid grid-cols-2 gap-x-3 gap-y-1" style={{ fontSize: r.body.fontSize }}>
            {data.rows.map((x) => (
              <div key={x.k} className="flex gap-1.5">
                <dt style={{ color: r.colors.muted }}>{x.k}:</dt>
                <dd className="font-semibold">{x.v}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <div className={`relative flex items-center gap-3 ${horizontal ? "ml-auto" : "mt-auto"}`}>
          {data.phone ? (
            <span className="font-mono-x text-[15px] font-bold" style={{ color: r.colors.accent }}>☎ {data.phone}</span>
          ) : null}
          <Cta r={r} label={data.cta} />
        </div>
        {!horizontal && data.footnote ? (
          <p className="relative" style={{ ...r.body, fontSize: 10 }}>{data.footnote}</p>
        ) : null}
      </div>
    );
  }

  /* ---------------- CANDIDATE ---------------- */
  if (kind === "candidate") {
    return (
      <div className={`${cls} flex ${horizontal ? "flex-row items-center gap-4" : "flex-col gap-2"}`} style={shell}>
        <Texture r={r} />
        <Badge r={r} text={data.badge} />
        <div className="relative flex items-center gap-3">
          {data.imageUrl ? <ImageBox r={r} url={data.imageUrl} className="h-14 w-14 shrink-0 rounded-full" /> : <Logo r={r} text={data.headline} />}
          <div>
            <Head r={r} size={(Number(r.head.fontSize) || 17) + 2}>{data.headline}</Head>
            <p className="text-[11.5px] font-semibold" style={{ color: r.colors.accent }}>{data.sub}</p>
            {data.brand ? <Body r={r}>{data.brand}</Body> : null}
          </div>
        </div>
        {!horizontal && data.bullets?.length ? (
          <ul className="relative mt-1 space-y-1">
            {data.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2" style={{ ...r.body, color: r.colors.fg }}>
                <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rotate-45" style={{ background: r.colors.accent }} />
                {b}
              </li>
            ))}
          </ul>
        ) : null}
        <div className={`relative ${horizontal ? "ml-auto" : "mt-auto pt-1"}`}>
          <Cta r={r} label={data.cta} />
        </div>
      </div>
    );
  }

  /* ---------------- PRODUCT PRICE ---------------- */
  if (kind === "product-price") {
    return (
      <div className={`${cls} flex ${horizontal ? "flex-row items-center gap-4" : "flex-col gap-2"}`} style={shell}>
        <Texture r={r} />
        {data.imageUrl && !horizontal ? <ImageBox r={r} url={data.imageUrl} className="relative h-24 w-full" /> : null}
        <div className="relative flex items-center gap-2">
          <Badge r={r} text={data.badge} />
          {data.discount ? (
            <span className="font-mono-x text-[10px] font-bold" style={{ color: r.colors.accent }}>-{data.discount}</span>
          ) : null}
        </div>
        <div className="relative min-w-0 flex-1">
          <p className="font-mono-x text-[9.5px] tracking-[0.2em] uppercase" style={{ color: r.colors.muted }}>{data.brand}</p>
          <Head r={r}>{data.headline}</Head>
          <Body r={r} clamp={2}>{data.sub}</Body>
        </div>
        <div className={`relative flex items-center gap-3 ${horizontal ? "" : "mt-auto"}`}>
          <div>
            <span className="font-serif-bn text-[22px] font-black" style={{ color: r.colors.accent }}>{data.price}</span>
            {data.strikePrice ? (
              <span className="ml-2 text-[12px] line-through" style={{ color: r.colors.muted }}>{data.strikePrice}</span>
            ) : null}
          </div>
          <Cta r={r} label={data.cta} />
        </div>
      </div>
    );
  }

  /* ---------------- COUPON ---------------- */
  if (kind === "offer-coupon") {
    return (
      <div className={`${cls} flex ${horizontal ? "flex-row items-center gap-4" : "flex-col gap-3"}`} style={shell}>
        <Texture r={r} />
        <div className="relative min-w-0 flex-1">
          <p className="font-mono-x text-[9.5px] tracking-[0.2em] uppercase" style={{ color: r.colors.muted }}>{data.brand}</p>
          <Head r={r} size={(Number(r.head.fontSize) || 17) + 1}>{data.headline}</Head>
          <Body r={r}>{data.sub}</Body>
        </div>
        <div className="relative flex items-center gap-3">
          {data.code ? (
            <span
              className="border-[1.5px] border-dashed px-3 py-2 font-mono-x text-[13px] font-bold tracking-[0.14em]"
              style={{ borderColor: r.colors.accent, color: r.colors.accent }}
            >
              {data.code}
            </span>
          ) : null}
          <Cta r={r} label={data.cta} />
        </div>
      </div>
    );
  }

  /* ---------------- EVENT ---------------- */
  if (kind === "event-date") {
    const [d1, d2] = (data.date || "").split("–");
    return (
      <div className={`${cls} flex ${horizontal ? "flex-row items-center gap-4" : "flex-col gap-3"}`} style={shell}>
        <Texture r={r} />
        <div
          className="relative flex h-16 w-16 shrink-0 flex-col items-center justify-center border-[1.5px]"
          style={{ borderColor: r.colors.accent, background: r.colors.accent, color: r.colors.accentFg }}
        >
          <span className="font-serif-bn text-[20px] leading-none font-black">{d1?.trim() || "১৮"}</span>
          <span className="font-mono-x text-[8px] tracking-[0.14em] uppercase">{d2?.trim() || "JAN"}</span>
        </div>
        <div className="relative min-w-0 flex-1">
          <Badge r={r} text={data.badge} />
          <Head r={r}>{data.headline}</Head>
          <Body r={r}>🕒 {data.time} · 📍 {data.place}</Body>
          {data.price ? <p className="mt-0.5 text-[12px] font-bold" style={{ color: r.colors.accent }}>{data.price}</p> : null}
        </div>
        <div className={`relative ${horizontal ? "" : "mt-auto"}`}><Cta r={r} label={data.cta} /></div>
      </div>
    );
  }

  /* ---------------- ROW-TABLE KINDS ---------------- */
  if (kind === "job-card" || kind === "property" || kind === "auto-spec" || kind === "clinic" || kind === "finance-rate") {
    return (
      <div className={`${cls} flex ${horizontal ? "flex-row items-center gap-4" : "flex-col gap-2"}`} style={shell}>
        <Texture r={r} />
        {data.imageUrl && !horizontal && (kind === "property" || kind === "auto-spec") ? (
          <ImageBox r={r} url={data.imageUrl} className="relative h-24 w-full" />
        ) : null}
        <div className="relative min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge r={r} text={data.badge} />
            <span className="font-mono-x text-[9.5px] tracking-[0.18em] uppercase" style={{ color: r.colors.muted }}>{data.brand}</span>
          </div>
          <div className="mt-1.5"><Head r={r}>{data.headline}</Head></div>
          <Body r={r}>{data.sub}</Body>
          {data.price ? (
            <p className="mt-1 font-serif-bn text-[20px] font-black" style={{ color: r.colors.accent }}>{data.price}</p>
          ) : null}
          {data.rows?.length && !horizontal ? (
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1" style={{ fontSize: 11 }}>
              {data.rows.map((x) => (
                <div key={x.k} className="flex justify-between border-b pb-0.5" style={{ borderColor: r.colors.border }}>
                  <dt style={{ color: r.colors.muted }}>{x.k}</dt>
                  <dd className="font-semibold">{x.v}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {data.bullets?.length && !horizontal ? (
            <ul className="mt-2 space-y-1">
              {data.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2" style={{ fontSize: 11 }}>
                  <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rotate-45" style={{ background: r.colors.accent }} />
                  {b}
                </li>
              ))}
            </ul>
          ) : null}
          {data.footnote && !horizontal ? (
            <p className="mt-1.5" style={{ ...r.body, fontSize: 10 }}>{data.footnote}</p>
          ) : null}
        </div>
        <div className={`relative flex items-center gap-2 ${horizontal ? "" : "mt-auto pt-1"}`}>
          {data.phone ? <span className="font-mono-x text-[12px] font-bold" style={{ color: r.colors.accent }}>☎ {data.phone}</span> : null}
          <Cta r={r} label={data.cta} />
        </div>
      </div>
    );
  }

  /* ---------------- COURSE ---------------- */
  if (kind === "course") {
    return (
      <div className={`${cls} flex ${horizontal ? "flex-row items-center gap-4" : "flex-col gap-2"}`} style={shell}>
        <Texture r={r} />
        <div className="relative min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge r={r} text={data.badge} />
            <span className="font-mono-x text-[9.5px] tracking-[0.18em] uppercase" style={{ color: r.colors.muted }}>{data.brand}</span>
          </div>
          <div className="mt-1.5"><Head r={r}>{data.headline}</Head></div>
          <Body r={r}>{data.sub}</Body>
          {data.bullets?.length && !horizontal ? (
            <ul className="mt-2 space-y-1">
              {data.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2" style={{ fontSize: 11 }}>
                  <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rotate-45" style={{ background: r.colors.accent }} />
                  {b}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className={`relative flex items-center gap-3 ${horizontal ? "" : "mt-auto pt-1"}`}>
          <div>
            <span className="font-serif-bn text-[19px] font-black" style={{ color: r.colors.accent }}>{data.price}</span>
            {data.strikePrice ? <span className="ml-1.5 text-[11px] line-through" style={{ color: r.colors.muted }}>{data.strikePrice}</span> : null}
          </div>
          <Cta r={r} label={data.cta} />
        </div>
      </div>
    );
  }

  /* ---------------- DONATION ---------------- */
  if (kind === "donation") {
    const got = data.rows?.[1]?.v ?? "";
    return (
      <div className={`${cls} flex ${horizontal ? "flex-row items-center gap-4" : "flex-col gap-2"}`} style={shell}>
        <Texture r={r} />
        <div className="relative min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge r={r} text={data.badge} />
            <span className="font-mono-x text-[9.5px] tracking-[0.18em] uppercase" style={{ color: r.colors.muted }}>{data.brand}</span>
          </div>
          <div className="mt-1.5"><Head r={r}>{data.headline}</Head></div>
          <Body r={r}>{data.sub}</Body>
          {data.rows?.length ? (
            <>
              <div className="mt-2 h-1.5 w-full overflow-hidden" style={{ background: r.colors.border }}>
                <div className="h-full transition-[width] duration-700" style={{ width: "62%", background: r.colors.accent }} />
              </div>
              <p className="mt-1 font-mono-x text-[10px]" style={{ color: r.colors.muted }}>{got} / {data.rows?.[0]?.v}</p>
            </>
          ) : null}
        </div>
        <div className={`relative flex items-center gap-2 ${horizontal ? "" : "mt-auto pt-1"}`}>
          {data.phone ? <span className="font-mono-x text-[12px] font-bold" style={{ color: r.colors.accent }}>☎ {data.phone}</span> : null}
          <Cta r={r} label={data.cta} />
        </div>
      </div>
    );
  }

  /* ---------------- GOVT NOTICE ---------------- */
  if (kind === "govt-notice") {
    return (
      <div className={`${cls} flex flex-col gap-2`} style={shell}>
        <Texture r={r} />
        <div className="relative flex items-center justify-between gap-2 border-b pb-1.5" style={{ borderColor: r.colors.border }}>
          <span className="font-mono-x text-[9.5px] tracking-[0.2em] uppercase" style={{ color: r.colors.muted }}>{data.brand}</span>
          <Badge r={r} text={data.badge} />
        </div>
        <div className="relative"><Head r={r} size={(Number(r.head.fontSize) || 17) - 1}>{data.headline}</Head></div>
        {data.body ? <Body r={r}>{data.body}</Body> : null}
        {data.bullets?.length ? (
          <ul className="relative space-y-1">
            {data.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2" style={{ fontSize: 11 }}>
                <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rotate-45" style={{ background: r.colors.accent }} />
                {b}
              </li>
            ))}
          </ul>
        ) : null}
        {data.rows?.length ? (
          <dl className="relative grid grid-cols-2 gap-x-3" style={{ fontSize: 11 }}>
            {data.rows.map((x) => (
              <div key={x.k} className="flex justify-between border-b pb-0.5" style={{ borderColor: r.colors.border }}>
                <dt style={{ color: r.colors.muted }}>{x.k}</dt>
                <dd className="font-semibold">{x.v}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <div className="relative mt-auto flex items-center gap-3 pt-1">
          {data.phone ? <span className="font-mono-x text-[12px] font-bold" style={{ color: r.colors.accent }}>{data.phone}</span> : null}
          <Cta r={r} label={data.cta} />
        </div>
      </div>
    );
  }

  /* ---------------- OBITUARY ---------------- */
  if (kind === "obituary") {
    return (
      <div className={`${cls} flex flex-col items-center gap-1.5 text-center`} style={{ ...shell, textAlign: "center" }}>
        <Texture r={r} />
        <p className="relative font-mono-x text-[8.5px] tracking-[0.18em]" style={{ color: r.colors.muted }}>{data.badge}</p>
        <div className="relative my-1 h-px w-12" style={{ background: r.colors.border }} />
        {data.imageUrl ? <ImageBox r={r} url={data.imageUrl} className="relative h-16 w-16 rounded-full" /> : null}
        <div className="relative"><Head r={r} size={(Number(r.head.fontSize) || 17) + 3}>{data.headline}</Head></div>
        <p className="relative font-mono-x text-[11px]" style={{ color: r.colors.muted }}>{data.sub}</p>
        {data.body ? <Body r={r}>{data.body}</Body> : null}
        {data.footnote ? <p className="relative mt-auto pt-2" style={{ ...r.body, fontSize: 10 }}>{data.footnote}</p> : null}
      </div>
    );
  }

  /* ---------------- COUNTDOWN ---------------- */
  if (kind === "countdown-launch") {
    return (
      <div className={`${cls} flex ${horizontal ? "flex-row items-center gap-4" : "flex-col gap-2"}`} style={shell}>
        <Texture r={r} />
        <div className="relative min-w-0 flex-1">
          <Badge r={r} text={data.badge} />
          <div className="mt-1.5"><Head r={r} size={(Number(r.head.fontSize) || 17) + 1}>{data.headline}</Head></div>
          <Body r={r}>{data.sub}</Body>
        </div>
        <div className="relative flex items-center gap-1.5">
          {(data.rows ?? []).map((x) => (
            <div key={x.v} className="px-2 py-1 text-center" style={{ border: `1.5px solid ${r.colors.border}` }}>
              <div className="font-mono-x text-[16px] leading-none font-bold" style={{ color: r.colors.accent }}>{x.k}</div>
              <div className="font-mono-x text-[7.5px] tracking-[0.12em] uppercase" style={{ color: r.colors.muted }}>{x.v}</div>
            </div>
          ))}
        </div>
        <Cta r={r} label={data.cta} />
      </div>
    );
  }

  /* ---------------- POSTER ---------------- */
  if (kind === "poster") {
    return (
      <div className={`${cls} flex flex-col justify-end gap-1.5`} style={shell}>
        <div className="adx-img pointer-events-none absolute inset-0" style={{ ...r.imageStyle, opacity: (Number(r.imageStyle.opacity) || 1) * 0.72, backgroundImage: data.imageUrl ? `url(${data.imageUrl})` : `radial-gradient(120% 90% at 20% 0%, ${r.colors.accent}44, transparent 60%), repeating-linear-gradient(135deg, ${r.colors.border} 0 1px, transparent 1px 12px)` }} />
        <Texture r={r} />
        <div className="relative">
          <Badge r={r} text={data.badge} />
          <div className="mt-2"><Head r={r} size={(Number(r.head.fontSize) || 17) + 7}>{data.headline}</Head></div>
          <Body r={r}>{data.sub}</Body>
          <div className="mt-3"><Cta r={r} label={data.cta} /></div>
        </div>
      </div>
    );
  }

  /* ---------------- SPLIT IMAGE ---------------- */
  if (kind === "split-image") {
    return (
      <div className={`${cls} flex ${tall ? "flex-col" : "flex-row"} items-stretch gap-3`} style={shell}>
        <Texture r={r} />
        <ImageBox r={r} url={data.imageUrl} className={`relative ${tall ? "h-28 w-full" : "w-[38%] min-w-[90px]"} shrink-0`} style={{ border: `1px solid ${r.colors.border}` }} />
        <div className="relative flex min-w-0 flex-1 flex-col justify-center gap-1">
          <div className="flex items-center gap-2">
            <Badge r={r} text={data.badge} />
            <span className="font-mono-x text-[9.5px] tracking-[0.18em] uppercase" style={{ color: r.colors.muted }}>{data.brand}</span>
          </div>
          <Head r={r} size={(Number(r.head.fontSize) || 17) - 1}>{data.headline}</Head>
          {data.price ? <p className="font-serif-bn text-[18px] font-black" style={{ color: r.colors.accent }}>{data.price}</p> : null}
          <Body r={r} clamp={2}>{data.sub}</Body>
          <div className="mt-1"><Cta r={r} label={data.cta} /></div>
        </div>
      </div>
    );
  }

  /* ---------------- CUSTOM HTML ---------------- */
  if (kind === "custom-html" && data.html && data.html.trim().length > 0) {
    return (
      <div className={cls} style={shell}>
        {data.css ? <style dangerouslySetInnerHTML={{ __html: data.css }} /> : null}
        <div dangerouslySetInnerHTML={{ __html: data.html }} />
      </div>
    );
  }

  /* ---------------- CLASSIC BANNER (default) ---------------- */
  return (
    <div className={`${cls} flex ${horizontal ? "flex-row items-center gap-4" : "flex-col gap-2"}`} style={shell}>
      <Texture r={r} />
      {data.imageUrl ? (
        <ImageBox r={r} url={data.imageUrl} className={`relative shrink-0 ${horizontal ? "h-12 w-12" : "h-20 w-full"}`} />
      ) : (
        <Logo r={r} text={data.logoText || data.brand} />
      )}
      <div className="relative min-w-0 flex-1">
        {data.brand ? (
          <p className="font-mono-x text-[9.5px] tracking-[0.2em] uppercase" style={{ color: r.colors.muted }}>{data.brand}</p>
        ) : null}
        <Head r={r} size={(Number(r.head.fontSize) || 17) - 1}>{data.headline}</Head>
        <Body r={r} clamp={2}>{data.sub}</Body>
      </div>
      <div className={`relative ${horizontal ? "" : "mt-auto"}`}><Cta r={r} label={data.cta} /></div>
    </div>
  );
}
