import { getClient } from "./client";

export interface AdSlot {
  slotKey: string;
  name: string;
  description: string | null;
  enabled: boolean;
  dayRateBdt: number;
  houseHtmlEnabled: boolean;
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

function nowIso() {
  return new Date().toISOString();
}

function uuid() {
  return crypto.randomUUID();
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
    updatedAt: String(row.updated_at),
  }));
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
export async function listAdBookings() {
  const client = getClient();
  const res = await client.execute("SELECT * FROM ad_bookings ORDER BY created_at DESC");
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

export async function recordAdDeliveryEvent(input: { bookingId?: string; slotKey: string; kind: string; path?: string; device?: string; }) {
  const client = getClient();
  await client.execute({
    sql: "INSERT INTO ad_events (id, slot_key, kind, path, device, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    args: [crypto.randomUUID(), input.slotKey, input.kind, input.path || null, input.device || null, new Date().toISOString()],
  });
  if (input.bookingId && input.kind === "impression") {
    await client.execute({ sql: "UPDATE ad_bookings SET impressions = impressions + 1 WHERE id = ?", args: [input.bookingId] });
  }
  if (input.bookingId && input.kind === "click") {
    await client.execute({ sql: "UPDATE ad_bookings SET clicks = clicks + 1 WHERE id = ?", args: [input.bookingId] });
  }
}

export async function getActiveAdForSlot(slotKey: string) {
  const client = getClient();
  const now = new Date().toISOString();
  const res = await client.execute({
    sql: "SELECT c.* FROM ad_creatives c JOIN ad_bookings b ON b.creative_id = c.id WHERE b.slot_key = ? AND b.status = 'active' AND b.starts_at <= ? AND b.ends_at >= ? ORDER BY b.priority DESC, b.created_at DESC LIMIT 1",
    args: [slotKey, now, now],
  });
  const row = res.rows[0] as Record<string, unknown>;
  if (!row) return null;
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