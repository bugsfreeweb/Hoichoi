import { statsSnapshot, recentPipelineRuns } from "@hoichoi/db";
import { LiveDeskMonitor } from "@/components/LiveDeskMonitor";
import { getAllComments } from "@hoichoi/db";
import { ModerationTable } from "@/components/admin/ModerationTable";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [stats, runs, comments] = await Promise.all([
    statsSnapshot(),
    recentPipelineRuns(8),
    getAllComments(),
  ]);

  const avgSec = stats.avgRunDurationSec;
  const durText =
    avgSec > 0
      ? `${Math.floor(avgSec / 60).toLocaleString("bn")} মি ${(avgSec % 60).toLocaleString("bn", { minimumIntegerDigits: 2 })} সে`
      : "—";

  const tiles = [
    { label: "আজ সংগৃহীত", value: stats.collectedToday.toLocaleString("bn"), sub: "কালেক্ট → কমিট → ডিপ্লয়", icon: "📥", accent: "text-lime", bar: "bg-lime" },
    { label: "প্রকাশিত (লাইভ)", value: stats.published.toLocaleString("bn"), sub: "GitHub → Vercel সিঙ্কড", icon: "📰", accent: "text-sky-300", bar: "bg-sky-400" },
    { label: "ডুপ্লিকেট ব্লকড", value: stats.duplicatesBlocked.toLocaleString("bn"), sub: "SHA-256 + SimHash মিল", icon: "🔍", accent: "text-amberx", bar: "bg-amberx" },
    { label: "গড় রান সময়", value: durText, sub: `ডি-ডুপ রেট ${Math.round(stats.dedupRate * 100)}%`, icon: "⏱️", accent: "text-rose-300", bar: "bg-rose-400" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono-x text-[10px] tracking-[0.26em] text-lime uppercase">✳️ LIVE OVERVIEW</p>
        <h1 className="mt-1 font-serif-bn text-[32px] font-black text-white">ড্যাশবোর্ড</h1>
        <p className="mt-1 font-mono-x text-[9.5px] tracking-[0.18em] text-white/35 uppercase">
          TURSO · HOICHOI-CONTENT · ISR 300s
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-white/10 bg-panel p-4">
            <div className="flex items-center justify-between text-[11.5px] text-white/50">
              {t.label}
              <span className="text-[15px]">{t.icon}</span>
            </div>
            <p className="mt-2 font-serif-bn text-[26px] leading-none font-black text-white">{t.value}</p>
            <div className={`mt-3 h-1 w-9 ${t.bar}`} />
            <p className="mt-1.5 font-mono-x text-[9px] tracking-[0.08em] text-white/35 uppercase">{t.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-panel p-4">
        <p className="flex items-center gap-2 font-sans-bn text-[14px] font-bold text-white">
          <span className={`relative flex h-2 w-2`}>
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${stats.pendingReview > 0 ? "bg-alizarin" : "bg-lime"}`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${stats.pendingReview > 0 ? "bg-alizarin" : "bg-lime"}`} />
          </span>
          পেন্ডিং রিভিউ: {stats.pendingReview.toLocaleString("bn")}
        </p>
        <a
          href="/admin/moderation"
          className="rounded-lg bg-white px-3.5 py-2 text-[12px] font-bold text-night transition-colors hover:brightness-110"
        >
          মডারেশন কিউ দেখুন →
        </a>
      </div>

      <section>
        <SectionTitle>লাইভ নিউজডেস্ক মিটার</SectionTitle>
        <div className="mt-3 max-w-md">
          <LiveDeskMonitor />
        </div>
      </section>

      <section>
        <SectionTitle>রান লগ</SectionTitle>
        <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-white/10 bg-[#0a0d12] font-mono-x text-[9.5px] tracking-[0.18em] text-white/35 uppercase">
                  <th className="px-5 py-3 font-medium">সময়</th>
                  <th className="px-3 py-3 font-medium">স্ট্যাটাস</th>
                  <th className="px-3 py-3 font-medium">প্রোভাইডার</th>
                  <th className="px-5 py-3 text-right font-medium">নোট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {runs.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-white/[0.03]">
                    <td className="px-5 py-3 font-mono-x text-[11px] text-white/80">
                      {new Date(r.started_at).toLocaleString("bn-BD", { timeZone: "Asia/Dhaka" })}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 font-mono-x text-[9px] tracking-[0.14em] uppercase ${
                          r.status === "success"
                            ? "border-lime/40 text-lime"
                            : r.status === "failed"
                              ? "border-alizarin/40 text-rose-300"
                              : "border-white/12 text-white/55"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono-x text-[11px] text-white/60">
                      {r.provider_used ?? "—"}
                    </td>
                    <td className="max-w-[280px] truncate px-5 py-3 text-right text-[10.5px] text-white/45">
                      {r.error ?? "✓"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {runs.length === 0 && (
              <p className="p-6 text-center text-[12.5px] text-white/40">এখনো কোনো রান রেকর্ড নেই।</p>
            )}
          </div>
        </div>
      </section>
<section>
        <SectionTitle>মন্তব্য মডারেশন</SectionTitle>
        <div className="mt-3">
          <ModerationTable rows={comments} />
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-1 w-1 rotate-45 bg-alizarin" />
      <h2 className="font-sans-bn text-[15px] font-bold text-white">{children}</h2>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  );
}
