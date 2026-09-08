import { getClient, getPostById, mapRemovalRequest } from "@hoichoi/db";
import { RemovalRow } from "@/components/admin/RemovalRow";

export const dynamic = "force-dynamic";

export default async function AdminRemovalsPage() {
  const client = getClient();
  const res = await client.execute("SELECT * FROM removal_requests ORDER BY created_at DESC");
  const rows = res.rows.map((r) => mapRemovalRequest(r as Record<string, unknown>));
  const posts = new Map<string, { slug: string; title: string }>();
  for (const r of rows) {
    if (!posts.has(r.post_id)) {
      const p = await getPostById(r.post_id);
      if (p) posts.set(r.post_id, { slug: p.slug, title: p.title_bn });
    }
  }
  const open = rows.filter((r) => r.status === "open");
  const done = rows.filter((r) => r.status !== "open");

  return (
    <div>
      <PageHeading emoji="⚠️" kicker="CONTENT TAKEDOWN REQUESTS" title="রিমুভাল রিকোয়েস্ট" />
      <div className="mt-6 grid gap-10">
        <section>
          <QueueTitle count={open.length} label="খোলা" />
          <div className="mt-3 space-y-3">
            {open.length === 0 && <Empty />}
            {open.map((r) => (
              <RemovalRow key={r.id} req={r} post={posts.get(r.post_id)} />
            ))}
          </div>
        </section>
        <section>
          <QueueTitle count={done.length} label="প্রসেসড" />
          <div className="mt-3 space-y-3">
            {done.length === 0 && <Empty />}
            {done.map((r) => (
              <RemovalRow key={r.id} req={r} post={posts.get(r.post_id)} />
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
      <span className="h-2 w-2 bg-alizarin"></span> {label}
      <span className="rounded-full bg-ink px-2 py-0.5 font-mono-x text-[10px] text-paper">{count}</span>
    </h2>
  );
}

function Empty() {
  return <p className="border border-dashed border-ink/30 p-6 text-center text-[13px] text-ink-soft">কোনো রিকোয়েস্ট নেই।</p>;
}