import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { sections as sectionsTable, siteSettings } from "@/db/schema";
import { SECTIONS } from "./registry";
import { renumber } from "./order";

export interface SectionRow {
  key: string;
  scope: string;
  zone: string;
  label: string;
  labelEn: string;
  description: string;
  variant: string;
  visible: boolean;
  position: number;
  config: Record<string, unknown>;
}

export interface BrandSettings {
  accent: string;
  motion: boolean;
  density: "compact" | "comfortable" | "spacious";
  siteName: string;
  siteNameEn: string;
}

export const DEFAULT_BRAND: BrandSettings = {
  accent: "#ff5c38",
  motion: true,
  density: "comfortable",
  siteName: "হৈচৈ",
  siteNameEn: "HOICHOI NEWSROOM",
};

function fallbackSections(): SectionRow[] {
  return SECTIONS.map((s, i) => ({
    key: s.key,
    scope: s.scope,
    zone: s.zone,
    label: s.label,
    labelEn: s.labelEn,
    description: s.description,
    variant: s.defaultVariant,
    visible: s.defaultVisible,
    position: i,
    config: {},
  }));
}

function normalize(rows: SectionRow[]): SectionRow[] {
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return renumber(SECTIONS.map((meta, i) => {
    const row = byKey.get(meta.key);
    const variant =
      row && meta.variants.some((v) => v.id === row.variant) ? row.variant : meta.defaultVariant;
    return {
      key: meta.key,
      scope: meta.scope,
      zone: meta.zone,
      label: meta.label,
      labelEn: meta.labelEn,
      description: meta.description,
      variant,
      visible: row ? row.visible : meta.defaultVisible,
      position: row ? row.position : i,
      config: row?.config ?? {},
    };
  }));
}

export async function getAllSections(): Promise<SectionRow[]> {
  try {
    const rows = await db.select().from(sectionsTable).orderBy(asc(sectionsTable.position));
    if (!rows.length) {
      const seeded = fallbackSections();
      await db.insert(sectionsTable).values(seeded);
      return seeded;
    }
    return normalize(
      rows.map((r) => ({
        key: r.key,
        scope: r.scope,
        zone: r.zone,
        label: r.label,
        labelEn: r.labelEn,
        description: r.description,
        variant: r.variant,
        visible: r.visible,
        position: r.position,
        config: (r.config ?? {}) as Record<string, unknown>,
      })),
    );
  } catch {
    return fallbackSections();
  }
}

export async function getBrand(): Promise<BrandSettings> {
  try {
    const rows = await db.select().from(siteSettings).where(eq(siteSettings.id, 1)).limit(1);
    const row = rows[0];
    if (!row) {
      await db.insert(siteSettings).values({ id: 1, brand: DEFAULT_BRAND as unknown as Record<string, unknown> });
      return DEFAULT_BRAND;
    }
    return { ...DEFAULT_BRAND, ...(row.brand as Partial<BrandSettings>), motion: row.motion };
  } catch {
    return DEFAULT_BRAND;
  }
}

/** Ordered, visible sections for a page. `scope` includes the global chrome. */
export async function getRenderPlan(scope: "home" | "post"): Promise<{
  map: Record<string, SectionRow>;
  ordered: SectionRow[];
  brand: BrandSettings;
}> {
  const [all, brand] = await Promise.all([getAllSections(), getBrand()]);
  const relevant = all.filter((s) => s.scope === scope || s.scope === "global");
  const ordered = [...relevant].sort((a, b) => a.position - b.position);
  const map = Object.fromEntries(relevant.map((s) => [s.key, s]));
  return { map, ordered, brand };
}

export function isVisible(map: Record<string, SectionRow>, key: string): boolean {
  return map[key]?.visible ?? true;
}

export function variantOf(map: Record<string, SectionRow>, key: string): string {
  return map[key]?.variant ?? getVariantDefault(key);
}

function getVariantDefault(key: string): string {
  return SECTIONS.find((s) => s.key === key)?.defaultVariant ?? "";
}
