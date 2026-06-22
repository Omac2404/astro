import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/db";
import { getSessionToken, clearSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  deleteSession(await getSessionToken());
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
