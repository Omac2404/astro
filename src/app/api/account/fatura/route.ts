import { NextResponse } from "next/server";
import { getMemberFatura, setMemberFatura } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const u = await currentUser();
  if (!u || u.type !== "member") return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  return NextResponse.json({ fatura: getMemberFatura(u.email) ?? null, email: u.email });
}

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u || u.type !== "member") return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const ad = String(b.ad ?? "").trim();
  const email = String(b.email ?? "").trim() || u.email;
  const tel = String(b.tel ?? "").trim();
  if (!ad) return NextResponse.json({ error: "Ad Soyad gerekli." }, { status: 400 });
  const s = (k: string) => String(b[k] ?? "").trim().slice(0, 200);
  setMemberFatura(u.email, {
    ad, email, tel,
    yurtdisi: !!b.yurtdisi,
    il: s("il"), ilce: s("ilce"), ulke: s("ulke"), sehir: s("sehir"), acikAdres: s("acikAdres"),
  });
  return NextResponse.json({ ok: true });
}
