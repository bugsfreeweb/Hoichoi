import { getClient } from "./client";

export interface Poll {
  id: number;
  slug: string;
  topic: string;
  question: string;
  options: { id: string; label: string }[];
  template: string;
  status: "open" | "closed";
  featured: boolean;
  topicColor: string;
  createdAt: string;
  updatedAt: string;
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

export async function listPolls(): Promise<Poll[]> {
  const client = getClient();
  const res = await client.execute("SELECT * FROM polls ORDER BY featured DESC, updated_at DESC");
  return res.rows.map((row) => ({
    id: Number(row.id),
    slug: String(row.slug),
    topic: String(row.topic),
    question: String(row.question),
    options: JSON.parse(String(row.options_json)) as { id: string; label: string }[],
    template: String(row.template),
    status: String(row.status) === "open" ? "open" : "closed",
    featured: Number(row.featured) === 1,
    topicColor: String(row.topic_color),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

export async function getPoll(id: number): Promise<Poll | null> {
  const client = getClient();
  const res = await client.execute({ sql: "SELECT * FROM polls WHERE id = ?", args: [id] });
  const row = res.rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: Number(row.id),
    slug: String(row.slug),
    topic: String(row.topic),
    question: String(row.question),
    options: JSON.parse(String(row.options_json)) as { id: string; label: string }[],
    template: String(row.template),
    status: String(row.status) === "open" ? "open" : "closed",
    featured: Number(row.featured) === 1,
    topicColor: String(row.topic_color),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function getFeaturedPoll(): Promise<Poll | null> {
  const client = getClient();
  const res = await client.execute("SELECT * FROM polls WHERE featured = 1 ORDER BY updated_at DESC LIMIT 1");
  const row = res.rows[0] as Record<string, unknown> | undefined;
  if (!row) {
    const fallback = await client.execute("SELECT * FROM polls WHERE status = 'open' ORDER BY updated_at DESC LIMIT 1");
    const r = fallback.rows[0] as Record<string, unknown> | undefined;
    if (!r) return null;
    return {
      id: Number(r.id),
      slug: String(r.slug),
      topic: String(r.topic),
      question: String(r.question),
      options: JSON.parse(String(r.options_json)) as { id: string; label: string }[],
      template: String(r.template),
      status: String(r.status) === "open" ? "open" : "closed",
      featured: Number(r.featured) === 1,
      topicColor: String(r.topic_color),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    };
  }
  return {
    id: Number(row.id),
    slug: String(row.slug),
    topic: String(row.topic),
    question: String(row.question),
    options: JSON.parse(String(row.options_json)) as { id: string; label: string }[],
    template: String(row.template),
    status: String(row.status) === "open" ? "open" : "closed",
    featured: Number(row.featured) === 1,
    topicColor: String(row.topic_color),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
export async function createPoll(input: {
  topic: string;
  question: string;
  options: string[];
  template?: string;
  topicColor?: string;
  featured?: boolean;
}): Promise<Poll> {
  const client = getClient();
  const slug = slugify(input.topic || input.question);
  const now = nowIso();
  const options = input.options
    .map((label) => label.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((label, index) => ({ id: `opt-${index + 1}`, label: label.slice(0, 120) }));
  if (options.length < 2) throw new Error("poll_options");
  await client.execute({
    sql: "INSERT INTO polls (slug, topic, question, options_json, template, status, featured, topic_color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?)",
    args: [
      slug,
      input.topic.slice(0, 120),
      input.question.slice(0, 300),
      JSON.stringify(options),
      input.template || "bar",
      input.featured ? 1 : 0,
      input.topicColor || "#d2202c",
      now,
      now,
    ],
  });
  const res = await client.execute({ sql: "SELECT * FROM polls WHERE slug = ?", args: [slug] });
  const row = res.rows[0] as Record<string, unknown>;
  return {
    id: Number(row.id),
    slug: String(row.slug),
    topic: String(row.topic),
    question: String(row.question),
    options: JSON.parse(String(row.options_json)) as { id: string; label: string }[],
    template: String(row.template),
    status: "open",
    featured: Number(row.featured) === 1,
    topicColor: String(row.topic_color),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function setPollStatus(id: number, status: "open" | "closed"): Promise<void> {
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