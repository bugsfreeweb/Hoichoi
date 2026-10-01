import { getPostById, mapRemovalRequest, pageRows } from "@hoichoi/db";
import { RemovalRow } from "@/components/admin/RemovalRow";
import { Paginator } from "@/components/admin/Paginator";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminRemovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ openPage?: string; donePage?: string }>;
}) {
  const { openPage: openParam, donePage: doneParam } = await searchParams;

  // The two queues page separately. This page used to read every row of
  // removal_requests, split it in JS, and render all of it, so an open request
  // could fall past the fold with no way to reach it, and the closed list grew
  // without limit.
  const [open, done] = await Promise.all([
    pageRows({
      sql: "SELECT * FROM removal_requests",
      where: "status = 'open'",
      order: "created_at DESC",
      page: Number(openParam ?? 1),
      pageSize: PAGE_SIZE,
      map: mapRemovalRequest,
    }),
    pageRows({
      sql: "SELECT * FROM removal_requests",
      where: "status != 'open'",
      order: "created_at DESC",
      page: Number(doneParam ?? 1),
      pageSize: PAGE_SIZE,
      map: mapRemovalRequest,
    }),
  ]);

  // Resolve post titles for the rows actually on screen. Resolving them for the
  // whole table meant one getPostById per historical request.
  const posts = new Map<string, { slug: string; title: string }>();
  for (const r of [...open.rows, ...done.rows]) {
    if (posts.has(r.post_id)) continue;
    const p = await getPostById(r.post_id);
    if (p) posts.set(r.post_id, { slug: p.slug, title: p.title_bn });
  }

  return (
    <div>
      <PageHeading emoji="⚠️" kicker="CONTENT TAKEDOWN REQUESTS" title="রিমুভাল রিকোয়েস্ট" />
      <div className="mt-6 grid gap-10">
        <section>
          <QueueTitle count={open.total} label="খোলা" />
          <div className="mt-3 space-y-3">
            {open.rows.length === 0 && <Empty />}
            {open.rows.map((r) => (
              <RemovalRow key={r.id} req={r} post={posts.get(r.post_id)} />
            ))}
          </div>
          <Paginator
            page={open.page}
            pageSize={open.pageSize}
            total={open.total}
            basePath="/admin/removals"
            paramName="openPage"
            extraParams={doneParam ? { donePage: doneParam } : {}}
          />
        </section>
        <section>
          <QueueTitle count={done.total} label="প্রসেসড" />
          <div className="mt-3 space-y-3">
            {done.rows.length === 0 && <Empty />}
            {done.rows.map((r) => (
              <RemovalRow key={r.id} req={r} post={posts.get(r.post_id)} />
            ))}
          </div>
          <Paginator
            page={done.page}
            pageSize={done.pageSize}
            total={done.total}
            basePath="/admin/removals"
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
      <span className="h-2 w-2 bg-alizarin"></span> {label}
      <span className="rounded-full bg-ink px-2 py-0.5 font-mono-x text-[10px] text-paper">{count}</span>
    </h2>
  );
}

function Empty() {
  return <p className="border border-dashed border-ink/30 p-6 text-center text-[13px] text-ink-soft">কোনো রিকোয়েস্ট নেই।</p>;
}