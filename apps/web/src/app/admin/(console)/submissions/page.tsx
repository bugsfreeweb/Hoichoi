import { mapSubmittedPage, pageRows } from "@hoichoi/db";
import { SubmissionRow } from "@/components/admin/SubmissionRow";
import { Paginator } from "@/components/admin/Paginator";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ openPage?: string; donePage?: string }>;
}) {
  const { openPage: openParam, donePage: doneParam } = await searchParams;

  // Paginate in SQL rather than fetching every row and filtering in JS. Both
  // queues page independently so working the "new" list does not jump the
  // "processed" list back to page 1.
  const [open, done] = await Promise.all([
    pageRows({
      sql: "SELECT * FROM submitted_pages",
      where: "status IN ('new', 'reviewing')",
      order: "created_at DESC",
      page: Number(openParam ?? 1),
      pageSize: PAGE_SIZE,
      map: mapSubmittedPage,
    }),
    pageRows({
      sql: "SELECT * FROM submitted_pages",
      where: "status IN ('accepted', 'rejected')",
      order: "created_at DESC",
      page: Number(doneParam ?? 1),
      pageSize: PAGE_SIZE,
      map: mapSubmittedPage,
    }),
  ]);

  return (
    <div>
      <PageHeading emoji="💡" kicker="PUBLIC SUGGESTIONS" title="সাবমিশন" />
      <div className="mt-6 grid gap-10">
        <section>
          <QueueTitle count={open.total} label="নতুন সাবমিশন" />
          <div className="mt-3 space-y-3">
            {open.rows.length === 0 && <Empty />}
            {open.rows.map((s) => (
              <SubmissionRow key={s.id} sub={s} />
            ))}
          </div>
          <Paginator
            page={open.page}
            pageSize={open.pageSize}
            total={open.total}
            basePath="/admin/submissions"
            paramName="openPage"
            extraParams={doneParam ? { donePage: doneParam } : {}}
          />
        </section>
        <section>
          <QueueTitle count={done.total} label="প্রসেসড সাবমিশন" />
          <div className="mt-3 space-y-3">
            {done.rows.length === 0 && <Empty />}
            {done.rows.map((s) => (
              <SubmissionRow key={s.id} sub={s} />
            ))}
          </div>
          <Paginator
            page={done.page}
            pageSize={done.pageSize}
            total={done.total}
            basePath="/admin/submissions"
            paramName="donePage"
            extraParams={openParam ? { openPage: openParam } : {}}
          />
        </section>
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

function QueueTitle({ count, label }: { count: number; label: string }) {
  return (
    <h2 className="flex items-center gap-2 font-sans-bn text-[16px] font-bold text-ink">
      <span className="h-2 w-2 bg-cat-blue"></span> {label}
      <span className="rounded-full bg-ink px-2 py-0.5 font-mono-x text-[10px] text-paper">{count}</span>
    </h2>
  );
}

function Empty() {
  return <p className="border border-dashed border-ink/30 p-6 text-center text-[13px] text-ink-soft">কোনো এন্ট্রি নেই।</p>;
}