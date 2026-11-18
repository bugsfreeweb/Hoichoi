import { PageHeading } from "@/components/admin/ui/PageHeader";
import { Card, CardHead, StatTile } from "@/components/admin/ui/Card";
import { mapProvider, pageRows } from "@hoichoi/db";
import { ProviderRow } from "@/components/admin/ProviderRow";
import { ProviderForm } from "@/components/admin/ProviderForm";
import { Paginator } from "@/components/admin/Paginator";
import { ProviderHealthTable } from "@/components/admin/ProviderHealthTable";
import { ProviderStatusBoard } from "@/components/admin/ProviderStatusBoard";
import { listAiProviderStatus } from "@hoichoi/db";
import { PROVIDERS_GUIDE } from "@/lib/provider-catalog";
import { ProviderAddPanel } from "@/components/admin/ProviderAddPanel";

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
  /** The default image provider — grouped with the image fleet, not "custom". */
  cloudflare: { order: 0 },
  custom: { order: 10 },
};

/**
 * The provider fleet, laid out like the dashboard rather than like a form.
 *
 * This page used to be a two-column grid whose left column was the "add a
 * provider" form: the form stretched to the height of the list, the list grew
 * sideways with the editing row, and the whole screen read as one undifferentiated
 * wall of bordered boxes. Now the numbers that matter are tiles at the top, the
 * fleet is a card, the health table is a card, and adding a provider is a panel
 * that opens when you need it — so the page is a console, not a spreadsheet.
 */
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

  /**
   * The tiles and the status board describe the *fleet*, not the page in view.
   * They used to be computed from the twenty rows on screen, so the headline
   * numbers moved when an operator turned the page — and a dead provider that sat
   * on page two was never counted at all.
   */
  const fleet = await listAiProviderStatus().catch(() => []);

  const active = fleet.filter((p) => p.isActive);
  const text = active.filter((p) => p.purpose === "text");
  const image = active.filter((p) => p.purpose === "image");
  const keyPresent = (p: { hasStoredKey: boolean; keyEnvVar: string }) =>
    p.hasStoredKey || Boolean(p.keyEnvVar && process.env[p.keyEnvVar]);
  const withKey = active.filter(keyPresent);
  const imageReady = image.filter(keyPresent);
  /** env names that are actually set here — never the values. */
  const envKeys = Object.keys(process.env).filter(
    (k) => k.endsWith("_API_KEY") || k === "CLOUDFLARE_API_TOKEN",
  );

  /**
   * The single sentence an operator needs when an image fails: which row would
   * actually render, or that none would. It is derived from the same three
   * conditions the resolver checks, so it cannot disagree with the chain.
   */
  const imageLine =
    imageReady.length > 0
      ? `ছবি এই মুহূর্তে ${imageReady.map((p) => p.name).join(", ")} থেকে আসবে।`
      : image.length === 0
        ? "ছবি তৈরির জন্য কোনো সক্রিয় প্রোভাইডার নেই — নিচের তালিকা থেকে একটি চালু করুন।"
        : "ছবির রো আছে কিন্তু কোনোটিতে কী নেই — কী বসান, নাহলে ছবি তৈরি হবে না।";

  return (
    <div className="pb-8">
      <PageHeading
        emoji="🤖"
        kicker="FREE-TIER FIRST RESOLVER"
        title="AI প্রোভাইডার"
        description="লেখা ও ছবি তৈরির প্রোভাইডার। বিনামূল্যের চেইন আগে চেষ্টা করা হয়, ব্যর্থ হলে পরেরটি।"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="মোট রো" value={page.total} hint="টেক্সট + ছবি" />
        <StatTile
          label="সক্রিয়"
          value={active.length}
          tone="teal"
          hint={`${text.length} লেখা · ${image.length} ছবি`}
        />
        <StatTile
          label="কী আছে"
          value={`${withKey.length}/${Math.max(1, active.length)}`}
          tone={withKey.length === 0 ? "alarm" : "ink"}
          hint="বাকিগুলো env বা vault থেকে কী খোঁজে"
        />
        <StatTile
          label="ছবি তৈরি করতে পারে"
          value={imageReady.length}
          tone={imageReady.length === 0 ? "amber" : "teal"}
          hint={imageLine}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHead
            emoji="📚"
            title="প্রোভাইডার তালিকা"
            kicker={`PRIORITY ORDER · ${providers.length} shown / ${page.total} total`}
            note="উপরের রো আগে চেষ্টা করা হয়। ✍️ লেখা আর 🎨 ছবি আলাদা কাজ — একই কী দিয়ে দুটোই হতে পারে, কিন্তু ছবির জন্য আলাদা image মডেল লাগে।"
            actions={<ProviderAddPanel />}
          />
          <div className="space-y-2.5 p-3">
            {providers.map((p, i) => (
              <ProviderRow
                key={p.id}
                provider={p}
                index={(page.page - 1) * page.pageSize + i + 1}
                // Value never leaves the server: the row only needs to know
                // whether a key exists so "configured" and "usable" stop looking
                // the same.
                envKeyPresent={Boolean(p.api_key_env_var && process.env[p.api_key_env_var])}
              />
            ))}
            {providers.length === 0 && (
              <p className="px-2 py-10 text-center text-[13px] text-ink-soft">
                এখনো কোনো প্রোভাইডার নেই — “প্রোভাইডার যোগ” দিয়ে শুরু করুন।
              </p>
            )}
            <Paginator
              page={page.page}
              pageSize={page.pageSize}
              total={page.total}
              basePath="/admin/providers"
            />
          </div>
        </Card>

        <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <Card tone="quiet">
            <CardHead emoji="🧭" title="ছবি না এলে কী দেখবেন" kicker="CHECK THREE THINGS" />
            <ol className="space-y-2 px-4 py-3 text-[12.5px] leading-relaxed text-ink">
              {PROVIDERS_GUIDE.map((line) => (
                <li key={line.bn} className="flex gap-2">
                  <span className="mt-0.5 font-mono-x text-[10px] text-alizarin">{line.n}</span>
                  <span>{line.bn}</span>
                </li>
              ))}
            </ol>
          </Card>
          <Card tone="quiet">
            <CardHead emoji="⚙️" title="কী কীভাবে পড়া হয়" kicker="KEY RESOLUTION" />
            <p className="px-4 py-3 text-[12.5px] leading-relaxed text-ink-soft">
              কী ডিফল্টে এনভায়রনমেন্ট বা vault থেকে পড়া হয়। রো-তে আলাদা কী দিলে সেটি সেই রো-তে
              সংরক্ষিত হয় এবং এনভায়রনমেন্টের চেয়ে অগ্রাধিকার পায় — Demo-তে দেখা যাবে{" "}
              <span className="font-mono-x text-[11.5px] text-ink">DB-তে সংরক্ষিত</span>।
            </p>
          </Card>
        </div>
      </div>

      <div className="mt-4">
        <ProviderStatusBoard envKeys={envKeys} />
      </div>

      <Card className="mt-4">
        <CardHead
          emoji="🩺"
          title="মিডিয়া আপলোড স্বাস্থ্য"
          kicker="MEDIA TARGETS · LAST PROBE PER TARGET"
          note="এটি ছবি/ভিডিও ফাইল কোথায় রাখা হচ্ছে তার হিসাব — AI মডেল নয়। উপরের বোর্ডটি AI প্রোভাইডারের।"
        />
        <div className="p-3">
          <ProviderHealthTable />
        </div>
      </Card>
    </div>
  );
}
