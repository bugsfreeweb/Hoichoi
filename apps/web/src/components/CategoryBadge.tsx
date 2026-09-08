import Link from "next/link";
import type { CategoryMeta, CategorySlug } from "@hoichoi/shared-types";
import { CATEGORY_DEFAULT_COLORS } from "@/lib/categories";

export function CategoryBadge({
  slug,
  cats,
  size = "sm",
}: {
  slug: CategorySlug;
  cats?: CategoryMeta[];
  size?: "sm" | "lg";
}) {
  const meta = cats?.find((c) => c.slug === slug);
  const label = meta?.displayNameBn ?? slug;
  const color = meta?.dot ? `#${meta.dot}` : CATEGORY_DEFAULT_COLORS[slug] ?? "#4a4a4a";
  return (
    <Link
      href={`/category/${slug}`}
      className={
        size === "lg"
          ? "inline-flex items-center gap-1 px-3 py-1 text-[11.5px] font-bold text-white"
          : "inline-flex items-center gap-1 px-2.5 py-1 text-[10.5px] font-bold text-white"
      }
      style={{ background: color }}
    >
      {label}
    </Link>
  );
}