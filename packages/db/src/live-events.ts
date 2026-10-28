import { randomUUID } from "node:crypto";
import type { InValue } from "@libsql/client";
import { ensureLiveEventTables, getClient, nowIso, withTx } from "./client";

export type LiveThemeKey = "stage" | "broadsheet" | "scoreboard" | "timeline" | "compact" | "studio";
export type LiveEventStatus = "scheduled" | "live" | "ended";
export type LiveReactionKind = "like" | "love" | "clap" | "wow" | "sad" | "angry";
export type LiveUpdateKind = "update" | "key" | "breaking" | "quote" | "stat";
export type LiveStreamType = "youtube" | "hls" | "iframe" | "mp4";

export interface LiveStream {
  label: string;
  type: LiveStreamType;
  url: string;
}

export interface LiveScoreItem {
  label: string;
  value: number;
  display?: string;
  sub?: string;
  color?: string;
}

export interface LiveScoreboard {
  kind: "match" | "election" | "metrics";
  title: string;
  note?: string;
  progress?: number;
  items: LiveScoreItem[];
  meta?: { label: string; value: string }[];
}

export interface LiveEventRecord {
  id: string;
  slug: string;
  title: string;
  kicker: string;
  summary: string;
  category: string;
  categoryColor: string;
  location: string;
  status: LiveEventStatus;
  streamType: LiveStreamType;
  streamUrl: string;
  streams: LiveStream[];
  coverImage: string;
  template: LiveThemeKey | "auto";
  scoreboard: LiveScoreboard | null;
  keyPoints: string[];
  featured: boolean;
  commentsEnabled: boolean;
  reactionsEnabled: boolean;
  pollsEnabled: boolean;
  qaEnabled: boolean;
  showViewerCount: boolean;
  moderation: "pre" | "post";
  slowMode: number;
  startsAt: string;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LiveEventInput extends Omit<LiveEventRecord, "id" | "createdAt" | "updatedAt" | "endedAt"> {
  id?: string;
  endedAt?: string | null;
}

export interface LiveUpdate {
  id: string;
  kind: LiveUpdateKind;
  title: string;
  body: string;
  author: string;
  mediaUrl: string;
  pinned: boolean;
  createdAt: string;
}

export interface LiveComment {
  id: string;
  name: string;
  body: string;
  pinned: boolean;
  likes: number;
  status: "approved" | "pending" | "rejected";
  createdAt: string;
  mine: boolean;
  liked: boolean;
}

export interface LivePoll {
  id: string;
  question: string;
  status: "open" | "closed";
  options: { id: string; label: string; votes: number }[];
  total: number;
  myVote: string | null;
}

export interface LiveQuestion {
  id: string;
  name: string;
  body: string;
  status: "pending" | "approved" | "answered" | "hidden";
  answer: string;
  upvotes: number;
  createdAt: string;
  mine: boolean;
  voted: boolean;
}

export interface LiveEventFeed {
  event: LiveEventRecord;
  updates: LiveUpdate[];
  comments: LiveComment[];
  reactions: Record<LiveReactionKind, number>;
  poll: LivePoll | null;
  questions: LiveQuestion[];
  viewers: number;
  peakViewers: number;
  totals: { comments: number; reactions: number; votes: number; shares: number; updates: number };
  refreshSeconds: number;
  floatingPlayer: boolean;
  serverTime: string;
}

export interface LiveEventCard extends Omit<LiveEventRecord, "scoreboard" | "keyPoints" | "streams"> {
  viewers: number;
  updates: number;
  lastUpdate: string | null;
}

let schemaPromise: Promise<void> | null = null;

async function ready(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = ensureLiveEventTables(getClient()).catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
}

function rowValue(row: Record<string, unknown>, key: string, fallback = ""): string {
  const value = row[key];
  return value == null ? fallback : String(value);
}

function jsonValue<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function yes(value: unknown): boolean {
  return Number(value) === 1 || value === true;
}

function mapEvent(row: Record<string, unknown>): LiveEventRecord {
  const allowedThemes: LiveThemeKey[] = ["stage", "broadsheet", "scoreboard", "timeline", "compact", "studio"];
  const theme = rowValue(row, "template", "auto");
  return {
    id: rowValue(row, "id"),
    slug: rowValue(row, "slug"),
    title: rowValue(row, "title"),
    kicker: rowValue(row, "kicker", "লাইভ"),
    summary: rowValue(row, "summary"),
    category: rowValue(row, "category", "জাতীয়"),
    categoryColor: rowValue(row, "category_color", "#d2202c"),
    location: rowValue(row, "location"),
    status: (["live", "ended"].includes(rowValue(row, "status")) ? rowValue(row, "status") : "scheduled") as LiveEventStatus,
    streamType: (["hls", "iframe", "mp4"].includes(rowValue(row, "stream_type")) ? rowValue(row, "stream_type") : "youtube") as LiveStreamType,
    streamUrl: rowValue(row, "stream_url"),
    streams: jsonValue<LiveStream[]>(row.streams_json, []),
    coverImage: rowValue(row, "cover_image"),
    template: allowedThemes.includes(theme as LiveThemeKey) ? (theme as LiveThemeKey) : "auto",
    scoreboard: jsonValue<LiveScoreboard | null>(row.scoreboard_json, null),
    keyPoints: jsonValue<string[]>(row.key_points_json, []),
    featured: yes(row.featured),
    commentsEnabled: yes(row.comments_enabled),
    reactionsEnabled: yes(row.reactions_enabled),
    pollsEnabled: yes(row.polls_enabled),
    qaEnabled: yes(row.qa_enabled),
    showViewerCount: yes(row.show_viewer_count),
    moderation: rowValue(row, "moderation") === "pre" ? "pre" : "post",
    slowMode: Math.max(0, Number(row.slow_mode ?? 0)),
    startsAt: rowValue(row, "starts_at"),
    endedAt: rowValue(row, "ended_at") || null,
    createdAt: rowValue(row, "created_at"),
    updatedAt: rowValue(row, "updated_at"),
  };
}

function mapUpdate(row: Record<string, unknown>): LiveUpdate {
  return {
    id: rowValue(row, "id"),
    kind: rowValue(row, "kind", "update") as LiveUpdateKind,
    title: rowValue(row, "title"),
    body: rowValue(row, "body"),
    author: rowValue(row, "author", "হৈচৈ ডেস্ক"),
    mediaUrl: rowValue(row, "media_url"),
    pinned: yes(row.pinned),
    createdAt: rowValue(row, "created_at"),
  };
}

async function getEvent(sql: string, args: InValue[]): Promise<LiveEventRecord | null> {
  await ready();
  const result = await getClient().execute({ sql, args });
  const row = result.rows[0] as Record<string, unknown> | undefined;
  return row ? mapEvent(row) : null;
}

export async function getLiveEventBySlug(slug: string): Promise<LiveEventRecord | null> {
  return getEvent("SELECT * FROM live_events WHERE slug = ? LIMIT 1", [slug]);
}

export async function getLiveEventById(id: string): Promise<LiveEventRecord | null> {
  return getEvent("SELECT * FROM live_events WHERE id = ? LIMIT 1", [id]);
}

export async function listLiveEvents(): Promise<LiveEventRecord[]> {
  await ready();
  const result = await getClient().execute(
    "SELECT * FROM live_events ORDER BY CASE status WHEN 'live' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END, featured DESC, starts_at DESC",
  );
  return result.rows.map((row) => mapEvent(row as Record<string, unknown>));
}

export async function getLiveEventCards(): Promise<LiveEventCard[]> {
  const events = await listLiveEvents();
  if (!events.length) return [];
  const client = getClient();
  const result = await client.execute({
    sql: `SELECT event_id, COUNT(*) AS updates, MAX(created_at) AS last_update
          FROM live_updates WHERE event_id IN (${events.map(() => "?").join(",")}) GROUP BY event_id`,
    args: events.map((event) => event.id),
  });
  const updateMap = new Map(
    result.rows.map((row) => [
      String((row as Record<string, unknown>).event_id),
      {
        count: Number((row as Record<string, unknown>).updates ?? 0),
        last: (row as Record<string, unknown>).last_update as string | null,
      },
    ]),
  );
  const viewers = await Promise.all(events.map((event) => countLiveViewers(event.id)));
  return events.map((event, index) => {
    const update = updateMap.get(event.id);
    const { scoreboard: _scoreboard, keyPoints: _keyPoints, streams: _streams, ...rest } = event;
    return {
      ...rest,
      viewers: viewers[index] ?? 0,
      updates: update?.count ?? 0,
      lastUpdate: update?.last ?? null,
    };
  });
}

async function countLiveViewers(eventId: string): Promise<number> {
  await ready();
  const result = await getClient().execute({
    sql: "SELECT COUNT(*) AS n FROM live_viewers WHERE event_id = ? AND last_seen >= ?",
    args: [eventId, new Date(Date.now() - 60_000).toISOString()],
  });
  return Number((result.rows[0] as Record<string, unknown> | undefined)?.n ?? 0);
}

function emptyReactions(): Record<LiveReactionKind, number> {
  return { like: 0, love: 0, clap: 0, wow: 0, sad: 0, angry: 0 };
}

export async function getLiveEventFeed(
  slug: string,
  sessionId = "",
  options: { refreshSeconds?: number; floatingPlayer?: boolean } = {},
): Promise<LiveEventFeed | null> {
  const event = await getLiveEventBySlug(slug);
  if (!event) return null;
  await ready();
  const client = getClient();
  const [updatesRes, commentsRes, reactionsRes, pollRes, questionsRes, viewers, peakRes, totalRes] = await Promise.all([
    client.execute({ sql: "SELECT * FROM live_updates WHERE event_id = ? ORDER BY pinned DESC, created_at DESC LIMIT 100", args: [event.id] }),
    client.execute({
      sql: `SELECT c.*, EXISTS(SELECT 1 FROM live_engagement_votes v WHERE v.target_type = 'comment' AND v.target_id = c.id AND v.session_id = ?) AS liked
            FROM live_comments c WHERE c.event_id = ? AND (c.status = 'approved' OR c.pinned = 1 OR (? <> '' AND c.session_id = ?))
            ORDER BY c.pinned DESC, c.created_at DESC LIMIT 100`,
      args: [sessionId, event.id, sessionId, sessionId],
    }),
    client.execute({ sql: "SELECT kind, COUNT(*) AS n FROM live_reactions WHERE event_id = ? GROUP BY kind", args: [event.id] }),
    event.pollsEnabled
      ? client.execute({ sql: "SELECT * FROM live_polls WHERE event_id = ? ORDER BY created_at DESC LIMIT 1", args: [event.id] })
      : Promise.resolve({ rows: [] }),
    client.execute({
      sql: `SELECT q.*, EXISTS(SELECT 1 FROM live_engagement_votes v WHERE v.target_type = 'question' AND v.target_id = q.id AND v.session_id = ?) AS voted
            FROM live_questions q WHERE q.event_id = ? AND (q.status IN ('approved','answered') OR (? <> '' AND q.session_id = ?))
            ORDER BY q.status = 'answered' DESC, q.upvotes DESC, q.created_at DESC LIMIT 100`,
      args: [sessionId, event.id, sessionId, sessionId],
    }),
    countLiveViewers(event.id),
    client.execute({
      sql: "SELECT COALESCE(MAX(viewers), 0) AS n FROM (SELECT COUNT(*) AS viewers FROM live_viewers WHERE event_id = ? GROUP BY substr(last_seen, 1, 16))",
      args: [event.id],
    }),
    client.execute({
      sql: `SELECT
            (SELECT COUNT(*) FROM live_comments WHERE event_id = ? AND status = 'approved') AS comments,
            (SELECT COUNT(*) FROM live_reactions WHERE event_id = ?) AS reactions,
            (SELECT COUNT(*) FROM live_poll_votes v JOIN live_polls p ON p.id = v.poll_id WHERE p.event_id = ?) AS votes,
            (SELECT COUNT(*) FROM live_updates WHERE event_id = ?) AS updates,
            (SELECT COUNT(*) FROM live_event_activity WHERE event_id = ? AND kind = 'share') AS shares`,
      args: [event.id, event.id, event.id, event.id, event.id],
    }),
  ]);
  const reactions = emptyReactions();
  for (const row of reactionsRes.rows as Record<string, unknown>[]) {
    const kind = String(row.kind);
    if (kind in reactions) reactions[kind as LiveReactionKind] = Number(row.n);
  }

  const pollRow = pollRes.rows[0] as Record<string, unknown> | undefined;
  let poll: LivePoll | null = null;
  if (pollRow) {
    const id = String(pollRow.id);
    const options = jsonValue<Array<{ id: string; label: string }>>(pollRow.options_json, []);
    const votesRes = await client.execute({
      sql: "SELECT option_id, COUNT(*) AS n FROM live_poll_votes WHERE poll_id = ? GROUP BY option_id",
      args: [id],
    });
    const votes = new Map(votesRes.rows.map((row) => [String((row as Record<string, unknown>).option_id), Number((row as Record<string, unknown>).n)]));
    const myVoteRes = sessionId
      ? await client.execute({ sql: "SELECT option_id FROM live_poll_votes WHERE poll_id = ? AND session_id = ? LIMIT 1", args: [id, sessionId] })
      : { rows: [] };
    poll = {
      id,
      question: String(pollRow.question),
      status: String(pollRow.status) === "open" ? "open" : "closed",
      options: options.map((option) => ({ ...option, votes: votes.get(option.id) ?? 0 })),
      total: [...votes.values()].reduce((sum, n) => sum + n, 0),
      myVote: myVoteRes.rows[0] ? String((myVoteRes.rows[0] as Record<string, unknown>).option_id) : null,
    };
  }

  const totals = totalRes.rows[0] as Record<string, unknown> | undefined;
  return {
    event,
    updates: updatesRes.rows.map((row) => mapUpdate(row as Record<string, unknown>)),
    comments: commentsRes.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      body: String(row.body),
      pinned: yes(row.pinned),
      likes: Number(row.likes ?? 0),
      status: String(row.status) as LiveComment["status"],
      createdAt: String(row.created_at),
      mine: sessionId !== "" && String(row.session_id) === sessionId,
      liked: yes(row.liked),
    })),
    reactions,
    poll,
    questions: questionsRes.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      body: String(row.body),
      status: String(row.status) as LiveQuestion["status"],
      answer: String(row.answer ?? ""),
      upvotes: Number(row.upvotes ?? 0),
      createdAt: String(row.created_at),
      mine: sessionId !== "" && String(row.session_id) === sessionId,
      voted: yes(row.voted),
    })),
    viewers,
    peakViewers: Number((peakRes.rows[0] as Record<string, unknown> | undefined)?.n ?? 0),
    totals: {
      comments: Number(totals?.comments ?? 0),
      reactions: Number(totals?.reactions ?? 0),
      votes: Number(totals?.votes ?? 0),
      shares: Number(totals?.shares ?? 0),
      updates: Number(totals?.updates ?? 0),
    },
    refreshSeconds: Math.min(60, Math.max(4, Math.trunc(options.refreshSeconds ?? 8))),
    floatingPlayer: options.floatingPlayer ?? true,
    serverTime: nowIso(),
  };
}

export async function recordLiveViewer(eventId: string, sessionId: string): Promise<void> {
  await ready();
  const now = nowIso();
  await getClient().execute({
    sql: `INSERT INTO live_viewers (id, event_id, session_id, first_seen, last_seen) VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(event_id, session_id) DO UPDATE SET last_seen = excluded.last_seen`,
    args: [randomUUID(), eventId, sessionId, now, now],
  });
}

export async function recordLiveEventActivity(
  eventId: string,
  sessionId: string,
  kind: "share" | "play",
  label = "",
): Promise<void> {
  await ready();
  await getClient().execute({
    sql: "INSERT INTO live_event_activity (id, event_id, session_id, kind, label, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    args: [randomUUID(), eventId, sessionId, kind, label.slice(0, 100), nowIso()],
  });
}

export async function createLiveEvent(input: LiveEventInput): Promise<LiveEventRecord> {
  await ready();
  const now = nowIso();
  const id = input.id || randomUUID();
  const client = getClient();
  await client.execute({
    sql: `INSERT INTO live_events (
      id, slug, title, kicker, summary, category, category_color, location, status,
      stream_type, stream_url, streams_json, cover_image, template, scoreboard_json,
      key_points_json, featured, comments_enabled, reactions_enabled, polls_enabled,
      qa_enabled, show_viewer_count, moderation, slow_mode, starts_at, ended_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      slug=excluded.slug, title=excluded.title, kicker=excluded.kicker, summary=excluded.summary,
      category=excluded.category, category_color=excluded.category_color, location=excluded.location,
      status=excluded.status, stream_type=excluded.stream_type, stream_url=excluded.stream_url,
      streams_json=excluded.streams_json, cover_image=excluded.cover_image, template=excluded.template,
      scoreboard_json=excluded.scoreboard_json, key_points_json=excluded.key_points_json,
      featured=excluded.featured, comments_enabled=excluded.comments_enabled,
      reactions_enabled=excluded.reactions_enabled, polls_enabled=excluded.polls_enabled,
      qa_enabled=excluded.qa_enabled, show_viewer_count=excluded.show_viewer_count,
      moderation=excluded.moderation, slow_mode=excluded.slow_mode, starts_at=excluded.starts_at,
      ended_at=excluded.ended_at, updated_at=excluded.updated_at`,
    args: [
      id, input.slug, input.title, input.kicker, input.summary, input.category, input.categoryColor,
      input.location, input.status, input.streamType, input.streamUrl, JSON.stringify(input.streams),
      input.coverImage, input.template, input.scoreboard ? JSON.stringify(input.scoreboard) : null,
      JSON.stringify(input.keyPoints), Number(input.featured), Number(input.commentsEnabled),
      Number(input.reactionsEnabled), Number(input.pollsEnabled), Number(input.qaEnabled),
      Number(input.showViewerCount), input.moderation, input.slowMode, input.startsAt,
      input.endedAt ?? null, now, now,
    ],
  });
  const event = await getLiveEventById(id);
  if (!event) throw new Error("Live event save failed");
  return event;
}

export async function setLiveEventStatus(id: string, status: LiveEventStatus): Promise<void> {
  await ready();
  const now = nowIso();
  await getClient().execute({
    sql: "UPDATE live_events SET status = ?, ended_at = ?, updated_at = ? WHERE id = ?",
    args: [status, status === "ended" ? now : null, now, id],
  });
}

export async function deleteLiveEvent(id: string): Promise<void> {
  await ready();
  await getClient().execute({ sql: "DELETE FROM live_events WHERE id = ?", args: [id] });
}

export async function setFeaturedLiveEvent(id: string | null): Promise<void> {
  await ready();
  await withTx(async (tx) => {
    await tx.execute({ sql: "UPDATE live_events SET featured = 0, updated_at = ?", args: [nowIso()] });
    if (id) await tx.execute({ sql: "UPDATE live_events SET featured = 1, updated_at = ? WHERE id = ?", args: [nowIso(), id] });
  });
}

export async function addLiveUpdate(input: {
  eventId: string;
  kind: LiveUpdateKind;
  title: string;
  body: string;
  author: string;
  mediaUrl: string;
}): Promise<void> {
  await ready();
  await getClient().execute({
    sql: "INSERT INTO live_updates (id, event_id, kind, title, body, author, media_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    args: [randomUUID(), input.eventId, input.kind, input.title, input.body, input.author, input.mediaUrl, nowIso()],
  });
}

export async function updateLiveUpdate(id: string, changes: { pinned?: boolean; delete?: boolean }): Promise<void> {
  await ready();
  if (changes.delete) {
    await getClient().execute({ sql: "DELETE FROM live_updates WHERE id = ?", args: [id] });
  } else if (changes.pinned !== undefined) {
    await getClient().execute({ sql: "UPDATE live_updates SET pinned = ? WHERE id = ?", args: [Number(changes.pinned), id] });
  }
}

export async function moderateLiveComment(id: string, status: LiveComment["status"], pinned?: boolean): Promise<void> {
  await ready();
  if (pinned !== undefined) {
    await getClient().execute({ sql: "UPDATE live_comments SET pinned = ? WHERE id = ?", args: [Number(pinned), id] });
  } else {
    await getClient().execute({ sql: "UPDATE live_comments SET status = ? WHERE id = ?", args: [status, id] });
  }
}

export async function moderateAllCleanLiveComments(eventId: string): Promise<void> {
  await ready();
  await getClient().execute({
    sql: "UPDATE live_comments SET status = 'approved' WHERE event_id = ? AND status = 'pending' AND flagged = 0",
    args: [eventId],
  });
}

export async function createLivePoll(eventId: string, question: string, options: { id: string; label: string }[]): Promise<void> {
  await ready();
  await getClient().execute({
    sql: "INSERT INTO live_polls (id, event_id, question, options_json, status, created_at) VALUES (?, ?, ?, ?, 'open', ?)",
    args: [randomUUID(), eventId, question, JSON.stringify(options), nowIso()],
  });
}

export async function setLivePollStatus(id: string, status: "open" | "closed"): Promise<void> {
  await ready();
  await getClient().execute({ sql: "UPDATE live_polls SET status = ? WHERE id = ?", args: [status, id] });
}

export async function moderateLiveQuestion(
  id: string,
  status: LiveQuestion["status"],
  answer?: string,
): Promise<void> {
  await ready();
  if (answer !== undefined) {
    await getClient().execute({
      sql: "UPDATE live_questions SET status = 'answered', answer = ? WHERE id = ?",
      args: [answer, id],
    });
  } else {
    await getClient().execute({ sql: "UPDATE live_questions SET status = ? WHERE id = ?", args: [status, id] });
  }
}

export async function saveLiveScoreboard(eventId: string, scoreboard: LiveScoreboard | null, keyPoints: string[]): Promise<void> {
  await ready();
  await getClient().execute({
    sql: "UPDATE live_events SET scoreboard_json = ?, key_points_json = ?, updated_at = ? WHERE id = ?",
    args: [scoreboard ? JSON.stringify(scoreboard) : null, JSON.stringify(keyPoints), nowIso(), eventId],
  });
}

export async function getLiveEventAdmin(id: string) {
  const event = await getLiveEventById(id);
  if (!event) return null;
  await ready();
  const client = getClient();
  const [updates, comments, questions, polls] = await Promise.all([
    client.execute({ sql: "SELECT * FROM live_updates WHERE event_id = ? ORDER BY created_at DESC LIMIT 100", args: [id] }),
    client.execute({ sql: "SELECT * FROM live_comments WHERE event_id = ? ORDER BY pinned DESC, created_at DESC LIMIT 300", args: [id] }),
    client.execute({ sql: "SELECT * FROM live_questions WHERE event_id = ? ORDER BY created_at DESC LIMIT 200", args: [id] }),
    client.execute({ sql: "SELECT * FROM live_polls WHERE event_id = ? ORDER BY created_at DESC LIMIT 50", args: [id] }),
  ]);
  return {
    event,
    updates: updates.rows.map((row) => mapUpdate(row as Record<string, unknown>)),
    comments: comments.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      body: String(row.body),
      pinned: yes(row.pinned),
      likes: Number(row.likes ?? 0),
      status: String(row.status) as LiveComment["status"],
      createdAt: String(row.created_at),
      mine: false,
      liked: false,
    })),
    questions: questions.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      body: String(row.body),
      status: String(row.status) as LiveQuestion["status"],
      answer: String(row.answer ?? ""),
      upvotes: Number(row.upvotes ?? 0),
      createdAt: String(row.created_at),
      mine: false,
      voted: false,
    })),
    polls: polls.rows.map((row) => ({
      id: String(row.id),
      question: String(row.question),
      status: String(row.status) as "open" | "closed",
      options: jsonValue<Array<{ id: string; label: string }>>(row.options_json, []),
      createdAt: String(row.created_at),
    })),
  };
}

async function hasLiveVote(
  type: "comment" | "question",
  eventId: string,
  targetId: string,
  sessionId: string,
): Promise<boolean> {
  await ready();
  const target = type === "comment"
    ? await getClient().execute({
      sql: "SELECT id FROM live_comments WHERE id = ? AND event_id = ? AND status = 'approved' LIMIT 1",
      args: [targetId, eventId],
    })
    : await getClient().execute({
      sql: "SELECT id FROM live_questions WHERE id = ? AND event_id = ? AND status IN ('approved','answered') LIMIT 1",
      args: [targetId, eventId],
    });
  if (!target.rows.length) return false;
  const result = await getClient().execute({
    sql: "INSERT OR IGNORE INTO live_engagement_votes (id, target_type, target_id, session_id, created_at) VALUES (?, ?, ?, ?, ?)",
    args: [randomUUID(), type, targetId, sessionId, nowIso()],
  });
  return result.rowsAffected > 0;
}

export async function recordLiveReaction(event: LiveEventRecord, sessionId: string, kind: LiveReactionKind): Promise<void> {
  if (!event.reactionsEnabled) throw new Error("disabled");
  await ready();
  await getClient().execute({
    sql: "INSERT OR IGNORE INTO live_reactions (id, event_id, session_id, kind, created_at) VALUES (?, ?, ?, ?, ?)",
    args: [randomUUID(), event.id, sessionId, kind, nowIso()],
  });
}

export async function submitLiveComment(
  event: LiveEventRecord,
  sessionId: string,
  name: string,
  body: string,
  options: { autoModeration: boolean; bannedWords: string[] },
): Promise<"approved" | "pending"> {
  if (!event.commentsEnabled) throw new Error("disabled");
  await ready();
  const lower = body.toLocaleLowerCase();
  const flagged = options.bannedWords.some((word) => word && lower.includes(word.toLocaleLowerCase()));
  const status = event.moderation === "pre" || (options.autoModeration && flagged) ? "pending" : "approved";
  if (event.slowMode > 0) {
    const recent = await getClient().execute({
      sql: "SELECT created_at FROM live_comments WHERE event_id = ? AND session_id = ? ORDER BY created_at DESC LIMIT 1",
      args: [event.id, sessionId],
    });
    const createdAt = (recent.rows[0] as Record<string, unknown> | undefined)?.created_at;
    if (createdAt && Date.now() - new Date(String(createdAt)).getTime() < event.slowMode * 1000) {
      throw new Error("too_fast");
    }
  }
  await getClient().execute({
    sql: "INSERT INTO live_comments (id, event_id, session_id, name, body, status, flagged, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    args: [randomUUID(), event.id, sessionId, name, body, status, Number(flagged), nowIso()],
  });
  return status;
}

export async function likeLiveComment(eventId: string, id: string, sessionId: string): Promise<void> {
  if (await hasLiveVote("comment", eventId, id, sessionId)) {
    await getClient().execute({
      sql: "UPDATE live_comments SET likes = likes + 1 WHERE id = ? AND event_id = ? AND status = 'approved'",
      args: [id, eventId],
    });
  }
}

export async function submitLiveQuestion(event: LiveEventRecord, sessionId: string, name: string, body: string): Promise<void> {
  if (!event.qaEnabled) throw new Error("disabled");
  await ready();
  await getClient().execute({
    sql: "INSERT INTO live_questions (id, event_id, session_id, name, body, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?)",
    args: [randomUUID(), event.id, sessionId, name, body, nowIso()],
  });
}

export async function upvoteLiveQuestion(eventId: string, id: string, sessionId: string): Promise<void> {
  if (await hasLiveVote("question", eventId, id, sessionId)) {
    await getClient().execute({
      sql: "UPDATE live_questions SET upvotes = upvotes + 1 WHERE id = ? AND event_id = ? AND status IN ('approved','answered')",
      args: [id, eventId],
    });
  }
}

export async function voteLivePoll(eventId: string, pollId: string, optionId: string, sessionId: string): Promise<void> {
  await ready();
  const poll = await getClient().execute({
    sql: "SELECT options_json, status FROM live_polls WHERE id = ? AND event_id = ? LIMIT 1",
    args: [pollId, eventId],
  });
  const row = poll.rows[0] as Record<string, unknown> | undefined;
  if (!row) throw new Error("poll_not_found");
  if (String(row.status) !== "open") throw new Error("disabled");
  const options = jsonValue<Array<{ id: string }>>(row.options_json, []);
  if (!options.some((option) => option.id === optionId)) throw new Error("bad_option");
  const result = await getClient().execute({
    sql: "INSERT OR IGNORE INTO live_poll_votes (id, poll_id, option_id, session_id, created_at) VALUES (?, ?, ?, ?, ?)",
    args: [randomUUID(), pollId, optionId, sessionId, nowIso()],
  });
  if (result.rowsAffected === 0) throw new Error("already_voted");
}
