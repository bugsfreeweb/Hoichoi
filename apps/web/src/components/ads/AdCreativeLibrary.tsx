"use client";

import { useActionState } from "react";
import type { AdCreative } from "@hoichoi/db";
import { updateClientCreative } from "@/app/portal/actions";
import { AD_CREATIVE_LAYOUTS, AD_CREATIVE_PALETTES } from "@/lib/ad-creative-style";
import { AdCreativePreview } from "./AdCreativePreview";

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function CreativeEditor({ creative }: { creative: AdCreative }) {
  const [state, action, pending] = useActionState(updateClientCreative, null);
  const field = "mt-1 w-full border border-ink/25 bg-paper px-3 py-2 text-[12px] text-ink outline-none focus:border-alizarin";
  const headline = stringValue(creative.data.headline, creative.name);
  const body = stringValue(creative.data.body);
  const cta = stringValue(creative.data.cta, "আরও জানুন");
  const url = stringValue(creative.data.url);

  return (
    <article className="border border-ink/15 bg-card p-4">
      <AdCreativePreview
        name={creative.name}
        headline={headline}
        body={body}
        cta={cta}
        templateId={creative.templateId}
        palette={creative.palette}
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-serif-bn text-[14px] font-bold text-ink">{creative.name}</p>
          <p className="mt-1 font-mono-x text-[9px] uppercase text-ink-soft">{creative.templateId} · {creative.palette} · {creative.baseLang}</p>
        </div>
        <span className="text-[10px] text-ink-soft">আপডেট: {creative.updatedAt.slice(0, 10)}</span>
      </div>
      <details className="mt-4 border-t border-ink/10 pt-3">
        <summary className="cursor-pointer text-[11px] font-bold text-ink">Creative সম্পাদনা</summary>
        <form action={action} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="creativeId" value={creative.id} />
          <label><span className="field-label">ক্রিয়েটিভের নাম</span><input name="creativeName" required maxLength={120} defaultValue={creative.name} className={field} /></label>
          <label><span className="field-label">শিরোনাম</span><input name="headline" required maxLength={100} defaultValue={headline} className={field} /></label>
          <label className="md:col-span-2"><span className="field-label">বার্তা</span><textarea name="body" maxLength={240} rows={2} defaultValue={body} className={field} /></label>
          <label><span className="field-label">বাটনের লেখা</span><input name="cta" maxLength={40} defaultValue={cta} className={field} /></label>
          <label><span className="field-label">গন্তব্য URL</span><input name="url" type="url" required maxLength={1000} defaultValue={url} className={field} /></label>
          <label>
            <span className="field-label">Layout</span>
            <select name="templateId" defaultValue={creative.templateId} className={field}>
              {AD_CREATIVE_LAYOUTS.map((layout) => <option key={layout.key} value={layout.key}>{layout.name}</option>)}
            </select>
          </label>
          <label>
            <span className="field-label">Palette</span>
            <select name="palette" defaultValue={creative.palette} className={field}>
              {AD_CREATIVE_PALETTES.map((palette) => <option key={palette.key} value={palette.key}>{palette.name}</option>)}
            </select>
          </label>
          {state?.error && <p role="alert" className="md:col-span-2 border border-alizarin/30 bg-alizarin/10 px-3 py-2 text-[11px] font-semibold text-alizarin">{state.error}</p>}
          {state?.notice && <p role="status" className="md:col-span-2 border border-lime/30 bg-lime/10 px-3 py-2 text-[11px] font-semibold text-ink">{state.notice}</p>}
          <div className="md:col-span-2">
            <button type="submit" disabled={pending} className="bg-ink px-3 py-2 text-[11px] font-bold text-paper hover:bg-alizarin disabled:opacity-50">
              {pending ? "সংরক্ষণ হচ্ছে…" : "পরিবর্তন সংরক্ষণ"}
            </button>
          </div>
        </form>
      </details>
    </article>
  );
}

export function AdCreativeLibrary({ creatives }: { creatives: AdCreative[] }) {
  if (!creatives.length) {
    return <p className="border border-dashed border-ink/20 px-4 py-8 text-center text-[11px] text-ink-soft">এখনো কোনো creative নেই। Studio থেকে প্রথমটি তৈরি করুন।</p>;
  }
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {creatives.map((creative) => <CreativeEditor key={creative.id} creative={creative} />)}
    </div>
  );
}
