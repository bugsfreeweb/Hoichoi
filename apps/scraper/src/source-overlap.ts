/**
 * Republication gate.
 *
 * Aggregating a story is legitimate; republishing someone else's article is not.
 * The rewrite is supposed to summarise in our own words and quote at most a short
 * line, but a model that "improves" a rewrite by lifting sentences produces text
 * that reads well and is a copyright problem — invisible in a diff review of the
 * site, because the copy looks like our own prose.
 *
 * This module answers one question with no database and no network: how many
 * words in a row are identical to the source? The pipeline holds anything over
 * the limit for human review rather than publishing it.
 */

export interface OverlapReport {
  /** Longest run of consecutive words shared with the source. */
  longestRun: number;
  /** The shared words themselves (clamped to 12 for logging). */
  sample: string;
  /** Configured ceiling for consecutive copied words. */
  limit: number;
  exceedsLimit: boolean;
}

export const DEFAULT_QUOTE_WORD_LIMIT = 35;

/**
 * Normalise to comparable words: strip punctuation and zero-width marks, fold
 * whitespace. Bangla has no case, so no lowercasing of the script is needed —
 * but Latin fragments (brand names, quotes) are folded for a fair comparison.
 */
export function tokenize(text: string): string[] {
  return text
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .split(/\s+/)
    .map((word) =>
      word
        .replace(/^[("'“”‘’«»\[\]]+|[)"'“”‘’«»\[\]।,.;:!?…]+$/g, "")
        .trim()
        .toLowerCase(),
    )
    .filter((word) => word.length > 0);
}

/**
 * Longest common contiguous run of words. Classic dynamic programming over rows
 * of the source: O(body × source) time, O(source) memory — the bodies are a few
 * thousand words at most.
 */
export function longestVerbatimRun(source: string, rewrite: string): { run: number; sample: string } {
  const a = tokenize(source);
  const b = tokenize(rewrite);
  if (a.length === 0 || b.length === 0) return { run: 0, sample: "" };

  let best = 0;
  let bestEnd = 0;
  let prev = new Array<number>(a.length + 1).fill(0);
  let curr = new Array<number>(a.length + 1).fill(0);

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        curr[j] = (prev[j - 1] ?? 0) + 1;
        if (curr[j]! > best) {
          best = curr[j]!;
          bestEnd = i;
        }
      } else {
        curr[j] = 0;
      }
    }
    const swap = prev;
    prev = curr;
    curr = swap;
    curr.fill(0);
  }

  const sample = b.slice(Math.max(0, bestEnd - Math.min(best, 12)), bestEnd).join(" ");
  return { run: best, sample };
}

export function checkRepublication(
  source: string,
  rewrite: string,
  limit = DEFAULT_QUOTE_WORD_LIMIT,
): OverlapReport {
  const { run, sample } = longestVerbatimRun(source, rewrite);
  return { longestRun: run, sample, limit, exceedsLimit: run > limit };
}

/**
 * How much of the rewrite is copied, as a share of its words. A story that is
 * mostly source text fails even when no single run is long (a model that
 * rearranges sentences but copies every one of them).
 */
export function copiedShare(source: string, rewrite: string): number {
  const a = new Set(tokenize(source));
  const b = tokenize(rewrite);
  if (b.length === 0) return 0;
  const copied = b.filter((word) => a.has(word)).length;
  return copied / b.length;
}
