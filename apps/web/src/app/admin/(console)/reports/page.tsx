import { mapReport, pageRows } from "@hoichoi/db";
import type { ReaderReportWithPost } from "@hoichoi/shared-types";
import { Paginator } from "@/components/admin/Paginator";
import { ReportRow } from "@/components/admin/ReportRow";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

/** Reports carry their parent post's title/slug, joined in SQL. */
const REPORT_SELECT =
  "SELECT r.*, p.title_bn AS postTitle, p.slug AS postSlug, p.category AS postCategory FROM reader_reports r LEFT JOIN posts p ON p.id = r.post_id";

function mapReportWithPost(row: Record<string, unknown>): ReaderReportWithPost {
  return {
    ...mapReport(row),
    postTitle: (row.postTitle as string | null) ?? null,
    postSlug: (row.postSlug as string | null) ?? null,
    postCategory: (row.postCategory as string | null) ?? null,
  };
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ openPage?: string; donePage?: string }>;
}) {
  const { openPage: openParam, donePage: doneParam } = await searchParams;

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
      <header>
        <p className="font-mono-x text-[10px] tracking-[0.24em] text-alizarin uppercase">
          🚩 READER REPORTS QUEUE
        </p>
        <h1 className="mt-1 font-serif-bn text-[34px] font-black text-ink">পাঠকের রিপোর্ট</h1>
      </header>
      <div className="mt-6 grid gap-10">
        <section>
          <QueueTitle count={open.total} label="খোলা" />
          <div className="mt-3 space-y-3">
            {open.rows.length === 0 && <Empty />}
            {open.rows.map((r) => (
              <ReportRow key={r.id} report={r} />
            ))}
          </div>
          <Paginator
            page={open.page}
            pageSize={open.pageSize}
            total={open.total}
            basePath="/admin/reports"
            paramName="openPage"
            extraParams={doneParam ? { donePage: doneParam } : {}}
          />
        </section>
        <section>
          <QueueTitle count={done.total} label="নিষ্পত্তি" />
          <div className="mt-3 space-y-3">
            {done.rows.length === 0 && <Empty />}
            {done.rows.map((r) => (
              <ReportRow key={r.id} report={r} />
            ))}
          </div>
          <Paginator
            page={done.page}
            pageSize={done.pageSize}
            total={done.total}
            basePath="/admin/reports"
            paramName="donePage"
            extraParams={openParam ? { openPage: openParam } : {}}
          />
        </section>
      </div>
    </div>
  );
}

function QueueTitle({ count, label }: { count: number; label: string }) {
  return (
    <h2 className="flex items-center gap-2 font-sans-bn text-[16px] font-bold text-ink">
      <span className="h-2 w-2 bg-alizarin"></span> {label}
      <span className="rounded-full bg-ink px-2 py-0.5 font-mono-x text-[10px] text-paper">{count}</span>
    </h2>
  );
}

function Empty() {
  return <p className="border border-dashed border-ink/30 p-6 text-center text-[13px] text-ink-soft">কোনো রিপোর্ট নেই।</p>;
}