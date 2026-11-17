/**
 * The story plate, as the collector sees it.
 *
 * `@hoichoi/poster` knows how to draw a plate; this file knows what to write on
 * it. Two rules are encoded here rather than at every call site:
 *
 *   1. A story never ships without a picture. If the model returned bytes we
 *      caption those; if it did not, we still draw the branded plate for the
 *      headline. "The provider was rate-limited" is not a reason to publish a
 *      card with no image.
 *   2. The desk and the date are in Bangla, because the picture is read by the
 *      same people as the headline.
 */
import { banglaDate, deskFor } from "@hoichoi/db";
import { renderPoster, type PosterSpec } from "@hoichoi/poster";

/** Re-exported from the database package so the collector and the web route agree. */
export { banglaDate, deskFor } from "@hoichoi/db";

export interface PlateInput {
  /** The model's render, or null when there is none. */
  background: Buffer | null;
  title: string;
  category?: string | null;
  source?: string | null;
  date?: Date;
  /** Stable seed for the fallback backdrop. Defaults to the headline. */
  seed?: string;
}

/** Compose the finished 1600×900 plate. Never throws for a missing background. */
export async function composeStoryPlate(input: PlateInput): Promise<Buffer> {
  const desk = deskFor(input.category);
  const spec: PosterSpec = {
    title: input.title,
    category: desk.label,
    source: input.source ?? null,
    dateText: banglaDate(input.date ?? new Date()),
  };
  const rendered = await renderPoster({
    background: input.background,
    spec,
    seed: input.seed ?? input.title,
    accent: desk.accent,
  });
  return rendered.bytes;
}
