/**
 * Remote media storage — re-exported from @hoichoi/db so the web admin, the
 * desktop and the scraper all push media through the exact same adapter chain.
 * The implementation moved to `@hoichoi/db/storage`; this shim keeps the
 * scraper's existing `./storage` imports working.
 */
export * from "@hoichoi/db/storage";
