import type { Metadata } from "next";
import VariantGallery from "@/components/admin/VariantGallery";
import { listPosts } from "@/lib/posts";
import { getBrand } from "@/lib/settings";
import { SYNC_SERIES } from "@/lib/data";

export const metadata: Metadata = {
  title: "ভ্যারিয়েন্ট গ্যালারি",
};

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const [posts, brand] = await Promise.all([listPosts(12), getBrand()]);
  const featured = posts.find((p) => p.featured) ?? posts[0];
  const related = posts.filter((p) => p.slug !== featured?.slug).slice(0, 3);
  const last = SYNC_SERIES[SYNC_SERIES.length - 1];

  return (
    <VariantGallery
      posts={posts.filter((p) => p.slug !== featured?.slug)}
      featured={featured}
      related={related}
      accent={brand.accent}
      totals={{
        collected: last.collected,
        published: last.published,
        dupes: last.dupes,
        comments: last.comments,
      }}
    />
  );
}
