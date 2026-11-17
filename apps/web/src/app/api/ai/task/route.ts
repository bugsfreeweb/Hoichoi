import { NextResponse } from "next/server";
import { verifyDeskToken } from "@hoichoi/db";
import { requireApiRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { limitRequest, LIMITS } from "@/lib/rate-limit";
import { AiTaskError, AI_TASKS, recordAiTaskRun, runAiTask, validateTaskInput } from "@/lib/ai-task";
import { logError } from "@/lib/log";
import { reportError } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/ai/task — the web console's editorial assistant.
 *
 * Deliberately not a chat endpoint: `{ task, text, sourceName? }` in, one field
 * out. The task vocabulary is closed (`draft | summarise | headline`), the caller
 * cannot supply a prompt or a model, and generation runs through the pipeline's
 * own rewrite path so the editorial rules and safety flags are the same ones the
 * scraper obeys.
 *
 * Roles: editor and above, **or** a desktop device token. The desktop runs the
 * collector locally and needs a rewrite per collected post; holding provider keys
 * on an operator's laptop is exactly what this endpoint exists to avoid, so a
 * verified `hdc_` device may call it. Moderators still may not: they review
 * content, they do not author it.
 *
 * Every call is audited with the task and the character count — not the text,
 * because the raw material is a reader's tip.
 */
export async function GET() {
  return NextResponse.json({ ok: true, tasks: AI_TASKS });
}

/**
 * The desktop's way in. Only a hash of the device token is stored server-side, so
 * this cannot be replayed from a database dump, and a revoked device is refused
 * on the next call rather than when its cookie expires.
 */
async function deskActor(req: Request): Promise<{ actor: string; label: string } | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = /^Bearer\s+(.+)$/i.exec(header.trim())?.[1]?.trim() ?? "";
  if (!token.startsWith("hdc_")) return null;
  const verified = await verifyDeskToken(token);
  return verified.ok && verified.device
    ? { actor: `desk:${verified.device.label}`, label: verified.device.label }
    : null;
}

export async function POST(req: Request) {
  // A device token is checked before the cookie guard: the desktop has no session,
  // and an `editor` cookie must never be the only way in for the pipeline.
  const desk = await deskActor(req);
  const guard = desk ? null : await requireApiRole("editor");
  if (guard && "response" in guard) return guard.response;
  const user = guard && "user" in guard ? guard.user : null;
  // A device has no email, so the ledger records `desk:<label>`: the label is what
  // the console shows when a device is revoked, and it is enough to answer
  // "which machine asked for this draft".
  const actor = desk?.actor ?? user?.email ?? "unknown";
  const actorRef = { email: actor, role: user?.role ?? "editor", user_id: user?.user_id };

  // Per-caller budget: an AI call is the most expensive thing this console does
  // and a stuck button must not become a bill. A desk device runs the whole
  // collector, so it gets the device budget rather than the authoring one — the
  // same 20/hour would refuse the second source of a single run.
  const limited = desk
    ? await limitRequest(req, { ...LIMITS.deskAiTask, discriminator: desk.label })
    : await limitRequest(req, LIMITS.aiTask);
  if (limited) return limited;

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "অনুরোধটি পড়া যায়নি।" }, { status: 400 });
  }

  const check = validateTaskInput(payload);
  if (!check.ok) {
    return NextResponse.json({ ok: false, error: check.error }, { status: 400 });
  }
  const input = check.input;

  try {
    const run = await runAiTask(input, { actor });
    await audit(
      actorRef,
      {
        action: `ai.task.${input.task}`,
        entityType: "ai_task",
        entityId: null,
        summary: `AI ${input.task} — ${input.text.length} অক্ষরের কাঁচা লেখা, প্রোভাইডার ${run.provider}`,
        metadata: {
          provider: run.provider,
          ms: run.ms,
          chars: input.text.length,
          category: input.category ?? null,
          run_id: run.runId,
          pii_removed: run.pii,
        },
      },
      req,
    );
    return NextResponse.json(
      {
        ok: true,
        task: input.task,
        result: run.result,
        provider: run.provider,
        ms: run.ms,
        // How much personal data was scrubbed before the text reached the model.
        pii: run.pii,
        // A draft is a draft: nothing here writes to the database.
        saved: false,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    if (err instanceof AiTaskError) {
      if (err.kind === "provider" || err.kind === "timeout") {
        logError({ event: "ai.task.failed", task: input.task, kind: err.kind, chars: input.text.length });
      }
      // A failed call is still a call: it spent an operator's time and possibly a
      // provider's quota, so the ledger records it.
      await recordAiTaskRun({
        task: input.task,
        provider: "unresolved",
        inputChars: input.text.length,
        outputChars: 0,
        latencyMs: 0,
        ok: false,
        errorKind: err.kind,
        actor,
      }).catch(() => undefined);
      return NextResponse.json({ ok: false, error: err.message, kind: err.kind }, { status: err.status });
    }
    void reportError(err, { event: "ai.task.error", route: "/api/ai/task", task: input.task });
    return NextResponse.json({ ok: false, error: "সহকারী উত্তর দিতে পারেনি।" }, { status: 500 });
  }
}
