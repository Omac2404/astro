import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ user: await currentUser() });
}
