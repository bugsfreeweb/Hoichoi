import { mapReport, pageRows } from "@hoichoi/db";
import type { ReaderReportWithPost } from "@hoichoi/shared-types";
import { Paginator } from "@/components/admin/Paginator";
import { ReportRow } from "@/components/admin/ReportRow";
import { ViewToggle } from "@/components/admin/ui/ViewToggle";
import { PageHeading } from "@/components/admin/ui/PageHeader";
import { Card, CardHead, StatTile } from "@/components/admin/ui/Card";
import { viewFromSearch } from "@/lib/view";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

/** Reports carry their parent post's title/slug, joined in SQL. */
const REPORT_SELECT =
  "SELECT r.*, p.title_bn AS postTitle, p.slug AS postSlug, p.category AS postCategory, p.media_path AS postMediaPath, p.media_kind AS postMediaKind FROM reader_reports r LEFT JOIN posts p ON p.id = r.post_id";

function mapReportWithPost(row: Record<string, unknown>): ReaderReportWithPost {
  return {
    ...mapReport(row),
    postTitle: (row.postTitle as string | null) ?? null,
    postSlug: (row.postSlug as string | null) ?? null,
    postCategory: (row.postCategory as string | null) ?? null,
    postMediaPath: (row.postMediaPath as string | null) ?? null,
    postMediaKind: (row.postMediaKind as ReaderReportWithPost["postMediaKind"]) ?? null,
  };
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ openPage?: string; donePage?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const { openPage: openParam, donePage: doneParam } = sp;
  const view = viewFromSearch(sp);
  const extra = {
    ...(openParam ? { openPage: openParam } : {}),
    ...(doneParam ? { donePage: doneParam } : {}),
    ...(view === "card" ? { view: "card" } : {}),
  };

  const [open, done] = await Promise.all([
    pageRows({
      sql: REPORT_SELECT,
      where: "r.status = 'open'",
      order: "r.created_at DESC",
      page: Number(openParam ?? 1),
      pageSize: PAGE_SIZE,
      map: mapReportWithPost,
    }),
    pageRows({
      sql: REPORT_SELECT,
      where: "r.status != 'open'",
      order: "r.created_at DESC",
      page: Number(doneParam ?? 1),
      pageSize: PAGE_SIZE,
      map: mapReportWithPost,
    }),
  ]);

  return (
    <div>
      <PageHeading
        emoji="🚩"
        kicker="READER REPORTS QUEUE"
        title="পাঠকের রিপোর্ট"
        description="রিপোর্ট করা পোস্টের ছবি ও কারণ দেখে পর্যালোচনা করুন — খোলা আর নিষ্পত্তি, আলাদা কার্ডে।"
        actions={<ViewToggle labelBn="দেখার ধরন" />}
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile label="খোলা রিপোর্ট" value={open.total} tone={open.total > 0 ? "alarm" : "ink"} hint="পাঠক জবাবের অপেক্ষায়" />
        <StatTile label="নিষ্পত্তি" value={done.total} tone="teal" hint="সিদ্ধান্ত হয়ে গেছে" />
        <StatTile
          label="এই পাতায়"
          value={`${open.rows.length + done.rows.length}`}
          hint="প্রতি পাতায় সর্বোচ্চ ২০টি সারি"
        />
      </div>
      <div className="grid gap-5">
        <Card>
          <CardHead emoji="🔓" title="খোলা" kicker={`${open.total} OPEN`} />
          <div className={view === "card" ? "space-y-3 p-3" : "divide-y divide-ink/10"}>
            {open.rows.length === 0 && <Empty />}
            {open.rows.map((r) => (
              <ReportRow key={r.id} report={r} compact={view === "list"} />
            ))}
          </div>
          <Paginator
            page={open.page}
            pageSize={open.pageSize}
            total={open.total}
            basePath="/admin/reports"
            paramName="openPage"
            extraParams={extra}
          />
        </Card>
        <Card>
          <CardHead emoji="✅" title="নিষ্পত্তি" kicker={`${done.total} CLOSED`} />
          <div className={view === "card" ? "space-y-3 p-3" : "divide-y divide-ink/10"}>
            {done.rows.length === 0 && <Empty />}
            {done.rows.map((r) => (
              <ReportRow key={r.id} report={r} compact={view === "list"} />
            ))}
          </div>
          <Paginator
            page={done.page}
            pageSize={done.pageSize}
            total={done.total}
            basePath="/admin/reports"
            paramName="donePage"
            extraParams={extra}
          />
        </Card>
      </div>
    </div>
  );
}

function Empty() {
  return <p className="border border-dashed border-ink/30 p-6 text-center text-[13px] text-ink-soft">কোনো রিপোর্ট নেই।</p>;
}