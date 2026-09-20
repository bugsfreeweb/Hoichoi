// Verify freshly authored Bengali: dangling viramas + tokens absent from the
// pre-edit corpus (staged blobs). ASCII output only.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const esc = (s) => [...s].map((c) => (c.codePointAt(0) > 127 ? "\\u" + c.codePointAt(0).toString(16).padStart(4, "0") : c)).join("");
const BN = /[\u0980-\u09FF]+/g;
const VIRAMA = "\u09cd";

const files = [
  "src/app/api/sync/route.ts",
  "src/components/admin/sync-panel.tsx",
  "src/components/desk/sync-controls.tsx",
  "src/components/home/hero.tsx", "src/components/home/rewrite-slider.tsx",
  "src/components/ticker.tsx", "src/components/ad-slot.tsx",
  "src/app/page.tsx", "src/app/news/[id]/page.tsx", "public/favicon.svg",
];

let dangling = 0;
for (const f of files) {
  readFileSync(f, "utf8").split(/\r?\n/).forEach((line, i) => {
    for (const t of line.match(BN) ?? []) {
      const v = t.indexOf(VIRAMA);
      if (v >= 0 && (v === t.length - 1 || t[v + 1] === VIRAMA)) {
        dangling++;
        console.log("DANGLING", f + ":" + (i + 1), esc(t));
      }
    }
  });
}
console.log("dangling viramas:", dangling);

const staged = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACM"], { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
const corpus = new Set();
for (const p of staged) {
  if (/\.(png|jpe?g|svg|ico|lock|tsbuildinfo)$/i.test(p)) continue;
  try {
    for (const t of execFileSync("git", ["show", ":" + p], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).match(BN) ?? []) corpus.add(t);
  } catch { /* skip */ }
}
console.log("corpus tokens:", corpus.size);
const novel = new Map();
for (const f of files) {
  readFileSync(f, "utf8").split(/\r?\n/).forEach((line, i) => {
    for (const t of line.match(BN) ?? []) if (!corpus.has(t) && !novel.has(t)) novel.set(t, f + ":" + (i + 1));
  });
}
console.log("tokens not in pre-edit corpus (" + novel.size + ") — review each:");
for (const [t, where] of novel) console.log("  " + esc(t) + " [" + [...t].length + "cp] " + where);