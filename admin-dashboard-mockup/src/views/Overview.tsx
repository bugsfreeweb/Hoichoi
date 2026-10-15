import { useMemo, useState } from "react";
import { AreaChart, DonutChart, Heatmap, RadialStack, SemiGauge, Sparkline } from "../components/charts";
import { BulletGroup, LiveStream } from "../components/advanced";
import { Badge, Card, CardHead, KpiCard, Legend, ProgressRow, SegMent } from "../components/ui";
import { activity, buildHeatmap, buildTimeseries, categories, heatmapDays, kpis, palette, type Range } from "../lib/data";
import { useInterval, toBn } from "../lib/hooks";

const RANGES = ["24H", "7D", "30D", "90D"] as const;

export default function Overview() {
  const [range, setRange] = useState<Range>("7D");
  const [stacked, setStacked] = useState(false);
  const [seed, setSeed] = useState(7);
  const ts = useMemo(() => buildTimeseries(range, seed), [range, seed]);
  const heat = useMemo(() => buildHeatmap(42), []);
  const [tick, setTick] = useState(0);
  useInterval(() => setTick((t) => t + 1), 4000);

  const liveFeed = activity.map((a, i) => ({ ...a, i }));

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <KpiCard
            key={k.key}
            bn={k.bn}
            en={k.en}
            value={k.value}
            delta={k.delta}
            color={k.color}
            spark={k.spark}
            delay={i * 80}
          />
        ))}
      </div>

      {/* main chart + donut */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2" delay={120}>
          <CardHead
            bn="সংগ্রহ বনাম প্রকাশ"
            en="Ingest vs publish throughput"
            icon="📈"
            right={
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStacked((s) => !s)}
                  className="mono rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] text-white/50 transition hover:border-amber-brand/40 hover:text-amber-brand"
                >
                  {stacked ? "STACKED" : "LAYERED"}
                </button>
                <SegMent options={RANGES} value={range} onChange={(v) => { setRange(v); setSeed((s) => s + 1); }} />
              </div>
            }
          />
          <AreaChart labels={ts.labels} series={ts.series} stacked={stacked} height={272} />
          <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
            <Legend items={ts.series} />
            <span className="mono text-[9.5px] text-white/30">
              AUTO-REFRESH · {toBn(10)}s · {toBn(tick)} syncs
            </span>
          </div>
        </Card>

        <Card delay={200}>
          <CardHead bn="বিভাগভিত্তিক বণ্টন" en="Category mix · LLM auto-tag" icon="🍩" />
          <div className="flex flex-col items-center">
            <DonutChart
              data={categories.map((c) => ({ label: c.bn, value: c.value, color: c.color }))}
              centerLabel={toBn(categories.reduce((a, c) => a + c.value, 0))}
              centerSub="মোট প্রতিবেদন"
              size={214}
            />
            <div className="mt-4 grid w-full grid-cols-2 gap-x-4 gap-y-2">
              {categories.map((c) => (
                <div key={c.en} className="flex items-center gap-2 text-[11px]">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.color }} />
                  <span className="bn truncate text-white/65">{c.bn}</span>
                  <span className="mono ml-auto text-white/40">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* live stream + bullet targets */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2" delay={120}>
          <CardHead
            bn="লাইভ ইনজেস্ট স্ট্রিম"
            en="Realtime ingest · rolling 60 ticks"
            icon="🌊"
            right={<Badge tone="good" dot>STREAMING</Badge>}
          />
          <LiveStream />
        </Card>

        <Card delay={200}>
          <CardHead bn="লক্ষ্যমাত্রা বনাম বাস্তব" en="Bullet charts · target tracking" icon="🎯" />
          <BulletGroup
            items={[
              { label: "সংগৃহীত রেকর্ড", value: 5842, target: 6000, max: 7000, color: palette.amber },
              { label: "প্রকাশিত প্রতিবেদন", value: 2514, target: 3000, max: 3600, color: palette.cyan },
              { label: "ফ্যাক্ট-গেট স্কোর", value: 91.4, target: 90, max: 100, color: palette.emerald, dec: 1, unit: "%" },
              { label: "আপটাইম", value: 99.2, target: 99.5, max: 100, color: palette.emerald, dec: 1, unit: "%" },
              { label: "ISR লেটেন্সি", value: 8.2, target: 10, max: 14, color: palette.violet, dec: 1, unit: "s", lowerIsBetter: true },
            ]}
          />
        </Card>
      </div>

      {/* gauges + heatmap */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card delay={120}>
          <CardHead bn="সিস্টেম স্বাস্থ্য" en="Service level objectives" icon="🫀" />
          <div className="flex items-center gap-4">
            <div className="relative">
              <RadialStack
                size={190}
                data={[
                  { label: "Uptime", value: 99.2, color: palette.emerald },
                  { label: "Fact gate", value: 91, color: palette.amber },
                  { label: "Dedupe", value: 84, color: palette.cyan },
                  { label: "Queue", value: 62, color: palette.violet },
                ]}
              />
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className="mono text-lg font-bold text-white">৯৯.২%</div>
                  <div className="mono text-[8.5px] uppercase tracking-widest text-white/35">uptime</div>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <ProgressRow label="আপটাইম" value={99} color={palette.emerald} />
              <ProgressRow label="ফ্যাক্ট-গেট পাস" value={91} color={palette.amber} />
              <ProgressRow label="ডিডুপ নির্ভুলতা" value={84} color={palette.cyan} />
              <ProgressRow label="কিউ ব্যাকলগ" value={62} color={palette.violet} />
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-2" delay={200}>
          <CardHead
            bn="সাপ্তাহিক সংগ্রহের তাপচিত্র"
            en="Collection heatmap · day × hour"
            icon="🔥"
            right={<Badge tone="warn">PEAK ১০:০০ · ১৯:০০</Badge>}
          />
          <Heatmap rows={heat} rowLabels={heatmapDays} />
        </Card>
      </div>

      {/* gauges row + activity */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card delay={120}>
          <CardHead bn="ফ্যাক্ট-গেট স্কোর" en="Average confidence" icon="🎯" />
          <div className="flex justify-center">
            <SemiGauge value={91.4} label="০.৯১" sub="threshold ০.৯০" color={palette.amber} size={220} />
          </div>
          <div className="mono mt-2 grid grid-cols-3 gap-2 text-center text-[10px]">
            {[
              { k: "PASS", v: "৮৪২", c: palette.emerald },
              { k: "RETRY", v: "৫৭", c: palette.amber },
              { k: "DROP", v: "১৯", c: palette.rose },
            ].map((s) => (
              <div key={s.k} className="rounded-lg border border-white/8 bg-white/[0.02] py-2">
                <div className="text-base font-bold" style={{ color: s.c }}>
                  {s.v}
                </div>
                <div className="tracking-widest text-white/35">{s.k}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card delay={180}>
          <CardHead bn="রান লেটেন্সি" en="End-to-end pipeline time" icon="⏱️" />
          <div className="flex justify-center">
            <SemiGauge value={64} max={120} label="৭৬ সে" sub="target ৯০ সে" color={palette.cyan} size={220} />
          </div>
          <div className="mt-2 space-y-2">
            {[
              { l: "Playwright শট", v: 2.1, c: palette.violet },
              { l: "LLM পুনর্লিখন", v: 4.4, c: palette.amber },
              { l: "ISR ডিপ্লয়", v: 8.0, c: palette.emerald },
            ].map((r) => (
              <div key={r.l} className="flex items-center gap-2 text-[11px]">
                <span className="bn w-28 truncate text-white/60">{r.l}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full" style={{ width: `${(r.v / 10) * 100}%`, background: r.c }} />
                </div>
                <span className="mono w-10 text-right text-white/45">{r.v}s</span>
              </div>
            ))}
          </div>
        </Card>

        <Card delay={240} className="flex flex-col">
          <CardHead bn="লাইভ অ্যাক্টিভিটি" en="Realtime event stream" icon="⚡" right={<Badge tone="good" dot>LIVE</Badge>} />
          <div className="relative -mr-1 max-h-[300px] flex-1 space-y-2 overflow-y-auto pr-1">
            <span className="absolute left-[7px] top-1 h-full w-px bg-gradient-to-b from-amber-brand/50 via-white/10 to-transparent" />
            {liveFeed.map((a) => (
              <div key={a.t} className="anim-in relative flex gap-3 pl-5" style={{ animationDelay: `${a.i * 90}ms` }}>
                <span
                  className="absolute left-0 top-1.5 h-[15px] w-[15px] rounded-full border-2 border-ink-900"
                  style={{ background: a.color, boxShadow: `0 0 10px ${a.color}99` }}
                />
                <div className="min-w-0 flex-1 rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 transition hover:border-white/15 hover:bg-white/[0.045]">
                  <div className="flex items-center gap-2">
                    <span className="mono text-[9px] tracking-widest" style={{ color: a.color }}>
                      {a.tag}
                    </span>
                    <span className="mono ml-auto text-[9.5px] text-white/30">{a.t}</span>
                  </div>
                  <p className="bn mt-0.5 text-[11.5px] leading-snug text-white/75">{a.bn}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* bottom strip: micro metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { bn: "API রেসপন্স", v: "১৪২ms", d: [40, 36, 44, 30, 28, 33, 26, 24], c: palette.emerald },
          { bn: "টোকেন খরচ /রান", v: "১৮.৪k", d: [20, 24, 22, 29, 27, 33, 31, 36], c: palette.violet },
          { bn: "ক্যাশ হিট রেট", v: "৯৪.৬%", d: [60, 64, 62, 70, 72, 76, 79, 83], c: palette.cyan },
          { bn: "ত্রুটি হার", v: "০.৮%", d: [18, 15, 16, 12, 10, 11, 8, 6], c: palette.rose },
        ].map((m, i) => (
          <Card key={m.bn} delay={i * 70} className="flex items-center justify-between !py-4">
            <div>
              <p className="bn text-[11px] text-white/45">{m.bn}</p>
              <p className="mono mt-1 text-lg font-bold text-white">{m.v}</p>
            </div>
            <Sparkline values={m.d} color={m.c} width={92} height={34} />
          </Card>
        ))}
      </div>
    </div>
  );
}
