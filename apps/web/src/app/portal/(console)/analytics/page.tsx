import { getAdAnalytics } from "@hoichoi/db";
import { requireAdClient } from "@/lib/ad-client-auth";

export const dynamic = "force-dynamic";

export default async function AdClientAnalyticsPage() {
  const client = await requireAdClient();
  const analytics = await getAdAnalytics(client.id);
  const impressions = analytics.reduce((sum, day) => sum + day.impressions, 0);
  const clicks = analytics.reduce((sum, day) => sum + day.clicks, 0);
  const max = Math.max(1, ...analytics.map((day) => day.impressions));
  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono-x text-[9px] tracking-[0.2em] text-alizarin uppercase">CAMPAIGN ANALYTICS</p>
        <h1 className="mt-1 font-serif-bn text-[28px] font-black text-ink">ডেলিভারি অ্যানালিটিক্স</h1>
        <p className="mt-1 text-[12px] text-ink-soft">আপনার অনুমোদিত campaign-এর গত ১৪ দিনের ডেটা।</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        {[["Impressions", impressions.toLocaleString()], ["Clicks", clicks.toLocaleString()], ["CTR", `${impressions ? (clicks / impressions * 100).toFixed(2) : "0.00"}%`]].map(([label, value]) => (
          <div key={label} className="border border-ink/15 bg-card p-4"><p className="text-[10px] text-ink-soft">{label}</p><p className="mt-1 font-display text-[24px] font-bold text-ink">{value}</p></div>
        ))}
      </div>
      <section className="border border-ink/15 bg-card p-4 md:p-6">
        <h2 className="mb-4 font-serif-bn text-[18px] font-bold text-ink">দৈনিক impressions</h2>
        <div className="space-y-2">
          {analytics.map((day) => (
            <div key={day.date} className="grid grid-cols-[90px_1fr_80px] items-center gap-3 text-[10px]">
              <span className="font-mono-x text-ink-soft">{day.date}</span>
              <div className="h-2 bg-ink/10"><div className="h-full bg-alizarin" style={{ width: `${day.impressions / max * 100}%` }} /></div>
              <span className="text-right font-mono-x text-ink">{day.impressions.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
