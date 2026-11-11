import { listNoticesPaged } from "@hoichoi/db";
import { AdminNotices } from "@/components/admin/AdminNotices";
import { Paginator } from "@/components/admin/Paginator";
import { PageHeading } from "@/components/admin/ui/PageHeader";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminNoticesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;

  // The board now pages. It previously loaded up to 200 notices on the server and
  // then refetched the whole table from the client on mount, so the server query
  // was discarded and anything past the cap was unreachable.
  const result = await listNoticesPaged({ page: Number(pageParam ?? 1), pageSize: PAGE_SIZE });

  return (
    <div>
      <PageHeading
        emoji="📣"
        kicker="SITE NOTICE BOARD"
        title="নোটিশ"
        description="সাইটের উপরে দেখানো ঘোষণা, সতর্কতা ও বিজ্ঞপ্তি — কোনটি কখন থেকে কখন পর্যন্ত দেখাবে তা ঠিক করুন।"
      />
      <AdminNotices notices={result.rows} />
      <Paginator
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        basePath="/admin/notices"
      />
    </div>
  );
}
