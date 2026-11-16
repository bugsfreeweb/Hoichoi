import {
  AI_TASKS,
  buildProvider,
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
}

/**
 * Run one task. Tries providers in priority order and stops at the first success;
 * a single provider failing must not fail the request while another can answer.
 */
export async function runAiTask(input: AiTaskInput): Promise<AiTaskRun> {
  const rows = await textProviderRows();
  if (rows.length === 0) {
    throw new AiTaskError("unavailable", "কোনো সক্রিয় টেক্সট প্রোভাইডার নেই।", 503);
  }

  const categorySlug = (input.category ?? "national") as CategorySlug;
  const meta = await getCategory(categorySlug).catch(() => null);
  const sourceName = input.sourceName?.trim() || "পাঠকের টিপ";
  const started = Date.now();

  let lastError: unknown = null;
  for (const row of rows) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI_TASK_TIMEOUT_MS);
    try {
      const provider = buildProvider(row, (keyName) => process.env[keyName] ?? null);
      const parsed = await provider.rewrite(
        {
          rawText: input.text,
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
      return {
        result: taskResult(input.task, parsed),
        provider: row.display_name ?? row.provider_key,
        ms: Date.now() - started,
      };
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
