import { PageHeading } from "@/components/admin/ui/PageHeader";
import { SectionTabs, type SectionTab } from "@/components/admin/ui/SectionTabs";
import { MODERATION_SECTION } from "@/components/admin/ui/sections";
import { listCategories, mapPost, pageRows } from "@hoichoi/db";
import { ModerationGrid } from "@/components/admin/ModerationGrid";
import { ModerationListRow } from "@/components/admin/ModerationListRow";
import type { CategoryOption } from "@/components/admin/CategoryPicker";
import { ViewToggle } from "@/components/admin/ui/ViewToggle";
import { viewFromSearch } from "@/lib/view";
import { biFor } from "@hoichoi/i18n";
import { getLocale } from "@/lib/locale";
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
  const [pending, approved, categories] = await Promise.all([
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
    listCategories({ includeInactive: true }),
  ]);

  /**
   * Which posts a checkbox may not approve.
   *
   * A desk with `requires_double_approval` needs a second human signature, and a
   * bulk tick is not that signature. The set is computed here and enforced again
   * in `/api/moderation/bulk`: the UI explains, the server refuses.
   */
  const doubleDesks = new Set(
    categories.filter((c) => c.config.requires_double_approval).map((c) => c.slug),
  );
  const lockedIds = (rows: typeof pending.rows): string[] =>
    rows.filter((p) => doubleDesks.has(p.category)).map((p) => p.id);

  // Quick desk correction uses the same categories the editor offers. Only
  // active desks are writable; a legacy value stays visible on its own row.
  const categoryOptions: CategoryOption[] = categories
    .filter((c) => c.isActive)
    .map((c) => ({
      slug: c.slug,
      label: c.displayNameBn,
      labelEn: c.displayNameEn,
    }));
  // Reader comments live on their own moderation page (/admin/comments) — the
  // comment queue was split out of this content page so a post editor looking
  // at article queues does not scroll past reader-submitted text to do their job.
  // This is a server component, so it builds its own pair function.
  const b = biFor(await getLocale());
  return (
    <div>
      <SectionTabs
        tabs={MODERATION_SECTION.tabs as unknown as SectionTab[]}
        current="/admin/moderation"
        label={MODERATION_SECTION.label}
      />
      <PageHeading
        emoji="⚖️"
        kicker="DOUBLE-APPROVAL GATE"
        title={b("কনটেন্ট মডারেশন", "Content moderation")}
        description={b(
          "AI-উৎপাদিত খসড়া দুই ধাপের অনুমোদনের পর প্রকাশিত হয়। নোট লিখে অনুমোদন, প্রত্যাখ্যান বা প্রকাশ করুন।",
          "AI-written drafts publish only after two approvals. Approve, reject or publish with a note.",
        )}
      />
      <p className="mt-2 text-[12.5px] text-ink-soft">
        {b(
          "প্রকাশের আগে দুই ধাপের যাচাই। পাঠকের মন্তব্য আলাদা কিউতে —",
          "Two gates before anything publishes. Reader comments sit in their own queue —",
        )}{" "}
        <a href="/admin/comments" className="font-bold text-alizarin underline underline-offset-2">
          {b("মন্তব্য মডারেশন ↗", "Comment moderation ↗")}
        </a>
        .
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-ink-soft">
          {b(
            "কার্ডে ছবি ও সারাংশ দেখে দ্রুত সিদ্ধান্ত নিন; লিস্টে এক লাইনে বড় ব্যাকলগ স্ক্যান করুন।",
            "Cards show the picture and summary for a quick call; the list scans a large backlog one line at a time.",
          )}
        </p>
        <ViewToggle labelBn={b("দেখার ধরন", "View")} />
      </div>
      <div className="mt-6 grid gap-10">
        <section>
          <QueueTitle color="amberx" count={pending.total} label={b("অনুমোদনের অপেক্ষায়", "Waiting for the first approval")} />
          <div className="mt-3">
            {pending.rows.length === 0 && <Empty msg={b("অনুমোদনের অপেক্ষায় কোনো পোস্ট নেই। চমৎকার!", "Nothing is waiting for approval. Good.")} />}
            {view === "card" && pending.rows.length > 0 ? (
              <ModerationGrid
                posts={pending.rows}
                queue="pending"
                lockedIds={lockedIds(pending.rows)}
                categories={categoryOptions}
              />
            ) : view === "card" ? null : (
              <div className="divide-y divide-ink/10 border border-ink/20">
                {pending.rows.map((p) => (
                  <ModerationListRow key={p.id} post={p} queue="pending" categories={categoryOptions} />
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
          <QueueTitle color="cat-blue" count={approved.total} label={b(
              "দ্বিতীয়-অনুমোদনের (সম্পাদক-অনুমোদনের) অপেক্ষায়",
              "Waiting for the second (editor) approval",
            )} />
          <p className="mt-1 text-[12.5px] text-ink-soft">
            {b(
              "child-sexual-abuse বিভাগের জন্য চার-স্তরের (fact+editor+human+legal) যাচাই - প্রকাশের আগে approver লিখে স্বাক্ষর করতে হয়",
              "child-sexual-abuse needs four gates (fact + editor + human + legal) — an approver has to sign in writing before it publishes",
            )}
          </p>
          <div className="mt-3">
            {approved.rows.length === 0 && <Empty msg={b("কোনো পোস্ট নেই।", "No posts here.")} />}
            {view === "card" && approved.rows.length > 0 ? (
              <ModerationGrid
                posts={approved.rows}
                queue="approved"
                lockedIds={lockedIds(approved.rows)}
                categories={categoryOptions}
              />
            ) : view === "card" ? null : (
              <div className="divide-y divide-ink/10 border border-ink/20">
                {approved.rows.map((p) => (
                  <ModerationListRow key={p.id} post={p} queue="approved" categories={categoryOptions} />
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