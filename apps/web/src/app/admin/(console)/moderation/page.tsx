import { listStatusPosts } from "@hoichoi/db";
import { ModerationCard } from "@/components/admin/ModerationCard";

export const dynamic = "force-dynamic";

export default async function AdminModerationPage() {
  const [pending, approved] = await Promise.all([
    listStatusPosts("pending_review"),
    listStatusPosts("approved"),
  ]);

  return (
    <div>
      <PageHeading emoji="✅" kicker="DOUBLE-APPROVAL GATE" title="মডারেশন কিউ" />
      <div className="mt-6 grid gap-10">
        <section>
          <QueueTitle color="amberx" count={pending.length} label="পেন্ডিং রিভিউ" />
          <div className="mt-3 space-y-3">
            {pending.length === 0 && <Empty msg="রিভিউর জন্য কোনো পোস্ট নেই।" />}
            {pending.map((p) => (
              <ModerationCard key={p.id} post={p} queue="pending" />
            ))}
          </div>
        </section>
        <section>
          <QueueTitle color="cat-blue" count={approved.length} label="প্রথম-অনুমোদিত (প্রকাশের অপেক্ষায়)" />
          <p className="mt-1 text-[12.5px] text-ink-soft">
            child-sexual-abuse ক্যাটাগরিতে ডাবল-অ্যাপ্রুভাল লাগে — দ্বিতীয় approver ক্লিক করলে প্রকাশ পাবে।
          </p>
          <div className="mt-3 space-y-3">
            {approved.length === 0 && <Empty msg="কোনো পোস্ট নেই।" />}
            {approved.map((p) => (
              <ModerationCard key={p.id} post={p} queue="approved" />
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