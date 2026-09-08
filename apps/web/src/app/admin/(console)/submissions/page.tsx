import { getClient, mapSubmittedPage } from "@hoichoi/db";
import { SubmissionRow } from "@/components/admin/SubmissionRow";

export const dynamic = "force-dynamic";

export default async function AdminSubmissionsPage() {
  const client = getClient();
  const res = await client.execute("SELECT * FROM submitted_pages ORDER BY created_at DESC");
  const subs = res.rows.map((r) => mapSubmittedPage(r as Record<string, unknown>));
  const open = subs.filter((s) => s.status === "new" || s.status === "reviewing");
  const done = subs.filter((s) => s.status === "accepted" || s.status === "rejected");

  return (
    <div>
      <PageHeading emoji="📥" kicker="PUBLIC SUGGESTIONS" title="সাবমিশন" />
      <div className="mt-6 grid gap-10">
        <section>
          <QueueTitle count={open.length} label="নতুন সাবমিশন" />
          <div className="mt-3 space-y-3">
            {open.length === 0 && <Empty />}
            {open.map((s) => (
              <SubmissionRow key={s.id} sub={s} />
            ))}
          </div>
        </section>
        <section>
          <QueueTitle count={done.length} label="হ্যান্ডেল করা" />
          <div className="mt-3 space-y-3">
            {done.length === 0 && <Empty />}
            {done.map((s) => (
              <SubmissionRow key={s.id} sub={s} />
            ))}
          </div>
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