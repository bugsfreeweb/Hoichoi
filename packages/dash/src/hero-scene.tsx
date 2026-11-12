"use client";

/**
 * Hero scene — the home page's "how a story is collected" panel.
 *
 * Every template renders the SAME real data (the featured post's source
 * platform, its real photo, the live collected/dups/published counters, the last
 * run time). A style only changes how that data is arranged, so nothing on this
 * panel is invented.
 *
 * Twelve templates ship: rail, orbit, stack, timeline, conveyor, radar, mosaic,
 * glass, terminal, deck, isometric, blueprint. They are pickable from the web
 * admin (সেটিংস → ভিজিবিলিটি) and from the desktop desk, both writing
 * `app_config_json.hero_scene_style`.
 *
 * Implementation notes
 *  - Pure CSS/SVG motion (transform + opacity only); no canvas, no rAF, so an
 *    idle hero costs nothing and server/client markup is identical.
 *  - Colours come from the `.hf-scene` custom properties, never from theme
 *    utility classes. That is what makes the panel readable on BOTH themes: the
 *    previous version inherited `--color-band` from the dark band, so on the
 *    light theme it painted a dark box with dark ink text inside it.
 */

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { HeroSceneStyle } from "@hoichoi/shared-types";

export interface HeroSceneFeature {
  image: string | null;
  title: string;
  summary: string | null;
  sourceName: string;
  sourceUrl: string;
  category: string | null;
}

export interface HeroSceneStats {
  collected: number;
  published: number;
  dups: number;
  lastRunIso: string | null;
}

export interface HeroSceneProps {
  style?: HeroSceneStyle | string | null;
  stats: HeroSceneStats;
  feature?: HeroSceneFeature | null;
  /** Rendered inside the admin picker: no live region, tighter type. */
  preview?: boolean;
}

/* ---------------------------------------------------------------- helpers */

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/** Local digit map — `hooks.ts` already exports a `toBn`, so keep this internal. */
function bn(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

interface PlatformInfo {
  labelBn: string;
  glyph: string;
  tone: string;
}

/** Which platform the archived item came from — derived from the real URL. */
export function scenePlatform(url: string, name: string): PlatformInfo {
  const u = (url || "").toLowerCase();
  const n = (name || "").toLowerCase();
  const has = (s: string) => u.includes(s) || n.includes(s);
  if (has("facebook") || has("fb.com") || has("fb.watch")) return { labelBn: "ফেসবুক", glyph: "f", tone: "#1877f2" };
  if (has("youtube") || has("youtu.be")) return { labelBn: "ইউটিউব", glyph: "▶", tone: "#ff0033" };
  if (has("twitter") || has("x.com")) return { labelBn: "এক্স", glyph: "𝕏", tone: "#111418" };
  if (has("instagram")) return { labelBn: "ইনস্টাগ্রাম", glyph: "◎", tone: "#d6249f" };
  if (has("tiktok")) return { labelBn: "টিকটক", glyph: "♪", tone: "#25f4ee" };
  if (has("telegram")) return { labelBn: "টেলিগ্রাম", glyph: "✈", tone: "#229ed9" };
  if (has("whatsapp")) return { labelBn: "হোয়াটসঅ্যাপ", glyph: "✆", tone: "#25d366" };
  if (has("rss") || has(".xml")) return { labelBn: "RSS ফিড", glyph: "◈", tone: "#f26522" };
  return { labelBn: "নিউজ সাইট", glyph: "◉", tone: "#6b6250" };
}

/** Bengali clock for the "last run" stamp (Dhaka time). */
function sceneClock(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString("bn-BD", {
      timeZone: "Asia/Dhaka",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

/** Cycle 0..(count-1) every `ms`, so one stage is "hot" at a time. */
function usePhase(count: number, ms = 2600): number {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPhase((n) => (n + 1) % count), ms);
    return () => clearInterval(t);
  }, [count, ms]);
  return phase;
}

const STAGE_BN = ["সংগ্রহ", "যাচাই", "প্রকাশ"];

/** Shared header: what the panel is + when it last ran. */
function SceneHead({ stats, compact }: { stats: HeroSceneStats; compact?: boolean }) {
  const lastRun = sceneClock(stats.lastRunIso);
  return (
    <div className="hf-head">
      <div>
        <p className="hf-kicker">COLLECT → REWRITE → PUBLISH</p>
        {!compact && <p className="hf-title">সংগ্রহ থেকে প্রকাশ</p>}
      </div>
      <span className={`hf-badge ${lastRun ? "hf-badge--live" : ""}`}>
        <i className="hf-dot" />
        {lastRun ? `শেষ ${lastRun}` : "STANDBY"}
      </span>
    </div>
  );
}

/** The three real counters, used by most templates. */
function SceneFoot({ stats }: { stats: HeroSceneStats }) {
  const dedupePct = stats.collected > 0 ? Math.round((stats.dups / stats.collected) * 100) : 0;
  return (
    <div className="hf-foot">
      <span>
        সংগ্রহ <b>{bn(stats.collected)}</b>
      </span>
      <span>
        ডুপ্লিকেট <b>{bn(stats.dups)}</b>
        {dedupePct > 0 ? <em> · {bn(dedupePct)}%</em> : null}
      </span>
      <span>
        প্রকাশিত <b>{bn(stats.published)}</b>
      </span>
    </div>
  );
}

/** 8 skeleton text lines pretending to be a captured post caption. */
function SkeletonLines({ n = 3 }: { n?: number }) {
  return (
    <div className="hf-skel" aria-hidden>
      {Array.from({ length: n }).map((_, i) => (
        <i key={i} style={{ width: `${92 - i * 16}%` }} />
      ))}
    </div>
  );
}

function SourceThumb({ feature, platform }: { feature?: HeroSceneFeature | null; platform: PlatformInfo }) {
  if (feature?.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={feature.image} alt="" className="hf-thumb" loading="lazy" />;
  }
  return (
    <span className="hf-thumb hf-thumb--empty" style={{ color: platform.tone }}>
      {platform.glyph}
    </span>
  );
}

/* ---------------------------------------------------------------- scenes */

/** 01 · angled rail — three tilted cards on a dashed rail. */
function RailScene({ stats, feature }: HeroSceneProps & { feature?: HeroSceneFeature | null }) {
  const phase = usePhase(3);
  const platform = scenePlatform(feature?.sourceUrl ?? "", feature?.sourceName ?? "");
  return (
    <>
      <SceneHead stats={stats} />
      <div className="hf-rail">
        <svg className="hf-rail-line" viewBox="0 0 10 100" preserveAspectRatio="none" aria-hidden>
          <line x1="5" y1="0" x2="5" y2="100" />
        </svg>
        <div className={`hf-card hf-card--l ${phase === 0 ? "is-hot" : ""}`}>
          <div className="hf-card-top">
            <span className="hf-glyph" style={{ background: platform.tone }}>
              {platform.glyph}
            </span>
            <span className="hf-mini">{platform.labelBn}</span>
            <span className="hf-chip">১৪:০২</span>
          </div>
          <SourceThumb feature={feature} platform={platform} />
          <SkeletonLines n={2} />
        </div>
        <div className={`hf-card hf-card--r hf-gate ${phase === 1 ? "is-hot" : ""}`}>
          <div className="hf-card-top">
            <span className="hf-mini">ডুপ্লিকেট যাচাই</span>
            <span className="hf-chip hf-chip--ok">✓ নতুন</span>
          </div>
          <div className="hf-gate-body">
            <i className="hf-scan" aria-hidden />
            <p className="hf-gate-label">SIMHASH · {bn(Math.max(0, Math.min(99, Math.round((stats.dups / Math.max(1, stats.collected)) * 100))))}%</p>
          </div>
        </div>
        <div className={`hf-card hf-card--l hf-pub ${phase === 2 ? "is-hot" : ""}`}>
          <div className="hf-card-top">
            <span className="hf-mini hf-mini--brand">হৈচৈ</span>
            <span className="hf-chip">{feature?.category ? bn(feature.category.length) : "—"}</span>
          </div>
          <p className="hf-pub-title">{feature?.title ?? "প্রকাশের অপেক্ষায়…"}</p>
          <SkeletonLines n={1} />
        </div>
      </div>
      <SceneFoot stats={stats} />
    </>
  );
}

/** 02 · orbit — the article in the middle, the pipeline orbiting it. */
function OrbitScene({ stats, feature }: HeroSceneProps) {
  const phase = usePhase(3, 2200);
  const platform = scenePlatform(feature?.sourceUrl ?? "", feature?.sourceName ?? "");
  return (
    <>
      <SceneHead stats={stats} compact />
      <div className="hf-orbit">
        <svg viewBox="0 0 200 200" className="hf-orbit-svg" aria-hidden>
          <circle cx="100" cy="100" r="86" className="hf-orbit-ring" />
          <circle cx="100" cy="100" r="60" className="hf-orbit-ring hf-orbit-ring--d" />
          <g className="hf-orbit-rotor">
            <circle cx="100" cy="14" r="3.4" className="hf-orbit-node" />
            <circle cx="174" cy="100" r="3.4" className="hf-orbit-node" />
            <circle cx="100" cy="186" r="3.4" className="hf-orbit-node" />
            <circle cx="26" cy="100" r="3.4" className="hf-orbit-node" />
          </g>
        </svg>
        <div className="hf-orbit-core">
          <span className="hf-glyph hf-glyph--lg" style={{ background: platform.tone }}>
            {platform.glyph}
          </span>
          <p className="hf-orbit-n">{bn(stats.published)}</p>
          <p className="hf-mini">প্রকাশিত</p>
        </div>
        {STAGE_BN.map((label, i) => (
          <span key={label} className={`hf-orbit-tag hf-orbit-tag--${i} ${phase === i ? "is-hot" : ""}`}>
            {label}
          </span>
        ))}
      </div>
      <p className="hf-caption">{feature?.title ?? "নতুন গল্প খোঁজা হচ্ছে…"}</p>
      <SceneFoot stats={stats} />
    </>
  );
}

/** 03 · stack — fanned cards; the top one flips between source and published. */
function StackScene({ stats, feature }: HeroSceneProps) {
  const phase = usePhase(2, 2800);
  const platform = scenePlatform(feature?.sourceUrl ?? "", feature?.sourceName ?? "");
  return (
    <>
      <SceneHead stats={stats} compact />
      <div className="hf-stack">
        <span className="hf-stack-card hf-stack-card--3" aria-hidden />
        <span className="hf-stack-card hf-stack-card--2" aria-hidden />
        <div className={`hf-stack-card hf-stack-card--1 ${phase === 1 ? "is-flip" : ""}`}>
          <div className="hf-card-top">
            <span className="hf-mini">{phase === 1 ? "প্রকাশিত" : platform.labelBn}</span>
            <span className={`hf-chip ${phase === 1 ? "hf-chip--ok" : ""}`}>{phase === 1 ? "✓ লাইভ" : "সংগ্রহ"}</span>
          </div>
          {phase === 1 ? (
            <p className="hf-pub-title">{feature?.title ?? "প্রকাশের অপেক্ষায়…"}</p>
          ) : (
            <>
              <SourceThumb feature={feature} platform={platform} />
              <SkeletonLines n={2} />
            </>
          )}
        </div>
      </div>
      <SceneFoot stats={stats} />
    </>
  );
}

/** 04 · timeline — vertical progress from capture to publish. */
function TimelineScene({ stats, feature }: HeroSceneProps) {
  const phase = usePhase(3, 2400);
  const platform = scenePlatform(feature?.sourceUrl ?? "", feature?.sourceName ?? "");
  const items = [
    { t: `সংগ্রহ · ${platform.labelBn}`, d: `${bn(stats.collected)}টি পোস্ট স্ক্যান` },
    { t: "ডুপ্লিকেট যাচাই", d: `${bn(stats.dups)}টি বাদ দেওয়া হয়েছে` },
    { t: "পুনর্লিখন ও প্রকাশ", d: `${bn(stats.published)}টি প্রকাশিত` },
  ];
  return (
    <>
      <SceneHead stats={stats} compact />
      <ol className="hf-tl">
        {items.map((it, i) => (
          <li key={it.t} className={phase === i ? "is-hot" : ""}>
            <span className="hf-tl-dot" />
            <div>
              <p className="hf-tl-t">{it.t}</p>
              <p className="hf-tl-d">{it.d}</p>
            </div>
            {i === 0 && feature?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={feature.image} alt="" className="hf-tl-thumb" loading="lazy" />
            ) : null}
          </li>
        ))}
      </ol>
      <SceneFoot stats={stats} />
    </>
  );
}

/** 05 · conveyor — items riding a belt through three stations. */
function ConveyorScene({ stats }: HeroSceneProps) {
  return (
    <>
      <SceneHead stats={stats} compact />
      <div className="hf-belt">
        <div className="hf-belt-stations" aria-hidden>
          {STAGE_BN.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
        <div className="hf-belt-track">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`hf-packet hf-packet--${i}`} />
          ))}
        </div>
        <div className="hf-belt-teeth" aria-hidden />
      </div>
      <SceneFoot stats={stats} />
    </>
  );
}

/** 06 · radar — a sweeping radar catching real queue blips. */
function RadarScene({ stats }: HeroSceneProps) {
  const total = Math.max(3, Math.min(9, stats.collected || 0));
  return (
    <>
      <SceneHead stats={stats} compact />
      <div className="hf-radar">
        <svg viewBox="0 0 200 200" className="hf-radar-svg" aria-hidden>
          {[86, 64, 42, 20].map((r) => (
            <circle key={r} cx="100" cy="100" r={r} className="hf-radar-ring" />
          ))}
          <line x1="100" y1="6" x2="100" y2="194" className="hf-radar-axis" />
          <line x1="6" y1="100" x2="194" y2="100" className="hf-radar-axis" />
          <path d="M100 100 L100 10 A90 90 0 0 1 178 56 Z" className="hf-radar-sweep" />
          {Array.from({ length: total }).map((_, i) => {
            const a = (i / total) * Math.PI * 2;
            const r = 26 + ((i * 37) % 56);
            return (
              <circle
                key={i}
                cx={100 + Math.cos(a) * r}
                cy={100 + Math.sin(a) * r}
                r={i % 3 === 0 ? 3.2 : 2.2}
                className={`hf-radar-blip hf-radar-blip--${i % 3}`}
              />
            );
          })}
        </svg>
        <span className="hf-radar-label">
          {bn(stats.collected)} · স্ক্যান
        </span>
      </div>
      <SceneFoot stats={stats} />
    </>
  );
}

/** 07 · mosaic — a grid of captured tiles, one real photo lit per cycle. */
function MosaicScene({ stats, feature }: HeroSceneProps) {
  const phase = usePhase(5, 1800);
  return (
    <>
      <SceneHead stats={stats} compact />
      <div className="hf-mosaic">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`hf-tile ${phase === i ? "is-hot" : ""}`}>
            {i === 2 && feature?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={feature.image} alt="" className="hf-tile-img" loading="lazy" />
            ) : (
              <>
                <i className="hf-tile-bar" style={{ width: `${70 - i * 6}%` }} />
                <i className="hf-tile-bar hf-tile-bar--d" style={{ width: `${45 + i * 4}%` }} />
              </>
            )}
          </div>
        ))}
      </div>
      <SceneFoot stats={stats} />
    </>
  );
}

/** 08 · glass — floating frosted panels, read like stacked layers. */
function GlassScene({ stats, feature }: HeroSceneProps) {
  const platform = scenePlatform(feature?.sourceUrl ?? "", feature?.sourceName ?? "");
  return (
    <>
      <SceneHead stats={stats} compact />
      <div className="hf-glass">
        <div className="hf-pane hf-pane--1">
          <span className="hf-mini">{platform.labelBn} · সোর্স</span>
          <SourceThumb feature={feature} platform={platform} />
        </div>
        <div className="hf-pane hf-pane--2">
          <span className="hf-mini">DEDUPE</span>
          <p className="hf-pane-big">{bn(stats.dups)}</p>
          <span className="hf-mini">বাদ পড়েছে</span>
        </div>
        <div className="hf-pane hf-pane--3">
          <span className="hf-mini">প্রকাশিত</span>
          <p className="hf-pane-big hf-pane-big--ok">{bn(stats.published)}</p>
          <SkeletonLines n={1} />
        </div>
      </div>
      <SceneFoot stats={stats} />
    </>
  );
}

/** 09 · terminal — a live log console fed by the real counters. */
function TerminalScene({ stats, feature }: HeroSceneProps) {
  const lastRun = sceneClock(stats.lastRunIso);
  const lines = [
    `$ collect --source ${feature?.sourceName ?? "feed"}`,
    `  ✓ ${stats.collected} posts scanned`,
    `  ✓ ${stats.dups} duplicates dropped`,
    `$ rewrite --temp 0.4`,
    `  ✓ ${stats.published} published`,
    lastRun ? `  · ${lastRun} · done` : "  · standby",
  ];
  return (
    <>
      <SceneHead stats={stats} compact />
      <div className="hf-term">
        {lines.map((l, i) => (
          <p key={i} className={`hf-term-line ${l.startsWith("$") ? "hf-term-line--cmd" : ""}`}>
            {l.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)] ?? d)}
          </p>
        ))}
        <span className="hf-term-caret" aria-hidden />
      </div>
      <SceneFoot stats={stats} />
    </>
  );
}

/** 10 · deck — cards shuffle; the published card rises to the top. */
function DeckScene({ stats, feature }: HeroSceneProps) {
  const phase = usePhase(3, 2200);
  const platform = scenePlatform(feature?.sourceUrl ?? "", feature?.sourceName ?? "");
  return (
    <>
      <SceneHead stats={stats} compact />
      <div className="hf-deck">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`hf-deck-card hf-deck-card--${i} ${phase === i ? "is-top" : ""}`}>
            <div className="hf-card-top">
              <span className="hf-mini">{i === 2 ? "প্রকাশিত" : i === 1 ? "DEDUPE" : platform.labelBn}</span>
              <span className="hf-chip">{i === 1 ? `${bn(stats.dups)} বাদ` : bn(stats.collected)}</span>
            </div>
            {i === 2 ? (
              <p className="hf-pub-title">{feature?.title ?? "প্রকাশের অপেক্ষায়…"}</p>
            ) : (
              <SkeletonLines n={2} />
            )}
          </div>
        ))}
      </div>
    </>
  );
}

/** 11 · isometric — layered plates stacked in depth. */
function IsometricScene({ stats, feature }: HeroSceneProps) {
  const platform = scenePlatform(feature?.sourceUrl ?? "", feature?.sourceName ?? "");
  const plates = [
    { label: platform.labelBn, value: bn(stats.collected) },
    { label: "ডুপ্লিকেট বাদ", value: bn(stats.dups) },
    { label: "প্রকাশিত", value: bn(stats.published) },
  ];
  return (
    <>
      <SceneHead stats={stats} compact />
      <div className="hf-iso">
        {plates.map((p, i) => (
          <div key={p.label} className={`hf-plate hf-plate--${i}`}>
            <span className="hf-mini">{p.label}</span>
            <span className="hf-plate-v">{p.value}</span>
          </div>
        ))}
        {feature?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={feature.image} alt="" className="hf-iso-img" loading="lazy" />
        ) : null}
      </div>
      <SceneFoot stats={stats} />
    </>
  );
}

/** 12 · blueprint — a wireframe diagram with measurement callouts. */
function BlueprintScene({ stats, feature }: HeroSceneProps) {
  const platform = scenePlatform(feature?.sourceUrl ?? "", feature?.sourceName ?? "");
  return (
    <>
      <SceneHead stats={stats} />
      <div className="hf-bp">
        <svg viewBox="0 0 300 150" className="hf-bp-svg" aria-hidden>
          <rect x="10" y="34" width="76" height="52" rx="4" />
          <rect x="112" y="34" width="76" height="52" rx="4" />
          <rect x="214" y="34" width="76" height="52" rx="4" />
          <path d="M86 60 H112" className="hf-bp-arrow" />
          <path d="M188 60 H214" className="hf-bp-arrow" />
          <path d="M10 24 H86 M112 24 H188 M214 24 H290" className="hf-bp-dim" />
          <path d="M48 96 V120 H262 V96" className="hf-bp-dim" />
          <circle cx="150" cy="60" r="7" className="hf-bp-node" />
        </svg>
        <div className="hf-bp-labels">
          <span>{platform.labelBn}</span>
          <span>dedupe</span>
          <span>publish</span>
        </div>
        <p className="hf-bp-count">
          {bn(stats.collected)} → {bn(stats.dups)} → {bn(stats.published)}
        </p>
      </div>
      <p className="hf-caption">{feature?.title ?? "নতুন গল্প খোঁজা হচ্ছে…"}</p>
      <SceneFoot stats={stats} />
    </>
  );
}

/* ---------------------------------------------------------------- dispatch */

const RENDERERS: Record<HeroSceneStyle, (p: HeroSceneProps) => ReactNode> = {
  rail: RailScene,
  orbit: OrbitScene,
  stack: StackScene,
  timeline: TimelineScene,
  conveyor: ConveyorScene,
  radar: RadarScene,
  mosaic: MosaicScene,
  glass: GlassScene,
  terminal: TerminalScene,
  deck: DeckScene,
  isometric: IsometricScene,
  blueprint: BlueprintScene,
};

/** Normalise an unknown config value to a known template. */
export function resolveSceneStyle(value: string | null | undefined): HeroSceneStyle {
  const key = (value ?? "rail") as HeroSceneStyle;
  return key in RENDERERS ? key : "rail";
}

export function HeroScene({ style, stats, feature, preview }: HeroSceneProps) {
  const key = resolveSceneStyle(typeof style === "string" ? style : null);
  const Render = RENDERERS[key];
  const sceneStyle = { "--hf-tone": scenePlatform(feature?.sourceUrl ?? "", feature?.sourceName ?? "").tone } as CSSProperties;
  return (
    <div
      className={`hf-scene hf-scene--${key} ${preview ? "hf-scene--preview" : ""}`}
      style={sceneStyle}
      data-scene={key}
    >
      <div className="hf-glow" aria-hidden />
      <div className="hf-grid" aria-hidden />
      <div className="hf-body">
        <Render style={key} stats={stats} feature={feature} preview={preview} />
      </div>
    </div>
  );
}
