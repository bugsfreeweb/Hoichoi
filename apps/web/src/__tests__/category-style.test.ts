import assert from "node:assert/strict";
import { bySortOrder, categoryLabel, categoryTint, readableOn } from "../lib/category-style";

/**
 * Contrast regression.
 *
 * The post page drew its category chip with a hardcoded `text-white` over the
 * category's dot colour. Those dots are admin-editable, so a pale or amber hue
 * turned the chip into unreadable white-on-white on the light theme. Text
 * colour is now derived from the background's WCAG relative luminance.
 */
const contrast = (fg: string, bg: string) => {
  const lum = (hex: string) => {
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const ch = [0, 2, 4].map((i) => {
      const s = parseInt(full.slice(i, i + 2), 16) / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
  };
  const a = lum(fg);
  const b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

// Every seeded category dot, plus a deliberately pale admin choice.
for (const dot of ["#2563eb", "#d2202c", "#0d9488", "#d97706", "#fbbf24", "#e9e2cf", "#ffffff"]) {
  const fg = readableOn(dot);
  const ratio = contrast(fg, dot);
  assert.ok(
    ratio >= 4.5,
    `${fg} on ${dot} is only ${ratio.toFixed(2)}:1 — needs 4.5:1 for body text`,
  );
}

// A pale hue must not get white text (the original bug).
assert.equal(readableOn("#fbbf24"), "#000000");
assert.equal(readableOn("#0a0c10"), "#ffffff");
// A missing or unparseable colour falls back to white on a dark chip.
assert.equal(readableOn(null), "#ffffff");
assert.equal(readableOn("not-a-colour"), "#ffffff");
assert.equal(readableOn("#abc"), readableOn("#aabbcc"), "3-digit hex must expand");

/** The DB dot wins over the built-in fallback. */
assert.equal(
  categoryTint("missing-children", [{ slug: "missing-children", dot: "ff00aa" }]),
  "#ff00aa",
);
/** A DB dot stored with a leading '#' must not produce '##ff00aa'. */
assert.equal(
  categoryTint("missing-children", [{ slug: "missing-children", dot: "#ff00aa" }]),
  "#ff00aa",
);
/** Unknown slugs still get a stable colour instead of undefined. */
assert.match(categoryTint("brand-new-category", []), /^#[0-9a-f]{6}$/i);

/** The DB name wins, so an admin rename reaches the page. */
assert.equal(
  categoryLabel("missing-children", [
    { slug: "missing-children", displayNameBn: "নিখোঁজ শিশু · নতুন নাম", displayNameEn: "x" },
  ]),
  "নিখোঁজ শিশু · নতুন নাম",
);
assert.equal(categoryLabel("missing-children", null), "নিখোঁজ শিশু");
assert.equal(categoryLabel("unknown-slug", null), "unknown-slug");

/** Admin sort order is respected, then Bengali name. */
const sorted = bySortOrder([
  { slug: "b", displayNameBn: "ব", sortOrder: 2 },
  { slug: "a", displayNameBn: "অ", sortOrder: 2 },
  { slug: "c", displayNameBn: "আ", sortOrder: 1 },
]);
assert.deepEqual(
  sorted.map((s) => s.slug),
  ["c", "a", "b"],
  "sortOrder first, then Bengali name",
);
// The input must not be mutated.
assert.equal(
  bySortOrder([{ slug: "z", sortOrder: 9 }, { slug: "y", sortOrder: 1 }])[0]?.slug,
  "y",
);

console.log("[test] category style checks passed");
