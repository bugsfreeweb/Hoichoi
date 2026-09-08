import { Command } from "commander";
import { runPipeline, type PipelineOptions } from "./pipeline";
import { runArchivePass } from "./archive";
import { getClient, ensureSchema } from "@hoichoi/db";

const program = new Command();

program
  .name("hoichoi-scraper")
  .description("হইচই auto-curation pipeline — scrape, dedup, rewrite, archive")
  .version("1.0.0");

program
  .command("scrape")
  .description("run the full scrape → rewrite → dedup pipeline")
  .option("--mock", "generate sample posts instead of live FB scraping (offline dev/demo)")
  .option("--max-sources <n>", "limit number of sources", "30")
  .option("--max-posts <n>", "limit posts per source", "200")
  .option("--evidence", "capture full-page screenshots as moderation evidence")
  .action(async (opts: { mock?: boolean; maxSources?: string; maxPosts?: string; evidence?: boolean }) => {
    const options: PipelineOptions = {
      mock: opts.mock ?? (process.env.HOICHOI_MOCK === "1"),
      maxSources: Number(opts.maxSources),
      maxPosts: Number(opts.maxPosts),
      evidence: opts.evidence ?? false,
    };
    try {
      await ensureSchema(getClient());
      await runPipeline(options);
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });

program
  .command("archive")
  .description("auto-rollover the 7-day window + purge past retention")
  .action(async () => {
    try {
      await ensureSchema(getClient());
      const report = await runArchivePass();
      console.log(JSON.stringify(report, null, 2));
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });

program
  .command("purge")
  .description("hard-delete archived content past archive_retention_days")
  .action(async () => {
    try {
      await ensureSchema(getClient());
      const { purgeExpired } = await import("./archive");
      const report = await purgeExpired((m) => console.log(m));
      console.log(JSON.stringify(report, null, 2));
    } catch (err) {
      console.error("[fatal]", (err as Error).message);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv).catch((err) => {
  console.error("[fatal]", (err as Error).message);
  process.exitCode = 1;
});