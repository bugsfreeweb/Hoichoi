import { NextRequest, NextResponse } from "next/server";
import { getClient, nowIso, mapProvider } from "@hoichoi/db";
import type { ProviderKey } from "@hoichoi/shared-types";
import { requireApiUser, unauthorized, forbidden } from "@/lib/auth";

const KEYS: ProviderKey[] = ["google", "groq", "openrouter", "ollama", "anthropic", "openai", "mistral", "github", "github-models", "custom"];

export async function GET() {
  const client = getClient();
  const res = await client.execute("SELECT * FROM llm_providers ORDER BY priority ASC");
  return NextResponse.json({ providers: res.rows.map((r) => mapProvider(r as Record<string, unknown>)) });
}

export async function POST(req: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
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
  } | null;
  if (!body?.providerKey || !body?.modelName || !KEYS.includes(body.providerKey)) {
    return NextResponse.json({ error: "providerKey + modelName required" }, { status: 400 });
  }
  const client = getClient();
  await client.execute({
    sql: `
      INSERT INTO llm_providers (
        id, provider_key, display_name, base_url, model_name, api_key_env_var, api_key,
        priority, is_active, is_free_tier, supports_rewrite, supports_embeddings, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
    `,
    args: [
      crypto.randomUUID(),
      body.providerKey,
      body.displayName?.trim() || body.providerKey,
      body.baseUrl?.trim() || null,
      body.modelName,
      body.apiKeyEnvVar?.trim() || `${body.providerKey.toUpperCase().replace(/-/g, "_")}_API_KEY`,
      body.api_key?.trim() || null,
      Number(body.priority ?? 100),
      body.isFreeTier ? 1 : 0,
      body.supportsRewrite ?? 1,
      body.supportsEmbeddings ?? 0,
      nowIso(),
      nowIso(),
    ],
  });
  return NextResponse.json({ ok: true });
}