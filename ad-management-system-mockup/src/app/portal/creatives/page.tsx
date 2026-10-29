import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { advertisers, creatives } from "@/db/schema";
import { ConsoleShell, CLIENT_NAV, SectionCard } from "@/components/console/Shell";
import Creative from "@/components/ads/Creative";
import { TEMPLATE_MAP, CATEGORY_LABEL } from "@/lib/ads/templates";
import { LANGS } from "@/lib/ads/translate";
import type { CreativeData, CreativeKind, PaletteKey } from "@/lib/ads/types";
import type { CreativeStyle } from "@/lib/ads/style";
import { isBlockLayout } from "@/lib/ads/blocks";

export const dynamic = "force-dynamic";

export default async function MyCreatives() {
  const [me] = await db.select().from(advertisers).where(eq(advertisers.email, "tanvir@rang.example")).limit(1);
  const rows = await db
    .select()
    .from(creatives)
    .where(eq(creatives.advertiserId, me.id))
    .orderBy(desc(creatives.id));

  return (
    <ConsoleShell
      kind="client"
      nav={CLIENT_NAV}
      active="/portal/creatives"
      title="আমার ক্রিয়েটিভ"
      subtitle="প্রতিটি ক্রিয়েটিভের সব ভাষার সংস্করণ স্বয়ংক্রিয়ভাবে তৈরি — আলাদা করে কিছু করতে হয় না।"
      actions={<Link href="/portal/book" className="c-btn c-btn-lime">+ নতুন ক্রিয়েটিভ</Link>}
    >
      <div className="space-y-6">
        {rows.map((c) => {
          const tpl = TEMPLATE_MAP[c.templateId];
          if (!tpl) return null;
          const base = { ...tpl.data, ...(c.data as CreativeData) };
          const i18n = (c.i18n ?? {}) as Record<string, CreativeData>;
          return (
            <SectionCard
              key={c.id}
              title={c.name}
              right={
                <span className="flex items-center gap-2">
                  <span className="c-pill st-draft">{CATEGORY_LABEL[tpl.category]}</span>
                  <span className="c-pill st-active">AUTO-TRANSLATE ON</span>
                </span>
              }
            >
              <div className="scroll-x">
                <div className="flex gap-4" style={{ minWidth: "min-content" }}>
                  {[{ code: c.baseLang, native: LANGS.find((l) => l.code === c.baseLang)?.native ?? "বাংলা", base: true }, ...LANGS.filter((l) => l.code !== c.baseLang).map((l) => ({ code: l.code, native: l.native, base: false }))].map(
                    (l) => {
                      const data = l.base ? base : { ...base, ...(i18n[l.code] ?? {}) };
                      const dir = LANGS.find((x) => x.code === l.code)?.dir ?? "ltr";
                      return (
                        <div key={l.code} className="w-[300px] shrink-0">
                          <p className="mb-1.5 flex items-center justify-between font-mono-x text-[9.5px] tracking-[0.18em] text-ink-soft uppercase">
                            {l.native}
                            {l.base ? <span className="text-alizarin">BASE</span> : <span className="text-lime">AUTO</span>}
                          </p>
                          <div className="border border-ink/15 bg-paper-deep/30 p-2" dir={dir}>
                            <Creative
                              kind={tpl.kind as CreativeKind}
                              palette={c.palette as PaletteKey}
                              data={data}
                              format="rect"
                              style={c.style as CreativeStyle}
                              layout={isBlockLayout(c.layout) ? c.layout : null}
                            />
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </SectionCard>
          );
        })}
      </div>
    </ConsoleShell>
  );
}
