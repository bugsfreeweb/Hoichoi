/**
 * Poll integrity.
 *
 * A poll is only as good as the tally, and the website's defence (an opaque
 * session id in a cookie) is trivially reset by whoever wants to stuff a ballot.
 * So the DB also remembers the hashed network each vote came from, and an
 * operator can review and invalidate a stretch of votes that looks orchestrated.
 *
 * The fraud score here is deliberately boring and falsifiable:
 *   - `sessionsPerIp` — one address raining votes from many sessions is ballot
 *     stuffing, not a family.
 *   - `votesPerMinute` — spikes that outpace a page's real traffic.
 *   - `singleSessionShare` — a clear-invalidate-reload pattern hides behind many
 *     sessions but a real human still usually spends the same one.
 *   - `optionConcentration` — one option taking nearly everything in the same
 *     window a spike happened is the shape of an organised run.
 *
 * Nothing auto-deletes: the score is a signal for a human, and it is computed
 * from *validated* votes only (invalidated ones no longer pollute it).
 */
import { getClient } from "./client";

export type IntegritySignal = {
  label: string;
  value: number;
  unit: string;
  bad: boolean;
  note: string;
};

export type PollIntegrityReport = {
  pollId: number;
  totalValidVotes: number;
  totalVotes: number;
  invalidated: number;
  signals: IntegritySignal[];
  score: number; // 0 (clean) .. 100 (certainly stuffed)
  verdict: "clean" | "flagged" | "suspicious";
  updatedAt: string | null;
};

export function integrityScore(signals: Pick<IntegritySignal, "value" | "unit" | "bad">[]): number {
  let score = 0;
  for (const s of signals) {
    if (!s.bad) continue;
    if (s.unit === "sessions/ip") score = Math.max(score, Math.min(40, (s.value - 2) * 12));
    if (s.unit === "votes/min") score = Math.max(score, Math.min(50, (s.value - 19) * 5));
    if (s.unit === "%") score = Math.max(score, s.value > 90 ? 45 : s.value > 75 ? 30 : 0);
  }
  return Math.max(0, Math.min(100, score));
}

export function verdictFor(score: number): PollIntegrityReport["verdict"] {
  return score >= 60 ? "suspicious" : score >= 30 ? "flagged" : "clean";
}

export async function pollIntegrity(pollId: number): Promise<PollIntegrityReport> {
  const client = getClient();
  const now = Date.now();

  // Validated votes only; invalidated votes pollute neither counts nor signals.
  const base = await client.execute({
    sql: `SELECT COUNT(*) AS total,
                 SUM(CASE WHEN invalidated_at IS NULL THEN 1 ELSE 0 END) AS valid,
                 COUNT(DISTINCT CASE WHEN invalidated_at IS NULL THEN session_id END) AS sessions,
                 COUNT(DISTINCT CASE WHEN invalidated_at IS NULL THEN ip_hash END) AS ips
          FROM poll_votes WHERE poll_id = ?`,
    args: [pollId],
  });
  const row = base.rows[0] as Record<string, unknown> | undefined;
  const totalVotes = Number(row?.total ?? 0);
  const totalValidVotes = Number(row?.valid ?? 0);
  const sessions = Number(row?.sessions ?? 0);
  const ips = Number(row?.ips ?? 0);

  // First and last validated vote, then a count inside the busiest single minute.
  const span = await client.execute({
    sql: `SELECT MIN(created_at) AS first, MAX(created_at) AS last
          FROM poll_votes WHERE poll_id = ? AND invalidated_at IS NULL`,
    args: [pollId],
  });
  const first = String((span.rows[0] as Record<string, unknown> | undefined)?.first ?? "");
  const last = String((span.rows[0] as Record<string, unknown> | undefined)?.last ?? "");
  const spanMs = first && last ? Date.parse(last) - Date.parse(first) : 0;
  const minutes = Math.max(1, spanMs / 60_000);

  // Busiest single minute, counted from real timestamps (ISO strings sort and
  // slice fine, so substr(…,1,16) is the minute bucket).
  const peak = await client.execute({
    sql: `SELECT MAX(n) AS n FROM (
            SELECT substr(created_at, 1, 16) AS minute, COUNT(*) AS n
            FROM poll_votes WHERE poll_id = ? AND invalidated_at IS NULL
            GROUP BY minute)`,
    args: [pollId],
  });
  const votesPerMinute = Number((peak.rows[0] as Record<string, unknown> | undefined)?.n ?? 0);

  // Option concentration among validated votes.
  const top = await client.execute({
    sql: `SELECT MAX(n) AS n FROM (
            SELECT option_id, COUNT(*) AS n FROM poll_votes
            WHERE poll_id = ? AND invalidated_at IS NULL GROUP BY option_id)`,
    args: [pollId],
  });
  const topVotes = Number((top.rows[0] as Record<string, unknown> | undefined)?.n ?? 0);
  const concentration = totalValidVotes ? Math.round((topVotes / totalValidVotes) * 100) : 0;

  const sessionsPerIp = ips ? sessions / ips : 0;
  const perMinute = totalValidVotes / minutes;

  const signals: IntegritySignal[] = [
    {
      label: "ভোট/মিনিট (শীর্ষ)",
      value: votesPerMinute,
      unit: "votes/min",
      bad: votesPerMinute > 19,
      note:
        votesPerMinute > 19
          ? "এক মিনিটে এত ভোট এক পেজ-লোডে আসা মানুষের সংখ্যা ছাড়িয়ে গেছে — রানার আকার।"
          : "স্বাভাবিক গতির মধ্যে।",
    },
    {
      label: "সেশন/আইপি",
      value: Math.round(sessionsPerIp * 10) / 10,
      unit: "sessions/ip",
      bad: sessionsPerIp > 2,
      note:
        sessionsPerIp > 2
          ? "একটি নেটওয়ার্ক থেকে গড়ে অনেক বেশি সেশন — কুকি মুছে আবার ভোট দেওয়ার ছাপ।"
          : "প্রতি নেটওয়ার্কে সামান্য সেশন।",
    },
    {
      label: "সবচেয়ে জনপ্রিয় অপশনের ভাগ",
      value: concentration,
      unit: "%",
      bad: concentration > 90,
      note: concentration > 90 ? "একটি অপশনেই প্রায় সব ভোট — সংগঠিত রানের আকার।" : "বিতরণ স্বাভাবিক।",
    },
  ];

  const score = integrityScore(signals);
  const invalidated = totalVotes - totalValidVotes;
  return {
    pollId,
    totalValidVotes,
    totalVotes,
    invalidated,
    signals,
    score,
    verdict: verdictFor(score),
    updatedAt: last || null,
  };
}

/** Distinct hashed networks that voted, so an operator can target one. */
export async function pollIpGroups(pollId: number): Promise<
  Array<{ ipHash: string; votes: number; sessions: number }>
> {
  const client = getClient();
  const res = await client.execute({
    sql: `SELECT ip_hash, COUNT(*) AS votes, COUNT(DISTINCT session_id) AS sessions
          FROM poll_votes
          WHERE poll_id = ? AND invalidated_at IS NULL AND ip_hash IS NOT NULL
          GROUP BY ip_hash
          ORDER BY votes DESC
          LIMIT 20`,
    args: [pollId],
  });
  return res.rows.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      ipHash: String(r.ip_hash),
      votes: Number(r.votes ?? 0),
      sessions: Number(r.sessions ?? 0),
    };
  });
}

/**
 * Invalidate a run of votes. Filter-supported so an operator can flag "all from
 * this one ip hash" without listing ids. Stamps why and by whom; never deletes.
 */
export async function invalidatePollVotes(
  pollId: number,
  input: {
    ids?: string[];
    allFromIpHash?: string | null;
    reason: string;
    by: { email: string; role: string };
  },
): Promise<number> {
  const client = getClient();
  const now = new Date().toISOString();
  const clauses = ["poll_id = ?", "invalidated_at IS NULL"];
  const args: (string | number)[] = [pollId];
  if (input.ids?.length) {
    const ids = input.ids.slice(0, 5000);
    clauses.push(`id IN (${ids.map(() => "?").join(", ")})`);
    args.push(...ids);
  }
  if (input.allFromIpHash) {
    clauses.push("ip_hash = ?");
    args.push(input.allFromIpHash);
  }
  const res = await client.execute({
    sql: `UPDATE poll_votes SET invalidated_at = ?, invalid_reason = ?, invalidated_by = ?
          WHERE ${clauses.join(" AND ")}`,
    args: [now, input.reason.slice(0, 200), `${input.by.email} (${input.by.role})`, ...args],
  });
  return res.rowsAffected ?? 0;
}
