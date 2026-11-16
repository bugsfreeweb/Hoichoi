import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { limitRequest, LIMITS } from "@/lib/rate-limit";
import { AiTaskError, AI_TASKS, runAiTask, validateTaskInput } from "@/lib/ai-task";
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
 * Roles: editor and above. Moderators review content, they do not author it.
 * Every call is audited with the task and the character count — not the text,
 * because the raw material is a reader's tip.
 */
export async function GET() {
  return NextResponse.json({ ok: true, tasks: AI_TASKS });
}

export async function POST(req: Request) {
  const guard = await requireApiRole("editor");
  if ("response" in guard) return guard.response;
  const user = guard.user;

  // Per-caller budget: an AI call is the most expensive thing this console does
  // and a stuck button must not become a bill.
  const limited = await limitRequest(req, LIMITS.aiTask);
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
    const run = await runAiTask(input);
    await audit(
      user,
      {
        action: `ai.task.${input.task}`,
        entityType: "ai_task",
        entityId: null,
        summary: `AI ${input.task} — ${input.text.length} অক্ষরের কাঁচা লেখা, প্রোভাইডার ${run.provider}`,
        metadata: { provider: run.provider, ms: run.ms, chars: input.text.length, category: input.category ?? null },
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
      return NextResponse.json({ ok: false, error: err.message, kind: err.kind }, { status: err.status });
    }
    void reportError(err, { event: "ai.task.error", route: "/api/ai/task", task: input.task });
    return NextResponse.json({ ok: false, error: "সহকারী উত্তর দিতে পারেনি।" }, { status: 500 });
  }
}
