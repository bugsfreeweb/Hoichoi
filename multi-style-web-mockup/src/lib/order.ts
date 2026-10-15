import { SECTIONS } from "./registry";

/**
 * Section positions must be unique for reordering to work: swapping two equal
 * numbers changes nothing. Older databases ended up with duplicates after new
 * sections were added, so every consumer renumbers through this one function.
 * Ties are broken by registry order, which is the intended default order.
 */
export function renumber<T extends { key: string; position: number }>(rows: T[]): T[] {
  const idx = new Map(SECTIONS.map((s, i) => [s.key, i]));
  return [...rows]
    .sort((a, b) => a.position - b.position || (idx.get(a.key) ?? 999) - (idx.get(b.key) ?? 999))
    .map((r, i) => ({ ...r, position: i }));
}
