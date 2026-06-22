import { NextResponse } from "next/server";
import { redeemGiftCode } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { sendMail } from "@/lib/mail";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u || u.type !== "member") return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const { kod } = await req.json().catch(() => ({}));
  const { error, urunAd } = redeemGiftCode(String(kod ?? ""), u.email);
  if (error) return NextResponse.json({ error }, { status: 400 });
  sendMail(u.email, `Hediye kodun tanımlandı — ${urunAd}`, `"${urunAd}" analizi hesabına tanımlandı. "Analizlerim" alanından doğum bilgilerini girip raporunu oluşturabilirsin.`);
  return NextResponse.json({ ok: true, urunAd });
}
