import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getClient, mapProvider } from "@hoichoi/db";
import { CLOUDFLARE_ACCOUNT_ENV, hasAccountPlaceholder, metaFor } from "@hoichoi/shared-types";
import { generateImage } from "@hoichoi/llm";
import { forbidden, requireApiRole } from "@/lib/auth";

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
  const guard = await requireApiRole("admin");
  if ("response" in guard) return guard.response;
  const user = guard.user;
  if (user.role !== "admin") return forbidden();

  const body = (await req.json().catch(() => null)) as { id?: string; prompt?: string } | null;
  const id = body?.id?.trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await ensureSchema(getClient());
    /**
     * Name the missing piece before spending a round trip on it.
     *
     * A Cloudflare row saved without its account id comes back from the API as
     * `7003 … /accounts/ACCOUNT_ID/ai/run/…`, which reads like a broken
     * integration. Two local checks — is the placeholder still there, is there a
     * token at all — turn that into a sentence that says what to paste where.
     */
    const rowRes = await getClient().execute({
      sql: "SELECT * FROM llm_providers WHERE id = ? LIMIT 1",
      args: [id],
    });
    const row = rowRes.rows[0] ? mapProvider(rowRes.rows[0] as Record<string, unknown>) : null;
    if (row && row.provider_key === "cloudflare") {
      if (hasAccountPlaceholder(row.base_url)) {
        return NextResponse.json({
          ok: false,
          error:
            "base URL-এ ACCOUNT_ID এখনো বসানো হয়নি — এই রো-টি সম্পাদনা করে আপনার ৩২-অক্ষরের account ID দিন " +
            `(Cloudflare → Workers & Pages → Account ID), অথবা সার্ভারে ${CLOUDFLARE_ACCOUNT_ENV} সেট করুন।`,
        });
      }
      if (!row.api_key && !process.env[row.api_key_env_var || "CLOUDFLARE_API_TOKEN"]) {
        return NextResponse.json({
          ok: false,
          error:
            "কোনো API টোকেন নেই — রো-তে টোকেন লিখুন বা সার্ভারে CLOUDFLARE_API_TOKEN সেট করুন " +
            "(অনুমতি: Workers AI → Edit)।",
        });
      }
    }
    const meta = metaFor(row?.provider_key ?? "custom");
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
      label: meta.label,
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
