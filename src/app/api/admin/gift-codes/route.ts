import { NextResponse } from "next/server";
import { getGiftCodes, createGiftCode, findMember } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { PRODUCTS } from "@/lib/products";
import { sendEvent } from "@/lib/mail";

export const runtime = "nodejs";

export async function GET() {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  return NextResponse.json({ codes: getGiftCodes() });
}

// Hediye kodu oluştur ve istenirse bir müşteriye ilet (e-posta).
export async function POST(req: Request) {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { slug, email } = await req.json().catch(() => ({}));
  const p = PRODUCTS.find((x) => x.slug === slug);
  if (!p) return NextResponse.json({ error: "Ürün seç." }, { status: 400 });

  const hedef = String(email ?? "").trim().toLowerCase();
  // Müşteriye iletilecekse o müşteri sahip olur; değilse kod "havuzda" (sahip boş gibi davranır → admin)
  const sahip = hedef || u.email;
  if (hedef && !findMember(hedef)) return NextResponse.json({ error: "Bu e-postayla bir üye yok." }, { status: 404 });

  const g = createGiftCode(p.slug, p.ad, sahip);
  if (hedef) {
    sendEvent("hediyeKodu", hedef, `Sana bir hediye: ${p.ad}`, `Gökname'de "${p.ad}" analizi için hediye kodun: ${g.kod}\nÜye girişinden sonra "Hediye Kodun Var mı?" alanına girerek analizini açabilirsin.`);
  }
  return NextResponse.json({ ok: true, kod: g.kod });
}
