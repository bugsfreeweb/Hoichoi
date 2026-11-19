import { PageHeading } from "@/components/admin/ui/PageHeader";
import { countExpiredPosts, countUnusablePosts, getSettings, listArchivedPostsPage } from "@hoichoi/db";
import { ArchivedRow } from "@/components/admin/ArchivedRow";
import { PurgeButton } from "@/components/admin/PurgeButton";
import { Paginator } from "@/components/admin/Paginator";
import { MaintenancePanel } from "@/components/admin/MaintenancePanel";
import { ExpiredPanel } from "@/components/admin/ExpiredPanel";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AdminArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const settings = await getSettings();
  const retention = Number(settings.archive_retention_days ?? 30);
  const visible = Number(settings.archive_visible_days ?? 7);
  const [result, unusableCount, expiredCount] = await Promise.all([
    listArchivedPostsPage(Number(page ?? 1), PAGE_SIZE),
    countUnusablePosts(),
    countExpiredPosts(retention),
  ]);
  const archived = result.rows;

  return (
    <div>
      <PageHeading emoji="📁" kicker="RETENTION WINDOW" title="আর্কাইভ" description="প্রকাশিত পোস্ট কত দিন পর আর্কাইভে যাবে তা ঠিক করুন, এবং আর্কাইভ থেকে ফেরান বা স্থায়ীভাবে মুছুন।" />
      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-soft">
        ওয়েবসাইটে কেবল শেষ <strong>{visible} দিনের</strong> পোস্ট দেখায়; তার পুরনো পোস্ট এখানে চলে আসে।
        কেউ পোস্ট না করলেও রোলওভার নিজে থেকেই হয় — দিনে একবার আর্কাইভ পাস চলে।
        {retention} দিনের বেশি পুরনো হলে স্থায়ীভাবে মুছে যায়। legal hold ও সক্রিয় নিখোঁজ মামলা
        কখনোই মোছা হয় না। একটি নির্দিষ্ট পোস্ট আগেই মুছতে চাইলে প্রতিটি সারির ডানে
        &ldquo;স্থায়ীভাবে মুছুন&rdquo; ব্যবহার করুন।
      </p>
      <ExpiredPanel retentionDays={retention} expiredCount={expiredCount} />
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

