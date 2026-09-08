import { statsSnapshot } from "@hoichoi/db";
import { StatTile } from "@/components/admin/StatTile";
import { LiveDeskMonitor } from "@/components/LiveDeskMonitor";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const stats = await statsSnapshot();

  const avgSec = stats.avgRunDurationSec;
  const durText =
    avgSec > 0
      ? `${Math.floor(avgSec / 60).toLocaleString("bn")} মি ${(avgSec % 60).toLocaleString("bn", { minimumIntegerDigits: 2 })} সে`
      : "—";

  return (
    <div>
      <PageHeading emoji="✳️" kicker="LIVE OVERVIEW" title="ড্যাশবোর্ড" />
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatTile label="আজ সংগৃহীত" value={stats.collectedToday} accent="cat-teal" />
        <StatTile label="প্রকাশিত (লাইভ)" value={stats.published} accent="cat-blue" />
        <StatTile label="ডুপ্লিকেট ব্লকড" value={stats.duplicatesBlocked} accent="alizarin" />
        <StatTile label="গড় রান সময়" valueText={durText} accent="amberx" />
      </div>

      <a
        href="/admin/moderation"
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-amberx/40 bg-amberx/10 px-3.5 py-2 text-[12.5px] font-semibold text-ink transition-colors hover:bg-amberx/20"
      >
        <span className={stats.pendingReview > 0 ? "h-2 w-2 rounded-full bg-alizarin" : "h-2 w-2 rounded-full bg-cat-teal"} />
        পেন্ডিং রিভিউ: {stats.pendingReview.toLocaleString("bn")} — মডারেশন কিউ দেখুন →
      </a>

      <div className="mt-8">
        <SectionTitle>লাইভ নিউজডেস্ক মিটার</SectionTitle>
        <div className="mt-3 max-w-md">
          <LiveDeskMonitor />
        </div>
      </div>
    </div>
  );
}

function PageHeading({ emoji, kicker, title }: { emoji: string; kicker: string; title: string }) {
  return (
    <header>
      <p className="font-mono-x text-[10px] tracking-[0.24em] text-alizarin uppercase">
        {emoji} {kicker}
      </p>
      <h1 className="mt-1 font-serif-bn text-[34px] font-black text-ink">{title}</h1>
    </header>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-sans-bn text-[16px] font-bold text-ink">{children}</h2>;
}