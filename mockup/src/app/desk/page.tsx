import DeskShell from "@/components/desk/shell";
import { DRIVER_LABEL } from "@/db";
import { ensureReady } from "@/lib/db-bootstrap";
import {
  getArticles,
  getCommentStatusCounts,
  getRuns,
  getKeys,
  getSources,
  getLogs,
  lite,
  runLite,
  sourceLite,
  logLite,
} from "@/lib/data";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${BRAND.desk} — Tauri কন্ট্রোলার`,
};

export default async function DeskPage() {
  await ensureReady();
  const [articles, runs, keys, sources, logs, commentCounts] = await Promise.all([
    getArticles(),
    getRuns(),
    getKeys(),
    getSources(),
    getLogs(),
    getCommentStatusCounts(),
  ]);

  return (
    <DeskShell
      articles={articles.map(lite)}
      runs={runs.map(runLite)}
      keys={keys}
      sources={sources.map(sourceLite)}
      logs={logs.map(logLite)}
      commentCounts={commentCounts}
      dbDriver={DRIVER_LABEL}
    />
  );
}
