import { getClient, mapPost } from "@hoichoi/db";
import { ArchivedRow } from "@/components/admin/ArchivedRow";
import { PurgeButton } from "@/components/admin/PurgeButton";

export const dynamic = "force-dynamic";

export default async function AdminArchivePage() {
  const client = getClient();
  const res = await client.execute(
    "SELECT * FROM posts WHERE archived_at IS NOT NULL ORDER BY archived_at DESC LIMIT 100",
  );
  const archived = res.rows.map((r) => mapPost(r as Record<string, unknown>));
  const retention = Number(process.env.ARCHIVE_RETENTION_DAYS ?? 30);

  return (
    <div>
      <PageHeading emoji="📁" kicker="RETENTION WINDOW" title="আর্কাইভ" />
      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-soft">
        ৭ দিনের পাবলিক জানালা শেষে পোস্ট এখানে চলে আসে। লিগ্যাল-হোল্ড বা সক্রিয় নিখোঁজ মামলা ব্যতিক্রম। {retention} দিন পর
        স্থায়ীভাবে মুছে ফেলা হয়।
      </p>
      <div className="mt-4 flex items-center gap-3">
        <PurgeButton retentionDays={retention} />
      </div>
      <div className="mt-6 space-y-2.5">
        {archived.length === 0 && (
          <p className="border border-dashed border-ink/30 p-6 text-center text-[13px] text-ink-soft">কোনো আর্কাইভড পোস্ট নেই।</p>
        )}
        {archived.map((p) => (
          <ArchivedRow key={p.id} post={p} />
        ))}
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