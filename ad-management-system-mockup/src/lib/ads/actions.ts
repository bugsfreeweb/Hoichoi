"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { advertisers, bookings, creatives, payments, slotConfig, activity, customTemplates } from "@/db/schema";
import { TEMPLATE_MAP } from "./templates";
import { isBlockLayout } from "./blocks";
import { buildLayoutI18n } from "./translate";
import { quotePrice, SLOT_MAP } from "./slots";
import { buildI18n } from "./translate";
import type { CreativeData, LangCode } from "./types";

function ref() {
  return "HC-AD-" + Math.floor(1000 + Math.random() * 8999);
}

async function log(actor: string, action: string, subject: string, detail: string) {
  await db.insert(activity).values({ actor, action, subject, detail });
}

function bust() {
  revalidatePath("/");
  revalidatePath("/portal");
  revalidatePath("/portal/bookings");
  revalidatePath("/admin/ads");
  revalidatePath("/admin/ads/bookings");
}

/* ================================================================== *
 * CLIENT — create a booking (creative + booking + invoice in one go)
 * ================================================================== */
export async function createBooking(fd: FormData) {
  const advertiserId = Number(fd.get("advertiserId") || 2);
  const slotKey = String(fd.get("slotKey"));
  const templateId = String(fd.get("templateId"));
  const days = Number(fd.get("days") || 7);
  const lang = (String(fd.get("lang") || "bn") as LangCode) || "bn";
  const palette = String(fd.get("palette") || "");
  const startOffset = Number(fd.get("startOffset") || 0);

  const tpl = TEMPLATE_MAP[templateId];
  const slot = SLOT_MAP[slotKey];
  if (!tpl || !slot) redirect("/portal/book?error=invalid");

  const override: CreativeData = {
    brand: (fd.get("brand") as string) || tpl.data.brand,
    headline: (fd.get("headline") as string) || tpl.data.headline,
    sub: (fd.get("sub") as string) || tpl.data.sub,
    body: (fd.get("body") as string) || tpl.data.body,
    cta: (fd.get("cta") as string) || tpl.data.cta,
    url: (fd.get("url") as string) || tpl.data.url,
    badge: (fd.get("badge") as string) || tpl.data.badge,
    price: (fd.get("price") as string) || tpl.data.price,
    phone: (fd.get("phone") as string) || tpl.data.phone,
    imageUrl: (fd.get("imageUrl") as string) || tpl.data.imageUrl,
    html: (fd.get("html") as string) || tpl.data.html,
  };
  const data: CreativeData = { ...tpl.data, ...override };

  const [cr] = await db
    .insert(creatives)
    .values({
      advertiserId,
      templateId,
      name: (fd.get("creativeName") as string) || `${tpl.nameBn} — ${data.brand ?? ""}`.trim(),
      palette: palette || tpl.palette,
      data,
      i18n: buildI18n(data, lang),
      baseLang: lang,
      autoTranslate: true,
    })
    .returning();

  const q = quotePrice(slotKey, days, tpl.uplift);
  const startsAt = new Date(Date.now() + startOffset * 86400000);
  const endsAt = new Date(startsAt.getTime() + days * 86400000);
  const r = ref();

  const [bk] = await db
    .insert(bookings)
    .values({
      ref: r,
      advertiserId,
      creativeId: cr.id,
      slotKey,
      startsAt,
      endsAt,
      days,
      status: "pending_payment",
      grossBdt: q.gross,
      discountBdt: q.discount,
      vatBdt: q.vat,
      totalBdt: q.total,
    })
    .returning();

  await db.insert(payments).values({
    bookingId: bk.id,
    advertiserId,
    method: "bkash",
    amountBdt: q.total,
    status: "initiated",
    meta: { createdBy: "client-wizard" },
  });

  await log("client", "booking.created", r, `${slot.label} · ${days} দিন · ৳${q.total}`);
  await log("system", "creative.translated", cr.name, "en, hi, ar, ur, ms বান্ডেল তৈরি");
  bust();
  redirect(`/portal/pay/${bk.id}`);
}

/* ================================================================== *
 * CLIENT — pay (sandbox gateway) → auto-activate
 * ================================================================== */
export async function payBooking(fd: FormData) {
  const bookingId = Number(fd.get("bookingId"));
  const method = String(fd.get("method") || "bkash");
  const payerRef = String(fd.get("payerRef") || "");

  const [bk] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!bk) redirect("/portal/bookings");

  const trx = "TRX" + Math.floor(100000 + Math.random() * 899999);

  await db
    .update(payments)
    .set({
      method,
      status: "paid",
      trxId: trx,
      payerRef,
      meta: { gateway: "sandbox", settled: true, capturedAt: new Date().toISOString() },
    })
    .where(eq(payments.bookingId, bookingId));

  // automatic go-live: future start → scheduled, today → active
  const live = bk.startsAt.getTime() <= Date.now();
  await db
    .update(bookings)
    .set({ status: live ? "active" : "scheduled" })
    .where(eq(bookings.id, bookingId));

  await log("system", "payment.captured", trx, `${method} · ৳${bk.totalBdt}`);
  await log("system", live ? "booking.activated" : "booking.scheduled", bk.ref, "পেমেন্টের পর স্বয়ংক্রিয়");
  bust();
  redirect(`/portal/bookings?paid=${bk.ref}`);
}

/* ================================================================== *
 * ADMIN — manual controls
 * ================================================================== */
export async function adminSetBookingStatus(fd: FormData) {
  const id = Number(fd.get("bookingId"));
  const status = String(fd.get("status"));
  const [bk] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  await db.update(bookings).set({ status, manual: true }).where(eq(bookings.id, id));
  await log("admin@hoichoi.example", "booking.status_changed", bk?.ref ?? String(id), `→ ${status}`);
  bust();
}

export async function adminSetPriority(fd: FormData) {
  const id = Number(fd.get("bookingId"));
  const priority = Number(fd.get("priority") || 0);
  const [bk] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  await db.update(bookings).set({ priority, manual: true }).where(eq(bookings.id, id));
  await log("admin@hoichoi.example", "booking.priority", bk?.ref ?? String(id), `priority=${priority}`);
  bust();
}

export async function adminToggleSlot(fd: FormData) {
  const slotKey = String(fd.get("slotKey"));
  const enabled = String(fd.get("enabled")) === "1";
  const existing = await db.select().from(slotConfig).where(eq(slotConfig.slotKey, slotKey)).limit(1);
  if (existing[0]) {
    await db.update(slotConfig).set({ enabled, updatedAt: new Date() }).where(eq(slotConfig.slotKey, slotKey));
  } else {
    await db.insert(slotConfig).values({ slotKey, enabled });
  }
  await log("admin@hoichoi.example", "slot.toggled", slotKey, enabled ? "চালু" : "বন্ধ");
  bust();
}

export async function adminSetSlotRate(fd: FormData) {
  const slotKey = String(fd.get("slotKey"));
  const dayRateBdt = Number(fd.get("dayRate") || 0);
  const existing = await db.select().from(slotConfig).where(eq(slotConfig.slotKey, slotKey)).limit(1);
  if (existing[0]) {
    await db.update(slotConfig).set({ dayRateBdt, updatedAt: new Date() }).where(eq(slotConfig.slotKey, slotKey));
  } else {
    await db.insert(slotConfig).values({ slotKey, dayRateBdt });
  }
  await log("admin@hoichoi.example", "slot.repriced", slotKey, `৳${dayRateBdt}/দিন`);
  bust();
}

/** Admin books a slot by hand — e.g. a free public-service placement. */
export async function adminManualBooking(fd: FormData) {
  const advertiserId = Number(fd.get("advertiserId"));
  const slotKey = String(fd.get("slotKey"));
  const templateId = String(fd.get("templateId"));
  const days = Number(fd.get("days") || 7);
  const free = String(fd.get("free")) === "1";
  const headline = String(fd.get("headline") || "");
  const sub = String(fd.get("sub") || "");
  const cta = String(fd.get("cta") || "");
  const url = String(fd.get("url") || "");

  const tpl = TEMPLATE_MAP[templateId];
  if (!tpl) return;

  const data: CreativeData = {
    ...tpl.data,
    ...(headline ? { headline } : {}),
    ...(sub ? { sub } : {}),
    ...(cta ? { cta } : {}),
    ...(url ? { url } : {}),
  };

  const [cr] = await db
    .insert(creatives)
    .values({
      advertiserId,
      templateId,
      name: `[ম্যানুয়াল] ${tpl.nameBn}`,
      palette: tpl.palette,
      data,
      i18n: buildI18n(data, "bn"),
      baseLang: "bn",
      autoTranslate: true,
    })
    .returning();

  const q = free
    ? { gross: 0, discount: 0, vat: 0, total: 0 }
    : quotePrice(slotKey, days, tpl.uplift);
  const r = ref();

  await db.insert(bookings).values({
    ref: r,
    advertiserId,
    creativeId: cr.id,
    slotKey,
    startsAt: new Date(),
    endsAt: new Date(Date.now() + days * 86400000),
    days,
    status: "active",
    priority: 8,
    grossBdt: q.gross,
    discountBdt: q.discount,
    vatBdt: q.vat,
    totalBdt: q.total,
    manual: true,
    adminNote: free ? "বিনামূল্যে জনস্বার্থ বিজ্ঞাপন" : "অ্যাডমিন কর্তৃক ম্যানুয়াল বুকিং",
  });

  await log("admin@hoichoi.example", "booking.manual_create", r, `${slotKey} · ${days} দিন · ${free ? "ফ্রি" : "৳" + q.total}`);
  bust();
}

export async function adminSetClientStatus(fd: FormData) {
  const id = Number(fd.get("advertiserId"));
  const status = String(fd.get("status"));
  await db.update(advertisers).set({ status }).where(eq(advertisers.id, id));
  await log("admin@hoichoi.example", "client.status", String(id), `→ ${status}`);
  revalidatePath("/admin/ads/clients");
}

export async function adminAddCredit(fd: FormData) {
  const id = Number(fd.get("advertiserId"));
  const amount = Number(fd.get("amount") || 0);
  await db
    .update(advertisers)
    .set({ creditBdt: sql`${advertisers.creditBdt} + ${amount}` })
    .where(eq(advertisers.id, id));
  await log("admin@hoichoi.example", "client.credit", String(id), `+৳${amount}`);
  revalidatePath("/admin/ads/clients");
}

export async function adminMarkPaid(fd: FormData) {
  const paymentId = Number(fd.get("paymentId"));
  const [p] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  await db
    .update(payments)
    .set({ status: "paid", method: "manual", trxId: "MANUAL-" + paymentId })
    .where(eq(payments.id, paymentId));
  if (p?.bookingId) {
    await db.update(bookings).set({ status: "active", manual: true }).where(eq(bookings.id, p.bookingId));
  }
  await log("admin@hoichoi.example", "payment.manual_settle", String(paymentId), "নগদ/ব্যাংক — হাতে নিষ্পত্তি");
  bust();
}

/* ================================================================== *
 * STUDIO — one payload creates creative + booking (client or admin)
 * ================================================================== */
export async function studioSubmit(fd: FormData) {
  const raw = String(fd.get("payload") || "{}");
  const p = JSON.parse(raw) as {
    slotKey: string;
    templateId: string;
    palette: string;
    data: CreativeData;
    style: Record<string, unknown>;
    lang: LangCode;
    days: number;
    name: string;
    free: boolean;
    advertiserId: number;
    admin?: boolean;
  };

  const tpl = TEMPLATE_MAP[p.templateId];
  const slot = SLOT_MAP[p.slotKey];
  if (!tpl || !slot) redirect("/portal/studio?error=invalid");

  const data: CreativeData = { ...tpl.data, ...p.data };
  const isAdmin = Boolean(fd.get("admin")) || p.admin === true;

  const [cr] = await db
    .insert(creatives)
    .values({
      advertiserId: p.advertiserId,
      templateId: p.templateId,
      name: p.name || tpl.nameBn,
      palette: p.palette || tpl.palette,
      data,
      style: p.style ?? {},
      i18n: buildI18n(data, p.lang),
      baseLang: p.lang,
      autoTranslate: true,
    })
    .returning();

  const free = isAdmin && p.free;
  const q = free ? { gross: 0, discount: 0, vat: 0, total: 0 } : quotePrice(p.slotKey, p.days, tpl.uplift);
  const r = ref();
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + p.days * 86400000);

  const [bk] = await db
    .insert(bookings)
    .values({
      ref: r,
      advertiserId: p.advertiserId,
      creativeId: cr.id,
      slotKey: p.slotKey,
      startsAt,
      endsAt,
      days: p.days,
      status: isAdmin ? "active" : "pending_payment",
      priority: isAdmin ? 8 : 0,
      grossBdt: q.gross,
      discountBdt: q.discount,
      vatBdt: q.vat,
      totalBdt: q.total,
      manual: isAdmin,
      adminNote: isAdmin ? (free ? "স্টুডিও · বিনামূল্যে জনস্বার্থ" : "স্টুডিও · ম্যানুয়াল") : null,
    })
    .returning();

  if (!isAdmin) {
    await db.insert(payments).values({
      bookingId: bk.id,
      advertiserId: p.advertiserId,
      method: "bkash",
      amountBdt: q.total,
      status: "initiated",
      meta: { createdBy: "studio" },
    });
  }

  await log(
    isAdmin ? "admin@hoichoi.example" : "client",
    isAdmin ? "booking.studio_manual" : "booking.studio_created",
    r,
    `${slot.label} · ${p.days} দিন · ${free ? "ফ্রি" : "৳" + q.total}`
  );
  await log("system", "creative.styled", cr.name, `ফন্ট/রং/মোশন কাস্টমাইজড · ${Object.keys(p.style ?? {}).length} প্রপার্টি`);
  bust();

  redirect(isAdmin ? `/admin/ads/bookings?created=${r}` : `/portal/pay/${bk.id}`);
}

export async function adminStudioSubmit(fd: FormData) {
  fd.set("admin", "1");
  return studioSubmit(fd);
}

/* ================================================================== *
 * BLOCK BUILDER — drag-and-drop layout becomes a saved custom template
 * ================================================================== */
export async function builderSubmit(fd: FormData) {
  const p = JSON.parse(String(fd.get("payload") || "{}")) as {
    advertiserId: number;
    slotKey: string;
    palette: string;
    layout: unknown;
    style: Record<string, unknown>;
    lang: LangCode;
    days: number;
    name: string;
    free: boolean;
    sourceTemplate: string;
    url: string;
    admin?: boolean;
  };

  if (!isBlockLayout(p.layout) || !p.layout.blocks.length) redirect("/portal/builder?error=empty");
  const slot = SLOT_MAP[p.slotKey];
  if (!slot) redirect("/portal/builder?error=slot");

  const isAdmin = Boolean(fd.get("admin")) || p.admin === true;
  const layout = { ...p.layout, i18n: buildLayoutI18n(p.layout, p.lang) };
  const data: CreativeData = { url: p.url, cta: "", headline: p.name };

  const [cr] = await db
    .insert(creatives)
    .values({
      advertiserId: p.advertiserId,
      templateId: p.sourceTemplate || "cu-01",
      name: p.name || "কাস্টম লেআউট",
      palette: p.palette || "newsprint",
      data,
      style: p.style ?? {},
      layout,
      i18n: buildI18n(data, p.lang),
      baseLang: p.lang,
      autoTranslate: true,
    })
    .returning();

  const free = isAdmin && p.free;
  const q = free ? { gross: 0, discount: 0, vat: 0, total: 0 } : quotePrice(p.slotKey, p.days);
  const r = ref();
  const startsAt = new Date();

  const [bk] = await db
    .insert(bookings)
    .values({
      ref: r,
      advertiserId: p.advertiserId,
      creativeId: cr.id,
      slotKey: p.slotKey,
      startsAt,
      endsAt: new Date(startsAt.getTime() + p.days * 86400000),
      days: p.days,
      status: isAdmin ? "active" : "pending_payment",
      priority: isAdmin ? 8 : 0,
      grossBdt: q.gross,
      discountBdt: q.discount,
      vatBdt: q.vat,
      totalBdt: q.total,
      manual: isAdmin,
      adminNote: isAdmin ? "ব্লক বিল্ডার · ম্যানুয়াল" : null,
    })
    .returning();

  if (!isAdmin) {
    await db.insert(payments).values({
      bookingId: bk.id,
      advertiserId: p.advertiserId,
      method: "bkash",
      amountBdt: q.total,
      status: "initiated",
      meta: { createdBy: "builder" },
    });
  }

  await log(
    isAdmin ? "admin@hoichoi.example" : "client",
    isAdmin ? "builder.manual_publish" : "builder.created",
    r,
    `${slot.label} · ${p.layout.blocks.length} ব্লক · ${free ? "ফ্রি" : "৳" + q.total}`
  );
  await log("system", "builder.i18n", cr.name, `৫টি ভাষার লেআউট তৈরি · সোর্স ${p.sourceTemplate || "খালি ক্যানভাস"}`);
  bust();
  redirect(isAdmin ? `/admin/ads/bookings?created=${r}` : `/portal/pay/${bk.id}`);
}

export async function adminBuilderSubmit(fd: FormData) {
  fd.set("admin", "1");
  return builderSubmit(fd);
}

/* ================================================================== *
 * CUSTOM TEMPLATE FACILITY — save any composed layout for reuse
 * ================================================================== */
export async function saveCustomTemplate(fd: FormData) {
  const p = JSON.parse(String(fd.get("savePayload") || fd.get("payload") || "{}")) as {
    advertiserId?: number;
    name: string;
    sourceTemplate?: string;
    palette: string;
    layout: unknown;
    style: Record<string, unknown>;
    shared?: boolean;
  };

  if (!isBlockLayout(p.layout) || !p.layout.blocks.length) return;

  const isAdmin = Boolean(fd.get("admin"));
  const shared = isAdmin && Boolean(p.shared);

  const [row] = await db
    .insert(customTemplates)
    .values({
      advertiserId: shared ? null : (p.advertiserId ?? 2),
      name: p.name || "কাস্টম টেমপ্লেট",
      sourceTemplateId: p.sourceTemplate || null,
      palette: p.palette || "newsprint",
      layout: { ...p.layout, i18n: undefined },
      style: p.style ?? {},
    })
    .returning();

  await log(
    isAdmin ? "admin@hoichoi.example" : "client",
    "custom_template.saved",
    row.name,
    shared ? "সবার জন্য শেয়ারড টেমপ্লেট" : `নিজের লাইব্রেরিতে · ${p.layout.blocks.length} ব্লক`
  );

  revalidatePath("/portal/builder");
  revalidatePath("/admin/ads/builder");
  revalidatePath("/admin/ads/templates");
}

export async function adminSaveCustomTemplate(fd: FormData) {
  fd.set("admin", "1");
  return saveCustomTemplate(fd);
}

export async function deleteCustomTemplate(fd: FormData) {
  const id = Number(fd.get("id"));
  const [row] = await db.select().from(customTemplates).where(eq(customTemplates.id, id)).limit(1);
  await db.delete(customTemplates).where(eq(customTemplates.id, id));
  await log("admin@hoichoi.example", "custom_template.deleted", row?.name ?? String(id), "লাইব্রেরি থেকে সরানো হয়েছে");
  revalidatePath("/portal/builder");
  revalidatePath("/admin/ads/builder");
  revalidatePath("/admin/ads/templates");
}
