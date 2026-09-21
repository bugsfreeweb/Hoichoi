import { getClient } from "../src/client";

/**
 * One-shot demo cleanup: wipes all user-generated / demo *content* and the
 * demo sources (fake-URL feeds that can never scrape successfully) while
 * keeping the configuration the desk needs — real sources, categories, LLM
 * providers, admin users, settings, redaction blocklist.
 *
 * Tables cleared: admin_actions, removal_requests, submitted_pages,
 * reader_reports, comments, posts, raw_posts.
 *
 * Sources: only demo rows (id LIKE 'demo-%', i.e. demo-src-*) are deleted,
 * along with their source_categories junctions; real sources survive.
 *
 * Pipeline runs: only demo runs (id LIKE 'demo-%') are deleted so the real
 * run history survives.
 */
async function main(): Promise<void> {
  const client = getClient();

  const contentTables = [
    "admin_actions",
    "removal_requests",
    "submitted_pages",
    "reader_reports",
    "comments",
    "posts",
    "raw_posts",
  ];

  for (const t of contentTables) {
    await client.execute(`DELETE FROM ${t}`);
    console.log(`cleared  ${t}`);
  }

  const deletedRuns = await client.execute("DELETE FROM pipeline_runs WHERE id LIKE 'demo-%'");
  console.log(`cleared  pipeline_runs (demo only) — ${deletedRuns.rowsAffected ?? deletedRuns.rows?.length ?? 0} rows`);

  const deletedJunctions = await client.execute(
    "DELETE FROM source_categories WHERE source_id IN (SELECT id FROM sources WHERE id LIKE 'demo-%')",
  );
  const deletedSources = await client.execute("DELETE FROM sources WHERE id LIKE 'demo-%'");
  console.log(`cleared  demo sources — ${deletedSources.rowsAffected ?? deletedSources.rows?.length ?? 0} rows (${deletedJunctions.rowsAffected ?? 0} category links)`);

  const kept = await client.execute(
    `SELECT (SELECT COUNT(*) FROM sources) AS sources,
            (SELECT COUNT(*) FROM category_configs) AS categories,
            (SELECT COUNT(*) FROM llm_providers) AS providers,
            (SELECT COUNT(*) FROM settings) AS settings`,
  );
  const row = (kept.rows[0] ?? {}) as Record<string, number>;
  console.log(
    `kept     sources=${row.sources ?? 0} categories=${row.categories ?? 0} providers=${row.providers ?? 0} settings=${row.settings ?? 0}`,
  );
  console.log("done — demo content removed, sources + categories preserved.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});