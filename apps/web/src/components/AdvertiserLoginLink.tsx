import Link from "next/link";

/**
 * Advertiser sign-in entry point.
 *
 * `/portal/login` existed with no inbound link anywhere on the site, so an
 * advertiser had no way to find it. It lives in the footer (below the about
 * block) and is rendered by every theme, including maintenance mode, from this
 * one component so the wording and target cannot drift.
 *
 * Plain colours only (no shared tokens) because the maintenance and mockup
 * themes scope their own CSS variables.
 */
export function AdvertiserLoginLink({
  tone = "default",
  className = "",
}: {
  /** `default` = paper themes, `dark` = obsidian/mockup themes. */
  tone?: "default" | "dark";
  className?: string;
}) {
  const base =
    tone === "dark"
      ? "border-white/25 text-white/70 hover:border-white/60 hover:text-white"
      : "border-ink/25 text-ink-soft hover:border-alizarin hover:text-alizarin";
  return (
    <Link
      href="/portal/login"
      className={`group inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-mono-x text-[10px] tracking-[0.14em] uppercase transition-colors ${base} ${className}`}
      title="বিজ্ঞাপনদাতা পোর্টালে লগইন করুন"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 11v3a1 1 0 0 0 1 1h2l3.5 3.5a1 1 0 0 0 1.7-.7V7.2a1 1 0 0 0-1.7-.7L6 10H4a1 1 0 0 0-1 1z" />
        <path d="M16 8a5 5 0 0 1 0 8" />
      </svg>
      বিজ্ঞাপনদাতা লগইন
      <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
    </Link>
  );
}
