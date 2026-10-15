import { NextResponse } from "next/server";
import { createSession, hashPassword, isAuthed } from "@/lib/auth";
import { getSettings, resetSettings, saveSettings } from "@/lib/store";
import { withDefaults, type SiteSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

function deepMerge(base: any, patch: any): any {
  if (!patch || typeof patch !== "object") return base;
  const out = { ...base };
  for (const key of Object.keys(patch)) {
    const b = base?.[key];
    const p = patch[key];
    out[key] = b && typeof b === "object" && !Array.isArray(b) ? deepMerge(b, p) : p;
  }
  return out;
}

/** Full configuration — admin only. */
export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ settings: await getSettings() });
}

/** Save the whole configuration (admin dashboard "Save changes"). */
export async function PUT(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.settings) return NextResponse.json({ error: "settings payload required" }, { status: 400 });

  const current = await getSettings();
  const incoming = withDefaults(body.settings) as SiteSettings;
  if (typeof body.newPassword === "string" && body.newPassword.trim().length >= 4) {
    incoming.security.passwordHash = hashPassword(body.newPassword);
  } else {
    incoming.security.passwordHash = current.security.passwordHash;
  }
  const saved = await saveSettings(incoming);
  return NextResponse.json({ settings: saved });
}

/** Partial patch — used by the visitor dock to hot-swap the active design. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const patch = body?.patch;
  if (!patch || typeof patch !== "object") {
    return NextResponse.json({ error: "patch required" }, { status: 400 });
  }
  // Public convenience endpoint for the visitor dock: design & motion only.
  const allowed = Object.keys(patch).filter((k) => ["activeTheme", "intensity"].includes(k));
  if (allowed.length === 0) {
    return NextResponse.json({ error: "only activeTheme/intensity can be patched without signing in" }, { status: 400 });
  }
  const current = await getSettings();
  const next = deepMerge(current, Object.fromEntries(allowed.map((k) => [k, patch[k]])));
  const saved = await saveSettings(withDefaults(next));
  if (body.session === true && (await isAuthed())) await createSession();
  return NextResponse.json({ settings: saved });
}

/** Reset everything back to the shipped defaults. */
export async function DELETE() {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const fresh = await resetSettings();
  return NextResponse.json({ settings: fresh });
}
