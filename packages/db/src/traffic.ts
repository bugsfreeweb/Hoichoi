/**
 * First-party, cookie-less traffic analytics.
 *
 * Two tables feed the five admin analytics groups:
 *   - `page_views`  one row per tracked page view (path + geo + UA-derived fields)
 *   - `ad_events`   one row per ad slot view/click
 *
 * Privacy: the raw IP is never stored. {@link recordPageView} hashes
 * `ip | userAgent | yyyy-mm-dd` into a short `visitor_id` (daily-rotating, so it
 * cannot be used to follow a person across days), and `session_id` is a random
 * per-tab id supplied by the client. Everything is aggregated server-side by
 * {@link trafficSnapshot}.
 */
import { createHash, randomUUID } from "node:crypto";
import type {
  TrafficBucket,
  TrafficCommentRow,
  TrafficCountry,
  TrafficRange,
  TrafficSnapshot,
  TrafficTopContent,
} from "@hoichoi/shared-types";
import { getClient, nowIso } from "./client";

const countryNames: Record<string, string> = {};

/** Turn an ISO-3166 alpha-2 code into its regional-indicator flag emoji. */
export function flagOf(code: string | null | undefined): string {
  const cc = (code ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** Display name for a country code (falls back to the code itself). */
function countryLabel(code: string | null | undefined): string {
  const cc = (code ?? "").trim().toUpperCase();
  if (!cc) return "Unknown";
  if (countryNames[cc]) return countryNames[cc]!;
  try {
    const dn = new Intl.DisplayNames(["en"], { type: "region" });
    const name = dn.of(cc);
    if (name && name !== cc) {
      countryNames[cc] = name;
      return name;
    }
  } catch {
    /* Intl.DisplayNames unavailable */
  }
  return cc;
}

/** Short daily visitor fingerprint — never the raw IP. */
export function visitorFingerprint(ip: string, userAgent: string, day = nowIso().slice(0, 10)): string {
  return createHash("sha256").update(`${ip}|${userAgent}|${day}`).digest("hex").slice(0, 16);
}

/** Very small UA sniff — enough for the OS/browser/device breakdown tiles. */
export function parseUserAgent(ua: string): { os: string; browser: string; device: string } {
  const s = ua || "";
  const os = /Windows/i.test(s)
    ? "Windows"
    : /Android/i.test(s)
      ? "Android"
      : /iPhone|iPad|iPod/i.test(s)
        ? "iOS"
        : /Mac OS X|Macintosh/i.test(s)
          ? "macOS"
          : /Linux/i.test(s)
            ? "Linux"
            : "Other";
  const browser = /Edg\//i.test(s)
    ? "Edge"
    : /OPR\/|Opera/i.test(s)
      ? "Opera"
      : /Chrome\/|CriOS/i.test(s)
        ? "Chrome"
        : /Firefox\/|FxiOS/i.test(s)
          ? "Firefox"
          : /Safari\//i.test(s)
            ? "Safari"
            : /bot|crawl|spider/i.test(s)
              ? "Bot"
              : "Other";
  const device = /iPad|Tablet/i.test(s)
    ? "Tablet"
    : /Mobile|Android|iPhone|iPod/i.test(s)
      ? "Mobile"
      : /bot|crawl|spider/i.test(s)
        ? "Bot"
        : "Desktop";
  return { os, browser, device };
}

export interface PageViewInput {
  path: string;
  postId?: string | null;
  postSlug?: string | null;
  sessionId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  country?: string | null;
  countryCode?: string | null;
  region?: string | null;
  city?: string | null;
  referrer?: string | null;
}

/** Persist one page view. Returns the stored row id (or null on bad input). */
export async function recordPageView(input: PageViewInput): Promise<string | null> {
  const path = (input.path ?? "").trim().slice(0, 500);
  if (!path) return null;
  const sessionId = (input.sessionId ?? "").trim().slice(0, 64) || randomUUID().slice(0, 16);
  const visitorId = visitorFingerprint(input.ip ?? "", input.userAgent ?? "");
  const ua = parseUserAgent(input.userAgent ?? "");
  const id = randomUUID();
  await getClient().execute({
    sql: `INSERT INTO page_views
      (id, path, post_id, post_slug, session_id, visitor_id, country, country_code, region, city, os, browser, device, referrer, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      path,
      input.postId ?? null,
      input.postSlug ?? null,
      sessionId,
      visitorId,
      (input.country ?? "").slice(0, 80) || null,
      (input.countryCode ?? "").slice(0, 2).toUpperCase() || null,
      (input.region ?? "").slice(0, 80) || null,
      (input.city ?? "").slice(0, 80) || null,
      ua.os,
      ua.browser,
      ua.device,
      (input.referrer ?? "").slice(0, 300) || null,
      nowIso(),
    ],
  });
  return id;
}

export interface AdEventInput {
  slot: string;
  event?: "view" | "click";
  postId?: string | null;
  path?: string | null;
  sessionId?: string | null;
  visitorId?: string | null;
  country?: string | null;
}

/** Resolve a post slug to its id (for storing post_id on a view). */
export async function postIdForSlug(slug: string): Promise<string | null> {
  const s = (slug ?? "").trim();
  if (!s) return null;
  const res = await getClient().execute({
    sql: "SELECT id FROM posts WHERE slug = ? LIMIT 1",
    args: [s],
  });
  const row = res.rows[0] as Row | undefined;
  return row ? String(row.id) : null;
}

/** Persist one ad slot view/click. */
export async function recordAdEvent(input: AdEventInput): Promise<void> {
  const slot = (input.slot ?? "").trim().slice(0, 60);
  if (!slot) return;
  await getClient().execute({
    sql: `INSERT INTO ad_events (id, slot, event, post_id, path, session_id, visitor_id, country, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      randomUUID(),
      slot,
      input.event === "click" ? "click" : "view",
      input.postId ?? null,
      (input.path ?? "").slice(0, 500) || null,
      (input.sessionId ?? "").slice(0, 64) || null,
      (input.visitorId ?? "").slice(0, 64) || null,
      (input.country ?? "").slice(0, 80) || null,
      nowIso(),
    ],
  });
}

/** Rows helper: `result.rows` are loosely-typed; coerce safely. */
type Row = Record<string, unknown>;
const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

/** Range → ISO cutoff (inclusive lower bound). */
function cutoffFor(range: TrafficRange): string {
  const ms = range === "24h" ? 86_400_000 : range === "7d" ? 7 * 86_400_000 : 30 * 86_400_000;
  return new Date(Date.now() - ms).toISOString();
}

function toCountries(rows: Row[]): TrafficCountry[] {
  return rows.map((r) => {
    const code = String(r.country_code ?? "");
    return {
      country: String(r.country ?? "") || countryLabel(code),
      countryCode: code,
      flag: flagOf(code),
      count: n(r.n),
    };
  });
}

/** Resolve post id → { title, slug } for the rows we are about to link. */
async function postMetaMap(ids: Array<string | null | undefined>): Promise<Map<string, { title: string; slug: string }>> {
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  const map = new Map<string, { title: string; slug: string }>();
  if (unique.length === 0) return map;
  const placeholders = unique.map(() => "?").join(",");
  const res = await getClient().execute({
    sql: `SELECT id, slug, title_bn FROM posts WHERE id IN (${placeholders})`,
    args: unique,
  });
  for (const r of res.rows as Row[]) {
    map.set(String(r.id), { title: String(r.title_bn ?? ""), slug: String(r.slug ?? "") });
  }
  return map;
}

function hrefFor(slug: string): string {
  return slug ? `/post/${slug}` : "#";
}

/**
 * Build the five-group traffic snapshot. All heavy lifting is done in SQL
 * (GROUP BY / COUNT DISTINCT) so the web route stays fast as views accumulate.
 */
export async function trafficSnapshot(range: TrafficRange = "24h"): Promise<TrafficSnapshot> {
  const client = getClient();
  const to = nowIso();
  const from = cutoffFor(range);
  const onlineCutoff = new Date(Date.now() - 5 * 60_000).toISOString();

  const [
    onlineRows,
    totalsRes,
    rangeCountries,
    topRes,
    commentTotalRes,
    recentComments,
    popularComments,
    sessionRes,
    bounceRes,
    osRes,
    browserRes,
    deviceRes,
    adTotals,
    adBySlot,
    adByPost,
  ] = await Promise.all([
    client.execute({
      sql: "SELECT visitor_id, country, country_code, max(created_at) AS t FROM page_views WHERE created_at >= ? GROUP BY visitor_id",
      args: [onlineCutoff],
    }),
    client.execute({
      sql: "SELECT count(*) AS pv, count(DISTINCT visitor_id) AS uv FROM page_views WHERE created_at >= ?",
      args: [from],
    }),
    client.execute({
      sql: "SELECT country, country_code, count(DISTINCT visitor_id) AS n FROM page_views WHERE created_at >= ? GROUP BY country_code ORDER BY n DESC LIMIT 12",
      args: [from],
    }),
    client.execute({
      sql: "SELECT post_id, post_slug, count(*) AS views FROM page_views WHERE created_at >= ? AND post_id IS NOT NULL GROUP BY post_id ORDER BY views DESC LIMIT 10",
      args: [from],
    }),
    client.execute("SELECT count(*) AS n FROM comments WHERE status = 'approved'"),
    client.execute(
      `SELECT c.id, c.author, c.body, c.likes, c.created_at, p.title_bn AS post_title, p.slug AS post_slug
       FROM comments c LEFT JOIN posts p ON p.id = c.post_id
       WHERE c.status = 'approved' ORDER BY c.created_at DESC LIMIT 8`,
    ),
    client.execute(
      `SELECT c.id, c.author, c.body, c.likes, c.created_at, p.title_bn AS post_title, p.slug AS post_slug
       FROM comments c LEFT JOIN posts p ON p.id = c.post_id
       WHERE c.status = 'approved' ORDER BY c.likes DESC, c.created_at DESC LIMIT 8`,
    ),
    client.execute({
      sql: "SELECT count(*) AS pv, count(DISTINCT session_id) AS sessions FROM page_views WHERE created_at >= ?",
      args: [from],
    }),
    client.execute({
      sql: "SELECT count(*) AS b FROM (SELECT session_id FROM page_views WHERE created_at >= ? GROUP BY session_id HAVING count(*) = 1)",
      args: [from],
    }),
    client.execute({
      sql: "SELECT os AS key, count(DISTINCT session_id) AS n FROM page_views WHERE created_at >= ? GROUP BY os ORDER BY n DESC",
      args: [from],
    }),
    client.execute({
      sql: "SELECT browser AS key, count(DISTINCT session_id) AS n FROM page_views WHERE created_at >= ? GROUP BY browser ORDER BY n DESC",
      args: [from],
    }),
    client.execute({
      sql: "SELECT device AS key, count(DISTINCT session_id) AS n FROM page_views WHERE created_at >= ? GROUP BY device ORDER BY n DESC",
      args: [from],
    }),
    client.execute({
      sql: `SELECT
              SUM(CASE WHEN event = 'view' THEN 1 ELSE 0 END) AS views,
              SUM(CASE WHEN event = 'click' THEN 1 ELSE 0 END) AS clicks
            FROM ad_events WHERE created_at >= ?`,
      args: [from],
    }),
    client.execute({
      sql: `SELECT slot,
              SUM(CASE WHEN event = 'view' THEN 1 ELSE 0 END) AS views,
              SUM(CASE WHEN event = 'click' THEN 1 ELSE 0 END) AS clicks
            FROM ad_events WHERE created_at >= ? GROUP BY slot ORDER BY views DESC LIMIT 12`,
      args: [from],
    }),
    client.execute({
      sql: `SELECT post_id,
              SUM(CASE WHEN event = 'view' THEN 1 ELSE 0 END) AS views,
              SUM(CASE WHEN event = 'click' THEN 1 ELSE 0 END) AS clicks
            FROM ad_events WHERE created_at >= ? AND post_id IS NOT NULL GROUP BY post_id ORDER BY views DESC LIMIT 10`,
      args: [from],
    }),
  ]);

  // Group 1 — online now.
  const onlineVisitors = (onlineRows.rows as Row[]).length;
  const onlineCountryMap = new Map<string, number>();
  for (const r of onlineRows.rows as Row[]) {
    const code = String(r.country_code ?? "");
    onlineCountryMap.set(code, (onlineCountryMap.get(code) ?? 0) + 1);
  }
  const onlineCountries: TrafficCountry[] = [...onlineCountryMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([code, count]) => ({
      country: countryLabel(code),
      countryCode: code,
      flag: flagOf(code),
      count,
    }));

  // Group 2 — most-read content (with per-post country split).
  const topRows = topRes.rows as Row[];
  const meta = await postMetaMap(topRows.map((r) => String(r.post_id ?? "")));
  const topContent: TrafficTopContent[] = [];
  for (const r of topRows) {
    const postId = String(r.post_id ?? "");
    const slug = String(r.post_slug ?? "") || meta.get(postId)?.slug || "";
    const title = meta.get(postId)?.title || slug || postId;
    const cRes = await client.execute({
      sql: "SELECT country, country_code, count(*) AS n FROM page_views WHERE created_at >= ? AND post_id = ? GROUP BY country_code ORDER BY n DESC LIMIT 5",
      args: [from, postId],
    });
    topContent.push({
      postId,
      title,
      slug,
      href: hrefFor(slug),
      views: n(r.views),
      countries: toCountries(cRes.rows as Row[]),
    });
  }

  // Group 4 — traffic mix.
  const pv = n(sessionRes.rows[0]?.pv);
  const sessions = n(sessionRes.rows[0]?.sessions);
  const bounced = n(bounceRes.rows[0]?.b);
  const bucketize = (rows: Row[]): TrafficBucket[] =>
    rows.map((r) => ({ key: String(r.key ?? "Other"), count: n(r.n) }));

  // Group 5 — ad views.
  const adViews = n(adTotals.rows[0]?.views);
  const adClicks = n(adTotals.rows[0]?.clicks);
  const adPostRows = adByPost.rows as Row[];
  const adMeta = await postMetaMap(adPostRows.map((r) => String(r.post_id ?? "")));

  const commentRow = (r: Row): TrafficCommentRow => {
    const slug = String(r.post_slug ?? "");
    return {
      id: String(r.id),
      author: String(r.author ?? ""),
      body: String(r.body ?? ""),
      postTitle: String(r.post_title ?? "") || slug || "—",
      postSlug: slug,
      href: hrefFor(slug),
      likes: n(r.likes),
      createdAt: String(r.created_at ?? ""),
    };
  };

  return {
    ok: true,
    generatedAt: to,
    range,
    from,
    to,
    online: { visitors: onlineVisitors, windowMin: 5, countries: onlineCountries },
    visitors: {
      total: n(totalsRes.rows[0]?.uv),
      pageViews: n(totalsRes.rows[0]?.pv),
      countries: toCountries(rangeCountries.rows as Row[]),
    },
    topContent,
    comments: {
      total: n(commentTotalRes.rows[0]?.n),
      recent: (recentComments.rows as Row[]).map(commentRow),
      popular: (popularComments.rows as Row[]).map(commentRow),
    },
    traffic: {
      pageViews: pv,
      sessions,
      bounced,
      bounceRate: sessions > 0 ? Math.round((bounced / sessions) * 100) : 0,
      os: bucketize(osRes.rows as Row[]),
      browser: bucketize(browserRes.rows as Row[]),
      devices: bucketize(deviceRes.rows as Row[]),
    },
    ads: {
      views: adViews,
      clicks: adClicks,
      ctr: adViews > 0 ? Math.round((adClicks / adViews) * 1000) / 10 : 0,
      bySlot: (adBySlot.rows as Row[]).map((r) => {
        const v = n(r.views);
        const c = n(r.clicks);
        return { slot: String(r.slot ?? ""), views: v, clicks: c, ctr: v > 0 ? Math.round((c / v) * 1000) / 10 : 0 };
      }),
      byPost: adPostRows.map((r) => {
        const postId = String(r.post_id ?? "");
        const slug = adMeta.get(postId)?.slug ?? "";
        return {
          postId,
          title: adMeta.get(postId)?.title || slug || postId,
          slug,
          href: hrefFor(slug),
          views: n(r.views),
          clicks: n(r.clicks),
        };
      }),
    },
  };
}
