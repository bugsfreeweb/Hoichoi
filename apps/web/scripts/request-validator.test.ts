/**
 * One shared request validator.
 * ---------------------------------------------------------------------------
 * The routes had grown three different habits: ignore an unknown field, crash on
 * it, or accept a string where a number was meant. The first is the dangerous
 * one — a route that ignores what it does not know can be talked into reading a
 * `role` out of a body it never expected — and the second turns a 400 into a 500
 * in the logs.
 *
 * Run: npx tsx scripts/request-validator.test.ts
 */
import assert from "node:assert/strict";
import { validateBody } from "../src/lib/validate";

let passed = 0;
function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const SPEC = {
  name: { kind: "string", min: 2, max: 10, label: "নাম" },
  count: { kind: "int", min: 1, max: 5, label: "সংখ্যা" },
  live: { kind: "bool", label: "প্রকাশ" },
  mode: { kind: "enum", values: ["a", "b"] as const, label: "মোড" },
  link: { kind: "url", optional: true, nullable: true, label: "লিংক" },
  tags: { kind: "stringArray", max: 3, itemMax: 8, label: "ট্যাগ" },
  note: { kind: "string", optional: true, nullable: true, label: "নোট" },
} as const;

const valid = {
  name: "hello",
  count: 2,
  live: true,
  mode: "a",
  link: "https://example.com/x",
  tags: ["one", " two ", "one"],
};

check("a good body comes back trimmed and de-duplicated", () => {
  const res = validateBody(valid, SPEC);
  assert.ok(res.ok);
  assert.equal(res.value.name, "hello");
  assert.equal(res.value.count, 2);
  assert.deepEqual(
    res.value.tags,
    ["one", "two"],
    "duplicates and padding removed",
  );
});

check("an unknown key is refused, not dropped", () => {
  const res = validateBody({ ...valid, role: "admin" }, SPEC);
  assert.ok(!res.ok);
  assert.equal(res.field, "role");
  assert.match(res.error, /অসমর্থিত ফিল্ড/);
});

check("a wrong type is a refusal, never a coercion", () => {
  for (const [field, bad] of [
    ["count", "2"],
    ["count", 2.5],
    ["live", "true"],
    ["live", 1],
    ["name", 42],
  ] as const) {
    const res = validateBody({ ...valid, [field]: bad }, SPEC);
    assert.ok(!res.ok, `${field}=${JSON.stringify(bad)} must fail`);
    assert.equal(res.field, field);
  }
});

check("a bound is a refusal, not a truncation", () => {
  const res = validateBody(
    { ...valid, note: "x".repeat(3000) },
    { ...SPEC, note: { kind: "string", max: 300 } },
  );
  assert.ok(!res.ok);
  assert.match(res.error, /সর্বোচ্চ 300/);
});

check("the error names the field and never echoes the value", () => {
  const res = validateBody(
    { ...valid, name: "s3cr3t-value" },
    { ...SPEC, name: { kind: "string", max: 4, label: "নাম" } },
  );
  assert.ok(!res.ok);
  assert.ok(
    !res.error.includes("s3cr3t"),
    "a value may be a secret; only the field is named",
  );
  assert.match(res.error, /^নাম: /);
});

check("a missing required field says so, in Bangla", () => {
  const { name: _drop, ...rest } = valid;
  const res = validateBody(rest, SPEC);
  assert.ok(!res.ok);
  assert.equal(res.field, "name");
  assert.match(res.error, /আবশ্যক/);
});

check("an optional nullable field accepts null and means null", () => {
  const res = validateBody({ ...valid, link: null, note: null }, SPEC);
  assert.ok(res.ok);
  assert.equal(res.value.link, null);
  assert.equal(res.value.note, null);
});

check("an optional field that is absent stays absent", () => {
  const res = validateBody({ ...valid }, SPEC);
  assert.ok(res.ok);
  assert.equal(res.value.note, undefined);
});

check(
  "a non-http link is refused; an empty optional link is not a link",
  () => {
    const bad = validateBody({ ...valid, link: "javascript:alert(1)" }, SPEC);
    assert.ok(!bad.ok);
    assert.equal(bad.field, "link");
    const empty = validateBody({ ...valid, link: "" }, SPEC);
    assert.ok(empty.ok);
    assert.equal(empty.value.link, null);
  },
);

check(
  "an enum outside its vocabulary is refused and lists the vocabulary",
  () => {
    const res = validateBody({ ...valid, mode: "publish" }, SPEC);
    assert.ok(!res.ok);
    assert.match(res.error, /a, b/);
  },
);

check("a list of the wrong shape fails once, at the field", () => {
  for (const bad of ["one,two", [1, 2], { 0: "one" }]) {
    const res = validateBody({ ...valid, tags: bad }, SPEC);
    assert.ok(!res.ok);
    assert.equal(res.field, "tags");
  }
});

check("too many list items is a refusal, not a silent cut", () => {
  const res = validateBody({ ...valid, tags: ["a", "b", "c", "d"] }, SPEC);
  assert.ok(!res.ok);
  assert.match(res.error, /সর্বোচ্চ 3/);
});

check("a body that is not an object fails once, at the top", () => {
  for (const payload of [null, undefined, [], "text", 42, true]) {
    const res = validateBody(payload, SPEC);
    assert.ok(!res.ok);
    assert.equal(res.field, "");
  }
});

check("an empty spec accepts an empty body and refuses anything else", () => {
  assert.ok(validateBody({}, {}).ok);
  const res = validateBody({ anything: 1 }, {});
  assert.ok(!res.ok);
});

console.log(`\nrequest validator: ${passed} checks passed`);
