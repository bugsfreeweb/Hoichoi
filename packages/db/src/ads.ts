import { getClient } from "./client";

export interface AdSlot {
  slotKey: string;
  name: string;
  description: string | null;
  enabled: boolean;
  dayRateBdt: number;
  houseHtmlEnabled: boolean;
  deliveryMode: "both" | "platform" | "house";
  updatedAt: string;
}

export interface AdCreative {
  id: string;
  clientId: string | null;
  name: string;
  templateId: string;
  palette: string;
  data: Record<string, unknown>;
  style: Record<string, unknown>;
  layout: Record<string, unknown>;
  baseLang: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdBooking {
  id: string;
  clientId: string;
  creativeId: string;
  slotKey: string;
  startsAt: string;
  endsAt: string;
  days: number;
  status: string;
  priority: number;
  grossBdt: number;
  discountBdt: number;
  vatBdt: number;
  totalBdt: number;
  impressions: number;
  clicks: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdEvent {
  id: string;
  bookingId: string | null;
  slotKey: string;
  kind: string;
  path: string | null;
  device: string | null;
  createdAt: string;
}

export interface AdAnalyticsDay {
  date: string;
  impressions: number;
  clicks: number;
}

function nowIso() {
  return new Date().toISOString();
}

function uuid() {
  return crypto.randomUUID();
}

function slotDeliveryMode(value: unknown): AdSlot["deliveryMode"] {
  return value === "platform" || value === "house" ? value : "both";
}

export async function listAdSlots() {
  const client = getClient();
  const res = await client.execute("SELECT * FROM ad_slots ORDER BY slot_key");
  return res.rows.map((row) => ({
    slotKey: String(row.slot_key),
    name: String(row.name),
    description: row.description ? String(row.description) : null,
    enabled: Number(row.enabled) === 1,
    dayRateBdt: Number(row.day_rate_bdt ?? 0),
    houseHtmlEnabled: Number(row.house_html_enabled) === 1,
    deliveryMode: slotDeliveryMode(row.delivery_mode),
    updatedAt: String(row.updated_at),
  }));
}

export async function updateAdSlotSettings(input: {
  slotKey: string;
  enabled: boolean;
  dayRateBdt: number;
  deliveryMode: AdSlot["deliveryMode"];
}) {
  const client = getClient();
  const result = await client.execute({
    sql: "UPDATE ad_slots SET enabled = ?, day_rate_bdt = ?, delivery_mode = ?, updated_at = ? WHERE slot_key = ?",
    args: [input.enabled ? 1 : 0, input.dayRateBdt, input.deliveryMode, nowIso(), input.slotKey],
  });
  if (result.rowsAffected === 0) throw new Error("বিজ্ঞাপন স্লটটি পাওয়া যায়নি।");
}

export async function getAdSlot(slotKey: string) {
  const client = getClient();
  const res = await client.execute({ sql: "SELECT * FROM ad_slots WHERE slot_key = ?", args: [slotKey] });
  const row = res.rows[0] as Record<string, unknown>;
  if (!row) return null;
  return {
    slotKey: String(row.slot_key),
    name: String(row.name),
    description: row.description ? String(row.description) : null,
    enabled: Number(row.enabled) === 1,
    dayRateBdt: Number(row.day_rate_bdt ?? 0),
    houseHtmlEnabled: Number(row.house_html_enabled) === 1,
    deliveryMode: slotDeliveryMode(row.delivery_mode),
    updatedAt: String(row.updated_at),
  };
}

export async function listAdCreatives(clientId?: string) {
  const client = getClient();
  const sql = clientId ? "SELECT * FROM ad_creatives WHERE client_id = ? ORDER BY created_at DESC" : "SELECT * FROM ad_creatives ORDER BY created_at DESC";
  const res = await client.execute(clientId ? { sql, args: [clientId] } : sql);
  return res.rows.map((row) => ({
    id: String(row.id),
    clientId: row.client_id ? String(row.client_id) : null,
    name: String(row.name),
    templateId: String(row.template_id),
    palette: String(row.palette),
    data: JSON.parse(String(row.data_json || "{}")),
    style: JSON.parse(String(row.style_json || "{}")),
    layout: JSON.parse(String(row.layout_json || "{}")),
    baseLang: String(row.base_lang),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

export async function createAdCreative(input: { name: string; templateId: string; palette?: string; data?: Record<string, unknown>; style?: Record<string, unknown>; layout?: Record<string, unknown>; clientId?: string; }) {
  const client = getClient();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await client.execute({
    sql: "INSERT INTO ad_creatives (id, client_id, name, template_id, palette, data_json, style_json, layout_json, base_lang, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    args: [id, input.clientId || null, input.name, input.templateId, input.palette || "newsprint", JSON.stringify(input.data || {}), JSON.stringify(input.style || {}), JSON.stringify(input.layout || {}), "bn", now, now],
  });
  const res = await client.execute({ sql: "SELECT * FROM ad_creatives WHERE id = ?", args: [id] });
  const row = res.rows[0] as Record<string, unknown>;
  return {
    id: String(row.id),
    clientId: row.client_id ? String(row.client_id) : null,
    name: String(row.name),
    templateId: String(row.template_id),
    palette: String(row.palette),
    data: JSON.parse(String(row.data_json || "{}")),
    style: JSON.parse(String(row.style_json || "{}")),
    layout: JSON.parse(String(row.layout_json || "{}")),
    baseLang: String(row.base_lang),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
export async function listAdBookings(clientId?: string) {
  const client = getClient();
  const res = await client.execute(
    clientId
      ? { sql: "SELECT * FROM ad_bookings WHERE client_id = ? ORDER BY created_at DESC", args: [clientId] }
      : "SELECT * FROM ad_bookings ORDER BY created_at DESC",
  );
  return res.rows.map((row) => ({
    id: String(row.id),
    clientId: String(row.client_id),
    creativeId: String(row.creative_id),
    slotKey: String(row.slot_key),
    startsAt: String(row.starts_at),
    endsAt: String(row.ends_at),
    days: Number(row.days),
    status: String(row.status),
    priority: Number(row.priority),
    grossBdt: Number(row.gross_bdt),
    discountBdt: Number(row.discount_bdt),
    vatBdt: Number(row.vat_bdt),
    totalBdt: Number(row.total_bdt),
    impressions: Number(row.impressions),
    clicks: Number(row.clicks),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

export async function createAdBooking(input: {
  clientId: string;
  creativeId: string;
  slotKey: string;
  startsAt: string;
  endsAt: string;
  days: number;
  grossBdt: number;
  discountBdt: number;
  vatBdt: number;
  totalBdt: number;
}) {
  const client = getClient();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await client.execute({
    sql: "INSERT INTO ad_bookings (id, client_id, creative_id, slot_key, starts_at, ends_at, days, status, priority, gross_bdt, discount_bdt, vat_bdt, total_bdt, impressions, clicks, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', 0, ?, ?, ?, ?, 0, 0, ?, ?)",
    args: [id, input.clientId, input.creativeId, input.slotKey, input.startsAt, input.endsAt, input.days, input.grossBdt, input.discountBdt, input.vatBdt, input.totalBdt, now, now],
  });
  const res = await client.execute({ sql: "SELECT * FROM ad_bookings WHERE id = ?", args: [id] });
  const row = res.rows[0] as Record<string, unknown>;
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    creativeId: String(row.creative_id),
    slotKey: String(row.slot_key),
    startsAt: String(row.starts_at),
    endsAt: String(row.ends_at),
    days: Number(row.days),
    status: String(row.status),
    priority: Number(row.priority),
    grossBdt: Number(row.gross_bdt),
    discountBdt: Number(row.discount_bdt),
    vatBdt: Number(row.vat_bdt),
    totalBdt: Number(row.total_bdt),
    impressions: Number(row.impressions),
    clicks: Number(row.clicks),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function setAdBookingStatus(id: string, status: "active" | "rejected") {
  const client = getClient();
  await client.execute({
    sql: "UPDATE ad_bookings SET status = ?, updated_at = ? WHERE id = ?",
    args: [status, new Date().toISOString(), id],
  });
}

export async function recordAdDeliveryEvent(input: {
  bookingId: string;
  slotKey: string;
  kind: "impression" | "click";
  path?: string;
  device?: string;
}) {
  const client = getClient();
  const now = nowIso();
  const activeBooking = await client.execute({
    sql: `SELECT b.id FROM ad_bookings b
      JOIN ad_slots s ON s.slot_key = b.slot_key AND s.enabled = 1
      JOIN ad_creatives c ON c.id = b.creative_id
      LEFT JOIN ad_clients client ON client.id = c.client_id
      WHERE b.id = ? AND b.slot_key = ? AND b.status = 'active'
        AND b.starts_at <= ? AND b.ends_at >= ?
        AND (c.client_id IS NULL OR client.status = 'approved')
      LIMIT 1`,
    args: [input.bookingId, input.slotKey, now, now],
  });
  if (!activeBooking.rows.length) throw new Error("বিজ্ঞাপন বুকিংটি এখন সক্রিয় নয়।");

  await client.batch([
    {
      sql: "INSERT INTO platform_ad_events (id, booking_id, slot_key, kind, path, device, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [crypto.randomUUID(), input.bookingId, input.slotKey, input.kind, input.path || null, input.device || null, now],
    },
    {
      sql: `UPDATE ad_bookings SET ${input.kind === "impression" ? "impressions" : "clicks"} =
        ${input.kind === "impression" ? "impressions" : "clicks"} + 1 WHERE id = ?`,
      args: [input.bookingId],
    },
  ], "write");
}

export async function getAdAnalytics(clientId?: string): Promise<AdAnalyticsDay[]> {
  const client = getClient();
  const clientFilter = clientId ? "AND b.client_id = ?" : "";
  const query = await client.execute({
    sql: `SELECT substr(e.created_at, 1, 10) AS event_date, e.kind, COUNT(*) AS total
      FROM platform_ad_events e
      LEFT JOIN ad_bookings b ON b.id = e.booking_id
      WHERE e.created_at >= ? ${clientFilter}
      GROUP BY event_date, e.kind
      ORDER BY event_date`,
    args: clientId
      ? [new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), clientId]
      : [new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)],
  });

  const series = new Map<string, AdAnalyticsDay>();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = new Date(today.getTime() - offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    series.set(date, { date, impressions: 0, clicks: 0 });
  }
  for (const row of query.rows) {
    const day = series.get(String(row.event_date));
    if (!day) continue;
    if (row.kind === "impression") day.impressions = Number(row.total);
    if (row.kind === "click") day.clicks = Number(row.total);
  }
  return [...series.values()];
}

export async function listAdEvents(clientId?: string): Promise<AdEvent[]> {
  const client = getClient();
  const result = await client.execute(
    clientId
      ? {
          sql: `SELECT e.* FROM platform_ad_events e
            JOIN ad_bookings b ON b.id = e.booking_id
            WHERE b.client_id = ?
            ORDER BY e.created_at DESC LIMIT 200`,
          args: [clientId],
        }
      : "SELECT * FROM platform_ad_events ORDER BY created_at DESC LIMIT 200",
  );
  return result.rows.map((row) => ({
    id: String(row.id),
    bookingId: row.booking_id ? String(row.booking_id) : null,
    slotKey: String(row.slot_key),
    kind: String(row.kind),
    path: row.path ? String(row.path) : null,
    device: row.device ? String(row.device) : null,
    createdAt: String(row.created_at),
  }));
}

export async function getActiveAdForSlot(slotKey: string) {
  const client = getClient();
  const now = new Date().toISOString();
  const res = await client.execute({
    sql: `SELECT c.*, b.id AS booking_id
      FROM ad_creatives c
      JOIN ad_bookings b ON b.creative_id = c.id
      LEFT JOIN ad_clients client ON client.id = c.client_id
      WHERE b.slot_key = ? AND b.status = 'active' AND b.starts_at <= ? AND b.ends_at >= ?
        AND (c.client_id IS NULL OR client.status = 'approved')
      ORDER BY b.priority DESC, b.created_at DESC LIMIT 1`,
    args: [slotKey, now, now],
  });
  const row = res.rows[0] as Record<string, unknown>;
  if (!row) return null;
  return {
    id: String(row.id),
    bookingId: String(row.booking_id),
    clientId: row.client_id ? String(row.client_id) : null,
    name: String(row.name),
    templateId: String(row.template_id),
    palette: String(row.palette),
    data: JSON.parse(String(row.data_json || "{}")),
    style: JSON.parse(String(row.style_json || "{}")),
    layout: JSON.parse(String(row.layout_json || "{}")),
    baseLang: String(row.base_lang),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listAdClients() {
  const client = getClient();
  const res = await client.execute("SELECT * FROM ad_clients ORDER BY created_at DESC");
  return res.rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    company: row.company ? String(row.company) : null,
    email: String(row.email),
    role: String(row.role),
    status: String(row.status),
    creditBdt: Number(row.credit_bdt),
    createdAt: String(row.created_at),
  }));
}

export async function createAdClient(input: { name: string; company?: string; email: string; phone?: string; role?: string; }) {
  const client = getClient();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await client.execute({
    sql: "INSERT INTO ad_clients (id, name, company, email, phone, role, status, credit_bdt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'approved', 0, ?, ?)",
    args: [id, input.name, input.company || null, input.email, input.phone || null, input.role || "client", now, now],
  });
  return { id, name: input.name, email: input.email };
}

export async function createAdClientAccount(input: {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  passwordHash: string;
}) {
  const client = getClient();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await client.execute({
    sql: "INSERT INTO ad_clients (id, name, company, email, phone, role, status, credit_bdt, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'client', 'pending', 0, ?, ?, ?)",
    args: [id, input.name, input.company || null, input.email.trim().toLowerCase(), input.phone || null, input.passwordHash, now, now],
  });
  return { id, name: input.name, email: input.email.trim().toLowerCase() };
}

export async function getAdClientAuthRecord(email: string) {
  const client = getClient();
  const res = await client.execute({
    sql: "SELECT id, name, email, password_hash, status FROM ad_clients WHERE email = ? LIMIT 1",
    args: [email.trim().toLowerCase()],
  });
  const row = res.rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    passwordHash: row.password_hash ? String(row.password_hash) : null,
    status: String(row.status),
  };
}

export async function setAdClientStatus(id: string, status: "approved" | "suspended") {
  const client = getClient();
  await client.execute({
    sql: "UPDATE ad_clients SET status = ?, updated_at = ? WHERE id = ?",
    args: [status, new Date().toISOString(), id],
  });
}