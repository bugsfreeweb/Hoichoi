#!/usr/bin/env node
/**
 * Broadcast card generator — JSON in, PNG out.
 *
 *   npx tsx packages/poster/scripts/social-card.ts --json card.json
 *   npx tsx packages/poster/scripts/social-card.ts --data '{"title":"…"}'
 *   npx tsx packages/poster/scripts/social-card.ts --sample
 *
 * Input shape (all but `title` optional):
 *
 *   {
 *     "category": "জাতীয়",
 *     "title": "…",
 *     "summary": "…",
 *     "source": "প্রথম আলো",
 *     "background_image_url": "https://…/photo.jpg",   // or a local path
 *     "brand": "হৈচৈ",
 *     "site": "hoichoifeed.vercel.app",
 *     "date": "১৮ নভেম্বর ২০২৬",
 *     "accent": "#E11D2E",
 *     "fonts": "cdn" | "local",
 *     "out": "card.png"
 *   }
 *
 * A `background_image_url` is *inspiration, not the picture*: it is rendered
 * blurred, saturation-lifted and hue-nudged under the field with a soft-light
 * blend, so the card echoes the scene without republishing the photograph.
 *
 * The result is a 1200×675 card at 2× device scale — a 2400×1350 PNG.
 */
import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";

import { renderBroadcastCard, type BroadcastCardInput } from "../src/html/broadcast";

interface CardJson extends BroadcastCardInput {
  background_image_url?: string | null;
  date?: string | null;
  out?: string | null;
}

const SAMPLE: CardJson = {
  category: "জাতীয়",
  title: "সুপ্রিম কোর্টের রায়ের পর রাজধানীতে নতুন ট্রাফিক ব্যবস্থা, আট সড়কে বদলে যাচ্ছে যান চলাচল",
  summary:
    "সকাল সাতটা থেকে সন্ধ্যা সাতটা পর্যন্ত নতুন নিয়ম কার্যকর হবে বলে জানিয়েছে ঢাকা মহানগর পুলিশ; মন্ত্রিপরিষদ সচিব বলেছেন পরবর্তী সপ্তাহে আরও চারটি সড়কে এই ব্যবস্থা শুরু হবে।",
  source: "প্রথম আলো",
  brand: "হৈচৈ",
  site: "hoichoifeed.vercel.app",
  date: "১৮ নভেম্বর ২০২৬",
  out: "card-sample.png",
};

function argValue(argv: string[], flag: string): string | null {
  const i = argv.indexOf(flag);
  if (i < 0) return null;
  const next = argv[i + 1];
  return next && !next.startsWith("--") ? next : null;
}

/** A remote URL is fetched once; a local path is read; anything unreadable is
 *  reported and skipped rather than silently producing a card with no picture. */
async function loadBackground(spec: string | null | undefined): Promise<Buffer | null> {
  if (!spec) return null;
  try {
    if (/^https?:\/\//i.test(spec)) {
      const res = await fetch(spec, {
        headers: { "user-agent": "Hoichoi/1.1 card-generator" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    }
    const path = isAbsolute(spec) ? spec : resolve(process.cwd(), spec);
    return await readFile(path);
  } catch (err) {
    console.error(
      `  ! background skipped (${err instanceof Error ? err.message : String(err)}) — the card still renders`,
    );
    return null;
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let json: CardJson;
  let out: string;

  const file = argValue(argv, "--json");
  const inline = argValue(argv, "--data");
  if (argv.includes("--sample")) {
    json = SAMPLE;
    out = "card-sample.png";
  } else if (file) {
    json = JSON.parse(await readFile(resolve(process.cwd(), file), "utf8")) as CardJson;
    out = json.out ?? "card.png";
  } else if (inline) {
    json = JSON.parse(inline) as CardJson;
    out = json.out ?? "card.png";
  } else {
    console.error(
      [
        "Usage:",
        "  npx tsx packages/poster/scripts/social-card.ts --json card.json [--out file.png]",
        "  npx tsx packages/poster/scripts/social-card.ts --data '{...}' [--out file.png]",
        "  npx tsx packages/poster/scripts/social-card.ts --sample",
      ].join("\n"),
    );
    process.exitCode = 2;
    return;
  }

  if (!json.title || !json.title.trim()) {
    // A card without a headline is a picture of nothing; refuse before launching
    // a browser.
    console.error("card: `title` is required");
    process.exitCode = 2;
    return;
  }

  out = argValue(argv, "--out") ?? out;
  const background = await loadBackground(json.background_image_url);

  const started = Date.now();
  const card = await renderBroadcastCard({
    category: json.category ?? null,
    title: json.title,
    summary: json.summary ?? null,
    source: json.source ?? null,
    brand: json.brand ?? null,
    site: json.site ?? null,
    dateText: json.date ?? null,
    accent: json.accent ?? null,
    backgroundImage: background,
    fonts: json.fonts === "cdn" ? "cdn" : "local",
  });
  await writeFile(out, card.bytes);
  console.log(
    `card: ${out} — ${card.width}×${card.height} at ${card.scale}× ` +
      `(${card.bytes.length.toLocaleString()} bytes, ${Date.now() - started} ms)` +
      (background ? " · inspired by the supplied image" : " · gradient field"),
  );
}

main().catch((err) => {
  console.error(`card failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
