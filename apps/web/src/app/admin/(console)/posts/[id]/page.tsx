import { notFound } from "next/navigation";
import { getPostById } from "@hoichoi/db";
import { PostEditor } from "@/components/admin/PostEditor";

export const dynamic = "force-dynamic";

export default async function AdminPostEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) notFound();
  return <PostEditor post={post} />;
}