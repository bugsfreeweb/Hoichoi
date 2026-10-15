import type { Metadata } from "next";
import AdminConsole, { type AdminBrand, type AdminSection } from "@/components/admin/AdminConsole";
import { SECTIONS } from "@/lib/registry";
import { DEFAULT_BRAND, getAllSections, getBrand } from "@/lib/settings";
import { listPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "অ্যাডমিন কনসোল · সেকশন লেআউট",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [sections, brand, posts] = await Promise.all([getAllSections(), getBrand(), listPosts(1)]);

  const byKey = new Map(sections.map((s) => [s.key, s]));
  const initialSections: AdminSection[] = SECTIONS.map((meta, i) => {
    const row = byKey.get(meta.key);
    return {
      key: meta.key,
      scope: meta.scope,
      zone: meta.zone,
      label: meta.label,
      labelEn: meta.labelEn,
      description: meta.description,
      variant: row && meta.variants.some((v) => v.id === row.variant) ? row.variant : meta.defaultVariant,
      visible: row ? row.visible : meta.defaultVisible,
      position: row ? row.position : i,
      config: row?.config ?? {},
    };
  });

  const initialBrand: AdminBrand = { ...DEFAULT_BRAND, ...brand };

  return (
    <AdminConsole
      initialSections={initialSections}
      initialBrand={initialBrand}
      initialDb={sections.length > 0}
      firstPostSlug={posts[0]?.slug ?? "mrbeast-4-35e7b1"}
    />
  );
}
