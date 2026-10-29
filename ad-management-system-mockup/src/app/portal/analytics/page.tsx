import { eq } from "drizzle-orm";
import { db } from "@/db";
import { advertisers } from "@/db/schema";
import { ConsoleShell, CLIENT_NAV, Stat, SectionCard } from "@/components/console/Shell";
import LiveAnalytics from "@/components/console/LiveAnalytics";
import { AreaChart, BarChart, DonutChart, Funnel, Heatmap, Sparkline, RadialGauge } from "@/components/charts/Charts";
import { buildAnalytics } from "@/lib/ads/analytics";

export const dynamic = "force-dynamic";

export default async function ClientAnalytics() {
  const [me] = await db.select().from(advertisers).where(eq(advertisers.email, "tanvir@rang.example")).limit(1);
  const a = await buildAnalytics(me.id);

  return (
    <ConsoleShell
      kind="client"
      nav={CLIENT_NAV}
      active="/portal/analytics"
      title="আমার অ্যানালিটিক্স"
      subtitle="আপনার ক্যাম্পেইন কেমন চলছে — ডেলিভারি, ক্লিক, খরচ ও সেরা সময় এক নজরে।"
    >
      <LiveAnalytics scope="client" title="আমার ক্যাম্পেইন — লাইভ" />


      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="ইম্প্রেশন" value={a.totals.impressions.toLocaleString()} />
        <Stat label="ক্লিক" value={a.totals.clicks.toLocaleString()} accent="#0b7c72" />
        <Stat label="CTR" value={`${a.totals.ctr.toFixed(2)}%`} sub="ইন্ডাস্ট্রি গড় ০.৯%" accent="#037c1b" />
        <Stat label="খরচ" value={`৳${a.totals.spend.toLocaleString()}`} accent="#d2202c" />
        <Stat label="CPM" value={`৳${a.totals.cpm.toFixed(1)}`} accent="#b45309" />
        <Stat label="CPC" value={`৳${a.totals.cpc.toFixed(1)}`} accent="#2563eb" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard title="১৪ দিনের পারফরম্যান্স">
            <AreaChart
              height={200}
              colors={["#5f8f0e", "#d2202c"]}
              labels={["ইম্প্রেশন", "ক্লিক ×২০"]}
              series={[
                { name: "ইম্প্রেশন", points: a.series.map((d) => ({ x: d.x, y: d.impressions })) },
                { name: "ক্লিক", points: a.series.map((d) => ({ x: d.x, y: d.clicks * 20 })) },
              ]}
            />
          </SectionCard>
        </div>

        <SectionCard title="স্লট মিশ্রণ">
          <DonutChart
            data={a.byFormat}
            size={150}
            centerValue={`${Math.round(a.totals.impressions / 1000)}k`}
            centerLabel="ইম্প্রেশন"
          />
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard title="কোন স্লট কত আনল">
          <BarChart data={a.bySlot} height={180} color="#1a140d" accent="#5f8f0e" />
        </SectionCard>

        <SectionCard title="আপনার ফানেল">
          <Funnel steps={a.funnel} />
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard title="কখন আপনার বিজ্ঞাপন সবচেয়ে বেশি দেখা হয়">
            <Heatmap rows={a.heat.rows} cols={a.heat.cols} values={a.heat.values} color="#0b7c72" />
            <p className="mt-3 text-[11.5px] leading-relaxed text-ink-soft">
              পরামর্শ: সন্ধ্যা ৬টা–রাত ১১টায় চাহিদা সর্বোচ্চ। পরের বুকিংয়ে প্রিমিয়াম স্লট নিলে একই খরচে
              বেশি ভিউয়েবল ইম্প্রেশন পাবেন।
            </p>
          </SectionCard>
        </div>

        <SectionCard title="লক্ষ্যমাত্রা">
          <div className="flex flex-wrap justify-around gap-3">
            <RadialGauge value={a.totals.ctr} max={5} label="CTR" color="#5f8f0e" />
            <RadialGauge value={72} max={100} label="ভিউয়েবিলিটি" color="#0b7c72" />
          </div>
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard title="আপনার ক্রিয়েটিভগুলো">
          <div className="scroll-x">
            <table className="c-table">
              <thead>
                <tr><th>ক্রিয়েটিভ</th><th>স্লট</th><th>ট্রেন্ড</th><th className="text-right">ইম্প.</th><th className="text-right">ক্লিক</th><th className="text-right">CTR</th></tr>
              </thead>
              <tbody>
                {a.topCreatives.map((c, i) => (
                  <tr key={c.name + i} className="row-enter" style={{ animationDelay: `${i * 60}ms` }}>
                    <td className="max-w-[220px] truncate font-serif-bn text-[13px] font-bold">{c.name}</td>
                    <td className="text-[12px] text-ink-soft">{c.slot}</td>
                    <td><Sparkline points={c.spark} /></td>
                    <td className="text-right font-mono-x">{c.imp.toLocaleString()}</td>
                    <td className="text-right font-mono-x">{c.clicks.toLocaleString()}</td>
                    <td className="text-right font-mono-x font-bold">{c.ctr.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </ConsoleShell>
  );
}
