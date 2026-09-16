import { NextRequest, NextResponse } from "next/server";
import { requireApiUser, unauthorized, forbidden } from "@/lib/auth";

export const dynamic = "force-dynamic";

const DEFAULTS: Record<string, string> = {
  google: "https://generativelanguage.googleapis.com",
  groq: "https://api.groq.com/openai",
  openrouter: "https://openrouter.ai/api",
  ollama: "http://localhost:11434",
  anthropic: "https://api.anthropic.com",
  openai: "https://api.openai.com",
  mistral: "https://api.mistral.ai",
  custom: "",
};

interface ModelPick {
  id: string;
  label: string;
}

/**
 * POST /api/providers/models  { providerKey, baseUrl?, apiKey? }
 * Admin — probes the provider's /v1/models (or Gemini's models endpoint) and
 * returns a list of model picks. OpenRouter is filtered to free models. The
 * apiKey sent here is used transiently for the probe, never persisted by
 * this route itself (stores happen through /api/providers).
 */
export async function POST(req: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const body = (await req.json().catch(() => null)) as {
    providerKey?: string;
    baseUrl?: string;
    apiKey?: string;
  } | null;
  const pkey = body?.providerKey ?? "";
  if (!DEFAULTS[pkey]) return NextResponse.json({ error: "অজানা প্রোভাইডার" }, { status: 400 });

  const base = (body?.baseUrl ?? "").trim().replace(/\/+$/, "") || DEFAULTS[pkey] || "";
  const apiKey = (body?.apiKey ?? "").trim();

  try {
    if (pkey === "google") {
      if (!apiKey) return NextResponse.json({ error: "অটো-ফেচের জন্য API key দিন" }, { status: 400 });
      const url = `${base}/v1beta/models?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
      if (!res.ok) return NextResponse.json({ error: `প্রোভাইডার: ${res.status}` }, { status: 502 });
      const data = (await res.json()) as { models?: Array<{ name: string; displayName?: string }> };
      const models: ModelPick[] = (data.models ?? [])
        .map((m) => ({ id: m.name.split("/").slice(-1)[0] ?? m.name, label: m.displayName ?? m.name }))
        .sort((a, b) => a.id.localeCompare(b.id));
      return NextResponse.json({ ok: true, models });
    }

    const headers: Record<string, string> = { Accept: "application/json" };
    if (pkey !== "ollama" && apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const url = `${base}/v1/models`;
    const res = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return NextResponse.json({ error: `প্রোভাইডার (${res.status}): ${res.statusText}` }, { status: 502 });
    const data = (await res.json()) as { data?: Array<{ id: string; name?: string; pricing?: { prompt: string | number } }> };
    let models: ModelPick[] = (data.data ?? [])
      .map((m) => ({ id: m.id, label: m.name ?? m.id }))
      .sort((a, b) => a.id.localeCompare(b.id));

    if (pkey === "openrouter") {
      models = models.filter(
        (m) => m.id.endsWith(":free") || m.id.includes("/free"),
      );
    }

    return NextResponse.json({ ok: true, models });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? `নেটওয়ার্ক: ${e.message}` : "নেটওয়ার্ক সমস্যা" },
      { status: 502 },
    );
  }
}