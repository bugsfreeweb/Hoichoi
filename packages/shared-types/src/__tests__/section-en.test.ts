/**
 * Every configurable section must be nameable in English.
 *
 * The design studio lists all 30 sections with a name and one line of help. Those
 * strings live in `SECTION_REGISTRY` in Bangla first — correct, the newsroom is a
 * Bangla newsroom — and `SECTION_EN` supplies the other half. A section added
 * without an English row would print Bangla at an operator reading English, which
 * is exactly the failure this file prevents.
 *
 * The check is data-only: it reads the registry, not the markup, so it also holds
 * for the public site if it ever prints section names.
 */
import { SECTION_REGISTRY, SECTION_EN } from "../index.js";

const BANGLA = /[\u0980-\u09FF]/;
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

check("the registry is not empty", () => {
  if (SECTION_REGISTRY.length < 25) throw new Error(`only ${SECTION_REGISTRY.length} sections`);
});

check("every section has an English name and description", () => {
  const missing = SECTION_REGISTRY.filter((s) => !SECTION_EN[s.key]).map((s) => s.key);
  if (missing.length > 0) throw new Error(`no English row for: ${missing.join(", ")}`);
  for (const meta of SECTION_REGISTRY) {
    if (!meta.labelEn || !meta.descriptionEn) {
      throw new Error(`${meta.key}: the English half did not reach the registry`);
    }
    if (BANGLA.test(meta.labelEn) || BANGLA.test(meta.descriptionEn)) {
      throw new Error(`${meta.key}: the English half contains Bangla`);
    }
  }
});

check("the Bangla half is still Bangla", () => {
  for (const meta of SECTION_REGISTRY) {
    if (!BANGLA.test(meta.label)) throw new Error(`${meta.key}: the Bangla label is not Bangla`);
    if (!BANGLA.test(meta.description)) throw new Error(`${meta.key}: the Bangla description is not Bangla`);
  }
});

check("the two halves say something different", () => {
  // A row copied across (English = Bangla) would pass the emptiness check while
  // leaving an English reader with Bangla text.
  for (const meta of SECTION_REGISTRY) {
    if (meta.label === meta.labelEn) throw new Error(`${meta.key}: the two names are identical`);
  }
});

check("no two sections share one English name", () => {
  const seen = new Map<string, string>();
  for (const meta of SECTION_REGISTRY) {
    const prev = seen.get(meta.labelEn);
    if (prev) throw new Error(`${prev} and ${meta.key} are both "${meta.labelEn}"`);
    seen.set(meta.labelEn, meta.key);
  }
});

console.log(`[shared-types] section English: ${passed} checks passed`);
