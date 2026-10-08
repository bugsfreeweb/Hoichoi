import { getAllComments, mapPost, pageRows } from "@hoichoi/db";
import { ModerationCard } from "@/components/admin/ModerationCard";
import { ModerationTable } from "@/components/admin/ModerationTable";
import { Paginator } from "@/components/admin/Paginator";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ pendingPage?: string; approvedPage?: string }>;
}) {
  const { pendingPage: pendingParam, approvedPage: approvedParam } = await searchParams;

  // The review queues now page. Rendering every pending_review post at once meant
  // a backlog of any size loaded in full, and there was no indication that more
  // were waiting beyond what fit on screen.
  const [pending, approved] = await Promise.all([
    pageRows({
      sql: "SELECT * FROM posts",
      where: "status = 'pending_review'",
      order: "created_at DESC",
      page: Number(pendingParam ?? 1),
      pageSize: PAGE_SIZE,
      map: mapPost,
    }),
    pageRows({
      sql: "SELECT * FROM posts",
      where: "status = 'approved'",
      order: "created_at DESC",
      page: Number(approvedParam ?? 1),
      pageSize: PAGE_SIZE,
      map: mapPost,
    }),
  ]);
  // Reader comments are a separate moderation queue and were previously never
  // rendered here (the table component existed but was never mounted).
  const comments = await getAllComments(400).catch(() => []);

  return (
    <div>
      <PageHeading emoji="⚖️" kicker="DOUBLE-APPROVAL GATE" title="মডারেশন সারি" />
      <div className="mt-6">
        <ModerationTable rows={comments} />
      </div>
      <div className="mt-10 grid gap-10">
        <section>
          <QueueTitle color="amberx" count={pending.total} label="অনুমোদনের অপেক্ষায়" />
          <div className="mt-3 space-y-3">
            {pending.rows.length === 0 && <Empty msg="অনুমোদনের অপেক্ষায় কোনো পোস্ট নেই। চমৎকার!" />}
            {pending.rows.map((p) => (
              <ModerationCard key={p.id} post={p} queue="pending" />
            ))}
          </div>
          <Paginator
            page={pending.page}
            pageSize={pending.pageSize}
            total={pending.total}
            basePath="/admin/moderation"
            paramName="pendingPage"
            extraParams={approvedParam ? { approvedPage: approvedParam } : {}}
          />
        </section>
        <section>
          <QueueTitle color="cat-blue" count={approved.total} label="দ্বিতীয়-অনুমোদনের (সম্পাদক-অনুমোদনের) অপেক্ষায়" />
          <p className="mt-1 text-[12.5px] text-ink-soft">
            child-sexual-abuse বিভাগের জন্য চার-স্তরের (fact+editor+human+legal) যাচাই - প্রকাশের আগে approver লিখে স্বাক্ষর করতে হয়
          </p>
          <div className="mt-3 space-y-3">
            {approved.rows.length === 0 && <Empty msg="কোনো পোস্ট নেই।" />}
            {approved.rows.map((p) => (
              <ModerationCard key={p.id} post={p} queue="approved" />
            ))}
          </div>
          <Paginator
            page={approved.page}
            pageSize={approved.pageSize}
            total={approved.total}
            basePath="/admin/moderation"
            paramName="approvedPage"
            extraParams={pendingParam ? { pendingPage: pendingParam } : {}}
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

function QueueTitle({ color, count, label }: { color: string; count: number; label: string }) {
  const dot = color === "amberx" ? "bg-amberx" : "bg-cat-blue";
  return (
    <h2 className="flex items-center gap-2 font-sans-bn text-[16px] font-bold text-ink">
      <span className={`h-2 w-2 ${dot}`}></span>
      {label}
      <span className="rounded-full bg-ink px-2 py-0.5 font-mono-x text-[10px] text-paper">{count}</span>
    </h2>
  );
}

function Empty({ msg }: { msg: string }) {
  return <p className="border border-dashed border-ink/30 p-6 text-center text-[13px] text-ink-soft">{msg}</p>;
}