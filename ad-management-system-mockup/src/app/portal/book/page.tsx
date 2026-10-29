import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { advertisers } from "@/db/schema";
import { ConsoleShell, CLIENT_NAV } from "@/components/console/Shell";
import Creative from "@/components/ads/Creative";
import { SLOTS, SLOT_MAP, FORMAT_LABEL, DURATIONS, quotePrice } from "@/lib/ads/slots";
import { TEMPLATES, TEMPLATE_MAP, CATEGORY_LABEL, PALETTES, templatesForFormat } from "@/lib/ads/templates";
import { LANGS, translateCreative } from "@/lib/ads/translate";
import { createBooking } from "@/lib/ads/actions";
import type { CreativeKind, LangCode, PaletteKey } from "@/lib/ads/types";

export const dynamic = "force-dynamic";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ slot?: string; template?: string; days?: string; lang?: string; palette?: string }>;
}) {
  const sp = await searchParams;
  const [me] = await db.select().from(advertisers).where(eq(advertisers.email, "tanvir@rang.example")).limit(1);

  const slotKey = sp.slot && SLOT_MAP[sp.slot] ? sp.slot : SLOTS[1].key;
  const slot = SLOT_MAP[slotKey];
  const compatible = templatesForFormat(slot.format);
  const templateId =
    sp.template && TEMPLATE_MAP[sp.template] && compatible.some((t) => t.id === sp.template)
      ? sp.template
      : compatible[0].id;
  const tpl = TEMPLATE_MAP[templateId];
  const days = Number(sp.days || 7);
  const lang = (sp.lang as LangCode) || "bn";
  const palette = (sp.palette as PaletteKey) || tpl.palette;

  const q = quotePrice(slotKey, days, tpl.uplift);
  const preview = lang === "bn" ? tpl.data : translateCreative(tpl.data, lang);

  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ slot: slotKey, template: templateId, days: String(days), lang, palette, ...patch });
    return `/portal/book?${p.toString()}`;
  };

  return (
    <ConsoleShell
      kind="client"
      nav={CLIENT_NAV}
      active="/portal/book"
      title="নতুন বিজ্ঞাপন বুকিং"
      subtitle="চার ধাপ — স্লট, টেমপ্লেট, লেখা, পেমেন্ট। কোনো ইমেইল বা ফোন কলের দরকার নেই।"
      actions={<Link href="/advertise#slots" className="c-btn c-btn-ghost">সম্পূর্ণ রেট কার্ড</Link>}
    >
      {/* stepper */}
      <ol className="mb-6 flex flex-wrap items-center gap-2 font-mono-x text-[10px] tracking-[0.18em] uppercase">
        {["স্লট", "টেমপ্লেট", "কনটেন্ট", "পেমেন্ট"].map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span className={`flex h-6 w-6 items-center justify-center ${i < 3 ? "bg-ink text-paper" : "border border-ink/30 text-ink-soft"}`}>
              {i + 1}
            </span>
            <span className={i < 3 ? "text-ink" : "text-ink-soft"}>{s}</span>
            {i < 3 ? <span className="mx-1 text-ink/25">———</span> : null}
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* ---------------- step 1 + 2 : pickers ---------------- */}
        <div className="space-y-6 lg:col-span-7">
          <section className="c-card">
            <header className="border-b border-ink/12 px-4 py-3">
              <h2 className="font-serif-bn text-[17px] font-black text-ink">১ · স্লট বাছুন</h2>
              <p className="mt-0.5 text-[11.5px] text-ink-soft">
                বর্তমানে নির্বাচিত: <b>{slot.label}</b> — {slot.area}
              </p>
            </header>
            <div className="max-h-[320px] overflow-y-auto p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {SLOTS.map((s) => (
                  <Link
                    key={s.key}
                    href={`/portal/book?slot=${s.key}&days=${days}&lang=${lang}`}
                    className={`block border p-3 transition-colors ${
                      s.key === slotKey ? "border-ink bg-ink text-paper" : "border-ink/18 hover:border-ink"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-serif-bn text-[13.5px] font-bold">{s.label}</span>
                      <span className={`c-pill ${s.existing ? "st-active" : "st-draft"}`}>
                        {s.existing ? "LIVE" : "NEW"}
                      </span>
                    </div>
                    <p className={`mt-1 font-mono-x text-[9.5px] uppercase ${s.key === slotKey ? "text-paper/55" : "text-ink-soft"}`}>
                      {FORMAT_LABEL[s.format]} · {s.size} · ৳{s.dayRate}/দিন
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className="c-card">
            <header className="border-b border-ink/12 px-4 py-3">
              <h2 className="font-serif-bn text-[17px] font-black text-ink">
                ২ · টেমপ্লেট <span className="font-mono-x text-[11px] font-medium text-ink-soft">({compatible.length}টি এই ফরম্যাটে)</span>
              </h2>
              <p className="mt-0.5 text-[11.5px] text-ink-soft">নির্বাচিত: <b>{tpl.nameBn}</b> · {CATEGORY_LABEL[tpl.category]}</p>
            </header>
            <div className="max-h-[360px] overflow-y-auto p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {compatible.map((t) => (
                  <Link
                    key={t.id}
                    href={qs({ template: t.id, palette: t.palette })}
                    className={`block border p-3 transition-colors ${
                      t.id === templateId ? "border-ink bg-ink text-paper" : "border-ink/18 hover:border-ink"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-serif-bn text-[13px] font-bold">{t.nameBn}</span>
                      {t.premium ? <span className="c-pill st-pending">+৳{t.uplift}</span> : null}
                    </div>
                    <p className={`mt-1 font-mono-x text-[9px] uppercase ${t.id === templateId ? "text-paper/55" : "text-ink-soft"}`}>
                      {CATEGORY_LABEL[t.category]} · {t.id}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* palette + language */}
          <section className="c-card p-4">
            <h2 className="font-serif-bn text-[17px] font-black text-ink">রং ও ভাষা</h2>
            <p className="c-label mt-3">কালার স্কিম</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.values(PALETTES).map((p) => (
                <Link
                  key={p.key}
                  href={qs({ palette: p.key })}
                  className={`flex items-center gap-2 border px-2.5 py-1.5 text-[11.5px] font-bold ${
                    p.key === palette ? "border-ink bg-ink text-paper" : "border-ink/20"
                  }`}
                >
                  <span className="h-3.5 w-3.5 border" style={{ background: p.bg, borderColor: p.accent }} />
                  <span className="h-3.5 w-3.5" style={{ background: p.accent }} />
                  {p.name}
                </Link>
              ))}
            </div>

            <p className="c-label mt-4">ভাষা (অটো-অনুবাদ সহ)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {LANGS.map((l) => (
                <Link
                  key={l.code}
                  href={qs({ lang: l.code })}
                  className={`border px-3 py-1.5 text-[12px] font-bold ${
                    l.code === lang ? "border-ink bg-ink text-paper" : "border-ink/20 hover:border-ink"
                  }`}
                >
                  {l.native}
                </Link>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-ink-soft">
              আপনি যে ভাষায় লিখবেন সেটাই মূল; বাকি ৫টি ভাষার সংস্করণ সংরক্ষণের সময় নিজে থেকেই তৈরি হবে।
            </p>
          </section>
        </div>

        {/* ---------------- step 3 + 4 : form, preview, quote ---------------- */}
        <div className="space-y-6 lg:col-span-5">
          <section className="c-card">
            <header className="border-b border-ink/12 px-4 py-3">
              <h2 className="font-serif-bn text-[17px] font-black text-ink">লাইভ প্রিভিউ</h2>
              <p className="mt-0.5 font-mono-x text-[9.5px] tracking-[0.18em] text-ink-soft uppercase">
                {slot.label} · {FORMAT_LABEL[slot.format]} · {LANGS.find((l) => l.code === lang)?.native}
              </p>
            </header>
            <div className="bg-paper-deep/40 p-3">
              <div className="relative" dir={LANGS.find((l) => l.code === lang)?.dir}>
                <span className="absolute top-1 right-1 z-10 border border-ink/30 bg-paper/90 px-1.5 py-0.5 font-mono-x text-[8px] tracking-[0.2em] text-ink-soft uppercase">
                  বিজ্ঞাপন · AD
                </span>
                <div className={`ad-reserve-${slot.format}`}>
                  <Creative kind={tpl.kind as CreativeKind} palette={palette} data={preview} format={slot.format} />
                </div>
              </div>
            </div>
          </section>

          <form action={createBooking} className="c-card">
            <header className="border-b border-ink/12 px-4 py-3">
              <h2 className="font-serif-bn text-[17px] font-black text-ink">৩ · আপনার লেখা</h2>
            </header>
            <div className="space-y-3 p-4">
              <input type="hidden" name="advertiserId" value={me?.id ?? 2} />
              <input type="hidden" name="slotKey" value={slotKey} />
              <input type="hidden" name="templateId" value={templateId} />
              <input type="hidden" name="palette" value={palette} />
              <input type="hidden" name="lang" value={lang} />
              <input type="hidden" name="days" value={days} />

              <div>
                <label className="c-label">ব্র্যান্ড / প্রতিষ্ঠান</label>
                <input className="c-input mt-1" name="brand" defaultValue={tpl.data.brand} />
              </div>
              <div>
                <label className="c-label">হেডলাইন</label>
                <input className="c-input mt-1" name="headline" defaultValue={tpl.data.headline} />
              </div>
              <div>
                <label className="c-label">সাব-হেডলাইন</label>
                <input className="c-input mt-1" name="sub" defaultValue={tpl.data.sub} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="c-label">ব্যাজ</label>
                  <input className="c-input mt-1" name="badge" defaultValue={tpl.data.badge} />
                </div>
                <div>
                  <label className="c-label">মূল্য / অফার</label>
                  <input className="c-input mt-1" name="price" defaultValue={tpl.data.price} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="c-label">বাটনের লেখা</label>
                  <input className="c-input mt-1" name="cta" defaultValue={tpl.data.cta} />
                </div>
                <div>
                  <label className="c-label">ফোন</label>
                  <input className="c-input mt-1" name="phone" defaultValue={tpl.data.phone} />
                </div>
              </div>
              <div>
                <label className="c-label">ল্যান্ডিং URL</label>
                <input className="c-input mt-1" name="url" defaultValue={tpl.data.url} />
              </div>
              <div>
                <label className="c-label">ছবির URL (ঐচ্ছিক)</label>
                <input className="c-input mt-1" name="imageUrl" placeholder="https://…" defaultValue={tpl.data.imageUrl} />
              </div>
              {tpl.kind === "custom-html" ? (
                <div>
                  <label className="c-label">কাস্টম HTML (ঐচ্ছিক)</label>
                  <textarea className="c-input mt-1 font-mono-x text-[11px]" name="html" rows={4} placeholder="<div>…</div>" />
                </div>
              ) : null}

              {/* duration */}
              <div className="border-t border-ink/12 pt-4">
                <p className="c-label">৪ · মেয়াদ</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DURATIONS.map((d) => (
                    <Link
                      key={d.days}
                      href={qs({ days: String(d.days) })}
                      className={`border px-3 py-1.5 text-[11.5px] font-bold ${
                        d.days === days ? "border-ink bg-ink text-paper" : "border-ink/20 hover:border-ink"
                      }`}
                    >
                      {d.label}
                      {d.off > 0 ? <span className="ml-1 text-[9px] text-lime">-{Math.round(d.off * 100)}%</span> : null}
                    </Link>
                  ))}
                </div>
                <label className="c-label mt-3 block">শুরু</label>
                <select name="startOffset" className="c-input mt-1">
                  <option value="0">আজ থেকে (পেমেন্টের সাথে সাথেই লাইভ)</option>
                  <option value="1">আগামীকাল</option>
                  <option value="7">৭ দিন পর</option>
                </select>
              </div>

              {/* quote */}
              <div className="border border-ink/20 bg-paper-deep/40 p-3">
                <dl className="space-y-1.5 text-[12.5px]">
                  <div className="flex justify-between"><dt className="text-ink-soft">স্লট রেট × {days} দিন</dt><dd className="font-mono-x">৳{q.gross.toLocaleString()}</dd></div>
                  {tpl.uplift ? (
                    <div className="flex justify-between"><dt className="text-ink-soft">প্রিমিয়াম টেমপ্লেট</dt><dd className="font-mono-x">অন্তর্ভুক্ত</dd></div>
                  ) : null}
                  <div className="flex justify-between text-lime"><dt>ভলিউম ছাড় ({Math.round(q.off * 100)}%)</dt><dd className="font-mono-x">−৳{q.discount.toLocaleString()}</dd></div>
                  <div className="flex justify-between"><dt className="text-ink-soft">ভ্যাট ১৫%</dt><dd className="font-mono-x">৳{q.vat.toLocaleString()}</dd></div>
                  <div className="flex justify-between border-t border-ink/20 pt-1.5 text-[15px] font-black"><dt>সর্বমোট</dt><dd className="font-mono-x">৳{q.total.toLocaleString()}</dd></div>
                </dl>
              </div>

              <button type="submit" className="c-btn c-btn-lime w-full py-3">
                বুকিং নিশ্চিত করে পেমেন্টে যান →
              </button>
              <p className="text-center text-[10.5px] text-ink-soft">
                বিকাশ · নগদ · রকেট · কার্ড · PayPal · ক্রিপ্টো · ব্যাংক
              </p>
            </div>
          </form>
        </div>
      </div>
    </ConsoleShell>
  );
}
