"use server";

import { revalidatePath } from "next/cache";
import { createPoll, deletePoll, setFeaturedPoll, setPollStatus, setPollTemplate, updatePoll } from "@hoichoi/db";
import { requirePageUser, requiresRole } from "@/lib/auth";

export type PollFormState = { error?: string; notice?: string } | null;

function text(formData: FormData, name: string, max: number): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function parseDhakaDate(value: string): string | null {
  if (!value) return null;
  const date = new Date(`${value}:00+06:00`);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

const TEMPLATES = ["bar", "battle", "donut", "card", "rank", "meter"];
const STATUSES = ["open", "closed", "scheduled"];
const RESULTS_MODES = ["after-vote", "always", "after-close"];

async function requirePollEditor() {
  const user = await requirePageUser();
  if (!requiresRole(user, "editor")) throw new Error("পোল পরিচালনার জন্য editor অনুমতি প্রয়োজন।");
}

function parseForm(formData: FormData) {
  const topic = text(formData, "topic", 120);
  const question = text(formData, "question", 300);
  const options = text(formData, "options", 2000)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const template = text(formData, "template", 40) || "bar";
  const topicColor = text(formData, "topicColor", 20) || "#d2202c";
  const description = text(formData, "description", 1200);
  const status = text(formData, "status", 20);
  const resultsMode = text(formData, "resultsMode", 20);
  const startsAtValue = text(formData, "startsAt", 40);
  const parsedStartsAt = startsAtValue ? parseDhakaDate(startsAtValue) : null;
  const startsAt = parsedStartsAt ?? new Date().toISOString();
  const endsAtValue = text(formData, "endsAt", 40);
  const endsAt = endsAtValue ? parseDhakaDate(endsAtValue) : null;
  const allowMultiple = formData.get("allowMultiple") === "on";
  if (topic.length < 2) return { error: "বিষয় অন্তত ২ অক্ষরের হতে হবে।" } as const;
  if (question.length < 3) return { error: "প্রশ্ন অন্তত ৩ অক্ষরের হতে হবে।" } as const;
  if (options.length < 2 || options.length > 12) return { error: "২ থেকে ১২টি অপশন দিন।" } as const;
  if (!TEMPLATES.includes(template)) return { error: "একটি বৈধ পোল ডিজাইন বেছে নিন।" } as const;
  if (!STATUSES.includes(status)) return { error: "একটি বৈধ পোলের অবস্থা বেছে নিন।" } as const;
  if (status === "scheduled" && !startsAtValue) return { error: "আসন্ন পোলের শুরুর সময় নির্ধারণ করুন।" } as const;
  if (startsAtValue && !parsedStartsAt) return { error: "শুরুর সময়টি সঠিক নয়।" } as const;
  if (!RESULTS_MODES.includes(resultsMode)) return { error: "ফলাফল দেখানোর নিয়মটি সঠিক নয়।" } as const;
  if (!/^#[0-9a-f]{6}$/i.test(topicColor)) return { error: "বিষয়ের রংটি সঠিক নয়।" } as const;
  if (endsAtValue && !endsAt) return { error: "শেষের সময়টি সঠিক নয়।" } as const;
  if (endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) return { error: "শেষের সময় শুরুর সময়ের পরে হতে হবে।" } as const;
  return { value: { topic, question, options, template, topicColor, description, status: status as "open" | "closed" | "scheduled", startsAt, endsAt, allowMultiple, resultsMode: resultsMode as "after-vote" | "always" | "after-close", featured: formData.get("featured") === "on" } } as const;
}

function revalidatePolls() {
  revalidatePath("/admin/polls");
  revalidatePath("/poll");
  revalidatePath("/");
}

export async function createStandalonePoll(
  _previous: PollFormState,
  formData: FormData,
): Promise<PollFormState> {
  await requirePollEditor();
  const parsed = parseForm(formData);
  if ("error" in parsed) return { error: parsed.error };
  await createPoll(parsed.value);
  revalidatePolls();
  return { notice: "পোলটি সংরক্ষিত হয়েছে।" };
}

export async function deleteStandalonePoll(id: number) {
  await requirePollEditor();
  await deletePoll(id);
  revalidatePolls();
}

export async function toggleStandalonePoll(id: number, status: "open" | "closed" | "scheduled") {
  await requirePollEditor();
  await setPollStatus(id, status);
  revalidatePolls();
}

export async function featureStandalonePoll(id: number) {
  await requirePollEditor();
  await setFeaturedPoll(id);
  revalidatePolls();
}

export async function changeStandalonePollTemplate(id: number, template: string) {
  await requirePollEditor();
  if (!TEMPLATES.includes(template)) throw new Error("বৈধ পোল ডিজাইন বেছে নিন।");
  await setPollTemplate(id, template);
  revalidatePolls();
}

export async function updateStandalonePoll(id: number, formData: FormData): Promise<void> {
  await requirePollEditor();
  const parsed = parseForm(formData);
  if ("error" in parsed) throw new Error(parsed.error);
  await updatePoll(id, parsed.value);
  revalidatePolls();
}