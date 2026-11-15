import { NextResponse } from "next/server";
import { listProviderHealth, updateProviderSettings } from "@hoichoi/db";
import { requireApiRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY_RE = /^(github|s3|image|local):[A-Za-z0-9._/@:-]{1,160}$/;

/**
 * Media provider registry.
 *
 * GET lists every provider the uploader has actually touched, with its measured
 * bytes, its quota (if an operator set one) and why the last attempt fell over to
 * the next target. POST only changes policy — quota, enabled, cooldown — never
 * counters, so the numbers on screen always come from real traffic.
 */
export async function GET() {
  const guard = await requireApiRole("moderator");
  if ("response" in guard) return guard.response;
  try {
    const providers = await listProviderHealth();
    return NextResponse.json({
      ok: true,
      providers,
      counts: {
        total: providers.length,
        ok: providers.filter((p) => p.consecutive_failures === 0 && p.enabled).length,
        failing: providers.filter((p) => p.consecutive_failures > 0).length,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message || "provider health unavailable" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const guard = await requireApiRole("admin");
  if ("response" in guard) return guard.response;
  const user = guard.user;

  let body: {
    key?: unknown;
    quota_bytes?: unknown;
    enabled?: unknown;
    clear_cooldown?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const key = typeof body.key === "string" ? body.key.trim() : "";
  if (!KEY_RE.test(key)) {
    return NextResponse.json({ ok: false, error: "invalid provider key" }, { status: 400 });
  }

  const patch: { quota_bytes?: number | null; enabled?: boolean; clear_cooldown?: boolean } = {};
  if (body.quota_bytes !== undefined) {
    if (body.quota_bytes === null) {
      patch.quota_bytes = null;
    } else {
      const value = Number(body.quota_bytes);
      if (!Number.isFinite(value) || value < 0) {
        return NextResponse.json({ ok: false, error: "quota_bytes must be a non-negative number" }, { status: 400 });
      }
      patch.quota_bytes = Math.trunc(value);
    }
  }
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (typeof body.clear_cooldown === "boolean") patch.clear_cooldown = body.clear_cooldown;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "nothing to update" }, { status: 400 });
  }

  await updateProviderSettings(key, patch);
  await audit(
    user,
    {
      action: "provider.health_update",
      entityType: "media_provider",
      entityId: key,
      summary: `মিডিয়া প্রোভাইডার আপডেট · ${key} — ${JSON.stringify(patch)}`,
      metadata: patch as Record<string, unknown>,
    },
    req,
  ).catch(() => undefined);

  const row = (await listProviderHealth()).find((p) => p.provider_key === key) ?? null;
  return NextResponse.json({ ok: true, provider: row });
}
