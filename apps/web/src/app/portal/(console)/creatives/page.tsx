import Link from "next/link";
import { listAdCreatives } from "@hoichoi/db";
import { requireAdClient } from "@/lib/ad-client-auth";

export const dynamic = "force-dynamic";

export default async function AdClientCreativesPage() {
  const client = await requireAdClient();
  const creatives = await listAdCreatives(client.id);
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono-x text-[9px] tracking-[0.2em] text-alizarin uppercase">CREATIVE LIBRARY</p>
          <h1 className="mt-1 font-serif-bn text-[28px] font-black text-ink">আমার ক্রিয়েটিভ</h1>
          <p className="mt-1 text-[12px] text-ink-soft">আপনার অ্যাকাউন্টের creative-গুলো এখানে সংরক্ষিত থাকবে।</p>
        </div>
        <Link href="/portal/studio" className="bg-ink px-3 py-2 text-[10px] font-bold text-paper">+ creative তৈরি করুন</Link>
      </header>
      {creatives.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {creatives.map((creative) => (
            <article key={creative.id} className="border border-ink/15 bg-card p-4">
              <p className="font-serif-bn text-[15px] font-bold text-ink">{creative.name}</p>
              <p className="mt-2 font-mono-x text-[9px] uppercase text-ink-soft">{creative.templateId} · {creative.palette} · {creative.baseLang}</p>
              <p className="mt-2 text-[10px] text-ink-soft">আপডেট: {creative.updatedAt.slice(0, 10)}</p>
            </article>
          ))}
        </div>
      ) : <p className="border border-dashed border-ink/20 px-4 py-10 text-center text-[11px] text-ink-soft">এখনো কোনো creative নেই। Studio থেকে প্রথমটি তৈরি করুন।</p>}
    </div>
  );
}
