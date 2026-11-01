import { getClient } from "./client";

export interface Poll {
  id: number;
  slug: string;
  topic: string;
  question: string;
  description: string;
  options: { id: string; label: string }[];
  template: string;
  status: "open" | "closed" | "scheduled";
  featured: boolean;
  topicColor: string;
  startsAt: string;
  endsAt: string | null;
  allowMultiple: boolean;
  resultsMode: "after-vote" | "always" | "after-close";
  impressions: number;
  shares: number;
  createdAt: string;
  updatedAt: string;
}

export function pollResultsVisible(poll: Pick<Poll, "status" | "resultsMode">, hasVoted: boolean): boolean {
  return poll.status === "closed"
    || poll.resultsMode === "always"
    || (poll.resultsMode === "after-vote" && hasVoted);
}

function nowIso() {
  return new Date().toISOString();
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 89);
  return slug.length >= 2 ? slug : `poll-${Date.now().toString(36)}`;
}

function mapPoll(row: Record<string, unknown>): Poll {
  const startsAt = String(row.starts_at || row.created_at);
  const endsAt = row.ends_at ? String(row.ends_at) : null;
  const storedStatus = String(row.status);
  const resultsMode = String(row.results_mode);
  const status = storedStatus === "closed"
    ? "closed"
    : new Date(startsAt).getTime() > Date.now()
      ? "scheduled"
      : endsAt && new Date(endsAt).getTime() <= Date.now()
        ? "closed"
        : "open";
  return {
    id: Number(row.id),
    slug: String(row.slug),
    topic: String(row.topic),
    question: String(row.question),
    description: String(row.description ?? ""),
    options: JSON.parse(String(row.options_json)) as { id: string; label: string }[],
    template: String(row.template),
    status,
    featured: Number(row.featured) === 1,
    topicColor: String(row.topic_color),
    startsAt,
    endsAt,
    allowMultiple: Number(row.allow_multiple) === 1,
    resultsMode: resultsMode === "always" || resultsMode === "after-close" ? resultsMode : "after-vote",
    impressions: Number(row.impressions ?? 0),
    shares: Number(row.shares ?? 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listPolls(): Promise<Poll[]> {
  const client = getClient();
  const res = await client.execute("SELECT * FROM polls ORDER BY featured DESC, updated_at DESC");
  return res.rows.map((row) => mapPoll(row as Record<string, unknown>));
}

export async function getPoll(id: number): Promise<Poll | null> {
  const client = getClient();
  const res = await client.execute({ sql: "SELECT * FROM polls WHERE id = ?", args: [id] });
  const row = res.rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  return mapPoll(row);
}

export async function getPollBySlug(slug: string): Promise<Poll | null> {
  const client = getClient();
  const res = await client.execute({ sql: "SELECT * FROM polls WHERE slug = ?", args: [slug] });
  const row = res.rows[0] as Record<string, unknown> | undefined;
  return row ? mapPoll(row) : null;
}

export async function getFeaturedPoll(): Promise<Poll | null> {
  const client = getClient();
  const res = await client.execute("SELECT * FROM polls WHERE featured = 1 ORDER BY updated_at DESC LIMIT 1");
  const row = res.rows[0] as Record<string, unknown> | undefined;
  if (!row) {
    const fallback = await client.execute("SELECT * FROM polls WHERE status = 'open' ORDER BY updated_at DESC LIMIT 1");
    const r = fallback.rows[0] as Record<string, unknown> | undefined;
    if (!r) return null;
    return mapPoll(r);
  }
  return mapPoll(row);
}
export async function createPoll(input: {
  topic: string;
  question: string;
  description?: string;
  options: string[];
  template?: string;
  topicColor?: string;
  featured?: boolean;
  status?: "open" | "closed" | "scheduled";
  startsAt?: string;
  endsAt?: string | null;
  allowMultiple?: boolean;
  resultsMode?: "after-vote" | "always" | "after-close";
}): Promise<Poll> {
  const client = getClient();
  const now = nowIso();
  const baseSlug = slugify(input.topic || input.question);
  const existing = await client.execute({ sql: "SELECT 1 FROM polls WHERE slug = ?", args: [baseSlug] });
  const slug = existing.rows.length ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;
  const options = input.options
    .map((label) => label.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((label, index) => ({ id: `opt-${index + 1}`, label: label.slice(0, 120) }));
  if (options.length < 2) throw new Error("poll_options");
  await client.execute({
    sql: "INSERT INTO polls (slug, topic, question, description, options_json, template, status, featured, topic_color, starts_at, ends_at, allow_multiple, results_mode, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    args: [
      slug,
      input.topic.slice(0, 120),
      input.question.slice(0, 300),
      (input.description ?? "").slice(0, 1200),
      JSON.stringify(options),
      input.template || "bar",
      input.status ?? "open",
      input.featured ? 1 : 0,
      input.topicColor || "#d2202c",
      input.startsAt || now,
      input.endsAt || null,
      input.allowMultiple ? 1 : 0,
      input.resultsMode ?? "after-vote",
      now,
      now,
    ],
  });
  const res = await client.execute({ sql: "SELECT * FROM polls WHERE slug = ?", args: [slug] });
  const row = res.rows[0] as Record<string, unknown>;
  if (input.featured) {
    await client.execute({ sql: "UPDATE polls SET featured = 0 WHERE id != ?", args: [Number(row.id)] });
  }
  return mapPoll(row);
}

export async function updatePoll(id: number, input: {
  topic: string;
  question: string;
  description: string;
  options: string[];
  template: string;
  topicColor: string;
  status: "open" | "closed" | "scheduled";
  startsAt: string;
  endsAt: string | null;
  allowMultiple: boolean;
  resultsMode: "after-vote" | "always" | "after-close";
}): Promise<void> {
  const client = getClient();
  const current = await getPoll(id);
  if (!current) throw new Error("poll_not_found");
  const options = input.options.map((label, index) => ({
    id: current.options[index]?.id ?? `opt-${index + 1}`,
    label: label.trim().slice(0, 120),
  })).filter((option) => option.label).slice(0, 12);
  if (options.length < 2) throw new Error("poll_options");
  const retainedIds = options.map((option) => option.id);
  await client.execute({
    sql: `DELETE FROM poll_votes WHERE poll_id = ? AND option_id NOT IN (${retainedIds.map(() => "?").join(",")})`,
    args: [id, ...retainedIds],
  });
  await client.execute({
    sql: "UPDATE polls SET topic = ?, question = ?, description = ?, options_json = ?, template = ?, topic_color = ?, status = ?, starts_at = ?, ends_at = ?, allow_multiple = ?, results_mode = ?, updated_at = ? WHERE id = ?",
    args: [
      input.topic.slice(0, 120),
      input.question.slice(0, 300),
      input.description.slice(0, 1200),
      JSON.stringify(options),
      input.template,
      input.topicColor,
      input.status,
      input.startsAt,
      input.endsAt,
      input.allowMultiple ? 1 : 0,
      input.resultsMode,
      nowIso(),
      id,
    ],
  });
}

export async function setPollStatus(id: number, status: "open" | "closed" | "scheduled"): Promise<void> {
  const client = getClient();
  await client.execute({ sql: "UPDATE polls SET status = ?, updated_at = ? WHERE id = ?", args: [status, nowIso(), id] });
}

export async function deletePoll(id: number): Promise<void> {
  const client = getClient();
  await client.execute({ sql: "DELETE FROM poll_votes WHERE poll_id = ?", args: [id] });
  await client.execute({ sql: "DELETE FROM polls WHERE id = ?", args: [id] });
}

export async function setFeaturedPoll(id: number): Promise<void> {
  const client = getClient();
  await client.execute("UPDATE polls SET featured = 0");
  await client.execute({ sql: "UPDATE polls SET featured = 1, updated_at = ? WHERE id = ?", args: [nowIso(), id] });
}

export async function setPollTemplate(id: number, template: string): Promise<void> {
  const client = getClient();
  await client.execute({ sql: "UPDATE polls SET template = ?, updated_at = ? WHERE id = ?", args: [template, nowIso(), id] });
}

export async function resetPollVotes(id: number): Promise<void> {
  const client = getClient();
  await client.execute({ sql: "DELETE FROM poll_votes WHERE poll_id = ?", args: [id] });
}

export async function votePoll(pollId: number, optionId: string, sessionId: string): Promise<void> {
  const client = getClient();
  await client.execute({
    sql: "INSERT OR IGNORE INTO poll_votes (id, poll_id, option_id, session_id, created_at) VALUES (?, ?, ?, ?, ?)",
    args: [crypto.randomUUID(), pollId, optionId, sessionId, nowIso()],
  });
}

export async function getPollVote(pollId: number, sessionId: string): Promise<string | null> {
  const votes = await getPollVotes(pollId, sessionId);
  return votes[0] ?? null;
}

export async function getPollVotes(pollId: number, sessionId: string): Promise<string[]> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT option_id FROM poll_votes WHERE poll_id = ? AND session_id = ?",
    args: [pollId, sessionId],
  });
  return res.rows.map((row) => String(row.option_id));
}

export async function setPollVotes(pollId: number, optionIds: string[], sessionId: string): Promise<void> {
  const client = getClient();
  const transaction = await client.transaction();
  try {
    await transaction.execute({
      sql: "DELETE FROM poll_votes WHERE poll_id = ? AND session_id = ?",
      args: [pollId, sessionId],
    });
    for (const optionId of optionIds) {
      await transaction.execute({
        sql: "INSERT INTO poll_votes (id, poll_id, option_id, session_id, created_at) VALUES (?, ?, ?, ?, ?)",
        args: [crypto.randomUUID(), pollId, optionId, sessionId, nowIso()],
      });
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function getPollResults(pollId: number): Promise<{ optionId: string; votes: number }[]> {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT option_id, COUNT(*) AS n FROM poll_votes WHERE poll_id = ? GROUP BY option_id",
    args: [pollId],
  });
  return res.rows.map((row) => ({ optionId: String(row.option_id), votes: Number(row.n ?? 0) }));
}

export async function getPollVoteCount(pollId: number): Promise<number> {
  const client = getClient();
  const res = await client.execute({ sql: "SELECT COUNT(*) AS n FROM poll_votes WHERE poll_id = ?", args: [pollId] });
  return Number((res.rows[0] as Record<string, unknown>)?.n ?? 0);
}