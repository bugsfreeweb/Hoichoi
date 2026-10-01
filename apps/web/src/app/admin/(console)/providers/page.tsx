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
      <PageHeading emoji="🤖" kicker="FREE-TIER FIRST RESOLVER" title="AI প্রোভাইডার" />
      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-soft">
        ক্রম অনুযায়ী fallback: Google Gemini → Groq → OpenRouter :free → Ollama (local) → paid। চাবি ডিফল্টে
        Stronghold/vault/env-এ থাকে; একটি প্রোভাইডারের জন্য আলাদা API key দিলে সেটি override হিসেবে সংরক্ষিত হয় (vault/env অপরাজিত)।
      </p>
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
            <ProviderRow key={p.id} provider={p} index={i + 1} />
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