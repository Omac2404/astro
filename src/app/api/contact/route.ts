import { NextResponse } from "next/server";
import { sendIletisimEvent } from "@/lib/mail";

export const runtime = "nodejs";

// İletişim formu — mesajı iletişim adresine iletir (iletisimForm bildirimi açıksa).
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const ad = String(b.ad ?? "").trim().slice(0, 120);
  const eposta = String(b.eposta ?? "").trim().slice(0, 160);
  const konu = String(b.konu ?? "").trim().slice(0, 200);
  const mesaj = String(b.mesaj ?? "").trim().slice(0, 4000);

  if (!ad || !eposta || !mesaj) return NextResponse.json({ error: "Ad, e-posta ve mesaj gerekli." }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(eposta)) return NextResponse.json({ error: "Geçerli bir e-posta gir." }, { status: 400 });

  sendIletisimEvent(
    "iletisimForm",
    konu ? `İletişim: ${konu}` : "Yeni iletişim mesajı",
    `Gönderen: ${ad} <${eposta}>\nKonu: ${konu || "—"}\n\n${mesaj}`
  );
  return NextResponse.json({ ok: true });
}
