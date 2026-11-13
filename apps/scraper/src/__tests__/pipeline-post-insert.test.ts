import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Every `INSERT INTO posts` in the pipeline must bind exactly as many values as
 * it declares.
 *
 * The published-post insert declared 20 columns with 20 `?` placeholders while
 * passing 21 arguments — `media_origin` had been added to the argument list but
 * not to the column list. libsql rejects the whole statement with
 * `SQLITE_UNKNOWN: Number of arguments mismatch: expected 20, got 21`, which
 * surfaced only as a per-source `[rewrite] …` error line. Nothing published,
 * and because the error is caught per post the run still reported success.
 *
 * A unit test on the DB cannot catch this class of bug (it needs a live,
 * migrated schema and a full crawl), but the source can: the statement text is
 * static, so the counts can be checked directly.
 */

const here = dirname(fileURLToPath(import.meta.url));
const pipelinePath = resolve(here, "../pipeline.ts");
const source = readFileSync(pipelinePath, "utf8");

/** Split a JS argument list on top-level commas. */
function splitArgs(list: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let cur = "";
  for (const ch of list) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      cur += ch;
      continue;
    }
    if ("([{".includes(ch)) depth++;
    if (")]}".includes(ch)) depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}

const insertRe = /INSERT INTO posts \(([\s\S]*?)\)\s*VALUES \(([\s\S]*?)\)/g;
let match: RegExpExecArray | null;
let statements = 0;

while ((match = insertRe.exec(source)) !== null) {
  statements++;
  const columns = (match[1] ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const placeholders = ((match[2] ?? "").match(/\?/g) ?? []).length;

  assert.equal(
    columns.length,
    placeholders,
    `INSERT INTO posts at offset ${match.index}: ${columns.length} columns but ${placeholders} placeholders`,
  );

  // The bound values are the `args: [ ... ]` that follows this statement.
  const after = source.slice(match.index);
  const argsStart = after.indexOf("args: [");
  assert.ok(argsStart > -1, `INSERT INTO posts at offset ${match.index} has no args array`);

  // Walk to the matching close bracket so nested arrays/objects do not end it.
  let i = argsStart + "args: [".length;
  let depth = 1;
  let quote: string | null = null;
  for (; i < after.length; i++) {
    const ch = after[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === undefined) break;
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) {
      depth--;
      if (depth === 0) break;
    }
  }
  const args = splitArgs(after.slice(argsStart + "args: [".length, i));

  assert.equal(
    args.length,
    placeholders,
    `INSERT INTO posts at offset ${match.index}: ${placeholders} placeholders but ${args.length} bound arguments — ` +
      `a mismatch here fails the statement at runtime with "Number of arguments mismatch"`,
  );

  for (const column of columns) {
    assert.match(column, /^[a-z_]+$/i, `unexpected column name "${column}"`);
  }
}

assert.ok(statements >= 3, `expected at least 3 INSERT INTO posts statements, found ${statements}`);
console.log(`[scraper] pipeline post inserts: ${statements} statements, columns = placeholders = args`);
