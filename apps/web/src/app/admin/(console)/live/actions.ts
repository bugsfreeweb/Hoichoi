"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addLiveUpdate,
  createLiveEvent,
  createLivePoll,
  deleteLiveEvent,
  getLiveEventById,
  getLiveEventBySlug,
  moderateAllCleanLiveComments,
  moderateLiveComment,
  moderateLiveQuestion,
  saveLiveScoreboard,
  setFeaturedLiveEvent,
  setLiveEventStatus,
  setLivePollStatus,
  updateLiveUpdate,
  type LiveEventInput,
  type LiveEventStatus,
  type LiveScoreboard,
  type LiveStream,
  type LiveThemeKey,
  type LiveUpdateKind,
} from "@hoichoi/db";
import { requirePageUser, requiresRole } from "@/lib/auth";

export type SaveLiveEventState = { error: string } | null;

const THEMES: LiveThemeKey[] = ["stage", "broadsheet", "scoreboard", "timeline", "compact", "studio"];
const STATUSES: LiveEventStatus[] = ["scheduled", "live", "ended"];
const UPDATE_KINDS: LiveUpdateKind[] = ["update", "key", "breaking", "quote", "stat"];
const STREAM_TYPES = ["youtube", "hls", "iframe", "mp4"] as const;

async function requireEditor() {
  const user = await requirePageUser();
  if (!requiresRole(user, "editor")) throw new Error("লাইভ ইভেন্ট পরিচালনার জন্য editor অনুমতি প্রয়োজন।");
}

function text(data: FormData, key: string, max = 500): string {
  const value = data.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function checked(data: FormData, key: string): boolean {
  return data.get(key) === "on";
}

function parseDhakaDate(value: string): string | null {
  if (!value) return new Date().toISOString();
  const date = new Date(`${value}:00+06:00`);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function parseStreams(raw: string): { streams?: LiveStream[]; error?: string } {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 5) return { error: "সর্বোচ্চ ৫টি বিকল্প চ্যানেল যোগ করা যাবে।" };
  const streams: LiveStream[] = [];
  for (const line of lines) {
    const [label, rawType, ...parts] = line.split("|").map((part) => part.trim());
    const url = parts.join("|");
    const type = (rawType || "").toLowerCase();
    if (!label || !url || !STREAM_TYPES.includes(type as (typeof STREAM_TYPES)[number])) {
      return { error: "বিকল্প চ্যানেলের প্রতিটি লাইন সম্পূর্ণ করুন: নাম, ধরন ও URL।" };
    }
    if (!/^https?:\/\//i.test(url)) return { error: "স্ট্রিম URL অবশ্যই http বা https দিয়ে শুরু হবে।" };
    streams.push({ label: label.slice(0, 60), type: type as LiveStream["type"], url: url.slice(0, 1000) });
  }
  return { streams };
}

function generatedSlug(title: string): string {
  const ascii = title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 89)
    .replace(/-+$/g, "");
  if (ascii.length >= 2) return ascii;
  return `live-event-${Date.now().toString(36)}`;
}

export async function saveLiveEvent(
  _previousState: SaveLiveEventState,
  formData: FormData,
): Promise<SaveLiveEventState> {
  await requireEditor();
  const id = text(formData, "id", 80) || undefined;
  const title = text(formData, "title", 200);
  const slug = (text(formData, "slug", 90) || generatedSlug(title)).toLowerCase();
  const statusValue = text(formData, "status", 20) as LiveEventStatus;
  const themeValue = text(formData, "template", 30);
  const streamTypeValue = text(formData, "streamType", 20);
  const coverImage = text(formData, "coverImage", 1000);
  const startsAt = parseDhakaDate(text(formData, "startsAt", 40));

  if (!title || title.length < 2) return { error: "ইভেন্টের শিরোনাম অন্তত ২ অক্ষরের হতে হবে।" };
  if (!/^[a-z0-9][a-z0-9-]{1,88}$/.test(slug)) return { error: "স্লাগে ছোট হাতের ইংরেজি অক্ষর, সংখ্যা ও হাইফেন ব্যবহার করুন।" };
  if (!STATUSES.includes(statusValue)) return { error: "ইভেন্টের অবস্থা সঠিক নয়।" };
  if (themeValue !== "auto" && !THEMES.includes(themeValue as LiveThemeKey)) return { error: "লাইভ থিমটি সঠিক নয়।" };
  if (!STREAM_TYPES.includes(streamTypeValue as (typeof STREAM_TYPES)[number])) return { error: "স্ট্রিমের ধরন সঠিক নয়।" };
  if (!startsAt) return { error: "শুরুর সময়টি সঠিক নয়।" };
  if (coverImage && !coverImage.startsWith("/") && !/^https?:\/\//i.test(coverImage)) {
    return { error: "কভার ছবির URL / অথবা http(s) দিয়ে শুরু হতে হবে।" };
  }
  const parsedStreams = parseStreams(text(formData, "streams", 5000));
  if (parsedStreams.error || !parsedStreams.streams) return { error: parsedStreams.error ?? "বিকল্প চ্যানেলগুলো পরীক্ষা করুন।" };

  const [existingSlug, existingEvent] = await Promise.all([
    getLiveEventBySlug(slug),
    id ? getLiveEventById(id) : Promise.resolve(null),
  ]);
  if (existingSlug && existingSlug.id !== id) return { error: "এই স্লাগটি আগে থেকেই ব্যবহৃত। অন্য স্লাগ দিন।" };
  if (id && !existingEvent) return { error: "সম্পাদনার ইভেন্টটি আর পাওয়া যাচ্ছে না। ইভেন্ট তালিকা রিফ্রেশ করুন।" };

  const input: LiveEventInput = {
    id,
    slug,
    title,
    kicker: text(formData, "kicker", 80) || "লাইভ",
    summary: text(formData, "summary", 1200),
    category: text(formData, "category", 80) || "জাতীয়",
    categoryColor: /^#[0-9a-f]{6}$/i.test(text(formData, "categoryColor", 7)) ? text(formData, "categoryColor", 7) : "#d2202c",
    location: text(formData, "location", 120),
    status: statusValue,
    streamType: streamTypeValue as LiveStream["type"],
    streamUrl: text(formData, "streamUrl", 1000),
    streams: parsedStreams.streams,
    coverImage,
    template: themeValue === "auto" ? "auto" : (themeValue as LiveThemeKey),
    scoreboard: existingEvent?.scoreboard ?? null,
    keyPoints: text(formData, "keyPoints", 4000).split(/\r?\n/).map((point) => point.trim()).filter(Boolean).slice(0, 20),
    featured: checked(formData, "featured"),
    commentsEnabled: checked(formData, "commentsEnabled"),
    reactionsEnabled: checked(formData, "reactionsEnabled"),
    pollsEnabled: checked(formData, "pollsEnabled"),
    qaEnabled: checked(formData, "qaEnabled"),
    showViewerCount: checked(formData, "showViewerCount"),
    moderation: text(formData, "moderation", 10) === "pre" ? "pre" : "post",
    slowMode: Math.min(300, Math.max(0, Number(text(formData, "slowMode", 5)) || 0)),
    startsAt,
    endedAt: statusValue === "ended" ? new Date().toISOString() : null,
  };

  let event: Awaited<ReturnType<typeof createLiveEvent>>;
  try {
    event = await createLiveEvent(input);
  } catch (error) {
    if (error instanceof Error && /UNIQUE constraint failed: live_events\.slug/i.test(error.message)) {
      return { error: "এই স্লাগটি অন্য একটি ইভেন্ট ব্যবহার করছে। স্লাগটি পরিবর্তন করে আবার চেষ্টা করুন।" };
    }
    throw error;
  }
  if (event.featured) await setFeaturedLiveEvent(event.id);
  revalidatePath("/");
  revalidatePath("/live");
  revalidatePath("/admin/live");
  revalidatePath(`/admin/live/${event.id}`);
  redirect(`/admin/live/${event.id}?saved=1`);
}

export async function changeLiveEventStatus(id: string, status: LiveEventStatus) {
  await requireEditor();
  if (!STATUSES.includes(status)) throw new Error("ইভেন্টের অবস্থা সঠিক নয়।");
  const event = await getLiveEventById(id);
  await setLiveEventStatus(id, status);
  revalidatePath("/");
  revalidatePath("/live");
  if (event) revalidatePath(`/live/${event.slug}`);
  revalidatePath("/admin/live");
  revalidatePath(`/admin/live/${id}`);
}

export async function featureLiveEvent(id: string | null) {
  await requireEditor();
  await setFeaturedLiveEvent(id);
  revalidatePath("/");
  revalidatePath("/live");
  revalidatePath("/admin/live");
}

export async function removeLiveEvent(id: string) {
  await requireEditor();
  await deleteLiveEvent(id);
  revalidatePath("/");
  revalidatePath("/live");
  revalidatePath("/admin/live");
  redirect("/admin/live?deleted=1");
}

export async function publishLiveUpdate(formData: FormData) {
  await requireEditor();
  const eventId = text(formData, "eventId", 80);
  const kind = text(formData, "kind", 20) as LiveUpdateKind;
  const body = text(formData, "body", 3000);
  if (!eventId || !UPDATE_KINDS.includes(kind) || body.length < 2) throw new Error("আপডেটের ধরন ও লেখা পরীক্ষা করুন।");
  await addLiveUpdate({
    eventId,
    kind,
    title: text(formData, "title", 200),
    body,
    author: text(formData, "author", 80) || "হৈচৈ ডেস্ক",
    mediaUrl: text(formData, "mediaUrl", 1000),
  });
  revalidatePath("/");
  revalidatePath("/live");
  revalidatePath(`/admin/live/${eventId}`);
}

export async function pinLiveUpdate(id: string, eventId: string, pinned: boolean) {
  await requireEditor();
  await updateLiveUpdate(id, { pinned });
  revalidatePath(`/admin/live/${eventId}`);
  revalidatePath(`/live`);
}

export async function deleteLiveUpdate(id: string, eventId: string) {
  await requireEditor();
  await updateLiveUpdate(id, { delete: true });
  revalidatePath(`/admin/live/${eventId}`);
  revalidatePath("/live");
}

export async function moderateComment(id: string, eventId: string, status: "approved" | "rejected") {
  await requireEditor();
  await moderateLiveComment(id, status);
  revalidatePath(`/admin/live/${eventId}`);
  revalidatePath("/live");
}

export async function pinComment(id: string, eventId: string, pinned: boolean) {
  await requireEditor();
  await moderateLiveComment(id, "approved", pinned);
  revalidatePath(`/admin/live/${eventId}`);
  revalidatePath("/live");
}

export async function approveCleanComments(eventId: string) {
  await requireEditor();
  await moderateAllCleanLiveComments(eventId);
  revalidatePath(`/admin/live/${eventId}`);
  revalidatePath("/live");
}

export async function createPollAction(formData: FormData) {
  await requireEditor();
  const eventId = text(formData, "eventId", 80);
  const question = text(formData, "question", 300);
  const options = text(formData, "options", 2000).split(/\r?\n/).map((label) => label.trim()).filter(Boolean);
  if (!eventId || question.length < 3 || options.length < 2 || options.length > 12) {
    throw new Error("পোলের প্রশ্ন এবং ২–১২টি অপশন দিন।");
  }
  await createLivePoll(eventId, question, options.map((label) => ({ id: randomUUID(), label: label.slice(0, 120) })));
  revalidatePath(`/admin/live/${eventId}`);
  revalidatePath("/live");
}

export async function changePollStatus(id: string, eventId: string, status: "open" | "closed") {
  await requireEditor();
  await setLivePollStatus(id, status);
  revalidatePath(`/admin/live/${eventId}`);
  revalidatePath("/live");
}

export async function moderateQuestion(id: string, eventId: string, status: "approved" | "hidden") {
  await requireEditor();
  await moderateLiveQuestion(id, status);
  revalidatePath(`/admin/live/${eventId}`);
}

export async function answerLiveQuestion(formData: FormData) {
  await requireEditor();
  const id = text(formData, "questionId", 80);
  const eventId = text(formData, "eventId", 80);
  const answer = text(formData, "answer", 1000);
  if (!id || !eventId || answer.length < 2) throw new Error("প্রশ্নের উত্তর লিখুন।");
  await moderateLiveQuestion(id, "answered", answer);
  revalidatePath(`/admin/live/${eventId}`);
  revalidatePath("/live");
}

export async function saveScoreboardAction(formData: FormData) {
  await requireEditor();
  const eventId = text(formData, "eventId", 80);
  if (!eventId) throw new Error("ইভেন্ট পাওয়া যায়নি।");
  const lines = text(formData, "items", 4000).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const items = lines.map((line) => {
    const [label, rawValue, color, sub, display] = line.split("|").map((part) => part.trim());
    const value = Number(rawValue);
    if (!label || !Number.isFinite(value)) throw new Error("স্কোরবোর্ডের প্রতিটি লাইন: লেবেল | সংখ্যা | রং | বর্ণনা | প্রদর্শিত মান");
    return {
      label: label.slice(0, 80),
      value: Math.max(0, value),
      ...(color && /^#[0-9a-f]{6}$/i.test(color) ? { color } : {}),
      ...(sub ? { sub: sub.slice(0, 120) } : {}),
      ...(display ? { display: display.slice(0, 40) } : {}),
    };
  }).slice(0, 12);
  const title = text(formData, "scoreTitle", 120);
  let scoreboard: LiveScoreboard | null = null;
  if (title || items.length) {
    if (!title || !items.length) throw new Error("স্কোরবোর্ডের শিরোনাম ও অন্তত একটি ডেটা আইটেম দিন।");
    const kind = text(formData, "scoreKind", 20);
    if (!["match", "election", "metrics"].includes(kind)) throw new Error("স্কোরবোর্ডের ধরন সঠিক নয়।");
    const progressValue = Number(text(formData, "progress", 10));
    scoreboard = {
      kind: kind as LiveScoreboard["kind"],
      title,
      note: text(formData, "scoreNote", 300),
      ...(Number.isFinite(progressValue) && text(formData, "progress", 10) !== "" ? { progress: Math.max(0, Math.min(100, progressValue)) } : {}),
      items,
    };
  }
  const keyPoints = text(formData, "keyPoints", 4000).split(/\r?\n/).map((point) => point.trim()).filter(Boolean).slice(0, 20);
  await saveLiveScoreboard(eventId, scoreboard, keyPoints);
  revalidatePath(`/admin/live/${eventId}`);
  revalidatePath("/");
  revalidatePath("/live");
}
