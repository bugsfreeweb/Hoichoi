/**
 * The console's screens, grouped.
 *
 * One place so the sidebar and the tab strips cannot disagree: the sidebar shows
 * one entry per group, and every screen in that group renders the same tabs. A
 * second copy of these lists is how a tab gets added to a page and forgotten by
 * the navigation.
 */
export interface SectionDef {
  href: string;
  label: string;
  en: string;
}

/** Sources + Categories: where material comes from and how it is filed. */
export const TAXONOMY_SECTION = {
  label: "সোর্স ও বিভাগ",
  en: "Sources & categories",
  tabs: [
    { href: "/admin/sources", label: "সোর্স", en: "Sources" },
    { href: "/admin/categories", label: "বিভাগ", en: "Categories" },
  ],
} as const;

/** Live events + Notices + Polls: the things published next to the feed. */
export const PROGRAM_SECTION = {
  label: "লাইভ, নোটিশ ও পোল",
  en: "Live, notices & polls",
  tabs: [
    { href: "/admin/live", label: "লাইভ ইভেন্ট", en: "Live events" },
    { href: "/admin/notices", label: "নোটিশ", en: "Notices" },
    { href: "/admin/polls", label: "পোল", en: "Polls" },
  ],
} as const;

/** Content + comment moderation: one queue, two subjects. */
export const MODERATION_SECTION = {
  label: "মডারেশন",
  en: "Moderation",
  tabs: [
    { href: "/admin/moderation", label: "কনটেন্ট", en: "Content" },
    { href: "/admin/comments", label: "মন্তব্য", en: "Comments" },
  ],
} as const;

/** Submissions + removal requests + reader reports: the inbox. */
export const INBOX_SECTION = {
  label: "ইনবক্স ও রিপোর্ট",
  en: "Inbox & reports",
  tabs: [
    { href: "/admin/submissions", label: "সাবমিশন", en: "Submissions" },
    { href: "/admin/removals", label: "রিমুভাল", en: "Removal requests" },
    { href: "/admin/reports", label: "রিপোর্ট", en: "Reader reports" },
  ],
} as const;

export const SECTIONS = [
  TAXONOMY_SECTION,
  PROGRAM_SECTION,
  MODERATION_SECTION,
  INBOX_SECTION,
] as const;
