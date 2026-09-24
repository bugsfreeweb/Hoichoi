import { getClient, mapSource, getSourceCategories, listCategories } from "@hoichoi/db";
import type { Source } from "@hoichoi/shared-types";
import { SourceForm } from "@/components/admin/SourceForm";
import { SourceRow } from "@/components/admin/SourceRow";

export const dynamic = "force-dynamic";

export default async function AdminSourcesPage() {
  const client = getClient();
  const res = await client.execute("SELECT * FROM sources ORDER BY created_at DESC");
  const rows = res.rows as Record<string, unknown>[];
  const sources: Source[] = await Promise.all(
    rows.map(async (r) => mapSource(r, await getSourceCategories(String(r.id)))),
  );
  const cats = await listCategories();

  return (
    <div>
      <PageHeading emoji="📡" kicker="SOURCE DIRECTORY" title="সোর্স" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[320px_1fr]">
        <div className="border border-ink/20 bg-paper-deep p-5">
          <h3 className="font-sans-bn text-[15px] font-bold text-ink">নতুন সোর্স যোগ</h3>
          <p className="mt-1 text-[12px] text-ink-soft">শুধু পাবলিক পেজ/গ্রুপ — ব্যক্তিগত প্রোফাইল নয়।</p>
          <div className="mt-4">
            <SourceForm categories={cats.map((c) => ({ slug: c.slug, label: c.displayNameBn }))} />
          </div>
        </div>
        <div className="space-y-2.5">
          {sources.length === 0 && (
            <p className="border border-ink/20 p-5 text-[13px] text-ink-soft">কোনো সোর্স নেই।</p>
          )}
          {sources.map((s) => (
            <SourceRow
              key={s.id}
              source={s}
              categories={cats.map((c) => ({ slug: c.slug, label: c.displayNameBn }))}
            />
          ))}
        </div>
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