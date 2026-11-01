import Link from "next/link";

const SECTIONS = [
  ["", "ড্যাশবোর্ড"],
  ["analytics", "অ্যানালিটিক্স"],
  ["slots", "স্লট"],
  ["bookings", "বুকিং"],
  ["clients", "ক্লায়েন্ট"],
  ["templates", "টেমপ্লেট"],
  ["studio", "স্টুডিও"],
  ["builder", "লেআউট বিল্ডার"],
  ["payments", "পেমেন্ট"],
  ["activity", "অ্যাক্টিভিটি"],
] as const;

export function AdsAdminNavigation({ active }: { active: string }) {
  return (
    <nav aria-label="বিজ্ঞাপন পরিচালনা" className="mt-6 flex flex-wrap gap-2 border-b border-ink/15 pb-4">
      {SECTIONS.map(([section, label]) => {
        const href = section ? `/admin/ads/${section}` : "/admin/ads";
        const selected = active === section;
        return (
          <Link
            key={section || "dashboard"}
            href={href}
            aria-current={selected ? "page" : undefined}
            className={`border px-3 py-2 text-[10px] font-bold transition-colors ${
              selected
                ? "border-ink bg-ink text-paper"
                : "border-ink/15 bg-card text-ink-soft hover:border-ink/40 hover:text-ink"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
