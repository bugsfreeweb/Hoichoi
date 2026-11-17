/**
 * Desktop → gateway wiring, checked as wiring.
 *
 * The behaviour is tested where it lives (`packages/llm/src/__tests__/gateway*`).
 * What this test pins is the joints, because every one of them can be broken
 * silently: the env names must be the ones the vault actually writes, the device
 * token must be accepted before the cookie guard (the desktop has no session),
 * and the actor must reach the ledger as a device rather than as "unknown".
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const repo = path.resolve(import.meta.dirname, "..", "..", "..");
const read = (p: string) => readFileSync(path.join(repo, p), "utf8");

const route = read("apps/web/src/app/api/ai/task/route.ts");
const aiTask = read("apps/web/src/lib/ai-task.ts");
const gateway = read("packages/llm/src/gateway.ts");
const resolver = read("packages/llm/src/resolver.ts");
const pipeline = read("apps/scraper/src/pipeline.ts");
const cli = read("apps/scraper/src/cli.ts");
const vault = read("apps/desktop/src/lib/vault.ts");

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok ${name}`);
}

check("the vault's env names are the gateway's env names", () => {
  const envMap = /const ENV_MAP[\s\S]*?\n\};/.exec(vault)?.[0] ?? "";
  assert.match(envMap, /desk_token:\s*"HOICHOI_DESK_TOKEN"/);
  assert.match(envMap, /desk_base_url:\s*"HOICHOI_DESK_BASE_URL"/);
  assert.match(gateway, /GATEWAY_TOKEN_ENV = "HOICHOI_DESK_TOKEN"/);
  assert.match(gateway, /GATEWAY_URL_ENV = "HOICHOI_DESK_BASE_URL"/);
});

check("both scraper entry points hand the gateway to the resolver", () => {
  // The collector and the CLI backfill both build a resolver; a gateway passed to
  // only one of them would leave half the pipeline still needing keys.
  assert.match(pipeline, /newResolver\(\{ gateway: gatewayProviderFromEnv\(\) \?\? undefined \}\)/);
  assert.match(cli, /newResolver\(\{ gateway: gatewayProviderFromEnv\(\) \?\? undefined \}\)/);
  assert.match(pipeline, /import \{[^}]*gatewayProviderFromEnv[^}]*\} from "@hoichoi\/llm"/);
  assert.match(cli, /import \{[^}]*gatewayProviderFromEnv[^}]*\} from "@hoichoi\/llm"/);
});

check("the resolver tries the gateway before reading any provider row", () => {
  const body = /async rewrite\(ctx[\s\S]*?\n  \}/.exec(resolver)?.[0] ?? "";
  const gatewayAt = body.indexOf("this.opts.gateway");
  const rowsAt = body.indexOf('activeProviders("rewrite")');
  assert.ok(gatewayAt >= 0, "resolver does not consult a gateway");
  assert.ok(rowsAt > gatewayAt, "the gateway must be attempted before the provider chain");
});

check("only a device token that starts with hdc_ is even looked up", () => {
  assert.match(route, /token\.startsWith\("hdc_"\)/);
  assert.match(route, /verifyDeskToken\(token\)/);
  assert.match(route, /verified\.ok && verified\.device/);
});

check("the device is authorised before the cookie guard", () => {
  const deskCall = route.indexOf("await deskActor(req)");
  const guardCall = route.indexOf('requireApiRole("editor")');
  assert.ok(deskCall > 0 && guardCall > 0);
  assert.ok(deskCall < guardCall, "desk token must be checked first: the desktop has no session");
  assert.match(route, /const guard = desk \? null : await requireApiRole\("editor"\)/);
});

check("a wrong or revoked device token still falls through to the cookie guard", () => {
  // deskActor returns null rather than throwing, so a stale token cannot become a
  // 200 and an editor who did nothing wrong is not locked out.
  const fn = /async function deskActor[\s\S]*?\n\}/.exec(route)?.[0] ?? "";
  assert.match(fn, /verified\.ok && verified\.device/);
  assert.match(fn, /actor: `desk:\$\{verified\.device\.label\}`/);
  assert.match(fn, /: null;/);
});

check("the ledger says 'desk:<label>', not the editor's email", () => {
  assert.match(route, /const actor = desk\?\.actor \?\? user\?\.email \?\? "unknown"/);
  assert.match(route, /await audit\(\s*actorRef,/);
  assert.match(route, /runAiTask\(input, \{ actor \}\)/);
  assert.match(aiTask, /actor\?: string \| null/);
  assert.match(aiTask, /actor: opts\.actor \?\? null/);
});

check("the route still refuses extra exports", () => {
  const exported = [...route.matchAll(/export const (\w+)/g)].map((m) => m[1] ?? "");
  for (const name of exported) {
    assert.ok(["runtime", "dynamic"].includes(name), `route exports ${name}; Next would reject it`);
  }
});

check("the gateway request can only carry the closed task vocabulary", () => {
  assert.match(gateway, /task: "draft"/);
  // Comments are allowed to *discuss* prompts; code is not allowed to send one.
  const code = gateway.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.ok(!/prompt\s*:/.test(code), "the client must not send a prompt field");
  assert.ok(!/model\s*:/.test(code), "the client must not choose a model");
  // The endpoint's own validator is the other half of that promise.
  const taskModule = read("packages/llm/src/task.ts");
  assert.match(taskModule, /"draft"/);
});

check("a device gets its own, larger budget than an author", () => {
  // One run rewrites every collected post: the 20/hour authoring budget would
  // refuse the second source of a twenty-post run and look like an outage.
  assert.match(route, /desk\s*\? await limitRequest\(req, \{ \.\.\.LIMITS\.deskAiTask, discriminator: desk\.label \}\)/);
  assert.match(route, /: await limitRequest\(req, LIMITS\.aiTask\)/);
  const limits = read("apps/web/src/lib/rate-limit.ts");
  const desk = Number(/deskAiTask: \{[^}]*limit: (\d+)/.exec(limits)?.[1] ?? 0);
  const author = Number(/aiTask: \{[^}]*limit: (\d+)/.exec(limits)?.[1] ?? 0);
  assert.ok(desk >= author * 10, `desk budget ${desk} must dwarf the authoring budget ${author}`);
});

check("a gateway failure never becomes a blank draft", () => {
  const body = /async rewrite\(ctx[\s\S]*?\n  \}\n/.exec(gateway)?.[0] ?? "";
  assert.match(body, /if \(!title \|\| !draft\)/);
  assert.match(body, /bad_output/);
});

console.log(`\nai-gateway-desk: ${passed} checks passed`);
