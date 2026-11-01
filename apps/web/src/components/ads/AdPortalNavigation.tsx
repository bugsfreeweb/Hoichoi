"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/portal", "ড্যাশবোর্ড"],
  ["/portal/studio", "স্টুডিও"],
  ["/portal/builder", "লেআউট বিল্ডার"],
  ["/portal/analytics", "অ্যানালিটিক্স"],
  ["/portal/book", "দ্রুত বুকিং"],
  ["/portal/bookings", "আমার বুকিং"],
  ["/portal/creatives", "ক্রিয়েটিভ"],
  ["/portal/payments", "পেমেন্ট"],
] as const;

export function AdPortalNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="বিজ্ঞাপন ক্লায়েন্ট মেনু" className="flex gap-2 overflow-x-auto border-y border-ink/15 px-4 py-3 md:px-8">
      {LINKS.map(([href, label]) => {
        const selected = pathname === href || (href !== "/portal" && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={selected ? "page" : undefined}
            className={`shrink-0 border px-3 py-2 text-[10px] font-bold ${
              selected ? "border-ink bg-ink text-paper" : "border-ink/15 text-ink-soft hover:border-ink/40 hover:text-ink"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
