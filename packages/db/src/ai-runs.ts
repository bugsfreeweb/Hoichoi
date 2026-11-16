import { getClient } from "./client";

/**
 * AI run ledger readers.
 *
 * The gateway writes one row per call (`apps/web/src/lib/ai-task.ts`); this reads
 * them back so an operator can see what the desk's AI actually cost in time and
 * how it failed — instead of inferring it from a bill.
 */

export interface AiTaskRunRow {
  id: string;
  task: string;
  provider: string;
  model: string | null;
  inputChars: number;
  outputChars: number;
  latencyMs: number;
  ok: boolean;
  errorKind: string | null;
  actor: string | null;
  createdAt: string;
}

export async function listAiTaskRuns(limit = 20): Promise<AiTaskRunRow[]> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT * FROM ai_task_runs ORDER BY created_at DESC LIMIT ?",
    args: [limit],
  });
  return res.rows.map((row) => ({
    id: String(row.id),
    task: String(row.task),
    provider: String(row.provider),
    model: row.model ? String(row.model) : null,
    inputChars: Number(row.input_chars ?? 0),
    outputChars: Number(row.output_chars ?? 0),
    latencyMs: Number(row.latency_ms ?? 0),
    ok: Number(row.ok ?? 0) === 1,
    errorKind: row.error_kind ? String(row.error_kind) : null,
    actor: row.actor ? String(row.actor) : null,
    createdAt: String(row.created_at),
  }));
}

export interface AiTaskSummary {
  calls: number;
  failures: number;
  totalChars: number;
  medianMs: number;
  lastAt: string | null;
}

/** Per-task totals over the last `days` days — the honest "is it working" view. */
export async function aiTaskSummary(task?: string, days = 30): Promise<AiTaskSummary> {
  const client = getClient();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const res = await client.execute({
    sql: task
      ? "SELECT ok, input_chars, latency_ms, created_at FROM ai_task_runs WHERE created_at >= ? AND task = ?"
      : "SELECT ok, input_chars, latency_ms, created_at FROM ai_task_runs WHERE created_at >= ?",
    args: task ? [since, task] : [since],
  });
  const rows = res.rows as Array<Record<string, unknown>>;
  const latencies = rows.map((r) => Number(r.latency_ms ?? 0)).sort((a, b) => a - b);
  const mid = latencies.length === 0 ? 0 : latencies[Math.floor(latencies.length / 2)] ?? 0;
  return {
    calls: rows.length,
    failures: rows.filter((r) => Number(r.ok ?? 0) !== 1).length,
    totalChars: rows.reduce((sum, r) => sum + Number(r.input_chars ?? 0), 0),
    medianMs: mid,
    lastAt: rows.length > 0 ? String(rows.reduce((a, b) => (String(a.created_at) > String(b.created_at) ? a : b)).created_at) : null,
  };
}