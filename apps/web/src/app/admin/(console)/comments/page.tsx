import { getAllComments } from "@hoichoi/db";
import { ModerationTable } from "@/components/admin/ModerationTable";

export const dynamic = "force-dynamic";

/**
 * Reader-comment moderation, split out of the article moderation page. Content
 * approve/block decisions act on posts; this queue holds reader-submitted
 * comments ("অনুমোদন ছাড়া পাবলিকে না"). The table component polls nothing —
 * the row list is hydrated server-side and refreshed by revalidation.
 */
export default async function AdminCommentsPage() {
  const comments = await getAllComments(600).catch(() => []);
  return (
    <div>
      <PageHeading emoji="💬" kicker="PUBLIC COMMENTS · QUEUE → LIVE" title="মন্তব্য মডারেশন" />
      <p className="mt-2 max-w-2xl text-[12.5px] text-ink-soft">
        পাবলিক মন্তব্যগুলো অনুমোদন ছাড়া সাইটে দেখা যায় না। অপেক্ষমান মন্তব্যগুলো
        «অপেক্ষমান» ট্যাবে — যেগুলো মডারেট করবেন তা অনুমোদন করুন, স্প্যাম/আপত্তিকর ব্লক করুন।
      </p>
      <div className="mt-6">
        <ModerationTable rows={comments} />
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