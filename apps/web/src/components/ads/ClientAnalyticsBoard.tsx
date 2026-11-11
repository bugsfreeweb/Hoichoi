import type { AdAnalyticsDay, AdBooking, AdEvent } from "@hoichoi/db";

/**
 * Client-side analytics board.
 *
 * Impressions and clicks are two very different magnitudes (clicks are ~1% of
 * impressions), so they are drawn on independent scales instead of one shared
 * y-axis: a shared axis flattened clicks into the baseline and made CTR
 * invisible. Each series is labelled with its own peak, which is honest about
 * what the reader is comparing.
 *
 * Everything here is server-rendered from real rows — the only motion is CSS
 * draw-in on first paint.
 */

function bn(v: number | string): string {
  return String(v).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d);
}

function bnDate(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  try {
    return new Intl.DateTimeFormat("bn-BD", { timeZone: "Asia/Dhaka", day: "numeric", month: "short" }).format(d);
  } catch {
    return day.slice(5);
  }
}

const KIND_BN: Record<string, string> = {
  impression: "ইম্প্রেশন",
  click: "ক্লিক",
};

export function ClientAnalyticsBoard({
  analytics,
  bookings,
  events,
}: {
  analytics: AdAnalyticsDay[];
  bookings: AdBooking[];
  events: AdEvent[];
}) {
  const impressions = analytics.reduce((s, d) => s + d.impressions, 0);
  const clicks = analytics.reduce((s, d) => s + d.clicks, 0);
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const active = bookings.filter((b) => b.status === "active").length;
  const pending = bookings.filter((b) => b.status === "pending").length;
  const spend = bookings
    .filter((b) => b.status === "active" || b.status === "completed")
    .reduce((s, b) => s + b.totalBdt, 0);

  const W = 720;
  const H = 190;
  const pad = 14;
  const peakImp = Math.max(1, ...analytics.map((d) => d.impressions));
  const peakClk = Math.max(1, ...analytics.map((d) => d.clicks));
  const n = Math.max(2, analytics.length);
  const X = (i: number) => pad + (i / (n - 1)) * (W - pad * 2);
  const YImp = (v: number) => pad + (H - pad * 2) * (1 - v / peakImp);
  const YClk = (v: number) => pad + (H - pad * 2) * (1 - v / peakClk);

  const impPath = analytics.map((d, i) => `${i ? "L" : "M"}${X(i)},${YImp(d.impressions)}`).join(" ");
  const clkPath = analytics.map((d, i) => `${i ? "L" : "M"}${X(i)},${YClk(d.clicks)}`).join(" ");

  const kpis = [
    { label: "ইম্প্রেশন · ১৪ দিন", value: bn(impressions), tone: "var(--color-alizarin, #d2202c)" },
    { label: "ক্লিক", value: bn(clicks), tone: "var(--color-lime, #5f8f0e)" },
    { label: "CTR", value: `${ctr.toFixed(2)}%`, tone: "#c47b02" },
    { label: "চলমান ক্যাম্পেইন", value: bn(active), tone: "var(--color-ink, #1a140d)" },
    { label: "ব্যয়", value: `৳${bn(spend.toLocaleString("en-US"))}`, tone: "var(--color-ink, #1a140d)" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((k, i) => (
          <div
            key={k.label}
            className="anim-in relative overflow-hidden border border-ink/15 bg-card px-4 py-3"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="absolute inset-x-0 top-0 h-[2px]" style={{ background: k.tone, opacity: 0.7 }} />
            <p className="font-mono-x text-[9px] tracking-[0.14em] text-ink-soft uppercase">{k.label}</p>
            <p className="mt-1.5 font-display text-[21px] leading-none font-bold text-ink">{k.value}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden border border-ink/20 bg-[#0b0e15] text-white shadow-[0_18px_50px_-24px_rgba(0,0,0,0.65)]">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 px-4 py-3.5 md:px-6">
          <div>
            <p className="font-mono-x text-[9px] tracking-[0.2em] text-white/40 uppercase">DELIVERY · OBSIDIAN</p>
            <h2 className="mt-1 font-serif-bn text-[18px] font-bold text-white/95">ইম্প্রেশন ও ক্লিকের ধারা</h2>
          </div>
          <div className="flex items-center gap-4 font-mono-x text-[9.5px] tracking-wide text-white/50 uppercase">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d2202c]" /> IMPRESSION · PEAK {bn(peakImp)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#5f8f0e]" /> CLICK · PEAK {bn(peakClk)}
            </span>
          </div>
        </div>
        <div className="px-2 py-3 md:px-4">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-[190px] w-full" preserveAspectRatio="none" role="img" aria-label="দৈনিক ইম্প্রেশন ও ক্লিক">
            <defs>
              <linearGradient id="ca-imp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d2202c" stopOpacity="0.42" />
                <stop offset="100%" stopColor="#d2202c" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((f) => (
              <line
                key={f}
                x1={pad}
                x2={W - pad}
                y1={pad + (H - pad * 2) * f}
                y2={pad + (H - pad * 2) * f}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
              />
            ))}
            <path d={`${impPath} L${X(n - 1)},${H - pad} L${X(0)},${H - pad} Z`} fill="url(#ca-imp)" />
            <path d={impPath} fill="none" stroke="#ff5a63" strokeWidth="2" className="ad-draw" strokeLinejoin="round" />
            <path d={clkPath} fill="none" stroke="#9bd93a" strokeWidth="1.7" className="ad-draw" style={{ animationDelay: "220ms" }} strokeLinejoin="round" />
            {analytics.map((d, i) => (
              <g key={d.date}>
                <circle cx={X(i)} cy={YImp(d.impressions)} r="2.6" fill="#ff5a63" />
                <title>{`${d.date} · ${d.impressions} impression · ${d.clicks} click`}</title>
              </g>
            ))}
            {analytics.length > 0 && (
              <circle cx={X(analytics.length - 1)} cy={YImp(analytics[analytics.length - 1]!.impressions)} r="4" fill="#ff5a63" className="ad-ping" />
            )}
          </svg>
        </div>
        <div className="flex justify-between px-4 pb-3 font-mono-x text-[9px] text-white/35 md:px-6">
          <span>{analytics[0] ? bnDate(analytics[0].date) : ""}</span>
          <span>{analytics[analytics.length - 1] ? bnDate(analytics[analytics.length - 1]!.date) : ""}</span>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="border border-ink/15 bg-card p-4 md:p-5">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="font-serif-bn text-[17px] font-bold text-ink">দৈনিক বিভাজন</h2>
            {pending > 0 && (
              <span className="border border-[#c47b02]/40 bg-[#c47b02]/10 px-2 py-1 font-mono-x text-[9px] font-bold text-[#c47b02] uppercase">
                {bn(pending)} বুকিং অনুমোদনের অপেক্ষায়
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {analytics.map((d, i) => (
              <div key={d.date} className="grid grid-cols-[74px_1fr_46px_40px] items-center gap-2.5">
                <span className="font-mono-x text-[9.5px] text-ink-soft">{bnDate(d.date)}</span>
                <div className="h-[7px] bg-ink/8">
                  <div
                    className="ad-bar h-full bg-gradient-to-r from-alizarin to-[#ff7a84]"
                    style={{ width: `${(d.impressions / peakImp) * 100}%`, animationDelay: `${i * 25}ms` }}
                  />
                </div>
                <span className="text-right font-mono-x text-[9.5px] text-ink">{bn(d.impressions)}</span>
                <span className="text-right font-mono-x text-[9.5px] text-ink-soft">{bn(d.clicks)}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 font-mono-x text-[8.5px] tracking-[0.1em] text-ink-soft uppercase">
            বাম = impression · ডান = click
          </p>
        </section>

        <section className="border border-ink/15 bg-card p-4 md:p-5">
          <h2 className="font-serif-bn text-[17px] font-bold text-ink">সাম্প্রতিক ডেলিভারি</h2>
          {events.length === 0 ? (
            <p className="mt-3 text-[12px] text-ink-soft">এখনো কোনো ডেলিভারি ইভেন্ট নেই — ক্যাম্পেইন চালু হলে এখানে দেখা যাবে।</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {events.slice(0, 10).map((e) => (
                <li key={e.id} className="flex items-center gap-2.5 border-b border-ink/8 pb-1.5 last:border-0">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${e.kind === "click" ? "bg-lime" : "bg-alizarin"}`}
                  />
                  <span className="min-w-0 flex-1 truncate font-mono-x text-[10px] text-ink-soft">
                    {KIND_BN[e.kind] ?? e.kind} · {e.slotKey}
                    {e.path ? ` · ${e.path}` : ""}
                  </span>
                  <span className="shrink-0 font-mono-x text-[9px] text-ink-soft/70">
                    {new Date(e.createdAt).toLocaleTimeString("bn-BD", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
