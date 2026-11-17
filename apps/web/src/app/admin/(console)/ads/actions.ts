"use server";

import { revalidatePath } from "next/cache";
import { AD_POLICY_KEYS, setAdBookingStatus, setAdClientStatus, updateAdSlotSettings } from "@hoichoi/db";
import { audit } from "@/lib/audit";
import { requirePageUser, requiresRole } from "@/lib/auth";

async function requireAdAdmin() {
  const user = await requirePageUser();
  if (!requiresRole(user, "admin")) throw new Error("বিজ্ঞাপন অ্যাকাউন্ট পরিচালনার জন্য admin অনুমতি প্রয়োজন।");
}

export async function updateAdClientStatus(formData: FormData): Promise<void> {
  await requireAdAdmin();
  const id = formData.get("clientId");
  const status = formData.get("status");
  if (typeof id !== "string" || !id || (status !== "approved" && status !== "suspended")) {
    throw new Error("ক্লায়েন্টের অবস্থা বা আইডি সঠিক নয়।");
  }
  await setAdClientStatus(id, status);
  revalidatePath("/admin/ads");
}

/**
 * Activate or reject a booking.
 *
 * Activation needs the policy checklist (see `AD_POLICY_CHECKS`): the review row
 * is written before the status flips, so "who approved this ad and what did they
 * confirm?" is answerable later. A missing tick throws with the operator's own
 * wording instead of silently launching the ad.
 */
export async function updateAdBookingStatus(formData: FormData): Promise<void> {
  const user = await requirePageUser();
  if (!requiresRole(user, "admin")) throw new Error("বিজ্ঞাপন অ্যাকাউন্ট পরিচালনার জন্য admin অনুমতি প্রয়োজন।");
  const id = formData.get("bookingId");
  const status = formData.get("status");
  if (typeof id !== "string" || !id || (status !== "active" && status !== "rejected")) {
    throw new Error("বুকিংয়ের অবস্থা বা আইডি সঠিক নয়।");
  }
  const checks = Object.fromEntries(AD_POLICY_KEYS.map((k) => [k, formData.get(`policy_${k}`) === "on"]));
  const notes = typeof formData.get("policyNotes") === "string" ? String(formData.get("policyNotes")) : null;
  await setAdBookingStatus(id, status, { actor: user.email, checks, notes });
  await audit(
    user,
    {
      action: status === "active" ? "ad.booking.activate" : "ad.booking.reject",
      entityType: "ad_bookings",
      entityId: id,
      summary: status === "active" ? "বিজ্ঞাপন অনুমোদন ও চালু" : "বিজ্ঞাপন বুকিং প্রত্যাখ্যান",
      metadata: { policy_checks: Object.keys(checks).filter((k) => checks[k]), notes: notes ? notes.slice(0, 200) : null },
    },
  );
  revalidatePath("/admin/ads");
  revalidatePath("/");
  revalidatePath("/post/[slug]", "page");
}

export async function saveAdSlotSettings(formData: FormData): Promise<void> {
  await requireAdAdmin();
  const slotKey = formData.get("slotKey");
  const enabled = formData.get("enabled");
  const dayRate = Number(formData.get("dayRateBdt"));
  const deliveryMode = formData.get("deliveryMode");
  if (
    typeof slotKey !== "string" ||
    !slotKey ||
    (enabled !== "true" && enabled !== "false") ||
    (deliveryMode !== "both" && deliveryMode !== "platform" && deliveryMode !== "house") ||
    !Number.isSafeInteger(dayRate) ||
    dayRate < 0 ||
    dayRate > 100_000_000
  ) {
    throw new Error("স্লটের অবস্থা বা দৈনিক মূল্য সঠিক নয়।");
  }
  await updateAdSlotSettings({
    slotKey,
    enabled: enabled === "true",
    dayRateBdt: dayRate,
    deliveryMode,
  });
  revalidatePath("/admin/ads");
  revalidatePath("/admin/ads/slots");
  revalidatePath("/");
  revalidatePath("/post/[slug]", "page");
}
