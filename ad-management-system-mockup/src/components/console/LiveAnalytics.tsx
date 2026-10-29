"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Tick {
  ok: true;
  ts: string;
  tick: number;
  totals: { impressions: number; clicks: number; spend: number; ctr: number; cpm: number };
  delta: { impressions: number; clicks: number; spend: number };
  series: { t: string; impressions: number; clicks: number }[];
  slots: { key: string; label: string; filled: boolean; ref: string | null; heat: number; imp: number }[];
  events: { id: string; kind: "impression" | "click" | "booking" | "payment"; text: string; amount?: number; at: string }[];
  topCreatives: { name: string; slot: string; imp: number; ctr: number }[];
}

const RANGES = [
  { key: "1H", name: "১ ঘণ্টা", sec: 3600 },
  { key: "24H", name: "২৪ ঘণ্টা", sec: 86400 },
  { key: "7D", name: "৭ দিন", sec: 604800 },
  { key: "30D", name: "৩০ দিন", sec: 2592000 },
];
const INTERVALS = [2000, 5000, 10000];

const BN = "০১২৩৪৫৬৭৮৯";
const bnNum = (n: number) => n.toLocaleString("en-US").replace(/\d/g, (d) => BN[Number(d)]);
const short = (n: number) => (n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

/* ------------------------- animated number ------------------------- */
function useCount(target: number) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const a = from.current;
    const b = target;
    if (a === b) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 650);
      setV(Math.round(a + (b - a) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = b;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

function Kpi({
  label, value, suffix, delta, tone, spark,
}: {
  label: string; value: number; suffix?: string; delta?: number; tone: string; spark: number[];
}) {
  const n = useCount(value);
  const prev = spark.length > 1 ? spark[spark.length - 2] : value;
  const pct = prev ? ((value - prev) / prev) * 100 : 0;
  const dir = Math.abs(pct) < 0.4 ? "flat" : pct > 0 ? "up" : "down";

  const path = useMemo(() => {
    if (spark.length < 2) return "";
    const max = Math.max(...spark, 1);
    const min = Math.min(...spark, 0);
    const span = Math.max(1, max - min);
    return spark
      .map((p, i) => `${i === 0 ? "M" : "L"}${(i / (spark.length - 1)) * 100},${28 - ((p - min) / span) * 24 - 2}`)
      .join(" ");
  }, [spark]);

  return (
    <div className="kpi">
      <div className="kpi-label"><span>{label}</span><i className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} /></div>
      <div className="kpi-value">
        {suffix}{bnNum(n)}
      </div>
      <div className="kpi-foot">
        <span className="kpi-delta" data-dir={dir}>
          {dir === "up" ? "▲" : dir === "down" ? "▼" : "■"} {Math.abs(pct).toFixed(1)}%
          {delta ? <b className="ml-1">+{short(delta)}</b> : null}
        </span>
        <svg className="kpi-spark" width="96" height="30" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
          <path d={`${path} L100,30 L0,30 Z`} fill={tone} opacity="0.13" />
          <path d={path} fill="none" stroke={tone} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    </div>
  );
}

/* ------------------------- streaming chart ------------------------- */
function StreamChart({ series, metric }: { series: Tick["series"]; metric: "impressions" | "clicks" }) {
  const W = 820, H = 210, pad = { t: 12, r: 12, b: 20, l: 38 };
  const [hover, setHover] = useState<{ x: number; y: number; p: Tick["series"][number] } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  const pts = series.map((p) => p[metric]);
  const max = Math.max(...pts, 1);
  const stepX = (W - pad.l - pad.r) / Math.max(1, pts.length - 1);
  const sx = (i: number) => pad.l + i * stepX;
  const sy = (v: number) => H - pad.b - (v / max) * (H - pad.t - pad.b);
  const line = pts.map((v, i) => `${i === 0 ? "M" : "L"}${sx(i)},${sy(v)}`).join(" ");
  const area = `${line} L${sx(pts.length - 1)},${H - pad.b} L${sx(0)},${H - pad.b} Z`;

  return (
    <div className="chart-frame" ref={wrap}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: H }}
        onMouseMove={(e) => {
          const box = wrap.current?.getBoundingClientRect();
          if (!box) return;
          const rel = ((e.clientX - box.left) / box.width) * W;
          const i = Math.max(0, Math.min(pts.length - 1, Math.round((rel - pad.l) / stepX)));
          setHover({ x: e.clientX - box.left, y: e.clientY - box.top, p: series[i] });
        }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="streamFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5f8f0e" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#5f8f0e" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="chart-grid">
          {[0, 1, 2, 3, 4].map((i) => {
            const y = pad.t + (i * (H - pad.t - pad.b)) / 4;
            return <line key={i} x1={pad.l} x2={W - pad.r} y1={y} y2={y} />;
          })}
        </g>
        <g className="chart-axis">
          {[0, 1, 2, 3, 4].map((i) => {
            const y = pad.t + (i * (H - pad.t - pad.b)) / 4;
            return <text key={i} x={pad.l - 6} y={y + 3} textAnchor="end">{short(Math.round(max - (i * max) / 4))}</text>;
          })}
          {series.map((p, i) => (i % 8 === 0 ? <text key={i} x={sx(i)} y={H - 5} textAnchor="middle">{p.t.slice(0, 5)}</text> : null))}
        </g>
        <path d={area} fill="url(#streamFill)" />
        <path className="chart-line" d={line} fill="none" stroke="#5f8f0e" strokeWidth="2.1" strokeLinejoin="round" strokeLinecap="round" />
        {pts.length ? (
          <circle cx={sx(pts.length - 1)} cy={sy(pts[pts.length - 1])} r="3.6" fill="#5f8f0e">
            <animate attributeName="r" values="3.6;6;3.6" dur="1.8s" repeatCount="indefinite" />
          </circle>
        ) : null}
        {hover ? <line x1={sx(series.indexOf(hover.p))} x2={sx(series.indexOf(hover.p))} y1={pad.t} y2={H - pad.b} stroke="#d2202c" strokeDasharray="3 3" /> : null}
      </svg>
      {hover ? (
        <div className="chart-tooltip" style={{ left: Math.min(hover.x + 12, (wrap.current?.clientWidth ?? 400) - 150), top: hover.y - 10 }}>
          <b>{hover.p.t}</b> · {metric === "impressions" ? "ইম্প্রেশন" : "ক্লিক"}: {bnNum(hover.p[metric])}
        </div>
      ) : null}
    </div>
  );
}

/* ================================================================== */

export default function LiveAnalytics({
  scope = "admin",
  title = "রিয়েল-টাইম অ্যানালিটিক্স",
}: {
  scope?: "admin" | "client";
  title?: string;
}) {
  const [data, setData] = useState<Tick | null>(null);
  const [state, setState] = useState<"live" | "paused" | "error">("live");
  const [intervalMs, setIntervalMs] = useState(2000);
  const [range, setRange] = useState("24H");
  const [metric, setMetric] = useState<"impressions" | "clicks">("impressions");
  const [impSpark, setImpSpark] = useState<number[]>([]);
  const [clkSpark, setClkSpark] = useState<number[]>([]);
  const [spendSpark, setSpendSpark] = useState<number[]>([]);
  const [feed, setFeed] = useState<Tick["events"]>([]);
  const seen = useRef<Set<string>>(new Set());

  const pull = useCallback(async () => {
    try {
      const r = await fetch(`/api/ads/live?scope=${scope}&range=${range}`, { cache: "no-store" });
      const j = (await r.json()) as Tick;
      if (!j.ok) throw new Error("bad payload");
      setData(j);
      setState("live");
      setImpSpark((s) => [...s, j.totals.impressions].slice(-24));
      setClkSpark((s) => [...s, j.totals.clicks].slice(-24));
      setSpendSpark((s) => [...s, j.totals.spend].slice(-24));
      setFeed((f) => {
        const fresh = j.events.filter((e) => !seen.current.has(e.id));
        fresh.forEach((e) => seen.current.add(e.id));
        return [...fresh, ...f].slice(0, 26);
      });
    } catch {
      setState((s) => (s === "paused" ? s : "error"));
    }
  }, [scope, range]);

  useEffect(() => {
    void pull();
    if (state === "paused") return;
    const id = setInterval(pull, intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, state === "paused", range, scope]);

  const rangeSec = RANGES.find((r) => r.key === range)?.sec ?? 86400;
  const filled = data?.slots.filter((s) => s.filled).length ?? 0;
  const total = data?.slots.length ?? SLOTS_LEN;
  const fillPct = total ? Math.round((filled / total) * 100) : 0;

  return (
    <section className="live-shell">
      {/* head */}
      <div className="live-head">
        <div className="flex flex-wrap items-center gap-3">
          <span className="live-state" data-state={state}>
            <span className="live-dot" />
            {state === "live" ? "LIVE" : state === "paused" ? "PAUSED" : "RECONNECTING"}
          </span>
          <b className="font-serif-bn text-[15px] text-ink">{title}</b>
          <span className="c-label">
            {scope === "admin" ? "ALL ACCOUNTS" : "MY CAMPAIGNS"} · {data ? new Date(data.ts).toLocaleTimeString("en-GB") : "—"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="range-tabs">
            {RANGES.map((r) => (
              <button key={r.key} type="button" data-on={range === r.key ? "1" : "0"} onClick={() => setRange(r.key)}>{r.name}</button>
            ))}
          </span>
          <span className="seg">
            {INTERVALS.map((ms) => (
              <button key={ms} type="button" data-on={intervalMs === ms ? "1" : "0"} onClick={() => setIntervalMs(ms)}>{ms / 1000}s</button>
            ))}
          </span>
          <button type="button" className="c-btn c-btn-ghost px-3 py-1.5 text-[10.5px]" onClick={() => setState((s) => (s === "paused" ? "live" : "paused"))}>
            {state === "paused" ? "▶ চালু" : "⏸ বিরতি"}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid p-4">
        <Kpi label="ইম্প্রেশন" value={data?.totals.impressions ?? 0} delta={data?.delta.impressions} tone="#0b7c72" spark={impSpark} />
        <Kpi label="ক্লিক" value={data?.totals.clicks ?? 0} delta={data?.delta.clicks} tone="#5f8f0e" spark={clkSpark} />
        <Kpi label="রাজস্ব" value={data?.totals.spend ?? 0} suffix="৳" delta={data?.delta.spend} tone="#037c1b" spark={spendSpark} />
        <Kpi label="CTR %" value={Math.round((data?.totals.ctr ?? 0) * 100) / 100} tone="#b45309" spark={impSpark.slice(-12)} />
        <Kpi label="CPM ৳" value={Math.round(data?.totals.cpm ?? 0)} tone="#2563eb" spark={spendSpark.slice(-12)} />
        <div className="kpi">
          <div className="kpi-label"><span>ইনভেন্টরি</span><i className="h-1.5 w-1.5 rounded-full" style={{ background: "#d2202c" }} /></div>
          <div className="kpi-value">{bnNum(filled)}<span className="text-[15px] text-ink-soft">/{bnNum(total)}</span></div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
            <div className="h-full rounded-full bg-lime transition-[width] duration-700" style={{ width: `${fillPct}%` }} />
          </div>
          <p className="mt-1.5 text-[9.5px] text-ink-soft">স্লট পূর্ণ · {bnNum(fillPct)}%</p>
        </div>
      </div>

      <div className="grid gap-4 border-t border-ink/12 p-4 lg:grid-cols-3">
        {/* chart */}
        <div className="lg:col-span-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <b className="font-serif-bn text-[14px] text-ink">লাইভ স্ট্রিম</b>
            <span className="seg">
              <button type="button" data-on={metric === "impressions" ? "1" : "0"} onClick={() => setMetric("impressions")}>ইম্প্রেশন</button>
              <button type="button" data-on={metric === "clicks" ? "1" : "0"} onClick={() => setMetric("clicks")}>ক্লিক</button>
            </span>
          </div>
          <StreamChart series={data?.series ?? []} metric={metric} />
          <p className="mt-1.5 font-mono-x text-[8.5px] tracking-[0.16em] text-ink-soft uppercase">
            উইন্ডো {RANGES.find((r) => r.key === range)?.name} · প্রতি {intervalMs / 1000} সেকেন্ডে হালনাগাদ
          </p>
        </div>

        {/* event feed */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <b className="font-serif-bn text-[14px] text-ink">লাইভ ইভেন্ট</b>
            <span className="c-label">{feed.length} EVENTS</span>
          </div>
          <div className="feed border border-ink/12 rounded-lg">
            {feed.length === 0 ? (
              <p className="p-4 text-center text-[11.5px] text-ink-soft">ইভেন্ট আসছে…</p>
            ) : (
              feed.map((e) => (
                <div className="feed-row" key={e.id}>
                  <span className="feed-dot" style={{ background: e.kind === "click" ? "#d2202c" : e.kind === "payment" ? "#037c1b" : "#0b7c72" }} />
                  <span className="min-w-0 flex-1 truncate text-ink">{e.text}</span>
                  {e.amount ? <b className="font-mono-x text-[10px] text-ink">৳{bnNum(e.amount)}</b> : null}
                  <span className="feed-time">{e.at}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* slots + top creatives */}
      <div className="grid gap-4 border-t border-ink/12 p-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <b className="font-serif-bn text-[14px] text-ink">স্লট অকুপেন্সি (লাইভ)</b>
            <span className="c-label">{filled} পূর্ণ · {total - filled} খালি</span>
          </div>
          <div className="slot-grid">
            {(data?.slots ?? []).map((s) => (
              <div className="slot-cell" key={s.key} data-filled={s.filled ? "1" : "0"} data-hot={s.filled && s.heat > 85 ? "1" : "0"} title={s.ref ? `${s.ref} · ${s.imp.toLocaleString()} ইম্প্রেশন` : "খালি — হাউস অ্যাড"}>
                <p className="slot-cell-name">{s.label}</p>
                <p className="slot-cell-meta">
                  {s.filled ? `${s.ref} · ${short(s.imp)}` : "হাউস অ্যাড"}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <b className="font-serif-bn text-[14px] text-ink">সেরা ক্রিয়েটিভ</b>
          <div className="mt-2 space-y-2">
            {(data?.topCreatives ?? []).map((c, i) => (
              <div key={c.name + i} className="border border-ink/12 rounded-lg p-2.5">
                <p className="truncate font-serif-bn text-[12.5px] font-bold text-ink">{c.name}</p>
                <p className="mt-0.5 truncate text-[10px] text-ink-soft">{c.slot}</p>
                <div className="mt-1.5 flex items-center justify-between font-mono-x text-[9.5px] text-ink-soft">
                  <span>{short(c.imp)} imp</span>
                  <b className="text-ink">{c.ctr.toFixed(2)}% CTR</b>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-ink/10">
                  <div className="h-full rounded-full bg-alizarin transition-[width] duration-700" style={{ width: `${Math.min(100, c.ctr * 22)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 font-mono-x text-[8.5px] tracking-[0.16em] text-ink-soft uppercase">
            রিফ্রেশ উইন্ডো {Math.round(rangeSec / 60)} মিনিট
          </p>
        </div>
      </div>
    </section>
  );
}

const SLOTS_LEN = 20;
