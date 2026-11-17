import {
  AI_TASKS,
  buildProvider,
  redactFields,
  taskResult,
  validateTaskInput,
  type AiTaskInput,
  type AiTaskResult,
} from "@hoichoi/llm";
import type { CategoryConfig, CategorySlug, LLMProviderRow } from "@hoichoi/shared-types";
import { getCategory, getClient } from "@hoichoi/db";

/**
 * Server-side AI task runner.
 *
 * The web console can now draft a tip, summarise a body or propose a headline
 * without the desktop app running. What it must never become is a prompt proxy —
 * so this runner:
 *
 * - accepts only a task name and raw material (`validateTaskInput`),
 * - picks the provider itself from the active chain by priority, exactly like the
 *   pipeline (an operator cannot ask for a specific model),
 * - generates through `provider.rewrite()` so the editorial rules and safety
 *   flags are the pipeline's rules, not a second policy,
 * - aborts after a bounded time, and returns a typed failure rather than a
 *   provider's raw error text.
 *
 * Keys never leave the server: they are resolved from env or the row's stored
 * override inside `buildProvider`.
 */

export class AiTaskError extends Error {
  readonly kind: "unavailable" | "timeout" | "provider" | "invalid";
  readonly status: number;
  constructor(kind: AiTaskError["kind"], message: string, status: number) {
    super(message);
    this.name = "AiTaskError";
    this.kind = kind;
    this.status = status;
  }
}

export const AI_TASK_TIMEOUT_MS = 45_000;

/** Providers that can do text work, in the order the pipeline would try them. */
export async function textProviderRows(): Promise<LLMProviderRow[]> {
  const client = getClient();
  const res = await client.execute(
    `SELECT * FROM llm_providers
      WHERE is_active = 1 AND supports_rewrite = 1 AND (purpose IS NULL OR purpose = 'text')
      ORDER BY priority ASC`,
  );
  return res.rows.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      ...r,
      // The column is free text; `buildProvider` switches on this key and falls
      // back to the OpenAI-compatible path for anything it does not recognise.
      provider_key: String(r.provider_key ?? "openai") as LLMProviderRow["provider_key"],
      is_active: Boolean(r.is_active),
      is_free_tier: Boolean(r.is_free_tier),
      supports_rewrite: Boolean(r.supports_rewrite),
      supports_embeddings: Boolean(r.supports_embeddings),
      priority: Number(r.priority ?? 100),
    } as LLMProviderRow;
  });
}

const DEFAULT_CONFIG: CategoryConfig = {
  requires_double_approval: false,
  show_content_warning: false,
  auto_pending_review: false,
  redaction_strict: "standard",
  allow_identifying_details: true,
  publish_age_gate: false,
  use_allegation_language: false,
  supports_case_status: false,
  share_widely_cta: false,
  include_helpline_numbers: false,
};

export interface AiTaskRun {
  result: AiTaskResult;
  provider: string;
  ms: number;
  /** How much PII was scrubbed from the request before it reached the model. */
  pii: { email: number; phone: number; longDigits: number; cardLike: number };
  /** Stable id of the recorded ledger row (see recordAiTaskRun). */
  runId: string;
}

/**
 * One row per gateway call, so "what did the AI cost and how slow was it" is a
 * fact of the ledger, not an anecdote. Written by the route after a success or
 * terminal failure.
 */
function outputCharsOf(result: AiTaskResult): number {
  return [result.title_bn, result.summary_bn, result.body_bn].reduce((sum, part) => sum + (part?.length ?? 0), 0);
}

export async function recordAiTaskRun(input: {
  task: string;
  provider: string;
  model?: string | null;
  inputChars: number;
  outputChars: number;
  latencyMs: number;
  ok: boolean;
  errorKind?: string | null;
  actor?: string | null;
}): Promise<string> {
  const client = getClient();
  const id = crypto.randomUUID();
  await client
    .execute({
      sql: `INSERT INTO ai_task_runs (id, task, provider, model, input_chars, output_chars, latency_ms, ok, error_kind, actor, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        input.task,
        input.provider,
        input.model || null,
        input.inputChars,
        input.outputChars,
        input.latencyMs,
        input.ok ? 1 : 0,
        input.errorKind || null,
        input.actor || null,
        new Date().toISOString(),
      ],
    })
    .catch(() => undefined);
  return id;
}

/**
 * Run one task. Tries providers in priority order and stops at the first success;
 * a single provider failing must not fail the request while another can answer.
 */
export async function runAiTask(
  input: AiTaskInput,
  opts: { actor?: string | null } = {},
): Promise<AiTaskRun> {
  const rows = await textProviderRows();
  if (rows.length === 0) {
    throw new AiTaskError("unavailable", "কোনো সক্রিয় টেক্সট প্রোভাইডার নেই।", 503);
  }

  const categorySlug = (input.category ?? "national") as CategorySlug;
  const meta = await getCategory(categorySlug).catch(() => null);
  const sourceName = input.sourceName?.trim() || "পাঠকের টিপ";
  const started = Date.now();

  // PII never reaches the model. The redactor is a pure, unit-tested function,
  // and its counts travel with the result so the editor is told when something
  // was removed rather than silently losing it.
  const scrubbed = redactFields({ rawText: input.text });
  const requestText = scrubbed.fields.rawText ?? input.text;

  let lastError: unknown = null;
  for (const row of rows) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI_TASK_TIMEOUT_MS);
    try {
      const provider = buildProvider(row, (keyName) => process.env[keyName] ?? null);
      const parsed = await provider.rewrite(
        {
          rawText: requestText,
          sourceName,
          sourcePageName: input.sourceName?.trim() || meta?.displayNameBn || "হৈচৈ ডেস্ক",
          category: categorySlug,
          categoryConfig: meta?.config ?? DEFAULT_CONFIG,
          categoryNameBn: meta?.displayNameBn ?? input.categoryNameBn,
          categoryDescriptionBn: meta?.descriptionBn,
          temperature: 0.3,
        },
        controller.signal,
      );
      // Scrub anything the model echoed back before it is handed to the editor:
      // after redaction the output may contain a marker where a phone number
      // was, and that is exactly what should reach the editor.
      const rawResult = taskResult(input.task, parsed);
      const result: AiTaskResult = {
        task: rawResult.task,
        title_bn: rawResult.title_bn ? redactFields({ v: rawResult.title_bn }).fields.v : undefined,
        summary_bn: rawResult.summary_bn ? redactFields({ v: rawResult.summary_bn }).fields.v : undefined,
        body_bn: rawResult.body_bn ? redactFields({ v: rawResult.body_bn }).fields.v : undefined,
        safety_flag: rawResult.safety_flag,
      };
      const providerName = row.display_name ?? row.provider_key;
      const ms = Date.now() - started;
      // The ledger write is awaited but never allowed to fail the request: the
      // draft the editor is waiting for matters more than the metrics row.
      const runId = await recordAiTaskRun({
        task: input.task,
        provider: providerName,
        inputChars: input.text.length,
        outputChars: outputCharsOf(result),
        latencyMs: ms,
        ok: true,
        actor: opts.actor ?? null,
      }).catch(() => "");
      return { result, provider: providerName, ms, pii: scrubbed.counts, runId };
    } catch (err) {
      lastError = err;
      // A timeout on one provider should still let the next one try.
    } finally {
      clearTimeout(timer);
    }
  }

  const message = lastError instanceof Error ? lastError.message : "unknown provider failure";
  const timedOut = /abort/i.test(message);
  throw new AiTaskError(
    timedOut ? "timeout" : "provider",
    timedOut ? "সময় শেষ — আবার চেষ্টা করুন।" : "প্রোভাইডার উত্তর দিতে পারেনি।",
    502,
  );
}

export { AI_TASKS, validateTaskInput };
export type { AiTaskInput, AiTaskResult };
