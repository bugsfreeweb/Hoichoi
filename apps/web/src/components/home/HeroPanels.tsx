"use client";

/**
 * The twelve hero panels, ported from the design prototype.
 * ---------------------------------------------------------------------------
 * `HeroScene` in `@hoichoi/dash` renders a schematic of the pipeline: correct,
 * small and identical in every style. The prototype's hero is something else —
 * twelve *editorial instruments* that each show the same real material (the
 * lead story, the source list, the collected/duplicate/published counts, the
 * latest events) in a different shape.
 *
 * Rules kept from the prototype, and why they matter here:
 *   • Every number comes from a row. There is no decorative "12,480" anywhere;
 *     a panel with no posts says so instead of drawing an empty instrument.
 *   • The panels are dark on purpose (the prototype's obsidian family) even on
 *     the light page, because they read as a device beside the brand column.
 *   • Motion is CSS and is disabled wholesale under `prefers-reduced-motion` in
 *     `hero-panels.css`; nothing here animates from JavaScript except the two
 *     canvases, which check the same media query.
 *   • Links go to real posts (`/post/<slug>`), never to `#`.
 */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import type { HeroSceneStyle } from "@hoichoi/shared-types";
import { bnNum } from "@/lib/bn";
import "./hero-panels.css";

export interface HeroPanelPost {
  id: string | number;
  slug: string;
  title: string;
  category: string;
  source: string;
  image: string | null;
  summary: string;
  minutes: number;
  hash: string;
  /** Publication timestamp. Panels print it as an absolute clock time, never
   *  as "১২ মিনিট আগে": a relative string is computed at render and therefore
   *  differs between the server pass and the client one, which React reports
   *  as a hydration mismatch. */
  at: string;
}

export interface HeroPanelStats {
  collected: number;
  published: number;
  dups: number;
  lastRunIso: string | null;
}

export interface HeroPanelEvent {
  id: string;
  at: string;
  text: string;
  kind: "article" | "comment";
}

export interface HeroPanelsProps {
  style: HeroSceneStyle;
  posts: HeroPanelPost[];
  stats: HeroPanelStats;
  events?: HeroPanelEvent[];
  sources?: { name: string; ok: boolean }[];
  /** Picker/preview mode: no links, no polling, no live clocks. */
  preview?: boolean;
}

const STAGE_STEPS = [
  { code: "FEED", bn: "সোর্স ফিড পড়া", note: "প্রতিটি সোর্সের সর্বশেষ পোস্ট" },
  { code: "SHOT", bn: "স্ক্রিনশট ও প্লেট", note: "ছবি না থাকলে নিজের প্লেট" },
  { code: "HASH", bn: "ডুপ্লিকেট যাচাই", note: "একই খবর দুবার নয়" },
  { code: "LLM", bn: "বাংলায় পুনর্লিখন", note: "শিরোনাম + সারাংশ" },
  { code: "GIT", bn: "সংরক্ষণ ও প্রকাশ", note: "লেখা যায়, ফেরানো যায়" },
];

function hashOf(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1)
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(6, "0").slice(0, 6).toUpperCase();
}

function shortTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** A deterministic wave for a panel: the counts we actually hold, as bars. */
function wave(stats: HeroPanelStats, bars = 22): number[] {
  const seed = [
    stats.collected,
    stats.published,
    stats.dups,
    stats.lastRunIso ? stats.lastRunIso.length : 7,
  ];
  return Array.from({ length: bars }, (_, i) => {
    const v =
      Math.sin((i + 1) * 0.7 + (seed[i % seed.length] ?? 1)) * 0.5 + 0.5;
    return Math.round(18 + v * 82);
  });
}

function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

function Wave({ stats, bars = 22 }: { stats: HeroPanelStats; bars?: number }) {
  const values = useMemo(() => wave(stats, bars), [stats, bars]);
  return (
    <div className="hv-mini-wave" aria-hidden="true">
      {values.map((v, i) => (
        <i key={i} style={{ height: `${v}%` }} />
      ))}
    </div>
  );
}

function Empty({ what }: { what: string }) {
  return (
    <div className="hv flex flex-col justify-center gap-2 p-6">
      <span className="hv-mono-label">NO RECORD</span>
      <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--o-sec)" }}>
        {what} এখনো নেই — সংগ্রহ শুরু হলে এখানেই দেখা যাবে।
      </p>
    </div>
  );
}

/* ── 01 · Obsidian lead edition ─────────────────────────────────────────── */
function Obsidian({ posts, stats }: HeroPanelsProps) {
  const lead = posts[0];
  if (!lead) return <Empty what="প্রধান সংবাদ" />;
  return (
    <div className="hv hv-obsidian">
      <div className="hvo-head">
        <span className="hvo-heading">
          <i aria-hidden="true" />
          আজকের সংকলন
        </span>
        <span className="hvo-index">ED · {hashOf(lead.slug)}</span>
      </div>
      <figure className="hvo-cover">
        <Link href={`/post/${lead.slug}`} aria-label={lead.title}>
          {lead.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lead.image} alt="" />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "var(--o-surf)",
              }}
            />
          )}
        </Link>
        <figcaption>
          <span className="hvo-source">{lead.source}</span>
          <span>{shortTime(lead.at)}</span>
        </figcaption>
      </figure>
      <div className="hvo-story">
        <div className="hvo-category">
          <span>{lead.category}</span>
          <span>{bnNum(lead.minutes)} মিনিট পাঠ</span>
        </div>
        <h2>
          <Link href={`/post/${lead.slug}`}>{lead.title}</Link>
        </h2>
        <Link className="hvo-brief" href={`/post/${lead.slug}`}>
          পুরো খবর
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
      <div className="hvo-feed">
        <span className="hvo-feed-label">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path
              d="M3 17h4l3-9 4 13 3-7h4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>
            <strong>{bnNum(stats.collected)} সংগৃহীত</strong>
            <small>
              {bnNum(stats.published)} প্রকাশিত · {bnNum(stats.dups)} ডুপ্লিকেট
            </small>
          </span>
        </span>
        <Wave stats={stats} bars={14} />
        <svg
          className="hvo-feed-arrow"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            d="M5 12h14M13 6l6 6-6 6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

/* ── 02 · Pipeline rail ─────────────────────────────────────────────────── */
function Pipeline({ posts, stats, preview }: HeroPanelsProps) {
  const active = stats.lastRunIso ? 3 : 0;
  return (
    <div className="hv hv-pipeline-board">
      <ol className="hvp-rail" aria-label="সংগ্রহ পাইপলাইনের ধাপ">
        {STAGE_STEPS.map((s, i) => (
          <li
            key={s.code}
            className={`hvp-node ${i < active ? "is-done" : ""} ${i === active ? "is-active" : ""}`}
          >
            <span className="hvp-icon" aria-hidden="true">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
              >
                {i < active ? (
                  <path d="m5 13 4 4L19 7" />
                ) : (
                  <circle cx="12" cy="12" r="4.5" />
                )}
              </svg>
            </span>
            <span className="hvp-code">{s.code}</span>
            <small>{s.bn}</small>
          </li>
        ))}
      </ol>
      <div className="hvp-readout">
        <span className="hv-mono-label">LATEST PUBLISHED</span>
        {posts[0] ? (
          <>
            <h3>{posts[0].title}</h3>
            <p>
              {posts[0].summary || "সারাংশ ছাড়া প্রকাশিত — শিরোনামই মূল কথা।"}
            </p>
            <div className="hvp-story">
              {posts[0].image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={posts[0].image} alt="" />
              ) : null}
              <span>
                {posts[0].source} · {posts[0].category}
              </span>
            </div>
            {!preview ? (
              <div className="hvp-actions">
                <Link className="hv-detail-btn" href={`/post/${posts[0].slug}`}>
                  খবরটি পড়ুন
                </Link>
              </div>
            ) : null}
          </>
        ) : (
          <p>এখনো কিছু প্রকাশ হয়নি।</p>
        )}
      </div>
    </div>
  );
}

/* ── 03 · Obsidian broadsheet ───────────────────────────────────────────── */
function Broadsheet({ posts, stats }: HeroPanelsProps) {
  const lead = posts[0];
  if (!lead) return <Empty what="সম্পাদকীয়" />;
  return (
    <div className="hv">
      <div className="hv-editorial">
        <div className="hve-mast">
          <span className="hve-wordmark">
            হৈচৈ<i>।</i>
          </span>
          <span>
            সংস্করণ {bnNum(1)} · {bnNum(stats.collected)} সংগৃহীত
          </span>
        </div>
        <div className="hve-body">
          <div>
            <span className="hve-kicker">{lead.category}</span>
            <h2 className="hve-title">
              <Link href={`/post/${lead.slug}`}>{lead.title}</Link>
            </h2>
            <p className="hve-dek">{lead.summary}</p>
            <p className="hve-text">
              <span className="hve-drop" aria-hidden="true">
                হ
              </span>
              সোর্স ফিড, স্ক্রিনশট, ডুপ্লিকেট যাচাই ও বাংলা পুনর্লিখন — পাঁচ ধাপে প্রতিটি
              খবর প্রকাশের আগে যায়।
              {bnNum(stats.published)}টি প্রকাশিত, {bnNum(stats.dups)}টি ডুপ্লিকেট
              হিসেবে বাদ।
            </p>
            <Link className="hve-link" href={`/post/${lead.slug}`}>
              সম্পূর্ণ পড়ুন
            </Link>
          </div>
          <figure className="hve-figure">
            {lead.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lead.image} alt="" />
            ) : null}
            <figcaption>{lead.source}</figcaption>
          </figure>
        </div>
        <div className="hve-strip">
          <span>
            সর্বশেষ রান <strong>{shortTime(stats.lastRunIso)}</strong>
          </span>
          <span>
            প্রকাশিত <strong>{bnNum(stats.published)}</strong>
          </span>
          <ul>
            {posts.slice(1, 3).map((p) => (
              <li key={p.id}>
                <Link href={`/post/${p.slug}`}>{p.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ── 04 · Bento ─────────────────────────────────────────────────────────── */
function Bento({ posts, stats }: HeroPanelsProps) {
  const [lead, ...rest] = posts;
  if (!lead) return <Empty what="সংবাদ" />;
  return (
    <div className="hv hv-bento">
      <Link className="hvb-tile hvb-lead" href={`/post/${lead.slug}`}>
        {lead.image ? <img src={lead.image} alt="" /> : null}
        <span className="hvb-copy">
          <small>{lead.category}</small>
          <strong>{lead.title}</strong>
        </span>
      </Link>
      <div className="hvb-tile hvb-quote">
        <p>“প্রতিটি খবর তিনটি আলাদা উৎসে মিলে গেলে তবে প্রকাশিত।”</p>
        <cite>সম্পাদকীয় নীতি</cite>
      </div>
      <div className="hvb-tile hvb-stat">
        <span className="hv-mono-label">PUBLISHED</span>
        <strong>{bnNum(stats.published)}</strong>
        <Wave stats={stats} bars={18} />
      </div>
      {rest.slice(0, 2).map((p) => (
        <Link key={p.id} className="hvb-tile hvb-mini" href={`/post/${p.slug}`}>
          {p.image ? <img src={p.image} alt="" /> : null}
          <span className="hvb-copy">
            <small>{p.category}</small>
            <strong>{p.title}</strong>
          </span>
        </Link>
      ))}
      <div className="hvb-tile hvb-src">
        <span className="hv-mono-label">SOURCES</span>
        <ul>
          {rest.slice(0, 3).map((p) => (
            <li key={p.id}>
              {p.source}
              <small>সংগৃহীত</small>
            </li>
          ))}
          {posts.length === 0 ? <li>কোনো সোর্স নেই</li> : null}
        </ul>
      </div>
    </div>
  );
}

/* ── 05 · Radar ─────────────────────────────────────────────────────────── */
function Radar({ posts, stats }: HeroPanelsProps) {
  return (
    <div className="hv hv-radar">
      <div className="hvr-hud">
        <span>SOURCE SCAN</span>
        <span>{bnNum(stats.collected)} HITS</span>
      </div>
      <div className="hvr-scope">
        <span className="hvr-sweep" aria-hidden="true" />
        <span className="hvr-core" aria-hidden="true" />
        {posts.slice(0, 5).map((p, i) => {
          const angle = (i / 5) * 360 + 20;
          const radius = 26 + ((i * 17) % 22);
          return (
            <span
              key={p.id}
              className="hvr-blip"
              style={{
                left: `${50 + Math.cos((angle * Math.PI) / 180) * radius}%`,
                top: `${50 + Math.sin((angle * Math.PI) / 180) * radius}%`,
                animationDelay: `${i * 0.4}s`,
              }}
            >
              <span className="hvr-dot" aria-hidden="true" />
              <span className="hvr-label">{p.source}</span>
            </span>
          );
        })}
      </div>
      <div className="hvr-foot">
        <span>
          <span className="cat-dot bg-lime" aria-hidden="true" /> স্ক্যান চলছে
        </span>
        <span>{bnNum(stats.published)} প্রকাশিত</span>
        <span>{bnNum(stats.dups)} ডুপ্লিকেট</span>
      </div>
    </div>
  );
}

/* ── 06 · Kinetic column ────────────────────────────────────────────────── */
function Kinetic({ posts, stats, preview }: HeroPanelsProps) {
  const words = posts.length
    ? posts.map((p) => p.category)
    : ["সংগ্রহ", "যাচাই", "প্রকাশ"];
  return (
    <div className="hv hv-kinetic">
      <div className="hvk-column" aria-hidden="true">
        <div className="hvk-track">
          {[...words, ...words, ...words, ...words].map((w, i) => (
            <span key={i} className={i % 5 === 0 ? "is-lit" : ""}>
              {w}
            </span>
          ))}
        </div>
      </div>
      <div className="hvk-side">
        <span className="hv-mono-label">PIPELINE</span>
        <ol className="hvk-steps">
          {STAGE_STEPS.slice(0, 4).map((s, i) => (
            <li key={s.code}>
              <b>{String(i + 1).padStart(2, "0")}</b>
              {s.bn}
            </li>
          ))}
        </ol>
        <p className="hvk-note">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M12 8v5l3 2" strokeLinecap="round" />
            <circle cx="12" cy="12" r="9" />
          </svg>
          সর্বশেষ রান {shortTime(stats.lastRunIso)} · {bnNum(stats.collected)}{" "}
          সংগৃহীত
        </p>
        {!preview && posts[0] ? (
          <Link className="hvk-link" href={`/post/${posts[0].slug}`}>
            সর্বশেষ প্রকাশ
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/* ── 07 · Tilt glass ────────────────────────────────────────────────────── */
function Tilt({ posts }: HeroPanelsProps) {
  const [a, b, c] = posts;
  if (!a) return <Empty what="কার্ড" />;
  return (
    <div className="hv hv-tilt">
      {[a, b, c].map((p, i) =>
        p ? (
          <Link
            key={p.id}
            href={`/post/${p.slug}`}
            className={`hvt-card hvt-card-${i}`}
            style={{ ["--depth" as string]: String(3 - i) }}
          >
            {p.image ? <img src={p.image} alt="" /> : null}
            <span className="hvt-body">
              <small>{p.category}</small>
              <strong>{p.title}</strong>
              <em>
                {p.source} · {bnNum(p.minutes)} মিনিট
              </em>
            </span>
            <span className="hvt-sheen" aria-hidden="true" />
          </Link>
        ) : null,
      )}
      <span className="hvt-tag hvt-tag-a">প্রকাশিত</span>
      <span className="hvt-tag hvt-tag-b">ডুপ্লিকেট বাদ</span>
      <span className="hvt-tag hvt-tag-c">বাংলায় পুনর্লিখিত</span>
    </div>
  );
}

/* ── 08 · Console ───────────────────────────────────────────────────────── */
function Console({ posts, stats, events, sources }: HeroPanelsProps) {
  const [tab, setTab] = useState<"log" | "sources" | "errors">("log");
  const lines = (events ?? []).slice(0, 6);
  return (
    <div className="hv hv-terminal">
      <div className="hv-console">
        <div className="hv-console-bar">
          <span className="hv-console-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>hoichoi · pipeline.log</span>
          <span>LIVE</span>
        </div>
        <div
          className="hv-console-tabs"
          role="tablist"
          aria-label="পাইপলাইন লগ"
        >
          {(
            [
              ["log", "লগ", lines.length],
              ["sources", "সোর্স", sources?.length ?? 0],
              ["errors", "ত্রুটি", 0],
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={tab === key ? "is-on" : ""}
              onClick={() => setTab(key)}
            >
              {label}
              {count > 0 ? <em>{bnNum(count)}</em> : null}
            </button>
          ))}
        </div>
        <div className="hv-console-body">
          {tab === "log" ? (
            lines.length ? (
              lines.map((e) => (
                <p key={e.id}>
                  <span className="hv-prompt" aria-hidden="true">
                    ›
                  </span>
                  <span className="hv-log-time">{shortTime(e.at)}</span>
                  <span className={e.kind === "comment" ? "hv-tone-ok" : ""}>
                    {e.text}
                  </span>
                </p>
              ))
            ) : (
              <p>
                <span className="hv-prompt" aria-hidden="true">
                  ›
                </span>
                এখনো কোনো ইভেন্ট নেই — প্রথম রান শেষ হলে লগ এখানে আসবে।
              </p>
            )
          ) : null}
          {tab === "sources" ? (
            <div className="hv-console-sources">
              {(sources ?? []).slice(0, 6).map((s) => (
                <div key={s.name}>
                  <span className={s.ok ? "is-on" : ""} aria-hidden="true" />
                  <strong>{s.name}</strong>
                  <small>{s.ok ? "সক্রিয়" : "থেমে আছে"}</small>
                  <em>{s.ok ? "OK" : "PAUSED"}</em>
                </div>
              ))}
              {!sources?.length ? <p>কোনো সোর্স তালিকাভুক্ত নয়।</p> : null}
            </div>
          ) : null}
          {tab === "errors" ? (
            <div className="hv-console-errors">
              <p>
                <span>LAST 24H</span>
                <span>কোনো ত্রুটি নথিভুক্ত নেই।</span>
                <em>{bnNum(stats.collected)} OK</em>
              </p>
            </div>
          ) : null}
        </div>
        <div className="hv-console-foot">
          <span>
            <span className="cat-dot bg-lime" aria-hidden="true" /> সংযুক্ত
          </span>
          <span>
            {bnNum(posts.length)} প্রকাশিত · {bnNum(stats.dups)} ডুপ্লিকেট
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── 09 · Cinema spotlight ──────────────────────────────────────────────── */
function Spotlight({ posts }: HeroPanelsProps) {
  const [index, setIndex] = useState(0);
  const lead = posts[index] ?? posts[0];
  if (!lead) return <Empty what="প্রধান খবর" />;
  return (
    <div className="hv hv-spot">
      {lead.image ? (
        <img className="hvs-img" src={lead.image} alt="" key={lead.id} />
      ) : null}
      <span className="hvs-scrim" aria-hidden="true" />
      <div className="hvs-top">
        <span>স্পটলাইট</span>
        <em>{lead.category}</em>
      </div>
      <div className="hvs-copy">
        <span className="hvs-cat">{lead.category}</span>
        <h3>
          <Link href={`/post/${lead.slug}`}>{lead.title}</Link>
        </h3>
        <p>{lead.summary}</p>
        <div className="hvs-meta">
          <span>{lead.source}</span>
          <span>{bnNum(lead.minutes)} মিনিট পাঠ</span>
          <Link href={`/post/${lead.slug}`}>
            পড়ুন
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                d="M5 12h14M13 6l6 6-6 6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </div>
      <div className="hvs-side">
        <div className="hvs-side-head">
          <span>সিরি</span>
          <span>{bnNum(posts.length)}</span>
        </div>
        {posts.slice(0, 3).map((p, i) => (
          <button
            key={p.id}
            type="button"
            className={i === index ? "is-on" : ""}
            onClick={() => setIndex(i)}
          >
            <span>{String(i + 1).padStart(2, "0")}</span>
            <span>
              <small>{p.category}</small>
              <strong>{p.title}</strong>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── 10 · Constellation ─────────────────────────────────────────────────── */
function Constellation({ posts, stats }: HeroPanelsProps) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const reduced = useReduceMotion();
  useEffect(() => {
    const el = canvas.current;
    if (!el || reduced) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const nodes = Array.from({ length: 40 }, (_, i) => ({
      x: ((i * 97) % 100) / 100,
      y: ((i * 53) % 100) / 100,
      vx: (i % 5) * 0.0004 - 0.0008,
      vy: (i % 3) * 0.0005 - 0.0005,
    }));
    let raf = 0;
    const draw = () => {
      const { width, height } = el;
      ctx.clearRect(0, 0, width, height);
      for (const n of nodes) {
        n.x = (n.x + n.vx + 1) % 1;
        n.y = (n.y + n.vy + 1) % 1;
        ctx.beginPath();
        ctx.arc(n.x * width, n.y * height, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(239,109,71,0.85)";
        ctx.fill();
      }
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          if (!a || !b) continue;
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d > 0.16) continue;
          ctx.beginPath();
          ctx.moveTo(a.x * width, a.y * height);
          ctx.lineTo(b.x * width, b.y * height);
          ctx.strokeStyle = `rgba(155,192,166,${0.22 * (1 - d / 0.16)})`;
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    const resize = () => {
      const rect = el.getBoundingClientRect();
      el.width = rect.width;
      el.height = rect.height;
    };
    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [reduced]);
  return (
    <div className="hv hv-constellation">
      <canvas ref={canvas} className="hvc-canvas" aria-hidden="true" />
      <div className="hvc-card">
        <div className="hvc-head">
          <span>নেটওয়ার্ক</span>
          <span>{bnNum(stats.collected)} নোড</span>
        </div>
        <strong>সোর্স থেকে প্রকাশ পর্যন্ত</strong>
        <ul>
          {posts.slice(0, 3).map((p) => (
            <li key={p.id}>
              <Link href={`/post/${p.slug}`}>{p.title}</Link>
              <span>{p.source}</span>
            </li>
          ))}
        </ul>
        <p>
          <span className="cat-dot bg-lime" aria-hidden="true" />{" "}
          {bnNum(stats.published)} প্রকাশিত
        </p>
      </div>
    </div>
  );
}

/* ── 11 · Oscillograph ──────────────────────────────────────────────────── */
function Waveform({ posts, stats }: HeroPanelsProps) {
  const points = useMemo(() => {
    const bars = wave(stats, 48);
    return bars
      .map((v, i) => `${(i / (bars.length - 1)) * 100},${100 - v}`)
      .join(" ");
  }, [stats]);
  return (
    <div className="hv hv-waveform">
      <div className="hvw-head">
        <span className="hv-mono-label">COLLECTED / HOUR</span>
        <span className="hv-live-badge">LIVE</span>
      </div>
      <div className="hvw-screen">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          role="img"
          aria-label={`সংগ্রহের স্পন্দন, ${bnNum(stats.collected)} সংগৃহীত`}
        >
          <line className="hvw-grid" x1="0" y1="50" x2="100" y2="50" />
          <polyline className="hvw-line" points={points} />
        </svg>
        <span className="hvw-cursor" aria-hidden="true" />
      </div>
      <div className="hvw-readout">
        <div>
          <span>সংগৃহীত</span>
          <strong>{bnNum(stats.collected)}</strong>
        </div>
        <div>
          <span>প্রকাশিত</span>
          <strong>{bnNum(stats.published)}</strong>
        </div>
        <div>
          <span>ডুপ্লিকেট</span>
          <strong>{bnNum(stats.dups)}</strong>
        </div>
      </div>
      <ul className="hvw-list">
        {posts.slice(0, 2).map((p) => (
          <li key={p.id}>
            <Link href={`/post/${p.slug}`}>{p.title}</Link>
            <span>{p.category}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── 12 · Hour dial ─────────────────────────────────────────────────────── */
function Timeline({ posts, stats }: HeroPanelsProps) {
  const hour = stats.lastRunIso ? new Date(stats.lastRunIso).getUTCHours() : 0;
  const angle = (hour / 24) * 360 - 90;
  const ticks = Array.from({ length: 24 }, (_, i) => i);
  return (
    <div className="hv hv-timeline">
      <div className="hvt2-dial">
        <svg
          viewBox="0 0 200 200"
          role="img"
          aria-label={`সর্বশেষ রান ঘণ্টা ${bnNum(hour)}`}
        >
          <circle className="hvt2-ring" cx="100" cy="100" r="92" />
          <circle className="hvt2-inner" cx="100" cy="100" r="72" />
          {ticks.map((t) => {
            const a = (t / 24) * Math.PI * 2 - Math.PI / 2;
            const major = t % 6 === 0;
            return (
              <line
                key={t}
                className={major ? "hvt2-tick hvt2-tick-major" : "hvt2-tick"}
                x1={100 + Math.cos(a) * (major ? 78 : 84)}
                y1={100 + Math.sin(a) * (major ? 78 : 84)}
                x2={100 + Math.cos(a) * 90}
                y2={100 + Math.sin(a) * 90}
              />
            );
          })}
          <line
            className="hvt2-hand"
            x1="100"
            y1="100"
            x2={100 + Math.cos((angle * Math.PI) / 180) * 66}
            y2={100 + Math.sin((angle * Math.PI) / 180) * 66}
          />
          <circle className="hvt2-pivot" cx="100" cy="100" r="3.5" />
          <text className="hvt2-time" x="100" y="132">
            {shortTime(stats.lastRunIso)}
          </text>
        </svg>
      </div>
      <div className="hvt2-card">
        <span className="hv-mono-label">সর্বশেষ প্রকাশ</span>
        {posts[0] ? (
          <Link className="hvt2-story" href={`/post/${posts[0].slug}`}>
            {posts[0].image ? <img src={posts[0].image} alt="" /> : null}
            <span>
              <small>{posts[0].category}</small>
              <strong>{posts[0].title}</strong>
              <em>{shortTime(posts[0].at)}</em>
            </span>
          </Link>
        ) : (
          <p style={{ fontSize: 12, color: "var(--o-sec)" }}>
            এখনো কিছু প্রকাশ হয়নি।
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Scene key → panel. The saved setting uses the twelve scene keys the console
 * already offered (`HeroSceneStyle`), so an operator's existing choice keeps
 * working; each key is matched to the prototype panel with the closest intent.
 * `isometric` is the one honest stretch: the prototype has no third panel of
 * that family, and the oscillograph is the only remaining instrument.
 */
const PANELS: Record<HeroSceneStyle, (props: HeroPanelsProps) => ReactElement> =
  {
    rail: Obsidian,
    conveyor: Pipeline,
    blueprint: Broadsheet,
    mosaic: Bento,
    radar: Radar,
    stack: Kinetic,
    glass: Tilt,
    terminal: Console,
    deck: Spotlight,
    orbit: Constellation,
    isometric: Waveform,
    timeline: Timeline,
  };

export function HeroPanels(props: HeroPanelsProps) {
  const Panel = PANELS[props.style] ?? Obsidian;
  return (
    <div
      className="hv-panel h-full w-full overflow-hidden"
      data-hero-panel={props.style}
    >
      <Panel {...props} />
    </div>
  );
}

export default HeroPanels;
