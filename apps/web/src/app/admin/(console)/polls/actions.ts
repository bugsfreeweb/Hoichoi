"use server";

import { revalidatePath } from "next/cache";
import { createPoll, deletePoll, setFeaturedPoll, setPollStatus, setPollTemplate } from "@hoichoi/db";

function text(formData: FormData, name: string, max: number) {
  return String(formData.get(name) ?? "").trim().slice(0, max);
}

export async function createStandalonePoll(formData: FormData) {
  const topic = text(formData, "topic", 120);
  const question = text(formData, "question", 300);
  const options = text(formData, "options", 2000)
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const template = text(formData, "template", 40) || "bar";
  const topicColor = text(formData, "topicColor", 20) || "#d2202c";
  try {
    await createPoll({ topic, question, options, template, topicColor });
  } catch {
    // ignore
  }
  revalidatePath("/admin/polls");
}

export async function deleteStandalonePoll(id: number) {
  await deletePoll(id);
  revalidatePath("/admin/polls");
}

export async function toggleStandalonePoll(id: number, status: "open" | "closed") {
  await setPollStatus(id, status);
  revalidatePath("/admin/polls");
}

export async function featureStandalonePoll(id: number) {
  await setFeaturedPoll(id);
  revalidatePath("/admin/polls");
}

export async function changeStandalonePollTemplate(id: number, template: string) {
  await setPollTemplate(id, template);
  revalidatePath("/admin/polls");
}