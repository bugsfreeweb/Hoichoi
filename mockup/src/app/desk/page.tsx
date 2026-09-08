import DeskShell from "@/components/desk/shell";
import { DRIVER_LABEL } from "@/db";
import {
  getArticles,
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
  const [articles, runs, keys, sources, logs] = await Promise.all([
    getArticles(),
    getRuns(),
    getKeys(),
    getSources(),
    getLogs(),
  ]);

  return (
    <DeskShell
      articles={articles.map(lite)}
      runs={runs.map(runLite)}
      keys={keys}
      sources={sources.map(sourceLite)}
      logs={logs.map(logLite)}
      dbDriver={DRIVER_LABEL}
    />
  );
}
