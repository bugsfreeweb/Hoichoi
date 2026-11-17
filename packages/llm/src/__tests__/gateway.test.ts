/**
 * The gateway client, tested as a client: what it sends, what it refuses, and
 * what it maps back. The point of the module is that a runner can produce a
 * draft without holding a provider key, so these checks are mostly about the
 * request never carrying more than it should and the failure never carrying less
 * than an operator needs.
 */
import assert from "node:assert/strict";
import { AiGatewayError, AiGatewayProvider, gatewayConfigFromEnv, gatewayRequestBody, gatewayUrl } from "../gateway";
import type { RewriteContext } from "../types";

let passed = 0;
function check(name: string, fn: () => void | Promise<void>) {
  return (async () => {
    await fn();
    passed++;
    console.log(`  ok ${name}`);
  })();
}

const ctx: RewriteContext = {
  rawText: "পুলিশ জানিয়েছে ঘটনাটি রাত ৯টার দিকে ঘটেছে।",
  sourceName: "পাঠকের টিপ",
  sourcePageName: "হৈচৈ ডেস্ক",
  category: "national",
  categoryConfig: {} as RewriteContext["categoryConfig"],
} as RewriteContext;

/** Record every call so the request itself can be asserted. */
function fakeFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
): { fetch: (url: string, init?: RequestInit) => Promise<Response>; calls: Array<{ url: string; init?: RequestInit }> } {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  return {
    calls,
    fetch: async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return handler(url, init);
    },
  };
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

await check("env needs both halves, and a real URL", () => {
  assert.equal(gatewayConfigFromEnv({}), null);
  assert.equal(gatewayConfigFromEnv({ HOICHOI_DESK_TOKEN: "hdc_x" }), null);
  assert.equal(gatewayConfigFromEnv({ HOICHOI_DESK_BASE_URL: "https://x.test" }), null);
  assert.equal(gatewayConfigFromEnv({ HOICHOI_DESK_BASE_URL: "x.test", HOICHOI_DESK_TOKEN: "hdc_x" }), null);
  const cfg = gatewayConfigFromEnv({ HOICHOI_DESK_BASE_URL: "https://x.test/", HOICHOI_DESK_TOKEN: " hdc_x " });
  assert.deepEqual(cfg, { baseUrl: "https://x.test/", token: "hdc_x" });
});

await check("URL joining never doubles or drops the slash", () => {
  assert.equal(gatewayUrl({ baseUrl: "https://x.test", token: "t" }, "/api/ai/task"), "https://x.test/api/ai/task");
  assert.equal(gatewayUrl({ baseUrl: "https://x.test///", token: "t" }), "https://x.test/api/ai/task");
});

await check("the body is a closed task, not a prompt", () => {
  const body = gatewayRequestBody(ctx);
  assert.equal(body.task, "draft");
  assert.equal(body.text, ctx.rawText);
  assert.equal(body.sourceName, "পাঠকের টিপ");
  assert.equal(body.category, "national");
  // Exactly these keys: an operator cannot smuggle a prompt, a model or a temperature.
  assert.deepEqual(Object.keys(body).sort(), ["category", "sourceName", "task", "text"]);
});

await check("a successful call returns title, summary and body", async () => {
  const f = fakeFetch(() =>
    json(200, { ok: true, result: { title_bn: "শিরোনাম", summary_bn: "সার", body_bn: "বিস্তারিত", safety_flag: "none" } }),
  );
  const provider = new AiGatewayProvider({ baseUrl: "https://x.test", token: "hdc_secret" }, f.fetch);
  const out = await provider.rewrite(ctx);
  assert.equal(out.title_bn, "শিরোনাম");
  assert.equal(out.body_bn, "বিস্তারিত");
  assert.equal(out.safety_flag, "none");
  assert.equal(f.calls.length, 1);
  const call0 = f.calls[0];
  assert.ok(call0, "the client made no request");
  assert.equal(call0.url, "https://x.test/api/ai/task");
  assert.equal(call0.init?.method, "POST");
  const headers = call0.init?.headers as Record<string, string>;
  assert.equal(headers.authorization, "Bearer hdc_secret");
});

await check("the request body carries no provider key", async () => {
  const f = fakeFetch(() => json(200, { ok: true, result: { title_bn: "শ", body_bn: "ব" } }));
  process.env.GOOGLE_API_KEY = "AIza-should-not-travel";
  try {
    const provider = new AiGatewayProvider({ baseUrl: "https://x.test", token: "hdc_secret" }, f.fetch);
    await provider.rewrite(ctx);
    const raw = String(f.calls[0]?.init?.body ?? "");
    assert.ok(!/AIza/.test(raw), "provider key leaked into the request body");
    assert.ok(!/api_key|apiKey|prompt|model/i.test(raw), `unexpected field in request: ${raw}`);
  } finally {
    delete process.env.GOOGLE_API_KEY;
  }
});

await check("an empty summary falls back to the draft's opening", async () => {
  const f = fakeFetch(() => json(200, { ok: true, result: { title_bn: "শ", body_bn: "একটি লম্বা কাহিনি যা সার হিসেবে কাজ করবে" } }));
  const provider = new AiGatewayProvider({ baseUrl: "https://x.test", token: "t" }, f.fetch);
  const out = await provider.rewrite(ctx);
  assert.equal(out.summary_bn, "একটি লম্বা কাহিনি যা সার হিসেবে কাজ করবে");
  assert.equal(out.safety_flag, "none");
});

await check("status codes map onto the resolver's own kinds", async () => {
  const cases: Array<[number, string]> = [
    [401, "auth"],
    [403, "auth"],
    [429, "rate_limit"],
    [400, "bad_output"],
    [422, "bad_output"],
    [500, "network"],
    [503, "network"],
  ];
  for (const [status, kind] of cases) {
    const f = fakeFetch(() => json(status, { ok: false, error: "না" }));
    const provider = new AiGatewayProvider({ baseUrl: "https://x.test", token: "t" }, f.fetch);
    await assert.rejects(
      () => provider.rewrite(ctx),
      (err: unknown) => err instanceof AiGatewayError && err.kind === kind && err.status === status,
      `status ${status} should be ${kind}`,
    );
  }
});

await check("the server's Bangla message reaches the operator, not the token", async () => {
  const f = fakeFetch(() => json(503, { ok: false, error: "কোনো সক্রিয় টেক্সট প্রোভাইডার নেই।" }));
  const provider = new AiGatewayProvider({ baseUrl: "https://x.test", token: "hdc_topsecret" }, f.fetch);
  await assert.rejects(
    () => provider.rewrite(ctx),
    (err: unknown) => {
      assert.ok(err instanceof AiGatewayError);
      assert.match(err.message, /প্রোভাইডার/);
      assert.ok(!err.message.includes("hdc_topsecret"), "token leaked into the error message");
      return true;
    },
  );
});

await check("an incomplete draft is refused, not published blank", async () => {
  for (const result of [{}, { title_bn: "শ" }, { body_bn: "ব" }]) {
    const f = fakeFetch(() => json(200, { ok: true, result }));
    const provider = new AiGatewayProvider({ baseUrl: "https://x.test", token: "t" }, f.fetch);
    await assert.rejects(
      () => provider.rewrite(ctx),
      (err: unknown) => err instanceof AiGatewayError && err.kind === "bad_output",
    );
  }
});

await check("a non-JSON answer is a bad_output, never a crash", async () => {
  const f = fakeFetch(() => new Response("<html>502</html>", { status: 200 }));
  const provider = new AiGatewayProvider({ baseUrl: "https://x.test", token: "t" }, f.fetch);
  await assert.rejects(
    () => provider.rewrite(ctx),
    (err: unknown) => err instanceof AiGatewayError && err.kind === "bad_output",
  );
});

await check("an unknown safety flag degrades to none instead of a bad row", async () => {
  const f = fakeFetch(() => json(200, { ok: true, result: { title_bn: "শ", body_bn: "ব", safety_flag: "weird" } }));
  const provider = new AiGatewayProvider({ baseUrl: "https://x.test", token: "t" }, f.fetch);
  assert.equal((await provider.rewrite(ctx)).safety_flag, "none");
});

await check("a network failure names the gateway, and an abort says deadline", async () => {
  const down = new AiGatewayProvider(
    { baseUrl: "https://x.test", token: "t" },
    async () => {
      throw new Error("getaddrinfo ENOTFOUND x.test");
    },
  );
  await assert.rejects(() => down.rewrite(ctx), /gateway unreachable/);

  const aborted = new AiGatewayProvider(
    { baseUrl: "https://x.test", token: "t" },
    async () => {
      throw new Error("This operation was aborted");
    },
  );
  await assert.rejects(
    () => aborted.rewrite(ctx),
    (err: unknown) => err instanceof AiGatewayError && /deadline/.test(err.message),
  );
});

await check("health check uses GET and never throws", async () => {
  const ok = fakeFetch(() => json(200, { ok: true, tasks: ["draft"] }));
  const provider = new AiGatewayProvider({ baseUrl: "https://x.test", token: "t" }, ok.fetch);
  const healthy = await provider.healthCheck();
  assert.equal(healthy.ok, true);
  assert.equal(ok.calls[0]?.init?.method, "GET");

  const broken = new AiGatewayProvider(
    { baseUrl: "https://x.test", token: "t" },
    async () => {
      throw new Error("boom");
    },
  );
  assert.equal((await broken.healthCheck()).ok, false);
});

await check("embedding and image are not offered, so the chain cannot pretend", () => {
  const provider = new AiGatewayProvider({ baseUrl: "https://x.test", token: "t" }, fakeFetch(() => json(200, {})).fetch);
  assert.equal(provider.supportsEmbeddings, false);
  assert.equal((provider as { supportsImage?: boolean }).supportsImage, undefined);
  assert.equal(provider.providerKey, "custom");
  assert.match(provider.name, /গেটওয়ে/);
});

console.log(`\ngateway: ${passed} checks passed`);
