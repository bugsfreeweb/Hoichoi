import { NextRequest, NextResponse } from "next/server";
import { getClient, nowIso } from "@hoichoi/db";
import type { InValue } from "@libsql/client";
import { requireApiUser, unauthorized, forbidden } from "@/lib/auth";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const client = getClient();
  if (body) {
    const sets: string[] = ["updated_at = ?"];
    const args: InValue[] = [nowIso()];
    let apiKey: string | null | undefined;
    if (typeof body.api_key === "string") apiKey = body.api_key.trim() || null;
    if ("api_key" in body) {
      sets.push("api_key = ?");
      args.push((apiKey ?? null) as InValue);
    }
    const fields: Record<string, unknown> = {
      is_active: body.is_active,
      priority: body.priority,
      model_name: body.model_name,
      display_name: body.display_name,
      base_url: body.base_url,
      api_key_env_var: body.api_key_env_var,
      is_free_tier: body.is_free_tier,
      supports_rewrite: body.supports_rewrite,
      supports_embeddings: body.supports_embeddings,
      purpose: typeof body.purpose === "string" ? (body.purpose === "image" ? "image" : "text") : undefined,
    };
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) {
        sets.push(`${k} = ?`);
        args.push(typeof v === "boolean" ? (v ? 1 : 0) : (v as InValue));
      }
    }
    args.push(id);
    await client.execute({ sql: `UPDATE llm_providers SET ${sets.join(", ")} WHERE id = ?`, args });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const { id } = await ctx.params;
  const client = getClient();
  await client.execute({ sql: "DELETE FROM llm_providers WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}