import Link from "next/link";
import { listAdCreatives } from "@hoichoi/db";
import { requireAdClient } from "@/lib/ad-client-auth";
import { AdCreativeLibrary } from "@/components/ads/AdCreativeLibrary";

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
      <AdCreativeLibrary creatives={creatives} />
    </div>
  );
}
