import { createHmac } from "node:crypto";
import { recordAudit } from "@hoichoi/db";
import type { AdminUser } from "@hoichoi/shared-types";

/**
 * Request-side audit helper.
 *
 * Two rules keep this honest:
 *  1. It never throws. A audit-table problem must not fail an action the operator
 *     already completed; the returned boolean lets the caller log a miss.
 *  2. It never accepts a secret. `metadata` is for field names, counts and small
 *     identifiers — the table is readable by every admin.
 */

function ipHash(req: Request | undefined): string | null {
  if (!req) return null;
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";
  if (!ip) return null;
  const secret = process.env.ADMIN_AUTH_SECRET ?? "hoichoi-audit";
  return createHmac("sha256", secret).update(ip).digest("hex").slice(0, 32);
}

export interface AuditWrite {
  /** Dotted verb, e.g. "post.update" or "provider.delete". */
  action: string;
  entityType: string;
  entityId?: string | number | null;
  /** One sentence a human will read in /admin/audit. Bangla or English, not both. */
  summary: string;
  metadata?: Record<string, unknown>;
}

export async function audit(
  user: Pick<AdminUser, "email" | "role"> & { user_id?: string },
  write: AuditWrite,
  req?: Request,
): Promise<boolean> {
  try {
    return await recordAudit({
      actorId: user.user_id ?? null,
      actorEmail: user.email,
      actorRole: user.role,
      action: write.action,
      entityType: write.entityType,
      entityId: write.entityId === undefined || write.entityId === null ? null : String(write.entityId),
      summary: write.summary,
      metadata: write.metadata ?? null,
      ipHash: ipHash(req),
    });
  } catch {
    return false;
  }
}

/** Field-level diff for `metadata`: only the names that actually changed. */
export function changedFields(before: Record<string, unknown>, after: Record<string, unknown>): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const out: string[] = [];
  for (const key of keys) {
    const a = before[key];
    const b = after[key];
    if (a === b) continue;
    if (a === null && b === undefined) continue;
    if (typeof a === "string" && typeof b === "string" && a === b) continue;
    out.push(key);
  }
  return out.sort();
}
