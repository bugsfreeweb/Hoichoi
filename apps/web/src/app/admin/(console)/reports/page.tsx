import { mapReport, pageRows } from "@hoichoi/db";
import type { ReaderReportWithPost } from "@hoichoi/shared-types";
import { Paginator } from "@/components/admin/Paginator";
import { ReportRow } from "@/components/admin/ReportRow";
import { ViewToggle, viewFromSearch } from "@/components/admin/ui/ViewToggle";

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
      <header>
        <p className="font-mono-x text-[10px] tracking-[0.24em] text-alizarin uppercase">
          🚩 READER REPORTS QUEUE
        </p>
        <h1 className="mt-1 font-serif-bn text-[34px] font-black text-ink">পাঠকের রিপোর্ট</h1>
      </header>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-ink-soft">রিপোর্ট করা পোস্টের ছবি ও কারণ দেখে পর্যালোচনা করুন।</p>
        <ViewToggle labelBn="দেখার ধরন" />
      </div>
      <div className="mt-6 grid gap-10">
        <section>
          <QueueTitle count={open.total} label="খোলা" />
          <div className={view === "card" ? "mt-3 space-y-3" : "mt-3 divide-y divide-ink/10 border border-ink/20"}>
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
        </section>
        <section>
          <QueueTitle count={done.total} label="নিষ্পত্তি" />
          <div className={view === "card" ? "mt-3 space-y-3" : "mt-3 divide-y divide-ink/10 border border-ink/20"}>
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