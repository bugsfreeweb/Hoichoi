"use client";

import { useId, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useLiveData } from "./live-data";
import Counter from "./counter";
import { bnNum, fullTimeBn, timeBn } from "@/lib/bn";
import type { AnalyticsPoint } from "@/lib/analytics-types";
import s from "./live-analytics.module.css";

/* ---- inline SVG icons (the web app avoids lucide-react) ---- */
type IconProps = { size?: number; color?: string; className?: string; style?: CSSProperties };
function Svg({ size = 16, color, className, style, children }: IconProps & {
  children: ReactNode;
}) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">{children}</svg>;
}
const IconActivity = (p: IconProps = {}) => <Svg {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></Svg>;
const IconArrowUpRight = (p: IconProps = {}) => <Svg {...p}><path d="M7 17 17 7" /><path d="M8 7h9v9" /></Svg>;
const IconCheckCheck = (p: IconProps = {}) => <Svg {...p}><path d="M18 6 7 17l-5-5" /><path d="m22 10-7.5 7.5L13 16" /></Svg>;
const IconDatabase = (p: IconProps = {}) => <Svg {...p}><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" /></Svg>;
const IconFiles = (p: IconProps = {}) => <Svg {...p}><path d="M20 7h-3a2 2 0 0 1-2-2V2" /><path d="M9 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7l4 4v10a2 2 0 0 1-2 2Z" /><path d="M3 7.6v12.8A1.55 1.55 0 0 0 4.6 22h9.8" /></Svg>;
const IconInfo = (p: IconProps = {}) => <Svg {...p}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></Svg>;
const IconMessageSquare = (p: IconProps = {}) => <Svg {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Svg>;
const IconPause = (p: IconProps = {}) => <Svg {...p}><circle cx="12" cy="12" r="10" /><path d="M10 9v6" /><path d="M14 9v6" /></Svg>;
const IconPlay = (p: IconProps = {}) => <Svg {...p}><circle cx="12" cy="12" r="10" /><path d="m10 8 6 4-6 4V8z" /></Svg>;
const IconRadio = (p: IconProps = {}) => <Svg {...p}><circle cx="12" cy="12" r="2" /><path d="M4.93 19.07a10 10 0 0 1 0-14.14" /><path d="M7.76 16.24a6 6 0 0 1 0-8.48" /><path d="M16.24 7.76a6 6 0 0 1 0 8.48" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></Svg>;
const IconRefreshCw = (p: IconProps = {}) => <Svg {...p}><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></Svg>;
const IconShieldCheck = (p: IconProps = {}) => <Svg {...p}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></Svg>;
const IconWifi = (p: IconProps = {}) => <Svg {...p}><path d="M5 13a10 10 0 0 1 14 0" /><path d="M8.5 16.5a5 5 0 0 1 7 0" /><path d="M12 20h.01" /></Svg>;

/* ---- category labels (mirror of @hoichoi/db CATEGORY_SEED slugs) ---- */
const CATEGORY_META: { key: string; label: string; color: string }[] = [
  { key: "child-sexual-abuse", label: "শিশু যৌন নির্যাতন", color: "#f38e98" },
  { key: "extramarital-crime", label: "পরকীয়া অপরাধ", color: "#eac181" },
  { key: "missing-children", label: "নিখোঁজ শিশু", color: "#8faeff" },
];

const timeLabel = (at: string, short = false) =>
  new Intl.DateTimeFormat("bn-BD", {
    timeZone: "Asia/Dhaka",
    month: "short",
    day: "numeric",
    ...(short ? {} : { hour: "2-digit", minute: "2-digit" }),
  }).format(new Date(at));
const rangeLabels = { "24h": "২৪ ঘণ্টা", "7d": "৭ দিন", all: "সব সময়" } as const;

function Trends({ points, range }: { points: AnalyticsPoint[]; range: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const id = useId().replace(/:/g, "");
  const max = Math.max(4, Math.ceil(Math.max(...points.flatMap(p => [p.collected, p.published])) / 4) * 4);
  const x = (i: number) => 45 + i * (724 / Math.max(1, points.length - 1));
  const y = (v: number) => 194 - (v / max) * 170;
  const curve = (key: "collected" | "published") => points.map((p, i) => { if (i === 0) return `M ${x(i)},${y(p[key])}`; const prev = points[i - 1]; return prev ? `C ${(x(i - 1) + x(i)) / 2},${y(prev[key])} ${(x(i - 1) + x(i)) / 2},${y(p[key])} ${x(i)},${y(p[key])}` : ""; }).join(" ");
  const collection = curve("collected");
  const publication = curve("published");
  const signature = `${range}-${points.map(p => `${p.collected},${p.published}`).join("/")}`;
  const point = hover === null ? null : points[hover];
  return <div className={s.chart} onMouseLeave={() => setHover(null)}>
    <svg viewBox="0 0 800 240" role="img" aria-label="নির্বাচিত সময়ে সংগৃহীত ও প্রকাশিত প্রতিবেদনের গ্রাফ" preserveAspectRatio="none">
      <defs><linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c8f65d" stopOpacity=".18" /><stop offset="100%" stopColor="#c8f65d" stopOpacity="0" /></linearGradient></defs>
      {[0, 1, 2, 3, 4].map(i => <g key={i}><line className={s.gridLine} x1="45" x2="770" y1={y(i * max / 4)} y2={y(i * max / 4)} /><text x="28" y={y(i * max / 4) + 3} textAnchor="end">{bnNum(i * max / 4)}</text></g>)}
      <g key={signature}>
        <path className={s.area} d={`${collection} L ${x(points.length - 1)},194 L 45,194 Z`} fill={`url(#${id}-fill)`} />
        <path className={s.trace} pathLength={1} d={collection} fill="none" stroke="#c8f65d" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path className={s.trace} pathLength={1} d={publication} fill="none" stroke="#90afff" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ animationDelay: "160ms" }} />
      </g>
      {points.map((p, i) => (i % Math.ceil(points.length / 5) === 0 || i === points.length - 1) && <text key={i} x={x(i)} y="222" textAnchor={i === points.length - 1 ? "end" : "middle"}>{range === "24h" ? timeBn(p.at) : timeLabel(p.at, true)}</text>)}
      {hover !== null && point && <g><line x1={x(hover)} x2={x(hover)} y1="16" y2="194" stroke="#c8f65d55" strokeDasharray="4 5" /><circle cx={x(hover)} cy={y(point.collected)} r="5" fill="#0f171d" stroke="#c8f65d" strokeWidth="2" /><circle cx={x(hover)} cy={y(point.published)} r="4" fill="#0f171d" stroke="#90afff" strokeWidth="2" /></g>}
    </svg>
    {points.map((p, i) => <button key={i} className={s.axisButton} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} style={{ left: `${3 + (i * 93) / points.length}%`, width: `${93 / points.length}%` }} aria-label={`${timeLabel(p.at)}: সংগৃহীত ${p.collected}, প্রকাশিত ${p.published}`} />)}
    {point && hover !== null && <div className={s.tooltip} style={{ left: `${Math.min(65, Math.max(5, (hover / (points.length - 1)) * 80))}%` }}><b>{fullTimeBn(point.at)}</b><p style={{ color: "#c8f65d" }}>সংগৃহীত <span>{bnNum(point.collected)}টি</span></p><p style={{ color: "#90afff" }}>প্রকাশিত <span>{bnNum(point.published)}টি</span></p></div>}
  </div>;
}

function ContentDonut({ values }: { values: { published: number; pending: number; duplicate: number } }) {
  const [active, setActive] = useState<number | null>(null);
  const parts = [
    { key: "published", label: "প্রকাশিত", count: values.published, color: "#c8f65d" },
    { key: "pending", label: "রিভিউ অপেক্ষায়", count: values.pending, color: "#90afff" },
    { key: "duplicate", label: "ডুপ্লিকেট", count: values.duplicate, color: "#eac181" },
  ];
  const total = parts.reduce((v, p) => v + p.count, 0);
  let offset = 0;
  return <><div className={s.donutWrap}><svg viewBox="0 0 200 200" aria-label="প্রকাশিত, রিভিউ অপেক্ষায় ও ডুপ্লিকেট কনটেন্টের অনুপাত" role="img"><circle cx="100" cy="100" r="74" fill="none" stroke="#243135" strokeWidth="13" />{parts.map((p, i) => { const portion = total ? (p.count / total) * 100 : 0; const start = offset; offset += portion; return <circle key={p.key} className={s.donutRing} cx="100" cy="100" r="74" pathLength="100" fill="none" stroke={p.color} strokeWidth={active === i ? 18 : 13} strokeDasharray={`${Math.max(0, portion - (portion > 1 ? 1 : 0))} ${100 - Math.max(0, portion - (portion > 1 ? 1 : 0))}`} strokeDashoffset={-start} opacity={active === null || active === i ? 1 : 0.25} />; })}</svg><div className={s.donutCenter}><strong>{bnNum(active === null ? total : (parts[active]?.count ?? 0))}</strong><span>{active === null ? "মোট রেকর্ড" : (parts[active]?.label ?? "")}</span></div></div><div className={s.donutLegend}>{parts.map((p, i) => <button key={p.key} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} onClick={() => setActive(active === i ? null : i)} aria-pressed={active === i}><i style={{ background: p.color }} />{p.label}<b>{bnNum(p.count)}</b><small>{total ? `${bnNum(Math.round((p.count / total) * 100))}%` : "—"}</small></button>)}</div></>;
}

export default function LiveAnalytics() {
  const live = useLiveData();
  const metrics = useMemo(() => [
    { title: "সংগৃহীত প্রতিবেদন", value: live?.data?.totals.collected, caption: "নির্বাচিত সময়ের নতুন রেকর্ড", color: "#c8f65d", icon: IconFiles },
    { title: "প্রকাশিত প্রতিবেদন", value: live?.data?.totals.published, caption: "পাবলিক সাইটে প্রকাশিত", color: "#90afff", icon: IconCheckCheck },
    { title: "ডুপ্লিকেট চিহ্নিত", value: live?.data?.totals.duplicates, caption: "পুনরাবৃত্তি হিসেবে সংরক্ষিত", color: "#eac181", icon: IconShieldCheck },
    { title: "অনুমোদিত মন্তব্য", value: live?.data?.totals.approvedComments, caption: "সম্পাদকীয় রিভিউ পেরিয়েছে", color: "#f38e98", icon: IconMessageSquare },
  ], [live?.data]);
  if (!live) return null;
  const { data, loading, error, paused, range, setRange, refresh, togglePaused, age } = live;
  const connection = error ? "সংযোগ বিচ্ছিন্ন" : paused ? "আপডেট বিরতিতে" : data ? "LIVE DATA" : "CONNECTING";
  const worker = data?.collector.status;
  const workerReady = worker === "ready" || worker === "working";
  const workerLabel = worker === "working" ? "কাজ চলছে" : worker === "ready" ? "প্রস্তুত" : worker === "offline" ? "অফলাইন" : worker === "error" ? "ত্রুটি" : "সংযুক্ত নয়";
  return <section id="live-insights" className={s.section}>
    <div className={s.inner}>
      <header className={s.header}><div><div className={s.eyebrow}>THE NEWSROOM, IN NUMBERS</div><h2 className={s.title}>হইচই চলছে। <span>দেখুন সংখ্যায়।</span></h2><p className={s.intro}>কত খবর এল, কতটি প্রকাশ হলো, আর কত মন্তব্য অনুমোদন পেল—ডাটাবেসের তথ্যেই পুরো ছবিটা দেখুন।</p></div><div className={s.livePill + (paused || error ? ` ${s.paused}` : "")} role="status"><i className={s.dot} />{connection}</div></header>
      <div className={s.toolbar}><div className={s.updated}><IconActivity size={13} /><span>{data ? `শেষ আপডেট ${timeBn(data.generatedAt)} · ${bnNum(age)} সেকেন্ড আগে` : "সর্বশেষ তথ্য আনা হচ্ছে…"}</span></div><div className={s.controls}><div className={s.range} aria-label="পরিসংখ্যানের সময়সীমা">{(Object.keys(rangeLabels) as (keyof typeof rangeLabels)[]).map(r => <button key={r} onClick={() => setRange(r)} className={range === r ? s.active : ""} aria-pressed={range === r}>{rangeLabels[r]}</button>)}</div><button className={s.iconButton} onClick={togglePaused} aria-label={paused ? "লাইভ আপডেট চালু করুন" : "লাইভ আপডেট বিরতি দিন"} title={paused ? "আপডেট চালু" : "আপডেট বিরতি"}>{paused ? <IconPlay size={14} /> : <IconPause size={14} />}</button><button className={s.iconButton} onClick={refresh} disabled={loading} aria-label="পরিসংখ্যান রিফ্রেশ" title="রিফ্রেশ"><IconRefreshCw size={14} className={loading ? s.spinning : ""} /></button></div></div>
      {error && <div className={s.error} role="alert"><span>{error} {data ? "শেষ পাওয়া তথ্য দেখানো হচ্ছে।" : ""}</span><button onClick={refresh}>আবার চেষ্টা</button></div>}
      <div className={s.metrics}>{metrics.map(m => <div key={m.title} className={s.metric} style={{ "--metric-accent": m.color } as CSSProperties}><div className={s.metricTop}>{m.title}<span style={{ color: m.color }}><m.icon size={16} /></span></div><div className={s.metricValue}>{m.value === undefined ? "—" : <Counter end={m.value} />}<small>টি</small></div><div className={s.metricBottom}>{m.caption}</div><div className={s.metricLine} /></div>)}</div>
      <div className={s.chartGrid}>
        <article className={s.card}><div className={s.cardHeader}><div><h3 className={s.cardTitle}>সংগ্রহ থেকে প্রকাশ</h3><p className={s.cardSub}>সময় অনুযায়ী প্রতিবেদনের সংখ্যা · {rangeLabels[range]}</p></div><span className={s.liveTag}>ACTIVITY TREND</span></div><div className={s.legend}><span><i style={{ background: "#c8f65d" }} />সংগৃহীত</span><span><i style={{ background: "#90afff" }} />প্রকাশিত</span></div>{data ? <Trends points={data.series} range={range} /> : <div className={s.skeleton} />}<div className={s.chartNote}><IconInfo size={12} />গ্রাফে মাউস রাখুন বা Tab চাপুন—প্রতিটি সময়ের সংখ্যা দেখা যাবে।</div></article>
        <article className={s.card}><div className={s.cardHeader}><div><h3 className={s.cardTitle}>কনটেন্টের অবস্থা</h3><p className={s.cardSub}>ডেটাবেসের সব রেকর্ড · লাইভ গণনা</p></div><IconFiles size={17} color="#9dad96" /></div>{data ? <ContentDonut values={data.allArticles} /> : <div className={s.skeleton} />}</article>
      </div>
      <div className={s.bottomGrid}>
        <article className={s.card}><div className={s.cardHeader}><div><h3 className={s.cardTitle}>কোন বিষয়ে কত খবর</h3><p className={s.cardSub}>নির্বাচিত সময়ে সংগৃহীত রেকর্ড</p></div></div><div className={s.categories}>{CATEGORY_META.map(k => { const value = data?.categories.find(c => c.key === k.key)?.count || 0; const max = Math.max(1, ...(data?.categories.map(c => c.count) || [])); return <div key={k.key} className={s.categoryRow}><span>{k.label}</span><div className={s.barTrack}><div className={s.barFill} style={{ width: `${(value / max) * 100}%`, background: k.color }} /></div><b>{data ? bnNum(value) : "—"}</b></div>; })}</div></article>
        <article className={s.card}><div className={s.cardHeader}><div><h3 className={s.cardTitle}>সর্বশেষ প্রকাশনা</h3><p className={s.cardSub}>প্রকাশিত সময় অনুযায়ী · স্বয়ংক্রিয় আপডেট</p></div><IconArrowUpRight size={16} color="#a0b290" /></div><div className={s.activity}>{data?.activity.slice(0, 3).map(a => <Link href={a.href} key={a.id}><i /><div><p>{a.text}</p><span>{timeLabel(a.at)}</span></div></Link>)}{data && !data.activity.length && <p className={s.empty}>এখনো কোনো প্রকাশিত প্রতিবেদন নেই।</p>}</div></article>
        <article className={s.card}><div className={s.cardHeader}><div><h3 className={s.cardTitle}>এই মুহূর্তের অবস্থা</h3><p className={s.cardSub}>পরীক্ষিত সংযোগ, অনুমান নয়</p></div><IconRadio size={17} color="#c8f65d" /></div><div className={s.services}>
          <div className={s.service}><IconDatabase size={16} /><p>{data?.database.driver || "TURSO"} ডাটাবেস<small>{data ? `${data.database.mode.toUpperCase()} · ${data.database.latencyMs}ms query` : "পরীক্ষা চলছে"}</small></p><span className={s.serviceStatus + (!data || error || paused ? ` ${s.warn}` : "")}><i />{error ? "অফলাইন" : paused ? "শেষ ফল" : data ? "সংযুক্ত" : "অপেক্ষা"}</span></div>
          <div className={s.service}><IconWifi size={16} /><p>পাবলিক ডেটা API<small>GET /api/stats · 10s</small></p><span className={s.serviceStatus + (!data || error || paused ? ` ${s.warn}` : "")}><i />{error ? "ত্রুটি" : paused ? "বিরতি" : data ? "সাড়া দিচ্ছে" : "অপেক্ষা"}</span></div>
          <div className={s.service}><IconRadio size={16} /><p>ডেস্কটপ কালেক্টর<small>{data?.collector.lastSeenAt ? `Heartbeat ${timeBn(data.collector.lastSeenAt)}` : "Heartbeat পাওয়া যায়নি"}</small></p><span className={s.serviceStatus + (!workerReady || error ? ` ${s.warn}` : "")}><i />{error ? "অজানা" : workerLabel}</span></div>
        </div></article>
      </div>
      <div className={s.footnote}><span><IconInfo size={13} />প্রতি ১০ সেকেন্ডে নতুন তথ্য। গ্রাফে ডাটাবেসের রেকর্ড গণনা করা হয়; নমুনা রেকর্ড থাকলে সেটিও অন্তর্ভুক্ত। কালেক্টর শুধু প্রকৃত heartbeat পেলেই সংযুক্ত দেখাবে।</span><Link href="/admin">পাইপলাইন কীভাবে চলে ↗</Link></div>
      <div className={s.srOnly} aria-live="polite">{error ? "লাইভ তথ্য আপডেট হয়নি" : data ? "পরিসংখ্যান আপডেট হয়েছে" : "পরিসংখ্যান লোড হচ্ছে"}</div>
    </div>
  </section>;
}