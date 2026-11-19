/**
 * What goes on a story plate, in Bangla.
 *
 * The plate itself lives in `@hoichoi/poster` (pure geometry + sharp). These are
 * the two facts it needs from the database's own vocabulary — the desk's Bangla
 * name and the desk's colour, plus a Bangla date — kept here so the collector and
 * the web route cannot label the same story differently.
 */
import { CATEGORY_SEED, GENERAL_CATEGORY_SEED } from "./rows";

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const BN_MONTHS = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];

/** 2026-11-17 → "১৭ নভেম্বর ২০২৬". */
export function banglaDate(date: Date = new Date()): string {
  const bn = (n: number) => String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)]!);
  return `${bn(date.getDate())} ${BN_MONTHS[date.getMonth()] ?? ""} ${bn(date.getFullYear())}`;
}

/** The desk's Bangla name and its own colour, so a sports plate is not the news red. */
export function deskFor(category: string | null | undefined): { label: string | null; accent: string } {
  const slug = (category ?? "").trim().toLowerCase();
  // Two seed lists exist: the general desks (politics, sports, economy…) and the
  // sensitive ones (missing children, abuse…), which are seeded separately.
  const meta =
    GENERAL_CATEGORY_SEED.find((c) => c.slug === slug) ?? CATEGORY_SEED.find((c) => c.slug === slug);
  if (!meta) return { label: null, accent: "#e8552d" };
  return { label: meta.displayNameBn, accent: `#${meta.dot}` };
}

/**
 * The desk as the *database* names it.
 *
 * `deskFor` above reads two hard-coded seed arrays, and that list is a subset of
 * what a live database holds: `/admin/categories` is operator-editable, so a real
 * installation ends up with 39 desks where the seeds name 22 — `tech`,
 * `international`, `ai`, `viral`, `entertainment`, `science` and the rest. Every
 * story filed under one of those printed the neutral "সংবাদ" badge, because the
 * plate asked the seeds and the seeds had never heard of it.
 *
 * So the source of truth is `category_configs.display_name_bn`: the same Bangla
 * name the console shows, the same one the reader sees. The seeds are only the
 * fallback for a caller with no database (a test, a CLI render, a first boot
 * before the migration ran).
 *
 * The answer is cached by slug: a desk name changes when a human edits it, which
 * is not a per-post event, and a pipeline that rendered forty plates should not
 * issue forty identical queries.
 */
const DESK_CACHE = new Map<string, { label: string | null; accent: string }>();

/** The accent a seeded desk owns, or the newsroom red. */
function seededAccent(slug: string): string {
  return (
    GENERAL_CATEGORY_SEED.find((c) => c.slug === slug) ??
    CATEGORY_SEED.find((c) => c.slug === slug)
  )
    ? `#${(GENERAL_CATEGORY_SEED.find((c) => c.slug === slug) ?? CATEGORY_SEED.find((c) => c.slug === slug))!.dot}`
    : "#e8552d";
}

/**
 * The desk's Bangla name and colour, read from `category_configs` first.
 *
 * Never throws: a database that cannot be reached degrades to the seed list, and
 * an unknown slug still gets a colour. A picture is not allowed to fail because a
 * label lookup did.
 */
export async function deskForCategory(
  category: string | null | undefined,
): Promise<{ label: string | null; accent: string }> {
  const slug = (category ?? "").trim().toLowerCase();
  if (!slug) return { label: null, accent: "#e8552d" };
  const cached = DESK_CACHE.get(slug);
  if (cached) return cached;

  let resolved: { label: string | null; accent: string } | null = null;
  try {
    const { getClient } = await import("./client");
    const res = await getClient().execute({
      sql: "SELECT display_name_bn, config FROM category_configs WHERE slug = ? LIMIT 1",
      args: [slug],
    });
    const row = res.rows[0] as unknown as
      | { display_name_bn: unknown; config: unknown }
      | undefined;
    const label = typeof row?.display_name_bn === "string" ? row.display_name_bn : null;
    if (label) {
      // A desk may carry its own dot colour in `config`; the seed's colour is the
      // fallback, and the newsroom red the last resort.
      let accent = seededAccent(slug);
      try {
        const cfg = typeof row?.config === "string" ? (JSON.parse(row.config) as { dot?: unknown }) : null;
        if (typeof cfg?.dot === "string" && /^[0-9a-f]{6}$/i.test(cfg.dot)) accent = `#${cfg.dot}`;
      } catch {
        /* a malformed config is not a reason to lose the label */
      }
      resolved = { label, accent };
    }
  } catch {
    /* no database here: fall through to the seeds */
  }

  const answer = resolved ?? deskFor(slug);
  DESK_CACHE.set(slug, answer);
  return answer;
}

/** Just the Bangla desk name, or null when the category is unknown. */
export function deskLabel(category: string | null | undefined): string | null {
  return deskFor(category).label;
}

/** Just the desk colour, or the newsroom red. */
export function deskAccent(category: string | null | undefined): string {
  return deskFor(category).accent;
}
