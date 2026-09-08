import { statsSnapshot } from "@hoichoi/db";
import { StatTile } from "@/components/admin/StatTile";
import { LiveDeskMonitor } from "@/components/LiveDeskMonitor";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const stats = await statsSnapshot();
  return (
    <div>
      <PageHeading emoji="📊" kicker="LIVE OVERVIEW" title="ড্যাশবোর্ড" />
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatTile label="আজ সংগ্রহ" value={stats.collectedToday} accent="cat-teal" />
        <StatTile label="ডুপ্লিকেট ব্লকড" value={stats.duplicatesBlocked} accent="alizarin" />
        <StatTile label="লাইভ পোস্ট" value={stats.published} accent="cat-blue" />
        <StatTile label="পেন্ডিং রিভিউ" value={stats.pendingReview} accent="amberx" />
      </div>

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