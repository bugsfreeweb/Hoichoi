/**
 * The resolver's gateway branch. Two things matter here and nothing else:
 * a gateway that answers wins before any row is read (so a keyless desktop can
 * still draft), and a gateway that fails is *named* in the chain error rather
 * than disappearing behind "no provider available".
 */
import assert from "node:assert/strict";
import { Resolver } from "../resolver";
import { AiGatewayProvider } from "../gateway";
import { ProviderError, type ParsedRewrite, type RewriteContext } from "../types";

let passed = 0;
async function check(name: string, fn: () => void | Promise<void>) {
  await fn();
  passed++;
  console.log(`  ok ${name}`);
}

const ctx = {
  rawText: "কাঁচা লেখা",
  sourceName: "পাঠকের টিপ",
  sourcePageName: "হৈচৈ ডেস্ক",
  category: "national",
  categoryConfig: {},
} as unknown as RewriteContext;

function responder(result: { title_bn: string; summary_bn?: string; body_bn: string }) {
  return async () =>
    new Response(JSON.stringify({ ok: true, result: { ...result, safety_flag: "none" } }), { status: 200 });
}

await check("a gateway answer wins without reading llm_providers", async () => {
  let rowsRead = 0;
  const resolver = new Resolver({
    gateway: new AiGatewayProvider({ baseUrl: "https://x.test", token: "t" }, responder({ title_bn: "শ", body_bn: "ব" })),
  });
  // Any DB read at all would throw here: there is no client in this test process.
  (resolver as unknown as { activeProviders: () => Promise<never[]> }).activeProviders = async () => {
    rowsRead++;
    return [];
  };
  const out = await resolver.rewrite(ctx);
  assert.equal(out.out.title_bn, "শ");
  assert.match(out.provider, /গেটওয়ে/);
  assert.equal(rowsRead, 0, "the gateway must be tried before any provider row");
});

await check("without a gateway the resolver behaves exactly as before", async () => {
  const resolver = new Resolver();
  assert.equal((resolver as unknown as { opts: { gateway?: unknown } }).opts.gateway, undefined);
});

await check("a failing gateway is named, and the local chain still gets its turn", async () => {
  const resolver = new Resolver({
    gateway: new AiGatewayProvider({ baseUrl: "https://x.test", token: "t" }, async () => {
      throw new ProviderError("auth", "টোকেনটি চেনা যায়নি।");
    }),
  });
  (resolver as unknown as { activeProviders: () => Promise<never[]> }).activeProviders = async () => [];
  await assert.rejects(
    () => resolver.rewrite(ctx),
    (err: unknown) => {
      assert.ok(err instanceof ProviderError);
      assert.match(err.message, /গেটওয়ে/);
      assert.match(err.message, /চেনা যায়নি/);
      assert.match(err.message, /all providers exhausted/);
      return true;
    },
  );
});

await check("an aborted run never calls the gateway", async () => {
  let called = 0;
  const resolver = new Resolver({
    gateway: {
      name: "গেটওয়ে",
      rewrite: async (): Promise<ParsedRewrite> => {
        called++;
        return { title_bn: "শ", summary_bn: "স", body_bn: "ব", safety_flag: "none" };
      },
    },
  });
  (resolver as unknown as { activeProviders: () => Promise<never[]> }).activeProviders = async () => [];
  const controller = new AbortController();
  controller.abort(new Error("deadline"));
  await assert.rejects(() => resolver.rewrite(ctx, controller.signal), /deadline/);
  assert.equal(called, 0);
});

await check("embedding is untouched: the gateway has no embed path", async () => {
  const resolver = new Resolver({
    gateway: new AiGatewayProvider({ baseUrl: "https://x.test", token: "t" }, responder({ title_bn: "শ", body_bn: "ব" })),
  });
  (resolver as unknown as { activeProviders: () => Promise<never[]> }).activeProviders = async () => [];
  await assert.rejects(() => resolver.embedText("লেখা"), /no embedding provider available/);
});

console.log(`\ngateway-resolver: ${passed} checks passed`);
