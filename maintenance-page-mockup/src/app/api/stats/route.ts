import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getStats } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ stats: await getStats() });
}
