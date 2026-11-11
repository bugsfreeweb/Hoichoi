import { NextResponse } from "next/server";
import { countReviewQueues, getClient, getMediaStorageConfig, recentPipelineRuns } from "@hoichoi/db";
import { listImageProviders } from "@hoichoi/llm";
import { requireApiUser, unauthorized, forbidden } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/system-status — one poll for the console's service strip.
 *
 * Operators had no single place to see whether the machinery behind the buttons
 * was alive: the DB, the text-provider chain, the image-provider chain, the
 * pipeline runner, and media storage were only visible by opening their own
 * pages (or not at all). This returns a compact, non-secret health summary that
 * the shell polls so a broken dependency is announced before a button is pressed
 * and silently fails.
 *
 * No values, only presence/counts. A latency figure is included so "slow" is
 * distinguishable from "down".
 */
export async function GET() {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin" && user.role !== "editor") return forbidden();

  const started = Date.now();
  const services: Array<{
    key: string;
    label: string;
    state: "ok" | "warn" | "down";
    detail: string;
    href: string;
  }> = [];

  // ---- database ----
  let dbOk = true;
  let dbDetail = "";
  let queues: Awaited<ReturnType<typeof countReviewQueues>> | null = null;
  try {
    await getClient().execute("SELECT 1");
    queues = await countReviewQueues();
    dbDetail = `${Date.now() - started} ms`;
  } catch (err) {
    dbOk = false;
    dbDetail = (err as Error).message;
  }
  services.push({
    key: "db",
    label: "ডেটাবেস",
    state: dbOk ? "ok" : "down",
    detail: dbOk ? `সংযোগ ঠিক · ${dbDetail}` : `সংযোগ ব্যর্থ · ${dbDetail}`,
    href: "/admin/setup",
  });

  // ---- text providers ----
  try {
    const rows = await getClient().execute(
      "SELECT provider_key, is_active, is_free_tier, api_key, api_key_env_var FROM llm_providers WHERE COALESCE(purpose,'text') = 'text'",
    );
    const rowsAll = rows.rows as unknown as Array<{
      provider_key: string;
      is_active: number;
      api_key: string | null;
      api_key_env_var: string;
    }>;
    const active = rowsAll.filter((r) => r.is_active);
    const withKey = active.filter((r) => r.api_key || Boolean(r.api_key_env_var && process.env[r.api_key_env_var]));
    services.push({
      key: "text",
      label: "লেখার প্রোভাইডার",
      state: withKey.length > 0 ? "ok" : active.length > 0 ? "warn" : "down",
      detail:
        withKey.length > 0
          ? `${withKey.length} সক্রিয় ও কী-যুক্ত`
          : active.length > 0
            ? `${active.length} সক্রিয়, কিন্তু কোনো কী পাওয়া যায়নি`
            : "কোনো টেক্সট প্রোভাইডার নেই",
      href: "/admin/providers",
    });
  } catch (err) {
    services.push({
      key: "text",
      label: "লেখার প্রোভাইডার",
      state: "down",
      detail: (err as Error).message,
      href: "/admin/providers",
    });
  }

  // ---- image providers ----
  try {
    const images = await listImageProviders();
    const usable = images.filter((p) => p.supportsImage && p.hasKey);
    services.push({
      key: "image",
      label: "ছবির প্রোভাইডার",
      state: usable.length > 0 ? "ok" : images.length > 0 ? "warn" : "down",
      detail:
        usable.length > 0
          ? `${usable.length} টি ছবি তৈরি করতে পারবে (${usable.map((p) => p.model).slice(0, 2).join(", ")})`
          : images.length > 0
            ? "রো আছে কিন্তু কোনোটি প্রস্তুত নয় — কী/মডেল দেখুন"
            : "কোনো ইমেজ-প্রোভাইডার নেই",
      href: "/admin/providers",
    });
  } catch (err) {
    services.push({
      key: "image",
      label: "ছবির প্রোভাইডার",
      state: "down",
      detail: (err as Error).message,
      href: "/admin/providers",
    });
  }

  // ---- pipeline runner ----
  try {
    const runs = await recentPipelineRuns(1);
    const last = runs[0] ?? null;
    const runnerConfigured = Boolean(process.env.GH_TRIGGER_TOKEN && process.env.GH_REPO) || Boolean(process.env.RUNNER_URL);
    let state: "ok" | "warn" | "down" = "warn";
    let detail = "এখনো কোনো রান নেই";
    if (last) {
      if (last.status === "running") {
        state = "ok";
        detail = "একটি রান চলছে…";
      } else if (last.status === "completed" || last.status === "success") {
        state = "ok";
        detail = `শেষ রান সফল · ${new Date(last.started_at).toLocaleString("bn-BD")}`;
      } else {
        state = runnerConfigured ? "warn" : "down";
        detail = `শেষ রান ${last.status}${last.error ? ` · ${last.error.slice(0, 120)}` : ""}`;
      }
    } else if (!runnerConfigured) {
      state = "down";
      detail = "রানার কনফিগার করা নেই (GH_TRIGGER_TOKEN / RUNNER_URL)";
    }
    services.push({ key: "pipeline", label: "পাইপলাইন রানার", state, detail, href: "/admin/setup" });
  } catch (err) {
    services.push({
      key: "pipeline",
      label: "পাইপলাইন রানার",
      state: "warn",
      detail: (err as Error).message,
      href: "/admin/logs",
    });
  }

  // ---- media storage ----
  try {
    const cfg = await getMediaStorageConfig();
    const adapters = (cfg.adapters ?? []).filter((a) => a.enabled !== false);
    services.push({
      key: "storage",
      label: "মিডিয়া স্টোরেজ",
      state: adapters.length > 0 ? "ok" : "warn",
      detail: adapters.length > 0 ? `${adapters.length} অ্যাডাপ্টার সক্রিয়` : "কোনো রিমোট অ্যাডাপ্টার নেই — লোকাল ফোল্ডারে রাখা হবে",
      href: "/admin/settings",
    });
  } catch {
    services.push({
      key: "storage",
      label: "মিডিয়া স্টোরেজ",
      state: "warn",
      detail: "কনফিগারেশন পড়া যায়নি",
      href: "/admin/settings",
    });
  }

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    latencyMs: Date.now() - started,
    services,
    queues,
  });
}
