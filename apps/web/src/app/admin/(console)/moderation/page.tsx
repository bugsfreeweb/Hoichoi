import { PageHeading } from "@/components/admin/ui/PageHeader";
import { mapPost, pageRows } from "@hoichoi/db";
import { ModerationCard } from "@/components/admin/ModerationCard";
import { ModerationListRow } from "@/components/admin/ModerationListRow";
import { ViewToggle } from "@/components/admin/ui/ViewToggle";
import { viewFromSearch } from "@/lib/view";
import { Paginator } from "@/components/admin/Paginator";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ pendingPage?: string; approvedPage?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const { pendingPage: pendingParam, approvedPage: approvedParam } = sp;
  const view = viewFromSearch(sp);
  const extra = {
    ...(pendingParam ? { pendingPage: pendingParam } : {}),
    ...(approvedParam ? { approvedPage: approvedParam } : {}),
    ...(view === "card" ? { view: "card" } : {}),
  };

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
  // Reader comments live on their own moderation page (/admin/comments) — the
  // comment queue was split out of this content page so a post editor looking
  // at article queues does not scroll past reader-submitted text to do their job.
  return (
    <div>
      <PageHeading emoji="⚖️" kicker="DOUBLE-APPROVAL GATE" title="কনটেন্ট মডারেশন" description="AI-উৎপাদিত খসড়া দুই ধাপের অনুমোদনের পর প্রকাশিত হয়। নোট লিখে অনুমোদন, প্রত্যাখ্যান বা প্রকাশ করুন।" />
      <p className="mt-2 text-[12.5px] text-ink-soft">
        প্রকাশের আগে দুই ধাপের যাচাই। পাঠকের মন্তব্য আলাদা কিউতে —{" "}
        <a href="/admin/comments" className="font-bold text-alizarin underline underline-offset-2">
          মন্তব্য মডারেশন ↗
        </a>
        .
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-ink-soft">
          কার্ডে ছবি ও সারাংশ দেখে দ্রুত সিদ্ধান্ত নিন; লিস্টে এক লাইনে বড় ব্যাকলগ স্ক্যান করুন।
        </p>
        <ViewToggle labelBn="দেখার ধরন" />
      </div>
      <div className="mt-6 grid gap-10">
        <section>
          <QueueTitle color="amberx" count={pending.total} label="অনুমোদনের অপেক্ষায়" />
          <div className="mt-3 space-y-3">
            {pending.rows.length === 0 && <Empty msg="অনুমোদনের অপেক্ষায় কোনো পোস্ট নেই। চমৎকার!" />}
            {view === "card" ? (
              pending.rows.map((p) => <ModerationCard key={p.id} post={p} queue="pending" />)
            ) : (
              <div className="divide-y divide-ink/10 border border-ink/20">
                {pending.rows.map((p) => (
                  <ModerationListRow key={p.id} post={p} queue="pending" />
                ))}
              </div>
            )}
          </div>
          <Paginator
            page={pending.page}
            pageSize={pending.pageSize}
            total={pending.total}
            basePath="/admin/moderation"
            paramName="pendingPage"
            extraParams={extra}
          />
        </section>
        <section>
          <QueueTitle color="cat-blue" count={approved.total} label="দ্বিতীয়-অনুমোদনের (সম্পাদক-অনুমোদনের) অপেক্ষায়" />
          <p className="mt-1 text-[12.5px] text-ink-soft">
            child-sexual-abuse বিভাগের জন্য চার-স্তরের (fact+editor+human+legal) যাচাই - প্রকাশের আগে approver লিখে স্বাক্ষর করতে হয়
          </p>
          <div className="mt-3 space-y-3">
            {approved.rows.length === 0 && <Empty msg="কোনো পোস্ট নেই।" />}
            {view === "card" ? (
              approved.rows.map((p) => <ModerationCard key={p.id} post={p} queue="approved" />)
            ) : (
              <div className="divide-y divide-ink/10 border border-ink/20">
                {approved.rows.map((p) => (
                  <ModerationListRow key={p.id} post={p} queue="approved" />
                ))}
              </div>
            )}
          </div>
          <Paginator
            page={approved.page}
            pageSize={approved.pageSize}
            total={approved.total}
            basePath="/admin/moderation"
            paramName="approvedPage"
            extraParams={extra}
          />
        </section>
      </div>
    </div>
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