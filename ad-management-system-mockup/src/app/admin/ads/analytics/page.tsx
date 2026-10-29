import { ConsoleShell, ADMIN_NAV, Stat, SectionCard } from "@/components/console/Shell";
import LiveAnalytics from "@/components/console/LiveAnalytics";
import { AreaChart, BarChart, DonutChart, Heatmap, Funnel, Sparkline, RadialGauge } from "@/components/charts/Charts";
import { buildAnalytics } from "@/lib/ads/analytics";
import { SLOTS } from "@/lib/ads/slots";

export const dynamic = "force-dynamic";

export default async function AdminAnalytics() {
  const a = await buildAnalytics();
  const fillRate = a.bySlot.length ? (a.bySlot.length / SLOTS.length) * 100 : 0;

  return (
    <ConsoleShell
      kind="admin"
      nav={ADMIN_NAV}
      active="/admin/ads/analytics"
      title="অ্যানালিটিক্স"
      subtitle="ডেলিভারি, রাজস্ব, ফানেল ও সময়ভিত্তিক পারফরম্যান্স — সব গ্রাফ লাইভ ডেটা থেকে তৈরি।"
    >
      <LiveAnalytics scope="admin" title="অ্যাড সার্ভার — লাইভ টেলিমেট্রি" />


      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="ইম্প্রেশন" value={a.totals.impressions.toLocaleString()} sub="সব ক্যাম্পেইন" />
        <Stat label="ক্লিক" value={a.totals.clicks.toLocaleString()} sub={`CTR ${a.totals.ctr.toFixed(2)}%`} accent="#0b7c72" />
        <Stat label="রাজস্ব" value={`৳${a.totals.spend.toLocaleString()}`} sub="পরিশোধিত" accent="#037c1b" />
        <Stat label="CPM" value={`৳${a.totals.cpm.toFixed(1)}`} sub="প্রতি হাজার ইম্প্রেশন" accent="#b45309" />
        <Stat label="CPC" value={`৳${a.totals.cpc.toFixed(1)}`} sub="প্রতি ক্লিক" accent="#2563eb" />
        <Stat label="স্লট কভারেজ" value={`${Math.round(fillRate)}%`} sub={`${SLOTS.length} স্লটের মধ্যে`} accent="#d2202c" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard
            title="১৪ দিনের ডেলিভারি"
            right={<span className="font-mono-x text-[9.5px] tracking-[0.18em] text-ink-soft uppercase">ইম্প্রেশন বনাম ক্লিক</span>}
          >
            <AreaChart
              height={200}
              colors={["#0b7c72", "#d2202c"]}
              labels={["ইম্প্রেশন", "ক্লিক ×২০"]}
              series={[
                { name: "ইম্প্রেশন", points: a.series.map((d) => ({ x: d.x, y: d.impressions })) },
                { name: "ক্লিক", points: a.series.map((d) => ({ x: d.x, y: d.clicks * 20 })) },
              ]}
            />
          </SectionCard>
        </div>

        <SectionCard title="ফরম্যাট অনুযায়ী ইম্প্রেশন">
          <DonutChart
            data={a.byFormat}
            centerValue={`${Math.round(a.totals.impressions / 1000)}k`}
            centerLabel="মোট ইম্প্রেশন"
          />
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard title="স্লট অনুযায়ী ডেলিভারি">
          <BarChart data={a.bySlot} height={190} color="#1a140d" accent="#5f8f0e" />
        </SectionCard>

        <SectionCard title="দৈনিক রাজস্ব (৳)">
          <BarChart
            data={a.series.slice(-10).map((d) => ({ label: d.x, value: d.spend }))}
            height={190}
            color="#0b7c72"
            accent="#037c1b"
            money
          />
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <SectionCard title="কনভার্সন ফানেল">
          <Funnel steps={a.funnel} />
        </SectionCard>

        <SectionCard title="সপ্তাহ × সময় হিটম্যাপ">
          <Heatmap rows={a.heat.rows} cols={a.heat.cols} values={a.heat.values} color="#5f8f0e" />
          <p className="mt-3 text-[11.5px] leading-relaxed text-ink-soft">
            সবচেয়ে বেশি পাঠক সন্ধ্যা ৬টা–রাত ১১টা। প্রিমিয়াম স্লটের ডে-পার্টিং এই উইন্ডোতে রাখলে CTR বাড়ে।
          </p>
        </SectionCard>

        <SectionCard title="পেমেন্ট মাধ্যম অনুযায়ী আয়">
          <DonutChart
            data={a.byMethod.map((m) => ({ ...m, label: m.label.toUpperCase() }))}
            size={150}
            centerValue={`৳${Math.round(a.totals.spend / 1000)}k`}
            centerLabel="মোট আদায়"
          />
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard title="সেরা ক্রিয়েটিভ">
            <div className="scroll-x">
              <table className="c-table">
                <thead>
                  <tr><th>ক্রিয়েটিভ</th><th>স্লট</th><th>ট্রেন্ড</th><th className="text-right">ইম্প.</th><th className="text-right">ক্লিক</th><th className="text-right">CTR</th></tr>
                </thead>
                <tbody>
                  {a.topCreatives.map((c, i) => (
                    <tr key={c.name + i} className="row-enter" style={{ animationDelay: `${i * 60}ms` }}>
                      <td className="max-w-[200px] truncate font-serif-bn text-[13px] font-bold">{c.name}</td>
                      <td className="text-[12px] text-ink-soft">{c.slot}</td>
                      <td><Sparkline points={c.spark} color="#5f8f0e" /></td>
                      <td className="text-right font-mono-x">{c.imp.toLocaleString()}</td>
                      <td className="text-right font-mono-x">{c.clicks.toLocaleString()}</td>
                      <td className="text-right font-mono-x font-bold" style={{ color: c.ctr > 2 ? "#037c1b" : "var(--color-ink)" }}>
                        {c.ctr.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="ইনভেন্টরি স্বাস্থ্য">
            <div className="flex flex-wrap justify-around gap-3">
              <RadialGauge value={a.totals.ctr} max={5} label="CTR / লক্ষ্য ৫%" color="#5f8f0e" />
              <RadialGauge value={fillRate} max={100} label="স্লট পূর্ণতা" color="#0b7c72" />
              <RadialGauge value={72} max={100} label="ভিউয়েবিলিটি" color="#b45309" />
            </div>
          </SectionCard>

          <SectionCard title="বুকিং স্ট্যাটাস মিশ্রণ">
            <DonutChart data={a.statusMix} size={140} thickness={18} centerValue={String(a.statusMix.reduce((s, x) => s + x.value, 0))} centerLabel="বুকিং" />
          </SectionCard>
        </div>
      </div>

      <div className="mt-6">
        <SectionCard title="বিজ্ঞাপন ক্যাটাগরি অনুযায়ী চাহিদা">
          <DonutChart data={a.byCategory} size={170} centerValue={String(a.byCategory.length)} centerLabel="ক্যাটাগরি" />
        </SectionCard>
      </div>
    </ConsoleShell>
  );
}
