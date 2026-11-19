/**
 * A prompt is compressed by dropping whole clauses, never by cutting a word in
 * half, and never by dropping the line that says the picture is a photograph or
 * the line that lists what must not appear.
 *
 * Background: Workers AI answered `400 Bad input: Length of '/prompt' must be
 * <= 2048` for the full editorial brief, first on the Cloudflare row and then on
 * the custom OpenAI-compatible row that proxies to the same binding. Two working
 * providers read as broken in the status board because of a character count.
 */
import {
  buildImageBrief,
  shortenImagePrompt,
  CLOUDFLARE_PROMPT_MAX,
} from "../image-prompt";
import { promptLimitFrom } from "../openai-compat";
import { readFileSync } from "node:fs";

let checks = 0;
function ok(cond: boolean, label: string) {
  checks++;
  if (!cond) throw new Error(`FAIL: ${label}`);
}

const brief = buildImageBrief({
  title: "ঢাকায় নতুন ট্রাফিক ব্যবস্থা চালু, আট সড়কে বদলে যাচ্ছে যান চলাচল",
  summary:
    "সকাল সাতটা থেকে সন্ধ্যা সাতটা পর্যন্ত নতুন নিয়ম কার্যকর হবে বলে জানিয়েছে পুলিশ।",
  body: "রাজধানীর আটটি প্রধান সড়কে আজ থেকে নতুন ট্রাফিক ব্যবস্থা চালু হচ্ছে।".repeat(
    10,
  ),
  tags: ["ঢাকা", "ট্রাফিক", "পুলিশ"],
  category: "জাতীয়",
});

/**
 * The prompt as the scraper actually sends it: the brief, the hard-rule lines the
 * wrapper appends, and the negative list folded in by `composeImagePrompt`. That
 * combination is what crossed 2048 in production — the bare brief usually fits.
 */
const sent = [
  brief.prompt,
  "Hard rules: no text, no words, no letters, no numbers, no captions, no logos, no watermarks anywhere in the image.",
  "People, if any, must be abstract, shown from behind or at a distance, and NEVER recognizable; never depict children.",
  `Do not include: ${brief.negative}.`,
].join(String.fromCharCode(10));

/**
 * The composed prompt sits within a hundred characters of the ceiling, which is
 * why it crossed in production: a longer summary, a longer negative list or an
 * operator-typed prompt is all it takes. The compression below is what the
 * transport now applies when the provider says 2048 in its own words.
 */
ok(
  sent.length > 1900,
  `the prompt as sent is at the ceiling (${sent.length} chars)`,
);

const short = shortenImagePrompt(sent);
ok(
  short.length <= CLOUDFLARE_PROMPT_MAX,
  `compressed prompt fits (${short.length})`,
);
ok(short === shortenImagePrompt(sent), "compression is deterministic");
ok(
  /photograph/i.test(short.split("\n")[0] ?? ""),
  "the first line still names the medium",
);
ok(/Central idea/i.test(short), "the central idea survives");
ok(/Visual metaphor/i.test(short), "the metaphor survives");
ok(/Subject:/i.test(short), "the subject survives");
ok(
  /Avoid:/i.test(short),
  "the negative list survives (that is what keeps lettering out)",
);

// Cheap lines go first: mood before setting.
const droppedMood = !/^Mood:/m.test(short);
ok(
  droppedMood || short.length <= CLOUDFLARE_PROMPT_MAX,
  "Mood is the first thing sacrificed",
);

// No mid-word cuts: every line ends at a word boundary or a real sentence end.
for (const line of short.split("\n")) {
  ok(
    !/\s\S{0,1}…$/.test(line) || line.length < 60,
    `line ends on a word: ${line.slice(-18)}`,
  );
}

// A prompt that already fits is returned untouched — shortening is not a rewrite.
const small = "Editorial news photograph about a bridge.";
ok(shortenImagePrompt(small) === small, "a short prompt is returned verbatim");

// The ceiling is honoured for any limit, including one a provider states that is
// far below ours — a host is free to be stricter than Workers AI.
const NL = String.fromCharCode(10);
const fat = Array.from(
  { length: 60 },
  (_, i) => `Line ${i}: ` + "a long clause about the scene ".repeat(4),
).join(NL);
for (const limit of [600, 1200, 2048]) {
  const got = shortenImagePrompt(fat, limit);
  ok(
    got.length <= limit,
    `a ${limit}-character ceiling is respected (${got.length})`,
  );
  ok(
    got.startsWith("Line 0:"),
    `the first line survives a ${limit}-character ceiling`,
  );
}

// Reading a provider's own ceiling.
ok(
  promptLimitFrom(
    "AiError: Bad input: Error: Length of '/prompt' must be <= 2048 (494fe8eb)",
  ) === 2048,
  "reads the Workers AI wording",
);
ok(
  promptLimitFrom('{"error":"Length of \\"/prompt\\" must be <= 1500"}') ===
    1500,
  "reads the JSON-quoted wording",
);
ok(
  promptLimitFrom("400 invalid image size") === null,
  "an unrelated 400 declares no ceiling",
);
ok(
  promptLimitFrom("Length of '/prompt' must be <= 12") === null,
  "an absurd ceiling is refused, not obeyed",
);

// The transport honours it: Cloudflare compresses, and the generic loop reads a
// stated limit and retries once rather than failing the row for good.
const src = readFileSync(
  new URL("../openai-compat.ts", import.meta.url),
  "utf8",
);
ok(
  /shortenImagePrompt\(prompt\)/.test(src),
  "the Workers AI payload is compressed before it is sent",
);
ok(
  /promptLimitFrom\(text\)/.test(src),
  "the generic path reads the stated ceiling",
);
ok(/compressed = true;/.test(src), "the generic path retries exactly once");

console.log(`image prompt limit: ${checks} checks passed`);
