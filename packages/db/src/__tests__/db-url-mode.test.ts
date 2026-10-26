import assert from "node:assert/strict";
import { isRemoteDatabaseUrl } from "../client";

assert.equal(isRemoteDatabaseUrl("libsql://demo.turso.io"), true);
assert.equal(isRemoteDatabaseUrl("https://example.com/db"), true);
assert.equal(isRemoteDatabaseUrl("file:./data/hoichoi.db"), false);
assert.equal(isRemoteDatabaseUrl(null), false);

console.log("db-url-mode: checks passed");
