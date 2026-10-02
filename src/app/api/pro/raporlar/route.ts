import { NextResponse, after } from "next/server";
import {
  isAstrolog, findMember, jetonBakiye, getJetonHareketleri, getProReportsByEmail, pruneOldProReports,
  proSilmeTarihi, proRaporBaslat, deleteProReport, getProUrun, PRO_URUNLER, getProAyar, type ProDanisan, type ProOlay,
} from "@/lib/db";
import { currentUser } from "@/lib/session";
import { runProGeneration, proKurtar } from "@/lib/pipeline-pro";

export const runtime = "nodejs";
export const maxDuration = 900;

async function astrolog() {
  const u = await currentUser();
  if (!u || u.type !== "member" || !isAstrolog(u.email)) return null;
  return u.email;
}

// Astrolog paneli verisi: bakiye, jeton hareketleri, Pro raporlar, ürünler
export async function GET() {
  const email = await astrolog();
  if (!email) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  pruneOldProReports();
  proKurtar();
  const raporlar = getProReportsByEmail(email).map((r) => ({
    id: r.id, slug: r.slug, urunAd: r.urunAd, durum: r.durum, dosya: r.dosya, hata: r.hata, iade: r.iade,
    jeton: r.jeton, tarih: r.tarih, hazirTarih: r.hazirTarih, silmeTarih: proSilmeTarihi(r).toISOString(),
    danisan: r.danisan,
  }));
  const m = findMember(email);
  return NextResponse.json({
    bakiye: jetonBakiye(email),
    hareketler: getJetonHareketleri(email).slice(0, 60).map(({ admin: _a, ...h }) => (void _a, h)),
    raporlar,
    urunler: PRO_URUNLER,
    profil: m?.astrolog ?? null,
    saklamaGun: getProAyar().saklamaGun,
  });
}

const s = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

function danisanOku(o: Record<string, unknown>): { error?: string; d?: ProDanisan } {
  const ad = s(o.ad, 40);
  const tarih = s(o.tarih, 10);
  const saat = s(o.saat, 5);
  const yer = s(o.yer, 120);
  const saatKesin = (["kesin", "yaklasik", "bilinmiyor"].includes(String(o.saatKesin)) ? o.saatKesin : "kesin") as ProDanisan["saatKesin"];
  if (!ad) return { error: "Danışan adı gerekli." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) return { error: "Geçerli bir doğum tarihi gir." };
  const yil = Number(tarih.slice(0, 4));
  if (yil < 1900 || yil > new Date().getFullYear()) return { error: "Doğum yılı 1900 ile bugün arasında olmalı." };
  if (saatKesin !== "bilinmiyor" && !/^\d{2}:\d{2}$/.test(saat)) return { error: "Doğum saatini gir ya da “Saat bilinmiyor” seç." };
  if (!yer) return { error: "Doğum yeri gerekli." };
  const olaylar: ProOlay[] = (Array.isArray(o.olaylar) ? o.olaylar : [])
    .map((x) => ({ tarih: s((x as ProOlay)?.tarih, 10), aciklama: s((x as ProOlay)?.aciklama, 200) }))
    .filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.tarih) && x.aciklama)
    .slice(0, 12);
  return {
    d: {
      ad, tarih, saat: saatKesin === "bilinmiyor" ? "" : saat, yer, saatKesin,
      cinsiyet: s(o.cinsiyet, 20) || undefined,
      meslek: s(o.meslek, 80) || undefined,
      iliski: s(o.iliski, 60) || undefined,
      sorular: s(o.sorular, 2000) || undefined,
      astrologNot: s(o.astrologNot, 2000) || undefined,
      olaylar: olaylar.length ? olaylar : undefined,
    },
  };
}

// Yeni Pro rapor: jeton düşer, üretim arka planda başlar (başarısızsa jeton iade edilir)
export async function POST(req: Request) {
  const email = await astrolog();
  if (!email) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const urun = getProUrun(String(b.slug ?? "natal"));
  if (!urun) return NextResponse.json({ error: "Geçersiz rapor türü." }, { status: 400 });
  const { error, d } = danisanOku((b.danisan ?? {}) as Record<string, unknown>);
  if (error || !d) return NextResponse.json({ error }, { status: 400 });
  const r = proRaporBaslat(email, urun, d);
  if (r.error || !r.rapor) return NextResponse.json({ error: r.error }, { status: 400 });
  const id = r.rapor.id;
  after(() => runProGeneration(id));
  return NextResponse.json({ ok: true, id, bakiye: jetonBakiye(email) });
}

export async function DELETE(req: Request) {
  const email = await astrolog();
  if (!email) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const { id } = await req.json().catch(() => ({}));
  const r = deleteProReport(String(id ?? ""), email);
  if (r.error) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
