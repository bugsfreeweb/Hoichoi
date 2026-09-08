/**
 * Archive lifecycle — moved into @hoichoi/db so the serverless web can reuse
 * it without pulling in Playwright/tsx. This module re-exports it for the
 * scraper CLI (which historically exposed these helpers).
 */
export {
  checkAndArchive,
  purgeExpired,
  runArchivePass,
  type ArchiveReport,
} from "@hoichoi/db/archive";