import { NextResponse } from "next/server";
import { getPaytr, setPaytr, type PaytrConfig } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  if (!u.super) return NextResponse.json({ error: "Yalnızca süper admin." }, { status: 403 });
  const c = getPaytr();
  // Gizli alanları gönderme; sadece kayıtlı olup olmadığını bildir
  const { merchantKey, merchantSalt, ...rest } = c;
  return NextResponse.json({ paytr: { ...rest, hasKey: !!merchantKey, hasSalt: !!merchantSalt } });
}

export async function POST(req: Request) {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  if (!u.super) return NextResponse.json({ error: "Yalnızca süper admin yapılandırabilir." }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const patch: Partial<PaytrConfig> = {};
  if ("aktif" in b) patch.aktif = !!b.aktif;
  if ("merchantId" in b) patch.merchantId = String(b.merchantId ?? "").trim();
  if ("testMod" in b) patch.testMod = !!b.testMod;
  if ("maxTaksit" in b) patch.maxTaksit = Math.max(0, Math.floor(Number(b.maxTaksit) || 0));
  if ("tekCekim" in b) patch.tekCekim = !!b.tekCekim;
  if ("basvuruModu" in b) patch.basvuruModu = !!b.basvuruModu;
  // Gizli alanlar yalnızca doluysa güncellenir (boş bırakılırsa korunur)
  if (typeof b.merchantKey === "string" && b.merchantKey.length > 0) patch.merchantKey = b.merchantKey.trim();
  if (typeof b.merchantSalt === "string" && b.merchantSalt.length > 0) patch.merchantSalt = b.merchantSalt.trim();

  setPaytr(patch);
  return NextResponse.json({ ok: true });
}
