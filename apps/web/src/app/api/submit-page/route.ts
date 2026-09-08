import { NextRequest, NextResponse } from "next/server";
import { getClient, nowIso } from "@hoichoi/db";
import type { CategorySlug } from "@hoichoi/shared-types";

const PROFILE_RE =
  /\/profile\.php|\/photo\.php|personal\.[a-z]+\.com|ref=bookmarks$/i;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    pageUrl?: string;
    pageName?: string;
    category?: CategorySlug | "";
    submitterEmail?: string;
    submitterName?: string;
    notes?: string;
  } | null;
  if (!body?.pageUrl) {
    return NextResponse.json({ error: "page_url required" }, { status: 400 });
  }
  let url: URL;
  try {
    url = new URL(body.pageUrl);
  } catch {
    return NextResponse.json({ error: "invalid URL" }, { status: 400 });
  }
  if (url.hostname.replace(/^(www|m|mbasic|web)\./, "") !== "facebook.com") {
    return NextResponse.json(
      { error: "please submit a facebook.com page or group URL" },
      { status: 400 },
    );
  }
  if (PROFILE_RE.test(url.pathname)) {
    return NextResponse.json(
      { error: "personal profiles are not accepted — pages/groups only" },
      { status: 400 },
    );
  }

  const client = getClient();
  await client.execute({
    sql: `
      INSERT INTO submitted_pages (id, page_url, page_name, submitter_email, submitter_name, category, notes, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?)
    `,
    args: [
      crypto.randomUUID(),
      url.toString(),
      body.pageName?.trim() || null,
      body.submitterEmail?.trim() || null,
      body.submitterName?.trim() || null,
      body.category || null,
      body.notes?.trim() || null,
      nowIso(),
    ],
  });
  return NextResponse.json({ ok: true });
}