import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { listSubscribers } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await listSubscribers();
  const csv = [
    "id,email,theme,created_at",
    ...rows.map((r) => `${r.id},"${r.email}","${r.theme ?? ""}","${r.createdAt.toISOString()}"`),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
