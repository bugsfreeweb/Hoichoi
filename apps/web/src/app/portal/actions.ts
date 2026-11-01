"use server";

import {
  createAdBooking,
  createAdCreative,
  createAdClientAccount,
  getAdClientAuthRecord,
  getAdSlot,
  listAdCreatives,
} from "@hoichoi/db";
import {
  createAdClientSession,
  destroyAdClientSession,
  currentAdClient,
} from "@/lib/ad-client-auth";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

export type PortalActionState = { error?: string; notice?: string } | null;

function value(formData: FormData, key: string, limit: number): string {
  const field = formData.get(key);
  return typeof field === "string" ? field.trim().slice(0, limit) : "";
}

function passwordValue(formData: FormData, key: string): string {
  const field = formData.get(key);
  return typeof field === "string" ? field.slice(0, 128) : "";
}

export async function registerAdClient(
  _previous: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  const name = value(formData, "name", 120);
  const company = value(formData, "company", 160);
  const email = value(formData, "email", 254).toLowerCase();
  const password = passwordValue(formData, "password");
  const confirmation = passwordValue(formData, "confirmPassword");

  if (name.length < 2) return { error: "আপনার নাম অন্তত ২ অক্ষরের হতে হবে।" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "সঠিক ইমেইল ঠিকানা দিন।" };
  if (password.length < 8) return { error: "পাসওয়ার্ডে অন্তত ৮টি অক্ষর থাকতে হবে।" };
  if (password !== confirmation) return { error: "দুটি পাসওয়ার্ড মিলছে না।" };

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    await createAdClientAccount({ name, company, email, passwordHash });
  } catch (error) {
    if (error instanceof Error && /UNIQUE constraint failed:\s*ad_clients\.email/i.test(error.message)) {
      return { error: "এই ইমেইলে অ্যাকাউন্ট আছে। লগইন করুন অথবা প্রশাসকের সাথে যোগাযোগ করুন।" };
    }
    throw error;
  }
  return { notice: "নিবন্ধন সফল। বিজ্ঞাপন বুকিং ব্যবহারের আগে প্রশাসকের অনুমোদন লাগবে।" };
}

export async function loginAdClient(
  _previous: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  const email = value(formData, "email", 254).toLowerCase();
  const password = passwordValue(formData, "password");
  const account = await getAdClientAuthRecord(email);
  const validPassword = account?.passwordHash
    ? await bcrypt.compare(password, account.passwordHash)
    : false;

  if (!account || !validPassword) return { error: "ইমেইল বা পাসওয়ার্ড সঠিক নয়।" };
  if (account.status === "pending") return { error: "আপনার অ্যাকাউন্ট প্রশাসকের অনুমোদনের অপেক্ষায় আছে।" };
  if (account.status !== "approved") return { error: "এই অ্যাকাউন্টে প্রবেশাধিকার বন্ধ আছে।" };

  await createAdClientSession(account.id);
  redirect("/portal");
}

export async function logoutAdClient(): Promise<void> {
  await destroyAdClientSession();
  redirect("/portal/login");
}

export async function createClientCreative(
  _previous: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  const client = await currentAdClient();
  if (!client) redirect("/portal/login");

  const name = value(formData, "creativeName", 120);
  const headline = value(formData, "headline", 100);
  const body = value(formData, "body", 240);
  const cta = value(formData, "cta", 40);
  const url = value(formData, "url", 1000);
  if (name.length < 2 || !headline) return { error: "ক্রিয়েটিভের নাম ও শিরোনাম পূরণ করুন।" };
  try {
    const destination = new URL(url);
    if (destination.protocol !== "https:" && destination.protocol !== "http:") throw new Error("invalid URL scheme");
  } catch {
    return { error: "গন্তব্য URL অবশ্যই http বা https লিংক হতে হবে।" };
  }

  await createAdCreative({
    clientId: client.id,
    name,
    templateId: "leaderboard",
    palette: "newsprint",
    data: { headline, body, cta, url },
  });
  redirect("/portal?created=creative");
}

export async function requestAdBooking(
  _previous: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  const client = await currentAdClient();
  if (!client) redirect("/portal/login");

  const slotKey = value(formData, "slotKey", 100);
  const creativeId = value(formData, "creativeId", 80);
  const startDate = value(formData, "startDate", 10);
  const days = Number(value(formData, "days", 3));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !Number.isInteger(days) || days < 1 || days > 90) {
    return { error: "শুরুর তারিখ এবং ১ থেকে ৯০ দিনের সময়সীমা নির্বাচন করুন।" };
  }

  const [slot, creatives] = await Promise.all([getAdSlot(slotKey), listAdCreatives(client.id)]);
  const creative = creatives.find((item) => item.id === creativeId);
  const startsAt = new Date(`${startDate}T00:00:00.000Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (!slot?.enabled || slot.deliveryMode === "house") return { error: "এই বিজ্ঞাপন স্লটটি এখন বুকিংয়ের জন্য চালু নেই।" };
  if (!creative) return { error: "নির্বাচিত ক্রিয়েটিভটি আপনার অ্যাকাউন্টে নেই।" };
  if (!Number.isFinite(startsAt.getTime()) || startsAt < today) return { error: "শুরুর তারিখ আজ বা তার পরের হতে হবে।" };

  const endsAt = new Date(startsAt.getTime() + days * 24 * 60 * 60 * 1000);
  const grossBdt = slot.dayRateBdt * days;
  await createAdBooking({
    clientId: client.id,
    creativeId,
    slotKey,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    days,
    grossBdt,
    discountBdt: 0,
    vatBdt: 0,
    totalBdt: grossBdt,
  });
  redirect("/portal?created=booking");
}
