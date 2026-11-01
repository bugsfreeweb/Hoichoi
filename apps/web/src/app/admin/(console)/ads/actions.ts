"use server";

import { revalidatePath } from "next/cache";
import { setAdBookingStatus, setAdClientStatus, updateAdSlotSettings } from "@hoichoi/db";
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

export async function updateAdBookingStatus(formData: FormData): Promise<void> {
  await requireAdAdmin();
  const id = formData.get("bookingId");
  const status = formData.get("status");
  if (typeof id !== "string" || !id || (status !== "active" && status !== "rejected")) {
    throw new Error("বুকিংয়ের অবস্থা বা আইডি সঠিক নয়।");
  }
  await setAdBookingStatus(id, status);
  revalidatePath("/admin/ads");
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
