import { PageHeading as AdminPageHeading } from "@/components/admin/ui/PageHeader";
import { ViewToggle, viewFromSearch } from "@/components/admin/ui/ViewToggle";
import Link from "next/link";
import { mapPost, pageRows } from "@hoichoi/db";
import type { Post, PostStatus } from "@hoichoi/shared-types";
import { Paginator } from "@/components/admin/Paginator";
import { AdminThumb, OriginBadge } from "@/components/admin/AdminThumb";
import { QuickImageButton } from "@/components/admin/QuickImageButton";
import { imageOrigin } from "@/lib/image-origin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const STATUS_STYLE: Record<PostStatus, string> = {
  pending_review: "bg-amberx",
  approved: "bg-cat-blue",
  rejected: "bg-alizarin",
  published: "bg-lime",
  removed: "bg-ink-soft",
};

/**
 * Content manager.
 *
 * Two views over the same rows:
 *  - **card** — picture first, so an operator can judge an article at a glance
 *    and regenerate its image without opening the editor;
 *  - **list** — the dense table the desk already used for bulk scanning.
 *
 * The image badge (`মূল উৎস` / `AI তৈরি` / `অ্যাডমিন আপলোড` / `বাইরের লিংক`) is
 * fed by `posts.media_origin`, so "where did this picture come from" is answered
 * by the row instead of by opening the post.
 */
export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const view = viewFromSearch(sp);

  const result = await pageRows({
    sql: "SELECT * FROM posts",
    order: "updated_at DESC",
    page: Number(sp.page ?? 1),
    pageSize: PAGE_SIZE,
    map: mapPost,
  });

  return (
    <div>
      <PageHeading />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-ink-soft">
          মোট {result.total.toLocaleString("bn-BD")} পোস্ট · পৃষ্ঠা {result.page}/{Math.max(1, Math.ceil(result.total / result.pageSize))}
          {" · "}ছবি না থাকলে এক ক্লিকেই AI ছবি তৈরি করুন।
        </p>
        <ViewToggle labelBn="দেখার ধরন" />
      </div>

      {result.rows.length === 0 && (
        <p className="mt-6 border border-dashed border-ink/30 p-6 text-center text-[13px] text-ink-soft">
          এখনো কোনো পোস্ট নেই। পাইপলাইন চালালে এখানে আসবে।
        </p>
      )}

      {view === "card" ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {result.rows.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      ) : (
        <div className="mt-5 divide-y divide-ink/10 border border-ink/20">
          {result.rows.map((p) => (
            <PostListRow key={p.id} post={p} />
          ))}
        </div>
      )}

      <Paginator
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        basePath="/admin/posts"
        extraParams={view === "card" ? { view: "card" } : {}}
      />
    </div>
  );
}

function PageHeading() {
  return (
    <AdminPageHeading
      emoji="✏️"
      kicker="CONTENT MANAGER"
      title="পোস্ট এডিটর"
      description="যেকোনো পোস্টের শিরোনাম, বিবরণ, সারাংশ, ক্যাটাগরি, কেস-স্ট্যাটাস ও প্রকাশের তারিখ-সময় বদলান; ছবির উৎস দেখুন, এক ক্লিকে AI ছবি তৈরি করুন; দেখান-লুকান বা মুছে ফেলুন। প্রতিটি কাজ লগ-এ রেকর্ড হয়।"
    />
  );
}

const date = (v: string | null) =>
  v ? new Date(v).toLocaleString("bn-BD", { dateStyle: "short", timeStyle: "short" }) : "—";

function StatusPill({ status }: { status: PostStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-paper ${STATUS_STYLE[status]}`}>
      {status}
    </span>
  );
}

function PostCard({ post }: { post: Post }) {
  const o = imageOrigin(post);
  return (
    <div className="group flex flex-col border border-ink/20 bg-paper-deep transition-colors hover:border-alizarin/50">
      <Link href={`/admin/posts/${post.id}`} className="block">
        {/* Image area keeps a fixed ratio so a missing picture does not make the
            card shorter than its neighbours. */}
        <div className="relative aspect-[16/9] overflow-hidden border-b border-ink/15 bg-ink/[0.04]">
          {post.media_path && post.media_kind !== "none" ? (
            <AdminThumb post={post} size="lg" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-ink-soft">
              <span className="text-[18px]">🖼</span>
              <span className="text-[10.5px] font-bold">ছবি নেই</span>
            </div>
          )}
          <span className="absolute top-2 left-2">
            <StatusPill status={post.status} />
          </span>
          <span className="absolute top-2 right-2">
            <OriginBadge post={post} className="bg-paper/90 backdrop-blur-sm" />
          </span>
        </div>
        <div className="px-3 pt-2.5">
          <p className="line-clamp-2 font-serif-bn text-[14.5px] font-extrabold leading-snug text-ink">
            {post.title_bn}
          </p>
          <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-ink-soft">
            {post.summary_bn ?? post.body_bn}
          </p>
        </div>
      </Link>
      <div className="mt-auto flex flex-wrap items-center gap-1.5 px-3 pt-2 pb-3">
        <span className="rounded-full border border-ink/20 px-2 py-0.5 text-[9.5px] font-bold text-ink-soft">
          {post.category}
        </span>
        <span className="font-mono-x text-[9.5px] text-ink-soft/80">{date(post.updated_at)}</span>
        <span className="ml-auto flex items-center gap-1.5">
          <QuickImageButton postId={post.id} hasImage={Boolean(post.media_path)} compact />
          <Link
            href={`/admin/posts/${post.id}`}
            className="border border-ink/25 bg-paper px-2 py-1 text-[10.5px] font-bold text-ink hover:border-ink"
            title={o.hint}
          >
            এডিট →
          </Link>
        </span>
      </div>
    </div>
  );
}

function PostListRow({ post }: { post: Post }) {
  return (
    <div className="flex flex-wrap items-center gap-3 bg-paper-deep px-3 py-2.5 transition-colors hover:bg-paper">
      <Link href={`/admin/posts/${post.id}`} className="shrink-0">
        {post.media_path && post.media_kind !== "none" ? <AdminThumb post={post} size="sm" /> : <AdminThumb post={post} size="sm" />}
      </Link>
      <div className="min-w-[200px] flex-1">
        <Link href={`/admin/posts/${post.id}`} className="block truncate text-[13px] font-bold text-ink hover:text-alizarin">
          {post.title_bn}
        </Link>
        <p className="truncate text-[11px] text-ink-soft">{post.summary_bn ?? post.body_bn}</p>
        <p className="truncate font-mono-x text-[9.5px] text-ink-soft/70">
          {post.slug} · আপডেট: {date(post.updated_at)}
        </p>
      </div>
      <OriginBadge post={post} />
      <span className="rounded-full border border-ink/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-soft">
        {post.category}
      </span>
      {post.case_status && (
        <span className="rounded-full border border-ink/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-soft">
          case: {post.case_status}
        </span>
      )}
      <StatusPill status={post.status} />
      <span className="hidden font-mono-x text-[10px] text-ink-soft sm:inline">{date(post.published_at)}</span>
      <QuickImageButton postId={post.id} hasImage={Boolean(post.media_path)} compact />
    </div>
  );
}
