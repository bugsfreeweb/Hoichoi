import Link from "next/link";
import { ConsoleShell, ADMIN_NAV, SectionCard } from "@/components/console/Shell";
import Creative from "@/components/ads/Creative";
import { TEMPLATES, CATEGORY_LABEL, PALETTES, templatesForFormat } from "@/lib/ads/templates";
import { FORMAT_LABEL } from "@/lib/ads/slots";
import { LANGS, translateCreative } from "@/lib/ads/translate";
import type { AdFormat, CreativeKind, LangCode, PaletteKey } from "@/lib/ads/types";

export const dynamic = "force-dynamic";

const FORMATS: AdFormat[] = ["leaderboard", "billboard", "rect", "infeed", "sky", "strip", "anchor", "native"];

export default async function TemplateLibrary({
  searchParams,
}: {
  searchParams: Promise<{ format?: string; cat?: string; lang?: string; palette?: string }>;
}) {
  const sp = await searchParams;
  const format = (FORMATS.includes(sp.format as AdFormat) ? sp.format : "rect") as AdFormat;
  const lang = (sp.lang as LangCode) || "bn";
  const forceP = sp.palette as PaletteKey | undefined;

  const compatible = templatesForFormat(format);
  const cats = Array.from(new Set(compatible.map((t) => t.category)));
  const cat = sp.cat && cats.includes(sp.cat as never) ? sp.cat : undefined;
  const list = cat ? compatible.filter((t) => t.category === cat) : compatible;

  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ format, lang, ...(cat ? { cat } : {}), ...(forceP ? { palette: forceP } : {}), ...patch });
    return `/admin/ads/templates?${p.toString()}`;
  };

  return (
    <ConsoleShell
      kind="admin"
      nav={ADMIN_NAV}
      active="/admin/ads/templates"
      title="টেমপ্লেট লাইব্রেরি"
      subtitle={`${TEMPLATES.length}টি রেডি টেমপ্লেট — প্রতিটি ফরম্যাটে কমপক্ষে ১০টি বিকল্প, ১০টি কালার স্কিম এবং ৬ ভাষার অটো-প্রিভিউ।`}
      actions={<Link href="/admin/ads/bookings?new=1" className="c-btn c-btn-lime">টেমপ্লেট দিয়ে বুক করুন</Link>}
    >
      {/* filters */}
      <div className="c-card mb-6 p-4">
        <p className="c-label">ফরম্যাট (স্লট টাইপ)</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {FORMATS.map((f) => {
            const n = templatesForFormat(f).length;
            return (
              <Link
                key={f}
                href={`/admin/ads/templates?format=${f}&lang=${lang}`}
                className={`border px-3 py-1.5 text-[12px] font-bold ${
                  f === format ? "border-ink bg-ink text-paper" : "border-ink/20 hover:border-ink"
                }`}
              >
                {FORMAT_LABEL[f]}
                <span className={`ml-1.5 font-mono-x text-[9.5px] ${f === format ? "text-lime" : "text-ink-soft"}`}>{n}</span>
              </Link>
            );
          })}
        </div>

        <p className="c-label mt-4">ক্যাটাগরি</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link href={qs({ cat: "" })} className={`c-pill ${!cat ? "st-active" : "st-draft"}`}>সব {compatible.length}</Link>
          {cats.map((c) => (
            <Link key={c} href={qs({ cat: c })} className={`c-pill ${cat === c ? "st-active" : "st-draft"}`}>
              {CATEGORY_LABEL[c]} {compatible.filter((t) => t.category === c).length}
            </Link>
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="c-label">প্রিভিউ ভাষা (অটো-অনুবাদ)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {LANGS.map((l) => (
                <Link key={l.code} href={qs({ lang: l.code })} className={`border px-2.5 py-1 text-[11.5px] font-bold ${l.code === lang ? "border-ink bg-ink text-paper" : "border-ink/20"}`}>
                  {l.native}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="c-label">কালার স্কিম চাপিয়ে দেখুন</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Link href={qs({ palette: "" })} className={`c-pill ${!forceP ? "st-active" : "st-draft"}`}>ডিফল্ট</Link>
              {Object.values(PALETTES).map((p) => (
                <Link key={p.key} href={qs({ palette: p.key })} className={`flex items-center gap-1 border px-2 py-1 text-[11px] font-bold ${forceP === p.key ? "border-ink bg-ink text-paper" : "border-ink/20"}`}>
                  <span className="h-3 w-3 border" style={{ background: p.bg, borderColor: p.accent }} />
                  <span className="h-3 w-3" style={{ background: p.accent }} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((t) => {
          const data = lang === "bn" ? t.data : translateCreative(t.data, lang);
          const dir = LANGS.find((l) => l.code === lang)?.dir ?? "ltr";
          return (
            <article key={t.id} className="c-card overflow-hidden">
              <header className="flex items-center justify-between gap-2 border-b border-ink/12 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate font-serif-bn text-[14px] font-bold text-ink">{t.nameBn}</p>
                  <p className="font-mono-x text-[9px] tracking-[0.16em] text-ink-soft uppercase">
                    {t.id} · {CATEGORY_LABEL[t.category]} · {t.kind}
                  </p>
                </div>
                {t.premium ? <span className="c-pill st-pending">+৳{t.uplift}</span> : <span className="c-pill st-active">FREE</span>}
              </header>

              <div className="bg-paper-deep/40 p-3" dir={dir}>
                <div className={`ad-reserve-${format}`}>
                  <Creative
                    kind={t.kind as CreativeKind}
                    palette={(forceP ?? t.palette) as PaletteKey}
                    data={data}
                    format={format}
                  />
                </div>
              </div>

              <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-ink/12 px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  {t.formats.slice(0, 4).map((f) => (
                    <span key={f} className="border border-ink/18 px-1.5 py-0.5 font-mono-x text-[8.5px] tracking-[0.14em] text-ink-soft uppercase">
                      {f}
                    </span>
                  ))}
                  {t.formats.length > 4 ? (
                    <span className="font-mono-x text-[8.5px] text-ink-soft">+{t.formats.length - 4}</span>
                  ) : null}
                </div>
                <span className="flex gap-1.5">
                  <Link href={`/admin/ads/builder?template=${t.id}`} className="c-btn c-btn-ghost px-2.5 py-1 text-[10.5px]">
                    ⠿ কাস্টম
                  </Link>
                  <Link href={`/portal/book?template=${t.id}`} className="c-btn px-2.5 py-1 text-[10.5px]">
                    বুক
                  </Link>
                </span>
              </footer>
            </article>
          );
        })}
      </div>

      <div className="mt-8">
        <SectionCard title="টেমপ্লেট কভারেজ (প্রতি ফরম্যাটে কতগুলো)">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FORMATS.map((f) => {
              const n = templatesForFormat(f).length;
              const ok = n >= 10;
              return (
                <div key={f} className="border border-ink/15 p-3">
                  <p className="flex items-center justify-between text-[12.5px] font-bold text-ink">
                    {FORMAT_LABEL[f]}
                    <span className={`c-pill ${ok ? "st-active" : "st-pending"}`}>{n}</span>
                  </p>
                  <div className="mt-2 h-1.5 w-full bg-ink/10">
                    <div className={ok ? "h-full bg-lime" : "h-full bg-amberx"} style={{ width: `${Math.min(100, (n / TEMPLATES.length) * 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </ConsoleShell>
  );
}
