import { PageHeading } from "@/components/admin/ui/PageHeader";
import { mapProvider, pageRows } from "@hoichoi/db";
import { ProviderRow } from "@/components/admin/ProviderRow";
import { ProviderForm } from "@/components/admin/ProviderForm";
import { Paginator } from "@/components/admin/Paginator";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const TIERS: Record<string, { order: number }> = {
  google: { order: 1 },
  groq: { order: 2 },
  openrouter: { order: 3 },
  ollama: { order: 4 },
  anthropic: { order: 5 },
  openai: { order: 6 },
  mistral: { order: 7 },
  github: { order: 8 },
  "github-models": { order: 9 },
  custom: { order: 10 },
};

export default async function AdminProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = await pageRows({
    sql: "SELECT * FROM llm_providers",
    order: "priority ASC",
    page: Number(pageParam ?? 1),
    pageSize: PAGE_SIZE,
    map: mapProvider,
  });
  const providers = page.rows
    .map((r) => r)
    .sort((a, b) => (TIERS[a.provider_key]?.order ?? 9) - (TIERS[b.provider_key]?.order ?? 9));

  return (
    <div>
      <PageHeading emoji="🤖" kicker="FREE-TIER FIRST RESOLVER" title="AI প্রোভাইডার" description="লেখা ও ছবি তৈরির প্রোভাইডার যোগ করুন বা বদলান। বিনামূল্যের চেইন আগে চেষ্টা করা হয়, ব্যর্থ হলে পরেরটি।" />
      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-soft">
        প্রতিটি প্রোভাইডার দুটি আলাদা কাজে লাগে — <b className="text-ink">✍️ লেখা</b> আর{" "}
        <b className="text-ink">🎨 ছবি</b>. Google ও OpenAI-এর একই কী দিয়ে দুটোই হয়, শুধু ছবির জন্য আলাদা
        image মডেল বেছে নিতে হয়। কী ডিফল্টে এনভায়রনমেন্ট/vault থেকে পড়া হয়; আলাদা কী দিলে সেটি সেই রো-তে
        সংরক্ষিত হয় এবং এনভায়রনমেন্টকে অগ্রাহ্য করে।
      </p>
      <div className="mt-3 max-w-2xl border-l-2 border-cat-teal bg-cat-teal/10 px-3 py-2 text-[12px] leading-relaxed text-ink">
        <b>ছবি না আসলে কী দেখবেন:</b> নিচের তালিকায় অন্তত একটি রো-তে{" "}
        <span className="font-mono-x">🎨 ছবি</span> ব্যাজ, <span className="font-mono-x">✓ কী আছে</span> আর
        image-সক্ষম মডেল (যেমন <span className="font-mono-x">gemini-2.5-flash-image</span> বা{" "}
        <span className="font-mono-x">gpt-image-1</span>) থাকতে হবে। তিনটির একটি না মিললে জেনারেশন ওই রো
        এড়িয়ে যায়।
      </div>
      <div className="mt-6 grid gap-8 lg:grid-cols-[320px_1fr]">
        <div className="border border-ink/20 bg-paper-deep p-5">
          <h3 className="font-sans-bn text-[15px] font-bold text-ink">প্রোভাইডার যোগ</h3>
          <div className="mt-4">
            <ProviderForm />
          </div>
        </div>
        <div className="space-y-2.5">
          <p className="font-mono-x text-[10px] tracking-[0.24em] text-ink-soft uppercase">
            PRIORITY ORDER · {providers.length} registered
          </p>
          {providers.map((p, i) => (
            <ProviderRow
              key={p.id}
              provider={p}
              index={i + 1}
              // Value never leaves the server: the row only needs to know
              // whether a key exists so "configured" and "usable" stop looking
              // the same.
              envKeyPresent={Boolean(p.api_key_env_var && process.env[p.api_key_env_var])}
            />
          ))}
          <Paginator
            page={page.page}
            pageSize={page.pageSize}
            total={page.total}
            basePath="/admin/providers"
          />
        </div>
      </div>
    </div>
  );
}

