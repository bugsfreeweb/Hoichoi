import { NextResponse, type NextRequest } from "next/server";
import {
  getLiveEventBySlug,
  getLiveEventFeed,
  likeLiveComment,
  recordLiveEventActivity,
  recordLiveReaction,
  recordLiveViewer,
  submitLiveComment,
  submitLiveQuestion,
  upvoteLiveQuestion,
  voteLivePoll,
  parseAppConfig,
  type LiveReactionKind,
} from "@hoichoi/db";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };
type LiveAction =
  | "heartbeat"
  | "react"
  | "comment"
  | "like"
  | "vote"
  | "question"
  | "upvote"
  | "share"
  | "play";

const REACTIONS: LiveReactionKind[] = ["like", "love", "clap", "wow", "sad", "angry"];
const RATE_LIMITS: Record<LiveAction, { count: number; window: number }> = {
  heartbeat: { count: 4, window: 60_000 },
  react: { count: 10, window: 10_000 },
  comment: { count: 4, window: 60_000 },
  like: { count: 12, window: 10_000 },
  vote: { count: 3, window: 60_000 },
  question: { count: 3, window: 60_000 },
  upvote: { count: 12, window: 10_000 },
  share: { count: 6, window: 60_000 },
  play: { count: 10, window: 60_000 },
};

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function limited(key: string, action: LiveAction): boolean {
  const now = Date.now();
  const config = RATE_LIMITS[action];
  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + config.window });
    if (rateBuckets.size > 10_000) {
      for (const [bucketKey, bucket] of rateBuckets) {
        if (bucket.resetAt <= now) rateBuckets.delete(bucketKey);
      }
    }
    return false;
  }
  current.count += 1;
  return current.count > config.count;
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validSession(value: unknown): string {
  const sessionId = clean(value, 80);
  return /^[a-zA-Z0-9._-]{8,80}$/.test(sessionId) ? sessionId : "";
}

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const sid = validSession(request.nextUrl.searchParams.get("sid"));
  const settings = await getSettings();
  const config = parseAppConfig(settings.app_config_json);
  if (!config.show_live_events) return fail("not_found", 404);
  const feed = await getLiveEventFeed(slug, sid, {
    refreshSeconds: config.live_events.refresh_seconds,
    floatingPlayer: config.live_events.floating_player,
  });
  if (!feed) return fail("not_found", 404);
  return NextResponse.json(feed, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const settings = await getSettings();
  if (!parseAppConfig(settings.app_config_json).show_live_events) return fail("not_found", 404);
  let payload: Record<string, unknown>;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return fail("invalid_body");
    payload = body as Record<string, unknown>;
  } catch {
    return fail("invalid_body");
  }

  const action = payload.action as LiveAction;
  if (!Object.hasOwn(RATE_LIMITS, action)) return fail("invalid_action");
  const sessionId = validSession(payload.sid);
  if (!sessionId) return fail("invalid_session");
  if (limited(`${clientIp(request)}:${sessionId}:${action}`, action)) return fail("too_fast", 429);

  const event = await getLiveEventBySlug(slug);
  if (!event) return fail("not_found", 404);
  if (action !== "heartbeat" && event.status !== "live") return fail("event_not_live", 409);

  try {
    switch (action) {
      case "heartbeat":
        if (event.status === "live") await recordLiveViewer(event.id, sessionId);
        return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
      case "react": {
        const kind = clean(payload.kind, 12) as LiveReactionKind;
        if (!REACTIONS.includes(kind)) return fail("invalid_reaction");
        await recordLiveReaction(event, sessionId, kind);
        break;
      }
      case "comment": {
        const name = clean(payload.name, 60);
        const body = clean(payload.body, 800);
        if (name.length < 2 || body.length < 2) return fail("invalid_comment");
        const settings = parseAppConfig((await getSettings()).app_config_json);
        const moderation = await submitLiveComment(event, sessionId, name, body, {
          autoModeration: settings.live_events.auto_moderation,
          bannedWords: settings.live_events.banned_words,
        });
        return NextResponse.json({ ok: true, moderation }, { status: 201, headers: { "Cache-Control": "no-store" } });
      }
      case "like": {
        if (!event.commentsEnabled) return fail("disabled", 409);
        const targetId = clean(payload.targetId, 80);
        if (!targetId) return fail("invalid_target");
        await likeLiveComment(event.id, targetId, sessionId);
        break;
      }
      case "vote": {
        if (!event.pollsEnabled) return fail("disabled", 409);
        const pollId = clean(payload.pollId, 80);
        const optionId = clean(payload.optionId, 80);
        if (!pollId || !optionId) return fail("invalid_vote");
        await voteLivePoll(event.id, pollId, optionId, sessionId);
        break;
      }
      case "question": {
        const name = clean(payload.name, 60);
        const body = clean(payload.body, 800);
        if (name.length < 2 || body.length < 2) return fail("invalid_question");
        await submitLiveQuestion(event, sessionId, name, body);
        break;
      }
      case "upvote": {
        if (!event.qaEnabled) return fail("disabled", 409);
        const targetId = clean(payload.targetId, 80);
        if (!targetId) return fail("invalid_target");
        await upvoteLiveQuestion(event.id, targetId, sessionId);
        break;
      }
      case "share":
      case "play":
        await recordLiveEventActivity(event.id, sessionId, action, clean(payload.network, 100));
        break;
    }
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "disabled") return fail("disabled", 409);
    if (message === "too_fast") return fail("too_fast", 429);
    if (message === "poll_not_found") return fail(message, 404);
    if (message === "bad_option" || message === "already_voted") return fail(message, 409);
    console.error("[live-event] Public action failed", error);
    return fail("action_failed", 500);
  }
}
