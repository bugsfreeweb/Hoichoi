import "server-only";
import { listCategories, getCategory } from "@hoichoi/db";
import type { CategoryMeta } from "@hoichoi/shared-types";

/** Server-only db-backed category lookups — never import from client code. */
export async function getCategories(): Promise<CategoryMeta[]> {
  try {
    const cats = await listCategories();
    return cats.length > 0 ? cats : [];
  } catch {
    return [];
  }
}

export async function findCategory(slug: string): Promise<CategoryMeta | null> {
  try {
    return await getCategory(slug);
  } catch {
    return null;
  }
}