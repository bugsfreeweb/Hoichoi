/**
 * A real portrait for a story about a real public figure.
 *
 * The image model can draw "a CEO in a leather jacket", but a reader opening a
 * Jensen Huang story expects Jensen Huang. Wikipedia's lead image is an
 * editorially usable portrait of the person the article names, and using it
 * avoids both a generic stock executive and a synthetic likeness presented as a
 * photograph. The fetch is best-effort: no portrait, no problem — the art
 * director's generated visual is still there.
 */
import { publicFigureFor } from "@hoichoi/llm";

export interface PublicFigurePortrait {
  bytes: Buffer;
  /** Bengali credit line for the poster footer. */
  credit: string;
  /** Machine label for the API payload. */
  source: string;
  name: string;
}

const MAX_BYTES = 12 * 1024 * 1024;

async function fetchBytes(url: string, signal: AbortSignal): Promise<Buffer | null> {
  const res = await fetch(url, {
    signal,
    headers: {
      // Wikimedia asks API clients to identify themselves.
      "user-agent": "HoichoiPoster/1.0 (https://hoichoifeed.vercel.app; editorial poster)",
      accept: "image/jpeg,image/png,image/webp",
    },
  });
  if (!res.ok) return null;
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) return null;
  const length = Number(res.headers.get("content-length") ?? "0");
  if (length > MAX_BYTES) return null;
  const bytes = Buffer.from(await res.arrayBuffer());
  return bytes.length > 0 && bytes.length <= MAX_BYTES ? bytes : null;
}

/** Resolve a named public figure to their Wikipedia lead portrait. */
export async function publicFigurePortrait(input: {
  title?: string | null;
  summary?: string | null;
  body?: string | null;
}): Promise<PublicFigurePortrait | null> {
  const person = publicFigureFor(input);
  if (!person) return null;
  const signal = AbortSignal.timeout(8_000);
  try {
    const summaryRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(person.wiki)}`,
      {
        signal,
        headers: {
          "user-agent": "HoichoiPoster/1.0 (https://hoichoifeed.vercel.app; editorial poster)",
          accept: "application/json",
        },
      },
    );
    if (!summaryRes.ok) return null;
    const data = (await summaryRes.json()) as {
      originalimage?: { source?: string };
      thumbnail?: { source?: string };
      title?: string;
    };
    const url = data.originalimage?.source ?? data.thumbnail?.source;
    if (!url) return null;
    const bytes = await fetchBytes(url, signal);
    if (!bytes) return null;
    return {
      bytes,
      credit: `ছবি: উইকিমিডিয়া কমন্স (${person.name})`,
      source: data.title ?? person.name,
      name: person.name,
    };
  } catch {
    return null;
  }
}
