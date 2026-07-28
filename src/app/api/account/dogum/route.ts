import { NextResponse } from "next/server";
import { setMemberDogum, getMemberDogum, type DogumBilgi } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const runtime = "nodejs";

function parseDogum(o: Record<string, unknown> | undefined): DogumBilgi | null {
  if (!o) return null;
  const ad = String(o.ad ?? "").trim().slice(0, 25);
  const tarih = String(o.tarih ?? "").trim();
  const saat = String(o.saat ?? "").trim();
  const yer = String(o.yer ?? "").trim();
  if (!ad || !tarih || !yer) return null;
  return { ad, tarih, saat, yer };
}

// Hesabın doğum bilgisini döndür (kilitli mi anlaşılsın diye)
export async function GET() {
  const u = await currentUser();
  if (!u || u.type !== "member") return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  return NextResponse.json({ dogum: getMemberDogum(u.email) ?? null });
}

// Doğum bilgisini bir kez kaydet (sonra değiştirilemez)
export async function POST(req: Request) {
  const u = await currentUser();
  if (!u || u.type !== "member") return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const dogum = parseDogum(b.dogum);
  if (!dogum) return NextResponse.json({ error: "İsim, doğum tarihi ve yer zorunlu." }, { status: 400 });
  const res = setMemberDogum(u.email, dogum);
  if (!res.ok) {
    return NextResponse.json(
      { error: res.locked ? "Doğum bilgin zaten kayıtlı ve değiştirilemez." : "İşlem başarısız." },
      { status: res.locked ? 409 : 400 }
    );
  }
  return NextResponse.json({ ok: true });
}
