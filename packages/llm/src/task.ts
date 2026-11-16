/**
 * AI tasks, as a small closed vocabulary.
 *
 * The web console needed "draft this tip", "summarise this" and "give me a
 * headline" without a local operator model. The risk in a generic gateway is that
 * it becomes an unbounded prompt proxy: any text in, any text out, billed to us.
 *
 * So a task is one of a fixed set, each with its own input ceiling and output
 * shape, and the caller cannot supply a prompt or choose a model. Generation goes
 * through the same `provider.rewrite()` path the pipeline uses, which means the
 * gateway inherits its editorial rules — own words, no verbatim copying, safety
 * flags, redaction — instead of inventing a second policy.
 *
 * This file is pure: validation and mapping in, testable without a provider key.
 */

export const AI_TASKS = ["draft", "summarise", "headline"] as const;
export type AiTask = (typeof AI_TASKS)[number];

export function isAiTask(value: unknown): value is AiTask {
  return typeof value === "string" && (AI_TASKS as readonly string[]).includes(value);
}

/** Hard ceiling on what a caller may send. Beyond this it is not a tip, it is a scrape. */
export const MAX_INPUT_CHARS = 6000;
export const MIN_INPUT_CHARS = 40;

export const TASK_LIMITS: Record<AiTask, { maxOutputChars: number }> = {
  draft: { maxOutputChars: 12_000 },
  summarise: { maxOutputChars: 1200 },
  headline: { maxOutputChars: 140 },
};

export interface AiTaskInput {
  task: AiTask;
  /** The raw material: a tip, a Facebook post body, a draft. Never a prompt. */
  text: string;
  /** Where it came from, so the draft can attribute honestly. */
  sourceName?: string;
  category?: string;
  categoryNameBn?: string;
}

/** Normalise whitespace and cut at a sentence boundary before the ceiling. */
export function clampInput(text: string, limit = MAX_INPUT_CHARS): string {
  const clean = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  // Prefer ending on a sentence so the model is not handed half a word.
  const lastStop = Math.max(cut.lastIndexOf("।"), cut.lastIndexOf(". "), cut.lastIndexOf("\n"));
  return (lastStop > limit * 0.6 ? cut.slice(0, lastStop + 1) : cut).trim();
}

export interface AiTaskResult {
  task: AiTask;
  title_bn?: string;
  summary_bn?: string;
  body_bn?: string;
  safety_flag?: string;
}

/**
 * Map a pipeline rewrite onto the task the console asked for.
 *
 * Only the requested field is returned: a "headline" call must not quietly hand
 * back a full body the operator then publishes by accident.
 */
export function taskResult(
  task: AiTask,
  parsed: { title_bn?: string; summary_bn?: string; body_bn?: string; safety_flag?: string },
): AiTaskResult {
  if (task === "headline") {
    const title = (parsed.title_bn ?? "").trim().slice(0, TASK_LIMITS.headline.maxOutputChars);
    return { task, title_bn: title || undefined, safety_flag: parsed.safety_flag };
  }
  if (task === "summarise") {
    const summary = (parsed.summary_bn ?? parsed.body_bn ?? "").trim().slice(0, TASK_LIMITS.summarise.maxOutputChars);
    return { task, summary_bn: summary || undefined, safety_flag: parsed.safety_flag };
  }
  return {
    task,
    title_bn: (parsed.title_bn ?? "").trim().slice(0, 160) || undefined,
    summary_bn: (parsed.summary_bn ?? "").trim().slice(0, 600) || undefined,
    body_bn: (parsed.body_bn ?? "").trim().slice(0, TASK_LIMITS.draft.maxOutputChars) || undefined,
    safety_flag: parsed.safety_flag,
  };
}

/**
 * Input the route accepts. Rejects a caller who tries to send their own prompt:
 * the only accepted keys are the task, the text and attribution hints.
 */
export function validateTaskInput(
  payload: unknown,
): { ok: true; input: AiTaskInput } | { ok: false; error: string } {
  if (!payload || typeof payload !== "object") return { ok: false, error: "অনুরোধটি পড়া যায়নি।" };
  const body = payload as Record<string, unknown>;

  const known = new Set(["task", "text", "sourceName", "category", "categoryNameBn"]);
  const unknown = Object.keys(body).filter((k) => !known.has(k));
  if (unknown.length > 0) {
    // A `prompt` or `system` key is the exact thing this gateway refuses to be.
    return { ok: false, error: `অসমর্থিত ফিল্ড: ${unknown.slice(0, 3).join(", ")}` };
  }

  if (!isAiTask(body.task)) return { ok: false, error: `task must be one of: ${AI_TASKS.join(", ")}` };

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length < MIN_INPUT_CHARS) return { ok: false, error: "কাঁচা লেখাটি খুব ছোট।" };
  if (text.length > MAX_INPUT_CHARS * 4) return { ok: false, error: "কাঁচা লেখাটি খুব বড়।" };

  const sourceName = typeof body.sourceName === "string" ? body.sourceName.slice(0, 80) : undefined;
  const categoryNameBn = typeof body.categoryNameBn === "string" ? body.categoryNameBn.slice(0, 60) : undefined;
  const category = typeof body.category === "string" ? body.category.slice(0, 40) : undefined;
  return {
    ok: true,
    input: { task: body.task, text: clampInput(text), sourceName, category, categoryNameBn },
  };
}
