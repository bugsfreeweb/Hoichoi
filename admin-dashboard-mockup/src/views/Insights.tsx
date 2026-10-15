import { useState } from "react";
import {
  BoxPlot,
  ComboChart,
  RadialBars,
  RoseChart,
  Sankey,
  Stacked100,
  Sunburst,
  WordCloud,
  type BoxStat,
  type SankeyLink,
  type SankeyNode,
  type SunItem,
} from "../components/advanced";
import { Reveal, Typewriter } from "../components/effects";
import { Badge, Card, CardHead, Legend } from "../components/ui";
import { buildHeatmap, palette, sources } from "../lib/data";
import { useInterval } from "../lib/hooks";
import { cn } from "../utils/cn";

const INSIGHTS = [
  "আজ সন্ধ্যা ৭টার পর সংগ্রহ ২.৪× বাড়ে — অপরাধ ও পুরসভা বিভাগে ডুপ্লিকেটের হার সবচেয়ে বেশি।",
  "Metro Rail Alerts সোর্সের সফলতা মাত্র ৭২.৩% — রিট্রাই কনফিগ ও টাইমআউট সেটিং যাচাই করুন।",
  "ফ্যাক্ট-গেটের নিচে পড়া ১৯টি পোস্ট পুনর্লিখনে পাঠানো হয়েছে — গড় স্কোর আবার ০.৯১-এ উঠেছে।",
];

const SRC_COLORS = [palette.amber, palette.cyan, palette.violet, palette.rose, palette.emerald, palette.sky];

const sankeyNodes: SankeyNode[] = [
  ...sources.map((s, i) => ({ id: `s${i}`, label: s.name, col: 0, color: SRC_COLORS[i] })),
  { id: "dedupe", label: "ডুপ্লিকেট গেট", col: 1, color: palette.flame },
  { id: "pub", label: "প্রকাশিত", col: 2, color: palette.emerald },
  { id: "rev", label: "রিভিউ কিউ", col: 2, color: palette.amber },
  { id: "rej", label: "বাতিল", col: 2, color: palette.rose },
  { id: "dup", label: "ডুপ্লিকেট", col: 2, color: palette.slate },
];

const sankeyLinks: SankeyLink[] = [
  ...sources.map((s, i) => ({ from: `s${i}`, to: "dedupe", value: s.posts })),
  { from: "dedupe", to: "pub", value: 2514 },
  { from: "dedupe", to: "rev", value: 1296 },
  { from: "dedupe", to: "rej", value: 626 },
  { from: "dedupe", to: "dup", value: 738 },
];

const sunData: SunItem[] = [
  { label: "অপরাধ", value: 1284, color: palette.rose, children: [{ label: "চুরি", value: 520 }, { label: "ছিনতাই", value: 410 }, { label: "নিখোঁজ", value: 354 }] },
  { label: "রাজনীতি", value: 962, color: palette.amber, children: [{ label: "পুরসভা", value: 540 }, { label: "বিধানসভা", value: 422 }] },
  { label: "শিক্ষা", value: 614, color: palette.cyan, children: [{ label: "স্কুল", value: 380 }, { label: "কলেজ", value: 234 }] },
  { label: "স্বাস্থ্য", value: 488, color: palette.emerald, children: [{ label: "হাসপাতাল", value: 290 }, { label: "ওষুধ", value: 198 }] },
  { label: "খেলা", value: 352, color: palette.violet, children: [{ label: "ফুটবল", value: 210 }, { label: "ক্রিকেট", value: 142 }] },
  { label: "আবহাওয়া", value: 214, color: palette.sky, children: [{ label: "বৃষ্টি", value: 150 }, { label: "তাপমাত্রা", value: 64 }] },
];

const heat = buildHeatmap(42);
const hourly = Array.from({ length: 24 }, (_, h) => heat.reduce((a, row) => a + row[h], 0));
const roseData = hourly.map((v, h) => ({
  label: `${String(h).padStart(2, "0")}:00`,
  value: v,
  color: h < 6 ? palette.violet : h < 12 ? palette.amber : h < 18 ? palette.cyan : palette.rose,
}));

const boxData: BoxStat[] = [
  { label: "Dedupe", min: 0.18, q1: 0.24, med: 0.31, q3: 0.41, max: 0.58, color: palette.rose, outliers: [0.82] },
  { label: "Shot", min: 1.1, q1: 1.6, med: 2.1, q3: 2.7, max: 3.5, color: palette.flame, outliers: [4.6] },
  { label: "LLM", min: 3.0, q1: 3.8, med: 4.4, q3: 5.1, max: 6.2, color: palette.violet, outliers: [7.4, 8.1] },
  { label: "Deploy", min: 6.8, q1: 7.4, med: 8.0, q3: 8.6, max: 9.4, color: palette.emerald, outliers: [11.2] },
];

const radialData = [
  { label: "ফ্যাক্ট-গেট পাস", value: 91, max: 100, color: palette.amber },
  { label: "ডুপ্লিকেট ব্লক", value: 84, max: 100, color: palette.rose },
  { label: "শট সফল", value: 97, max: 100, color: palette.cyan },
  { label: "ISR সাফল্য", value: 99, max: 100, color: palette.emerald },
  { label: "মন্তব্য অনুমোদন", value: 73, max: 100, color: palette.violet },
];

const words = [
  { text: "বন্যা", w: 90, color: palette.amber },
  { text: "নির্বাচন", w: 86, color: palette.cyan },
  { text: "ডেঙ্গু", w: 80, color: palette.rose },
  { text: "মেট্রো", w: 72, color: palette.violet },
  { text: "স্কুল", w: 64, color: palette.emerald },
  { text: "বৃষ্টি", w: 70, color: palette.sky },
  { text: "পুরসভা", w: 66, color: palette.amber },
  { text: "ফুটবল", w: 60, color: palette.emerald },
  { text: "হাসপাতাল", w: 74, color: palette.cyan },
  { text: "দুর্ঘটনা", w: 68, color: palette.rose },
  { text: "জল জমা", w: 58, color: palette.sky },
  { text: "পরীক্ষা", w: 52, color: palette.violet },
  { text: "বাজারদর", w: 56, color: palette.amber },
  { text: "ট্রাফিক", w: 50, color: palette.cyan },
  { text: "উৎসব", w: 44, color: palette.emerald },
  { text: "চুরি", w: 48, color: palette.rose },
  { text: "সাইবার", w: 46, color: palette.violet },
  { text: "শিশু", w: 54, color: palette.sky },
  { text: "ভোট", w: 62, color: palette.amber },
  { text: "ওষুধ", w: 42, color: palette.cyan },
];

const comboLabels = Array.from({ length: 14 }, (_, i) => `D${i + 1}`);
const comboBars = {
  name: "সংগৃহীত",
  color: palette.amber,
  values: [52, 61, 48, 70, 66, 74, 58, 80, 77, 69, 84, 90, 73, 88],
};
const comboLine = {
  name: "ফ্যাক্ট-গেট %",
  color: palette.cyan,
  values: [84, 86, 85, 89, 88, 90, 87, 91, 92, 90, 93, 91, 94, 92],
};

const stackedRows = [
  { label: "Kolkata City Watch", parts: [{ name: "প্রকাশিত", value: 58, color: palette.emerald }, { name: "রিভিউ", value: 22, color: palette.amber }, { name: "ডুপ্লিকেট", value: 14, color: palette.slate }, { name: "বাতিল", value: 6, color: palette.rose }] },
  { label: "উত্তরবঙ্গ বার্তা", parts: [{ name: "প্রকাশিত", value: 52, color: palette.emerald }, { name: "রিভিউ", value: 24, color: palette.amber }, { name: "ডুপ্লিকেট", value: 16, color: palette.slate }, { name: "বাতিল", value: 8, color: palette.rose }] },
  { label: "Howrah Pulse", parts: [{ name: "প্রকাশিত", value: 49, color: palette.emerald }, { name: "রিভিউ", value: 26, color: palette.amber }, { name: "ডুপ্লিকেট", value: 17, color: palette.slate }, { name: "বাতিল", value: 8, color: palette.rose }] },
  { label: "জেলা সংবাদ ডেস্ক", parts: [{ name: "প্রকাশিত", value: 41, color: palette.emerald }, { name: "রিভিউ", value: 28, color: palette.amber }, { name: "ডুপ্লিকেট", value: 22, color: palette.slate }, { name: "বাতিল", value: 9, color: palette.rose }] },
  { label: "Sundarban Live", parts: [{ name: "প্রকাশিত", value: 61, color: palette.emerald }, { name: "রিভিউ", value: 18, color: palette.amber }, { name: "ডুপ্লিকেট", value: 12, color: palette.slate }, { name: "বাতিল", value: 9, color: palette.rose }] },
  { label: "Metro Rail Alerts", parts: [{ name: "প্রকাশিত", value: 22, color: palette.emerald }, { name: "রিভিউ", value: 14, color: palette.amber }, { name: "ডুপ্লিকেট", value: 38, color: palette.slate }, { name: "বাতিল", value: 26, color: palette.rose }] },
];

export default function Insights() {
  const [idx, setIdx] = useState(0);
  useInterval(() => setIdx((i) => (i + 1) % INSIGHTS.length), 7000);

  return (
    <div className="space-y-5">
      {/* row 1: AI insight + word cloud */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card delay={40}>
          <CardHead
            bn="AI ইনসাইট"
            en="LLM summary · auto-generated"
            icon="✦"
            right={<Badge tone="brand" dot>LIVE</Badge>}
          />
          <div className="bn min-h-[118px] text-[15px] leading-relaxed text-white/85">
            <Typewriter key={idx} text={INSIGHTS[idx]} speed={26} />
          </div>
          <div className="mt-4 flex items-center gap-1.5">
            {INSIGHTS.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={cn("h-1 rounded-full transition-all duration-500", i === idx ? "w-8 bg-violet-brand" : "w-3 bg-white/15")}
                aria-label={`insight ${i + 1}`}
              />
            ))}
          </div>
          <div className="shimmer mt-4 rounded-xl border border-white/8 bg-white/[0.02] p-3">
            <div className="mono text-[9.5px] uppercase tracking-widest text-white/35">confidence</div>
            <div className="mono mt-1 text-sm text-violet-300">0.93 · runs #4817–#4821</div>
          </div>
        </Card>

        <Card className="xl:col-span-2" delay={100}>
          <CardHead bn="ট্রেন্ডিং শব্দ" en="Keyword cloud · weighted by mentions" icon="☁️" right={<Badge tone="info">NLP · BN</Badge>} />
          <WordCloud words={words} />
        </Card>
      </div>

      {/* row 2: sankey + sunburst */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2" delay={40}>
          <CardHead
            bn="ফ্লো ডায়াগ্রাম · সোর্স → ডেস্ক → ফলাফল"
            en="Sankey · record flow (5,174 items)"
            icon="🌊"
            right={<Badge tone="good">HOVER NODE</Badge>}
          />
          <Sankey nodes={sankeyNodes} links={sankeyLinks} />
        </Card>

        <Card delay={100}>
          <CardHead bn="বিষয় ও উপবিষয়" en="Sunburst · category → sub-topic" icon="☀️" />
          <Sunburst data={sunData} size={262} />
          <div className="mt-4">
            <Legend items={sunData.map((d) => ({ name: d.label, color: d.color }))} />
          </div>
        </Card>
      </div>

      {/* row 3: rose + radial + box (lazy) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Reveal min={320}>
          <Card className="h-full" delay={0}>
            <CardHead bn="ঘণ্টাভিত্তিক গোলাপচার্ট" en="Polar area · 24h volume" icon="🌸" />
            <RoseChart data={roseData} size={262} />
            <div className="mt-3 flex justify-center gap-4">
              <Legend
                items={[
                  { name: "রাত", color: palette.violet },
                  { name: "সকাল", color: palette.amber },
                  { name: "দুপুর", color: palette.cyan },
                  { name: "সন্ধ্যা", color: palette.rose },
                ]}
              />
            </div>
          </Card>
        </Reveal>

        <Reveal min={320}>
          <Card className="h-full" delay={60}>
            <CardHead bn="সিস্টেম স্বাস্থ্য রেডিয়াল" en="Radial bars · KPI health" icon="🎛️" />
            <RadialBars data={radialData} size={262} />
          </Card>
        </Reveal>

        <Reveal min={320}>
          <Card className="h-full" delay={120}>
            <CardHead bn="স্টেজ লেটেন্সি বক্সপ্লট" en="Box & whisker · seconds per stage" icon="📦" />
            <BoxPlot data={boxData} height={262} />
          </Card>
        </Reveal>
      </div>

      {/* row 4: combo + 100% stacked (lazy) */}
      <Reveal min={380}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2" delay={40}>
            <CardHead
              bn="কম্বো চার্ট · সংগ্রহ ও গুণমান"
              en="Bar + line · dual axis (14 days)"
              icon="📊"
              right={<Badge tone="warn">DUAL AXIS</Badge>}
            />
            <ComboChart labels={comboLabels} bars={comboBars} line={comboLine} height={290} />
            <div className="mt-3 border-t border-white/5 pt-3">
              <Legend items={[{ name: comboBars.name, color: comboBars.color }, { name: comboLine.name, color: comboLine.color }]} />
            </div>
          </Card>

          <Card delay={100}>
            <CardHead bn="সোর্স ভাগ · 100% স্ট্যাক" en="Outcome share per source" icon="▥" />
            <Stacked100 rows={stackedRows} />
            <div className="mt-4">
              <Legend items={[
                { name: "প্রকাশিত", color: palette.emerald },
                { name: "রিভিউ", color: palette.amber },
                { name: "ডুপ্লিকেট", color: palette.slate },
                { name: "বাতিল", color: palette.rose },
              ]} />
            </div>
          </Card>
        </div>
      </Reveal>
    </div>
  );
}
