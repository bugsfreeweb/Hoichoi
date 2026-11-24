import { notFound } from "next/navigation";
import { getPostById, latestPosterDesign } from "@hoichoi/db";
import { PostEditor } from "@/components/admin/PostEditor";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function AdminPostEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) notFound();
  // The share preview must know whether a portrait poster already exists;
  // without it the switch would claim 4:5 while showing the landscape image.
  const portrait = await latestPosterDesign(id, "4:5").catch(() => null);
  return (
    <PostEditor
      post={post}
      portraitPath={portrait?.media_path ?? null}
      shareDomain={new URL(siteUrl()).host}
    />
  );
}