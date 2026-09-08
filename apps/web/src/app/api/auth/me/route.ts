import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ admin: null }, { status: 200 });
  return NextResponse.json({ admin: user });
}