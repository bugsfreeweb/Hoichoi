import { renumber } from "./order";
import { SECTIONS } from "./registry";

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

function allSections(): SectionRow[] {
  const rows = SECTIONS.map((s, i) => ({
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
  return normalize(rows);
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
  return allSections();
}

export async function getBrand(): Promise<BrandSettings> {
  return DEFAULT_BRAND;
}

/** Ordered, visible sections for a page. `scope` includes the global chrome. */
export async function getRenderPlan(scope: "home" | "post"): Promise<{
  map: Record<string, SectionRow>;
  ordered: SectionRow[];
  brand: BrandSettings;
}> {
  const all = await getAllSections();
  const relevant = all.filter((s) => s.scope === scope || s.scope === "global");
  const ordered = [...relevant].sort((a, b) => a.position - b.position);
  const map = Object.fromEntries(relevant.map((s) => [s.key, s]));
  return { map, ordered, brand: DEFAULT_BRAND };
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