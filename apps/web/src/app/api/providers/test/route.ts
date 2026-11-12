import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getClient } from "@hoichoi/db";
import { generateImage } from "@hoichoi/llm";
import { requireApiUser, unauthorized, forbidden } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Diagnose ONE image provider.
 *
 * "Why don't my Google/OpenAI keys work?" could not be answered from the UI:
 * the generation chain silently falls through to the next row (often the
 * keyless Pollinations host, which leaves a watermark), so a broken row looked
 * like "it works, but the images are ugly".
 *
 * This runs the pinned provider with `strict: true` — no fallback, no 429 retry
 * — and returns the provider's own error text, so the operator sees
 * `gemini-2.5-flash-image: 429 quota exceeded` instead of a mystery.
 */
export async function POST(req: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const body = (await req.json().catch(() => null)) as { id?: string; prompt?: string } | null;
  const id = body?.id?.trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await ensureSchema(getClient());
    const started = Date.now();
    const result = await generateImage(
      {
        providerId: id,
        strict: true,
        prompt:
          body?.prompt?.trim() ||
          "Editorial news illustration: a calm wide river at golden hour, soft natural light, flat modern style, no text.",
        size: "1024x576",
        aspectRatio: "16:9",
        count: 1,
      },
      AbortSignal.timeout(100_000),
    );
    return NextResponse.json({
      ok: true,
      provider: result.provider,
      model: result.model,
      contentType: result.contentType,
      bytes: result.bytes.length,
      ms: Date.now() - started,
      // A data URL lets the operator eyeball the result (and spot watermarks)
      // without persisting anything to the media store.
      preview: `data:${result.contentType};base64,${Buffer.from(result.bytes).toString("base64")}`,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 200 },
    );
  }
}
