/* ==================================================================
 * Creative style system — fonts, text treatment, image filters,
 * borders, shadows and entrance/idle animations.
 * Shared by the public renderer, the client studio and admin studio.
 * ================================================================== */

export type FontKey =
  | "serif-bn"
  | "sans-bn"
  | "mono"
  | "display"
  | "slab"
  | "hand"
  | "condensed"
  | "inherit";

export const FONTS: { key: FontKey; name: string; stack: string; sample: string }[] = [
  { key: "serif-bn", name: "নোটো সেরিফ বাংলা", stack: "var(--font-serif-bn)", sample: "হৈচৈ Aa" },
  { key: "sans-bn", name: "নোটো সান্স বাংলা", stack: "var(--font-sans-bn-loaded), system-ui", sample: "হৈচৈ Aa" },
  { key: "mono", name: "জেটব্রেইনস মোনো", stack: "var(--font-mono-x)", sample: "হৈচৈ Aa" },
  { key: "display", name: "ডিসপ্লে (ভারী)", stack: "var(--font-serif-bn)", sample: "হৈচৈ Aa" },
  { key: "slab", name: "স্ল্যাব", stack: "Georgia, 'Times New Roman', serif", sample: "হৈচৈ Aa" },
  { key: "hand", name: "হ্যান্ড / ক্যাজুয়াল", stack: "'Segoe Script', 'Bradley Hand', cursive", sample: "হৈচৈ Aa" },
  { key: "condensed", name: "কন্ডেন্সড", stack: "'Arial Narrow', 'Helvetica Neue', sans-serif", sample: "হৈচৈ Aa" },
  { key: "inherit", name: "সাইটের ডিফল্ট", stack: "inherit", sample: "হৈচৈ Aa" },
];

export const FONT_MAP = Object.fromEntries(FONTS.map((f) => [f.key, f])) as Record<
  FontKey,
  (typeof FONTS)[number]
>;

export type AnimKey =
  | "none"
  | "fade-up"
  | "fade-in"
  | "slide-left"
  | "slide-right"
  | "zoom-in"
  | "flip-in"
  | "blur-in"
  | "pulse"
  | "glow"
  | "float"
  | "shine"
  | "ken-burns"
  | "ticker"
  | "shake"
  | "pop";

export const ANIMS: { key: AnimKey; name: string; group: "entrance" | "idle" }[] = [
  { key: "none", name: "কোনোটিই নয়", group: "entrance" },
  { key: "fade-up", name: "নিচ থেকে ফেড", group: "entrance" },
  { key: "fade-in", name: "ফেড ইন", group: "entrance" },
  { key: "slide-left", name: "বাঁ দিক থেকে", group: "entrance" },
  { key: "slide-right", name: "ডান দিক থেকে", group: "entrance" },
  { key: "zoom-in", name: "জুম ইন", group: "entrance" },
  { key: "flip-in", name: "ফ্লিপ", group: "entrance" },
  { key: "blur-in", name: "ব্লার থেকে স্পষ্ট", group: "entrance" },
  { key: "pop", name: "পপ", group: "entrance" },
  { key: "pulse", name: "পালস (ধীর স্পন্দন)", group: "idle" },
  { key: "glow", name: "গ্লো", group: "idle" },
  { key: "float", name: "ভাসমান", group: "idle" },
  { key: "shine", name: "শাইন সুইপ", group: "idle" },
  { key: "ken-burns", name: "কেন-বার্নস (ছবি)", group: "idle" },
  { key: "ticker", name: "টিকার স্ক্রল", group: "idle" },
  { key: "shake", name: "অ্যাটেনশন শেক", group: "idle" },
];

export type BorderKey = "none" | "hairline" | "solid" | "thick" | "dashed" | "double" | "ruled";
export const BORDERS: { key: BorderKey; name: string }[] = [
  { key: "none", name: "নেই" },
  { key: "hairline", name: "সরু" },
  { key: "solid", name: "সলিড" },
  { key: "thick", name: "মোটা" },
  { key: "dashed", name: "ড্যাশড" },
  { key: "double", name: "ডাবল" },
  { key: "ruled", name: "বাঁ পাশে রুল" },
];

export type ShadowKey = "none" | "soft" | "hard" | "press" | "lift" | "inner";
export const SHADOWS: { key: ShadowKey; name: string }[] = [
  { key: "none", name: "নেই" },
  { key: "soft", name: "সফট" },
  { key: "hard", name: "হার্ড অফসেট" },
  { key: "press", name: "প্রেস (নিউজপ্রিন্ট)" },
  { key: "lift", name: "লিফট" },
  { key: "inner", name: "ইনার" },
];

export type TextureKey = "none" | "grain" | "halftone" | "lines" | "grid" | "newsprint";
export const TEXTURES: { key: TextureKey; name: string }[] = [
  { key: "none", name: "নেই" },
  { key: "grain", name: "গ্রেইন" },
  { key: "halftone", name: "হাফটোন ডট" },
  { key: "lines", name: "তির্যক রেখা" },
  { key: "grid", name: "গ্রিড" },
  { key: "newsprint", name: "নিউজপ্রিন্ট" },
];

export type ImageFit = "cover" | "contain" | "fill";
export type ImageFilter = "none" | "grayscale" | "sepia" | "duotone" | "bright" | "contrast" | "vintage" | "cool";

export const IMAGE_FILTERS: { key: ImageFilter; name: string; css: string }[] = [
  { key: "none", name: "আসল", css: "none" },
  { key: "grayscale", name: "সাদা-কালো", css: "grayscale(1)" },
  { key: "sepia", name: "সেপিয়া", css: "sepia(0.75)" },
  { key: "duotone", name: "ডুওটোন", css: "grayscale(1) contrast(1.25) sepia(0.45) hue-rotate(-15deg) saturate(2.2)" },
  { key: "bright", name: "উজ্জ্বল", css: "brightness(1.18) saturate(1.15)" },
  { key: "contrast", name: "হাই কন্ট্রাস্ট", css: "contrast(1.45) saturate(1.1)" },
  { key: "vintage", name: "ভিন্টেজ", css: "sepia(0.35) contrast(1.1) saturate(0.85) brightness(1.05)" },
  { key: "cool", name: "কুল টোন", css: "hue-rotate(185deg) saturate(1.2)" },
];

/** Everything the studio can tune. All optional → templates stay valid. */
export interface CreativeStyle {
  /* colours (override the palette) */
  bg?: string;
  fg?: string;
  accent?: string;
  accentFg?: string;
  muted?: string;
  borderColor?: string;
  gradient?: boolean;
  gradientTo?: string;
  gradientAngle?: number;

  /* typography */
  headFont?: FontKey;
  bodyFont?: FontKey;
  headSize?: number; // px
  bodySize?: number; // px
  headWeight?: number; // 400-900
  headTransform?: "none" | "uppercase" | "capitalize";
  headItalic?: boolean;
  headUnderline?: boolean;
  letterSpacing?: number; // em × 100
  lineHeight?: number; // ×100
  align?: "left" | "center" | "right";

  /* frame */
  border?: BorderKey;
  radius?: number; // px
  shadow?: ShadowKey;
  padding?: number; // px
  texture?: TextureKey;

  /* image */
  imageFit?: ImageFit;
  imageFilter?: ImageFilter;
  imageOpacity?: number; // 0-100
  imageZoom?: number; // 100-180
  imagePosX?: number; // 0-100
  imagePosY?: number; // 0-100
  imageRadius?: number;

  /* motion */
  anim?: AnimKey;
  animIdle?: AnimKey;
  animSpeed?: number; // ms
  hoverLift?: boolean;
}

export const DEFAULT_STYLE: CreativeStyle = {
  headFont: "serif-bn",
  bodyFont: "sans-bn",
  headSize: 17,
  bodySize: 11.5,
  headWeight: 800,
  headTransform: "none",
  letterSpacing: 0,
  lineHeight: 125,
  align: "left",
  border: "solid",
  radius: 0,
  shadow: "none",
  padding: 16,
  texture: "none",
  imageFit: "cover",
  imageFilter: "none",
  imageOpacity: 100,
  imageZoom: 100,
  imagePosX: 50,
  imagePosY: 50,
  imageRadius: 0,
  anim: "fade-up",
  animIdle: "none",
  animSpeed: 600,
  hoverLift: true,
  gradient: false,
  gradientAngle: 135,
};

export function mergeStyle(s?: CreativeStyle | null): Required<
  Pick<
    CreativeStyle,
    | "headFont" | "bodyFont" | "headSize" | "bodySize" | "headWeight" | "headTransform"
    | "letterSpacing" | "lineHeight" | "align" | "border" | "radius" | "shadow" | "padding"
    | "texture" | "imageFit" | "imageFilter" | "imageOpacity" | "imageZoom" | "imagePosX"
    | "imagePosY" | "imageRadius" | "anim" | "animIdle" | "animSpeed" | "hoverLift"
    | "gradient" | "gradientAngle"
  >
> &
  CreativeStyle {
  return { ...DEFAULT_STYLE, ...(s ?? {}) } as ReturnType<typeof mergeStyle>;
}

const BORDER_CSS: Record<BorderKey, (c: string) => string> = {
  none: () => "none",
  hairline: (c) => `1px solid ${c}`,
  solid: (c) => `1.5px solid ${c}`,
  thick: (c) => `3px solid ${c}`,
  dashed: (c) => `1.5px dashed ${c}`,
  double: (c) => `4px double ${c}`,
  ruled: (c) => `1px solid ${c}`,
};

const SHADOW_CSS: Record<ShadowKey, (c: string) => string> = {
  none: () => "none",
  soft: () => "0 6px 22px rgba(0,0,0,.14)",
  hard: (c) => `6px 6px 0 0 ${c}`,
  press: (c) => `4px 4px 0 0 ${c}`,
  lift: () => "0 14px 36px rgba(0,0,0,.22)",
  inner: () => "inset 0 2px 14px rgba(0,0,0,.22)",
};

export function textureCss(t: TextureKey, color: string): string | undefined {
  switch (t) {
    case "grain":
      return `url("data:image/svg+xml,%3Csvg viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;
    case "halftone":
      return `radial-gradient(${color} 1px, transparent 1.4px)`;
    case "lines":
      return `repeating-linear-gradient(135deg, ${color} 0 1px, transparent 1px 9px)`;
    case "grid":
      return `linear-gradient(${color} 1px, transparent 0), linear-gradient(90deg, ${color} 1px, transparent 0)`;
    case "newsprint":
      return `repeating-linear-gradient(0deg, ${color} 0 1px, transparent 1px 4px)`;
    default:
      return undefined;
  }
}

export const TEXTURE_SIZE: Record<TextureKey, string | undefined> = {
  none: undefined,
  grain: "140px 140px",
  halftone: "7px 7px",
  lines: "auto",
  grid: "22px 22px, 22px 22px",
  newsprint: "auto",
};

export interface ResolvedStyle {
  shell: React.CSSProperties;
  head: React.CSSProperties;
  body: React.CSSProperties;
  imageStyle: React.CSSProperties;
  animClass: string;
  textureLayer?: React.CSSProperties;
  colors: { bg: string; fg: string; accent: string; accentFg: string; muted: string; border: string };
}

export function resolveStyle(
  st: CreativeStyle | null | undefined,
  base: { bg: string; fg: string; accent: string; accentFg: string; muted: string; border: string }
): ResolvedStyle {
  const s = mergeStyle(st);
  const colors = {
    bg: s.bg ?? base.bg,
    fg: s.fg ?? base.fg,
    accent: s.accent ?? base.accent,
    accentFg: s.accentFg ?? base.accentFg,
    muted: s.muted ?? base.muted,
    border: s.borderColor ?? base.border,
  };

  const background = s.gradient
    ? `linear-gradient(${s.gradientAngle}deg, ${colors.bg}, ${s.gradientTo ?? colors.accent})`
    : colors.bg;

  const shell: React.CSSProperties = {
    background,
    color: colors.fg,
    border: BORDER_CSS[s.border](colors.border),
    borderRadius: s.radius,
    boxShadow: SHADOW_CSS[s.shadow](colors.border),
    padding: s.padding,
    textAlign: s.align,
    fontFamily: FONT_MAP[s.bodyFont].stack,
    transition: "transform .3s cubic-bezier(.2,.7,.2,1), box-shadow .3s",
    animationDuration: `${s.animSpeed}ms`,
  };
  if (s.border === "ruled") {
    shell.border = "none";
    shell.borderLeft = `4px solid ${colors.accent}`;
  }

  const head: React.CSSProperties = {
    fontFamily: FONT_MAP[s.headFont].stack,
    fontSize: s.headSize,
    fontWeight: s.headWeight,
    textTransform: s.headTransform,
    fontStyle: s.headItalic ? "italic" : "normal",
    textDecoration: s.headUnderline ? "underline" : "none",
    letterSpacing: `${s.letterSpacing / 100}em`,
    lineHeight: s.lineHeight / 100,
  };

  const body: React.CSSProperties = {
    fontFamily: FONT_MAP[s.bodyFont].stack,
    fontSize: s.bodySize,
    color: colors.muted,
    lineHeight: (s.lineHeight + 20) / 100,
  };

  const filter = IMAGE_FILTERS.find((f) => f.key === s.imageFilter)?.css ?? "none";
  const imageStyle: React.CSSProperties = {
    backgroundSize: s.imageFit === "cover" ? `${s.imageZoom}% auto` : s.imageFit,
    backgroundPosition: `${s.imagePosX}% ${s.imagePosY}%`,
    backgroundRepeat: "no-repeat",
    filter: filter === "none" ? undefined : filter,
    opacity: s.imageOpacity / 100,
    borderRadius: s.imageRadius,
  };

  const classes = ["adx"];
  if (s.anim !== "none") classes.push(`adx-${s.anim}`);
  if (s.animIdle !== "none") classes.push(`adx-${s.animIdle}`);
  if (s.hoverLift) classes.push("adx-hover");

  const texBg = textureCss(s.texture, `${colors.fg}22`);
  const textureLayer = texBg
    ? {
        backgroundImage: texBg,
        backgroundSize: TEXTURE_SIZE[s.texture],
        opacity: s.texture === "grain" ? 0.22 : 0.5,
      }
    : undefined;

  return { shell, head, body, imageStyle, animClass: classes.join(" "), textureLayer, colors };
}
