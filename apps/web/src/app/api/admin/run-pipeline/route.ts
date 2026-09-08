import { NextResponse } from "next/server";
import { requireApiUser, unauthorized, forbidden } from "@/lib/auth";

/**
 * ম্যানুয়াল পাইপলাইন ট্রিগার।
 * - হোস্টেড/CI রানার: `RUNNER_URL` অথবা GitHub Personal Token + repo dispatch।
 * - না থাকলে 501 — লোকালি চালান: `pnpm scrape` অথবা `pnpm --filter scraper scrape --mock`।
 */
export async function POST() {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin" && user.role !== "editor") return forbidden();

  const runnerUrl = process.env.RUNNER_URL;
  if (runnerUrl) {
    try {
      const res = await fetch(runnerUrl, { method: "POST", body: JSON.stringify({ trigger: "manual" }) });
      return NextResponse.json({ ok: res.ok, deployed: true });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 502 });
    }
  }

  const ghToken = process.env.GH_TRIGGER_TOKEN;
  const repo = process.env.GH_REPO;
  if (ghToken && repo) {
    const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
      method: "POST",
      headers: { authorization: `Bearer ${ghToken}`, "content-type": "application/json" },
      body: JSON.stringify({ event_type: "run-pipeline" }),
    });
    return NextResponse.json({ ok: res.ok, deployed: true });
  }

  return NextResponse.json(
    {
      ok: false,
      error: "serverless runner not configured — run `pnpm scrape` locally or set RUNNER_URL / GH_TRIGGER_TOKEN",
      local: true,
    },
    { status: 501 },
  );
}