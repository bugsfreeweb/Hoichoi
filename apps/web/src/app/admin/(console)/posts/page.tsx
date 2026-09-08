import Link from "next/link";
import { listPosts } from "@hoichoi/db";
import type { Post, PostStatus } from "@hoichoi/shared-types";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<PostStatus, string> = {
  pending_review: "bg-amberx",
  approved: "bg-cat-blue",
  rejected: "bg-alizarin",
  published: "bg-lime",
  removed: "bg-ink-soft",
};

export default async function AdminPostsPage() {
  const posts = await listPosts(300);

  return (
    <div>
      <PageHeading />
      <div className="mt-6 space-y-2">
        {posts.length === 0 && (
          <p className="border border-dashed border-ink/30 p-6 text-center text-[13px] text-ink-soft">
            এখনো কোনো পোস্ট নেই। পাইপলাইন চালালে এখানে আসবে।
          </p>
        )}
        {posts.map((p) => (
          <PostRow key={p.id} post={p} />
        ))}
      </div>
    </div>
  );
}

function PageHeading() {
  return (
    <header>
      <p className="font-mono-x text-[10px] tracking-[0.24em] text-alizarin uppercase">✏️ CONTENT MANAGER</p>
      <h1 className="mt-1 font-serif-bn text-[34px] font-black text-ink">পোস্ট এডিটর</h1>
      <p className="mt-1 text-[12.5px] text-ink-soft">
        যেকোনো পোস্টের শিরোনাম, বিবরণ, সারাংশ, ক্যাটাগরি, কেস-স্ট্যাটাস ও প্রকাশের তারিখ-সময় বদলান; দেখান-লুকান; বা মুছে ফেলুন। প্রতিটি কাজ লগ-এ রেকর্ড হয়।
      </p>
    </header>
  );
}

function PostRow({ post }: { post: Post }) {
  const date = (v: string | null) => (v ? new Date(v).toLocaleString("bn-BD", { dateStyle: "short", timeStyle: "short" }) : "—");
  return (
    <Link
      href={`/admin/posts/${post.id}`}
      className="flex flex-wrap items-center gap-3 border border-ink/20 bg-paper-deep px-4 py-3 transition-colors hover:border-alizarin/50 hover:bg-paper"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-bold text-ink">{post.title_bn}</p>
        <p className="truncate font-mono-x text-[10.5px] text-ink-soft">
          {post.slug} · আপডেট: {date(post.updated_at)}
        </p>
      </div>
      <span className="rounded-full border border-ink/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-soft">
        {post.category}
      </span>
      {post.case_status && (
        <span className="rounded-full border border-ink/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-soft">
          case: {post.case_status}
        </span>
      )}
      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-paper ${STATUS_STYLE[post.status]}`}>
        {post.status}
      </span>
      <span className="font-mono-x text-[10.5px] text-ink-soft">{date(post.published_at)}</span>
    </Link>
  );
}