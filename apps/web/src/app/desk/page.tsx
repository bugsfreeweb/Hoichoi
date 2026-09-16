import { statsSnapshot, recentPipelineRuns, getAllComments, listPosts, analyticsSnapshot } from "@hoichoi/db";
import DeskShell from "@/components/desk/DeskShell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "হৈচৈ ডেস্ক — Tauri Controller",
};

export default async function DeskPage() {
  const [stats, runs, comments, posts, analytics] = await Promise.all([
    statsSnapshot(),
    recentPipelineRuns(10),
    getAllComments(),
    listPosts(100),
    analyticsSnapshot("all"),
  ]);

  return (
    <DeskShell
      stats={stats}
      runs={runs}
      comments={comments}
      posts={posts}
      sourcesCount={analytics.sources?.watching ?? 0}
    />
  );
}