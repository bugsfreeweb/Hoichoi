import { getPoll, getPollResults, getPollVotes, pollResultsVisible, setPollVotes } from "@hoichoi/db";
import { getSettings } from "@/lib/settings";
import { parseAppConfig } from "@hoichoi/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const recentVotes = new Map<string, number[]>();
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

function validSession(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9._:-]{8,64}$/.test(value);
}

function limited(sessionId: string): boolean {
  const now = Date.now();
  const hits = (recentVotes.get(sessionId) ?? []).filter((time) => now - time < 60_000);
  if (hits.length >= 12) {
    recentVotes.set(sessionId, hits);
    return true;
  }
  hits.push(now);
  recentVotes.set(sessionId, hits);
  if (recentVotes.size > 4000) recentVotes.clear();
  return false;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!parseAppConfig((await getSettings()).app_config_json).show_live_polls) return json({ error: "পোলটি পাওয়া যায়নি।" }, 404);
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) return json({ error: "পোলটি পাওয়া যায়নি।" }, 404);
  const poll = await getPoll(id);
  if (!poll) return json({ error: "পোলটি পাওয়া যায়নি।" }, 404);

  const sessionId = new URL(request.url).searchParams.get("sid");
  const myVotes = validSession(sessionId) ? await getPollVotes(id, sessionId) : [];
  const results = pollResultsVisible(poll, myVotes.length > 0) ? await getPollResults(id) : [];
  return json({ poll, results, myVotes });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!parseAppConfig((await getSettings()).app_config_json).show_live_polls) return json({ error: "পোলটি পাওয়া যায়নি।" }, 404);
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) return json({ error: "পোলটি পাওয়া যায়নি।" }, 404);

  let body: { optionId?: unknown; optionIds?: unknown; sid?: unknown };
  try {
    body = await request.json() as { optionId?: unknown; optionIds?: unknown; sid?: unknown };
  } catch {
    return json({ error: "অনুরোধটি পড়া যায়নি।" }, 400);
  }
  if (!validSession(body.sid)) return json({ error: "পেজটি রিফ্রেশ করে আবার চেষ্টা করুন।" }, 400);
  if (limited(body.sid)) return json({ error: "একটু অপেক্ষা করে আবার চেষ্টা করুন।" }, 429);

  const poll = await getPoll(id);
  if (!poll) return json({ error: "পোলটি পাওয়া যায়নি।" }, 404);
  if (poll.status !== "open" || (poll.endsAt && Date.parse(poll.endsAt) <= Date.now())) {
    return json({ error: "এই পোলের ভোটগ্রহণ এখন বন্ধ।" }, 403);
  }
  const rawOptionIds = Array.isArray(body.optionIds)
    ? body.optionIds
    : typeof body.optionId === "string" ? [body.optionId] : [];
  const wanted = rawOptionIds.filter((optionId): optionId is string => typeof optionId === "string" && optionId.length <= 40);
  if (wanted.length !== rawOptionIds.length) {
    return json({ error: "একটি বৈধ অপশন বেছে নিন।" }, 400);
  }
  const optionIds = [...new Set(wanted)];
  if (!optionIds.length || optionIds.length > poll.options.length || optionIds.some((optionId) => !poll.options.some((option) => option.id === optionId))) {
    return json({ error: "একটি বৈধ অপশন বেছে নিন।" }, 400);
  }
  if (!poll.allowMultiple && optionIds.length !== 1) return json({ error: "এই পোলে একটি অপশন বেছে নিন।" }, 400);
  const [singleOptionId] = optionIds;
  if (!singleOptionId) return json({ error: "একটি বৈধ অপশন বেছে নিন।" }, 400);

  await setPollVotes(id, poll.allowMultiple ? optionIds : [singleOptionId], body.sid);
  const myVotes = await getPollVotes(id, body.sid);
  const results = pollResultsVisible(poll, myVotes.length > 0) ? await getPollResults(id) : [];
  return json({ ok: true, results, myVotes });
}
