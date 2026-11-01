import Link from "next/link";
import { logoutAdClient } from "@/app/portal/actions";
import { requireAdClient } from "@/lib/ad-client-auth";
import { AdPortalNavigation } from "@/components/ads/AdPortalNavigation";

export default async function AdPortalLayout({ children }: { children: React.ReactNode }) {
  const client = await requireAdClient();
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/15 bg-paper">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-8">
          <div>
            <Link href="/portal" className="font-serif-bn text-[18px] font-black">হৈচৈ <span className="text-alizarin">বিজ্ঞাপন</span></Link>
            <p className="mt-0.5 text-[10px] text-ink-soft">{client.name} · {client.email}</p>
          </div>
          <form action={logoutAdClient}>
            <button type="submit" className="border border-ink/20 px-3 py-2 text-[11px] font-bold text-ink hover:border-ink">লগআউট</button>
          </form>
        </div>
      </header>
      <AdPortalNavigation />
      <main className="mx-auto max-w-7xl px-4 py-7 md:px-8 md:py-10">{children}</main>
    </div>
  );
}
