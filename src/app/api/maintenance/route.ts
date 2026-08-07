import { NextResponse } from "next/server";
import { getGenelAyar } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Herkese açık: site bakım modunda mı? (SiteChrome bunu okur)
export async function GET() {
  const a = getGenelAyar();
  return NextResponse.json({
    bakimModu: a.bakimModu, bakimMesaj: a.bakimMesaj, bakimBitis: a.bakimBitis,
    // Header'ın iletişim sekmesi etiketi (mod'a göre "İletişim" | "Reklam ve İşbirliği")
    iletisimEtiket: a.iletisimSayfa.mod === "reklam" ? "Reklam ve İşbirliği" : "İletişim",
    // Mobil menüdeki IG takip butonu için (Genel Ayarlar → Instagram Tanıtımı linki)
    igLink: a.hero.igLink || a.iletisim.instagram || "https://instagram.com",
  });
}
