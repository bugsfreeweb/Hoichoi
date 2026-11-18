import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getClient, nowIso, mapProvider } from "@hoichoi/db";
import {
  PROCESSOR_ENV_DEFAULTS,
  PROVIDER_META,
  composeCloudflareBaseUrl,
  validateProviderSetup,
  type ProviderKey,
} from "@hoichoi/shared-types";
import { forbidden, requireApiRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

/**
 * Derived from the shared catalogue instead of a hand-kept list.
 *
 * The list used to be written out here and in the console separately, so
 * Cloudflare — the default image provider — was in neither: adding a second
 * account meant a "custom" row and a hand-composed URL, which is exactly where
 * an operator gets a 7003 that looks like a broken integration.
 */
const KEYS = PROVIDER_META.map((p) => p.key) as ProviderKey[];

export async function GET() {
  // Provider rows carry base URLs, model names and key *presence*; the setup
  // page is admin-only, so the API must be too — without this guard an
  // unauthenticated request could enumerate the configured AI stack.
  const guard = await requireApiRole("admin");
  if ("response" in guard) return guard.response;
  const client = getClient();
  const res = await client.execute("SELECT * FROM llm_providers ORDER BY priority ASC");
  return NextResponse.json({ providers: res.rows.map((r) => mapProvider(r as Record<string, unknown>)) });
}

export async function POST(req: NextRequest) {
  const guard = await requireApiRole("admin");
  if ("response" in guard) return guard.response;
  const user = guard.user;
  if (user.role !== "admin") return forbidden();

  const body = (await req.json().catch(() => null)) as {
    providerKey?: ProviderKey;
    displayName?: string;
    baseUrl?: string;
    modelName?: string;
    apiKeyEnvVar?: string;
    api_key?: string;
    priority?: number;
    isFreeTier?: boolean;
    supportsRewrite?: boolean;
    supportsEmbeddings?: boolean;
    purpose?: string;
    /** Cloudflare (and any account-scoped provider): stored into the base URL. */
    accountId?: string;
  } | null;
  if (!body?.providerKey || !body?.modelName || !KEYS.includes(body.providerKey)) {
    return NextResponse.json({ error: "providerKey + modelName required" }, { status: 400 });
  }
  /**
   * A Cloudflare row is two values, and the URL is composed from the account id
   * here — not typed by the operator. A bad account id is refused with a Bangla
   * sentence instead of being saved and failing later with 7003.
   */
  let baseUrl = body.baseUrl?.trim() || "";
  if (body.providerKey === "cloudflare") {
    const composed = composeCloudflareBaseUrl(body.accountId ?? "");
    if (!composed) {
      return NextResponse.json(
        { error: "Cloudflare account ID ৩২ অক্ষরের hex হতে হবে — Cloudflare → Workers & Pages → Account ID।" },
        { status: 400 },
      );
    }
    baseUrl = composed;
  }
  const setup = validateProviderSetup({
    providerKey: body.providerKey,
    accountId: body.accountId,
    apiToken: body.api_key,
    baseUrl,
  });
  if (!setup.ok) return NextResponse.json({ error: setup.errorBn }, { status: 400 });
  if (body.providerKey === "custom" && !baseUrl) {
    return NextResponse.json({ error: "স্বনির্মিত প্রোভাইডারের জন্য base URL আবশ্যক।" }, { status: 400 });
  }
  try {
    const client = getClient();
    await ensureSchema(client);
    const purposeVal = body.purpose?.trim() === "image" ? "image" : "text";
    await client.execute({
      sql: `
        INSERT INTO llm_providers (
          id, provider_key, display_name, base_url, model_name, api_key_env_var, api_key,
          priority, is_active, is_free_tier, supports_rewrite, supports_embeddings, purpose, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        crypto.randomUUID(),
        body.providerKey,
        body.displayName?.trim() || body.providerKey,
        baseUrl || null,
        body.modelName,
        body.apiKeyEnvVar?.trim() || PROCESSOR_ENV_DEFAULTS[body.providerKey],
        body.api_key?.trim() || null,
        Number(body.priority ?? 100),
        body.isFreeTier ? 1 : 0,
        body.supportsRewrite ?? 1,
        body.supportsEmbeddings ?? 0,
        purposeVal,
        nowIso(),
        nowIso(),
      ],
    });
    await audit(user, { action: "provider.create", entityType: "provider", entityId: body.providerKey, summary: `প্রোভাইডার যোগ: ${body.providerKey}` }, req);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}