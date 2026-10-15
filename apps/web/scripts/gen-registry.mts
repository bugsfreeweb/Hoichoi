/**
 * One-shot generator (dev tooling): transcribes the mockup variant catalog
 * (multi-style-web-mockup/src/lib/registry.ts, copied verbatim into
 * src/lib/mv/registry.ts) into the shared-types SECTION_REGISTRY shape:
 *   section(key, scope, zone, label, description, [variant(...), ...])
 * Run via `pnpm --filter @hoichoi/web exec tsx scripts/gen-registry.mts`.
 * Output is NOT meant to be re-run; it is pasted into shared-types once.
 */
import { SECTIONS, PRESETS, ACCENTS, ZONE_LABELS, SCOPE_LABELS } from "../src/lib/mv/registry";

const out: string[] = [];
out.push("export const SECTION_REGISTRY: SectionMeta[] = [");
for (const s of SECTIONS) {
  const vs = s.variants.map(
    (v) =>
      `    variant(${JSON.stringify(v.id)}, ${JSON.stringify(v.name)}, ${JSON.stringify(v.blurb)}, ${JSON.stringify(v.thumb)}, ${JSON.stringify(v.skin)}),`,
  );
  out.push(`  section(${JSON.stringify(s.key)}, ${JSON.stringify(s.scope)}, ${JSON.stringify(s.zone)}, ${JSON.stringify(s.label)}, ${JSON.stringify(s.description)}, [`);
  out.push(vs.join("\n"));
  out.push(`  ], ${s.defaultVisible}),`);
}
out.push("];");
out.push("");
out.push("export const ZONE_LABELS: Record<SectionZone, { bn: string; en: string }> = " + JSON.stringify(ZONE_LABELS, null, 2).replace(/"bn"/g, "bn").replace(/"en"/g, "en").replace(/{"/g, "{ bn: \"").replace(/'?/g, "'").replace(/"(\w+)":/g, "\"$1\":") + ";");
out.push("");
out.push("export const SCOPE_LABELS: Record<SectionScope, { bn: string; en: string }> = " + JSON.stringify(SCOPE_LABELS, null, 2).replace(/"bn"/g, "bn").replace(/"en"/g, "en").replace(/{"/g, "{ bn: \"").replace(/'?/g, "'").replace(/"(\w+)":/g, "\"$1\":") + ";");
out.push("");
out.push("export const PRESETS: Preset[] = " + JSON.stringify(PRESETS, null, 2) + ";");
out.push("");
out.push("export const ACCENTS: AccentPreset[] = " + JSON.stringify(ACCENTS, null, 2) + ";");

const fs = await import("node:fs");
const path = await import("node:path");
fs.writeFileSync(path.resolve("scripts/registry.gen.txt"), out.join("\n") + "\n", "utf8");
console.log("wrote scripts/registry.gen.txt");