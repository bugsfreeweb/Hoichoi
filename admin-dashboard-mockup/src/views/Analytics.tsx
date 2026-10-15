import { useMemo, useState } from "react";
import {
  AreaChart,
  BarChart,
  BubbleChart,
  Candlestick,
  RadarChart,
  RankBars,
  Treemap,
  Waterfall,
} from "../components/charts";
import { Badge, Card, CardHead, Legend, SegMent } from "../components/ui";
import { bubbleData, buildTimeseries, costWaterfall, palette, radarAxes, sources, treemapData, type Range } from "../lib/data";

const RANGES = ["7D", "30D", "90D"] as const;

const candleData = [
  { label: "সোম", o: 420, h: 520, l: 390, c: 498 },
  { label: "মঙ্গল", o: 498, h: 540, l: 455, c: 468 },
  { label: "বুধ", o: 468, h: 610, l: 460, c: 596 },
  { label: "বৃহঃ", o: 596, h: 640, l: 548, c: 562 },
  { label: "শুক্র", o: 562, h: 700, l: 556, c: 688 },
  { label: "শনি", o: 688, h: 742, l: 640, c: 654 },
  { label: "রবি", o: 654, h: 690, l: 582, c: 672 },
];

export default function Analytics() {
  const [range, setRange] = useState<Range>("30D");
  const ts = useMemo(() => buildTimeseries(range, 19), [range]);

  const weekBars = {
    labels: ["সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি", "রবি"],
    series: [
      { name: "মোবাইল", color: palette.amber, values: [320, 412, 388, 465, 502, 448, 392] },
      { name: "ডেস্কটপ", color: palette.cyan, values: [180, 214, 196, 242, 268, 206, 178] },
      { name: "অ্যাপ", color: palette.violet, values: [96, 124, 112, 148, 162, 134, 108] },
    ],
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2" delay={60}>
          <CardHead
            bn="পাঠক সম্পৃক্ততা · পূর্বাভাস সহ"
            en="Engagement trend with 7-step forecast band"
            icon="🧭"
            right={<SegMent options={RANGES} value={range} onChange={setRange} />}
          />
          <AreaChart
            labels={ts.labels}
            series={ts.series.slice(0, 2)}
            height={280}
            forecastFrom={Math.floor(ts.labels.length * 0.78)}
          />
          <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
            <Legend items={ts.series.slice(0, 2)} />
            <span className="mono text-[9.5px] text-white/30">VIOLET BAND = ARIMA FORECAST</span>
          </div>
        </Card>

        <Card delay={120}>
          <CardHead bn="গুণমান রাডার" en="Hoichoi rewrite vs raw feed" icon="🕸️" />
          <div className="flex justify-center">
            <RadarChart
              size={282}
              axes={radarAxes}
              series={[
                { name: "হৈচৈ", color: palette.amber, values: radarAxes.map((a) => a.a) },
                { name: "কাঁচা ফিড", color: palette.slate, values: radarAxes.map((a) => a.b) },
              ]}
            />
          </div>
          <div className="mt-2 flex justify-center">
            <Legend items={[{ name: "হৈচৈ রিরাইট", color: palette.amber }, { name: "কাঁচা ফিড", color: palette.slate }]} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card delay={60}>
          <CardHead bn="ডিভাইস অনুযায়ী ভিউ" en="Stacked views by platform" icon="📊" right={<Badge tone="info">STACKED</Badge>} />
          <BarChart labels={weekBars.labels} series={weekBars.series} stacked height={250} />
          <div className="mt-2">
            <Legend items={weekBars.series} />
          </div>
        </Card>

        <Card delay={120}>
          <CardHead bn="ঘণ্টাভিত্তিক তুলনা" en="Grouped: collected / published / dropped" icon="📶" />
          <BarChart
            labels={["০০-০৪", "০৪-০৮", "০৮-১২", "১২-১৬", "১৬-২০", "২০-২৪"]}
            series={[
              { name: "সংগৃহীত", color: palette.amber, values: [42, 68, 142, 118, 164, 96] },
              { name: "প্রকাশিত", color: palette.cyan, values: [24, 38, 86, 72, 104, 58] },
              { name: "বাতিল", color: palette.rose, values: [8, 11, 22, 18, 26, 14] },
            ]}
            height={250}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card delay={60}>
          <CardHead bn="বিষয়ভিত্তিক ট্রিম্যাপ" en="Topic share treemap" icon="🧩" />
          <Treemap data={treemapData} height={236} />
        </Card>

        <Card delay={120}>
          <CardHead bn="সোর্স পারফরম্যান্স" en="Latency × success × volume" icon="🫧" />
          <BubbleChart data={bubbleData} height={262} />
        </Card>

        <Card delay={180}>
          <CardHead bn="দৈনিক ভিউ রেঞ্জ" en="OHLC of hourly readership" icon="🕯️" right={<Badge tone="good">+১৪.২%</Badge>} />
          <Candlestick data={candleData} height={248} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card delay={60}>
          <CardHead bn="ইনফ্রা খরচ বিশ্লেষণ" en="Monthly cost waterfall (USD)" icon="💸" />
          <Waterfall data={costWaterfall} height={238} />
        </Card>

        <Card delay={120}>
          <CardHead bn="শীর্ষ সোর্স র‍্যাংকিং" en="Posts ingested per source" icon="🏆" />
          <RankBars
            data={sources.map((s, i) => ({
              label: s.name,
              value: s.posts,
              color: [palette.amber, palette.cyan, palette.violet, palette.rose, palette.emerald, palette.sky][i % 6],
            }))}
          />
        </Card>

        <Card delay={180}>
          <CardHead bn="রূপান্তর মেট্রিক" en="Funnel conversion summary" icon="🔻" />
          <div className="space-y-3">
            {[
              { bn: "ফিড → শট", v: 91.2, c: palette.amber },
              { bn: "শট → ডিডুপ পাস", v: 83.8, c: palette.flame },
              { bn: "ডিডুপ → রিরাইট", v: 80.1, c: palette.violet },
              { bn: "রিরাইট → কমিট", v: 96.1, c: palette.cyan },
              { bn: "কমিট → লাইভ", v: 97.6, c: palette.emerald },
            ].map((r, i) => (
              <div key={r.bn} className="rounded-xl border border-white/6 bg-white/[0.02] p-3 transition hover:border-white/15">
                <div className="flex items-baseline justify-between">
                  <span className="bn text-[12px] text-white/75">{r.bn}</span>
                  <span className="mono text-sm font-bold" style={{ color: r.c }}>
                    {r.v}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${r.v}%`,
                      background: `linear-gradient(90deg, ${r.c}44, ${r.c})`,
                      boxShadow: `0 0 10px ${r.c}66`,
                      animation: `floatUp .6s ease ${i * 80}ms both`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
