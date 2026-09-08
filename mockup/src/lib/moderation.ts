import { db } from "@/db";
import { comments, ipBans, bannedWords } from "@/db/schema";
import { and, desc, eq, gt, isNull, or } from "drizzle-orm";

/**
 * Auto-moderation engine.
 *
 * Pipeline for every incoming comment:
 *  1. Ban gate      — if the IP has an active ban, reject outright.
 *  2. Word scan     — normalise text, match the offensive dictionary
 *                     (+ a built-in seed list so it works before any DB rows).
 *  3. Verdict:
 *        clean            → status "approved", published instantly.
 *        soft hit (sev 1) → status "pending" (held for manual review).
 *        hard hit (sev≥2) → status "blocked" AND escalate an IP ban:
 *           strike 1 → 7 days · strike 2 → 30 days · strike 3+ → permanent.
 *
 *  Admin can always override manually (approve / block / delete / unban).
 */

export const BAN_MS: Record<"7d" | "30d", number> = {
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

/** Built-in starter dictionary (Bangla + English), extendable via DB. */
export const SEED_BANNED_WORDS: Array<{ word: string; severity: number }> = [
  { word: "গালি", severity: 2 },
  { word: "শালা", severity: 2 },
  { word: "কুত্তা", severity: 2 },
  { word: "বেশ্যা", severity: 3 },
  { word: "মাগি", severity: 3 },
  { word: "হারামজাদা", severity: 3 },
  { word: "চুতমারানি", severity: 3 },
  { word: "খানকি", severity: 3 },
  { word: "বাটপার", severity: 1 },
  { word: "ভন্ড", severity: 1 },
  { word: "fuck", severity: 3 },
  { word: "bitch", severity: 3 },
  { word: "bastard", severity: 2 },
  { word: "asshole", severity: 2 },
  { word: "idiot", severity: 1 },
  { word: "scam", severity: 1 },
];

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:*_~`"'()\[\]{}<>|/\\@#$%^&+=-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Returns the list of banned words found in `text`. */
export async function scanWords(
  text: string,
): Promise<Array<{ word: string; severity: number }>> {
  let dict = SEED_BANNED_WORDS;
  try {
    const rows = await db.select().from(bannedWords);
    if (rows.length) {
      // DB dictionary overrides/extends the seed list
      const map = new Map<string, number>();
      SEED_BANNED_WORDS.forEach((w) => map.set(w.word.toLowerCase(), w.severity));
      rows.forEach((r) => map.set(r.word.toLowerCase(), r.severity));
      dict = Array.from(map, ([word, severity]) => ({ word, severity }));
    }
  } catch {
    /* fall back to seed list */
  }

  const haystack = " " + normalize(text) + " ";
  const hits: Array<{ word: string; severity: number }> = [];
  for (const entry of dict) {
    const w = normalize(entry.word);
    if (!w) continue;
    if (haystack.includes(" " + w + " ") || haystack.includes(w)) {
      hits.push(entry);
    }
  }
  return hits;
}

export type ActiveBan = {
  id: number;
  ip: string;
  scope: "7d" | "30d" | "permanent";
  reason: string;
  strikes: number;
  expiresAt: Date | null;
};

/** Returns the active (non-expired) ban for an IP, or null. */
export async function getActiveBan(ip: string): Promise<ActiveBan | null> {
  if (!ip) return null;
  try {
    const now = new Date();
    const rows = await db
      .select()
      .from(ipBans)
      .where(
        and(
          eq(ipBans.ip, ip),
          or(isNull(ipBans.expiresAt), gt(ipBans.expiresAt, now)),
        ),
      )
      .orderBy(desc(ipBans.createdAt))
      .limit(1);
    const b = rows[0];
    return b
      ? {
          id: b.id,
          ip: b.ip,
          scope: b.scope,
          reason: b.reason,
          strikes: b.strikes,
          expiresAt: b.expiresAt ?? null,
        }
      : null;
  } catch {
    return null;
  }
}

/** Count of prior bans for an IP — drives escalation. */
async function priorStrikes(ip: string): Promise<number> {
  try {
    const rows = await db.select().from(ipBans).where(eq(ipBans.ip, ip));
    return rows.length;
  } catch {
    return 0;
  }
}

export function scopeForStrike(strike: number): "7d" | "30d" | "permanent" {
  if (strike <= 1) return "7d";
  if (strike === 2) return "30d";
  return "permanent";
}

/** Issue (or escalate) an automatic IP ban. */
export async function autoBan(
  ip: string,
  reason: string,
): Promise<ActiveBan | null> {
  if (!ip) return null;
  const strike = (await priorStrikes(ip)) + 1;
  const scope = scopeForStrike(strike);
  const expiresAt =
    scope === "permanent" ? null : new Date(Date.now() + BAN_MS[scope]);
  try {
    const [row] = await db
      .insert(ipBans)
      .values({ ip, scope, reason, strikes: strike, auto: true, expiresAt })
      .returning();
    return row
      ? { id: row.id, ip, scope, reason, strikes: strike, expiresAt }
      : null;
  } catch {
    return null;
  }
}

export type Verdict = {
  status: "approved" | "pending" | "blocked";
  flagged: string[];
  auto: boolean;
  banned: ActiveBan | null;
  reason: string;
};

/** Full auto-moderation decision for a comment body. */
export async function moderate(text: string, ip: string): Promise<Verdict> {
  const hits = await scanWords(text);
  if (hits.length === 0) {
    return { status: "approved", flagged: [], auto: true, banned: null, reason: "clean" };
  }
  const maxSeverity = Math.max(...hits.map((h) => h.severity));
  const flagged = Array.from(new Set(hits.map((h) => h.word)));

  if (maxSeverity >= 2) {
    const banned = await autoBan(ip, `আপত্তিকর শব্দ: ${flagged.join(", ")}`);
    return {
      status: "blocked",
      flagged,
      auto: true,
      banned,
      reason: `hard-block (severity ${maxSeverity})`,
    };
  }
  // soft hit → hold for manual review
  return {
    status: "pending",
    flagged,
    auto: true,
    banned: null,
    reason: "soft-hold (severity 1)",
  };
}

/** Best-effort client IP from proxy headers (Vercel-friendly). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    ""
  );
}
