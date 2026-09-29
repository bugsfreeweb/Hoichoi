import { countUnusablePosts, listArchivedPostsPage } from "@hoichoi/db";
import { ArchivedRow } from "@/components/admin/ArchivedRow";
import { PurgeButton } from "@/components/admin/PurgeButton";
import { Paginator } from "@/components/admin/Paginator";
import { MaintenancePanel } from "@/components/admin/MaintenancePanel";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AdminArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const [result, unusableCount] = await Promise.all([
    listArchivedPostsPage(Number(page ?? 1), PAGE_SIZE),
    countUnusablePosts(),
  ]);
  const archived = result.rows;
  const retention = Number(process.env.ARCHIVE_RETENTION_DAYS ?? 30);

  return (
    <div>
      <PageHeading emoji="📁" kicker="RETENTION WINDOW" title="আর্কাইভ" />
      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-soft">
        ৭ দিনের পাবলিক জানালা শেষে পোস্ট এখানে চলে আসে। লিগ্যাল-হোল্ড বা সক্রিয় নিখোঁজ মামলা ব্যতিক্রম। {retention} দিন পর
        স্থায়ীভাবে মুছে ফেলা হয়। একটি নির্দিষ্ট পোস্ট আগেই মুছতে চাইলে প্রতিটি সারির
        ডানে &ldquo;স্থায়ীভাবে মুছুন&rdquo; ব্যবহার করুন — legal hold থাকলে মুছে ফেলা হবে না।
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
      <Paginator
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        basePath="/admin/archive"
      />
      <MaintenancePanel unusableCount={unusableCount} />
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