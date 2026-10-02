import { NextResponse } from "next/server";
import {
  getAstrologHesaplari, jetonBakiye, getJetonHareketleri, getProReports, getProAyar, setProAyar,
  astrologHesapKur, astrologRolKaldir, astrologProfilGuncelle, jetonYukle, deleteProReport, proSilmeTarihi,
  pruneOldProReports, type ProAyar,
} from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { proKurtar } from "@/lib/pipeline-pro";

export const runtime = "nodejs";

export async function GET() {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  pruneOldProReports();
  proKurtar();
  const raporlar = getProReports();
  const astrologlar = getAstrologHesaplari().map((m) => {
    const rs = raporlar.filter((r) => r.email === m.email.toLowerCase());
    return {
      email: m.email, kayit: m.kayit, ...(m.astrolog ?? { ad: "" }),
      bakiye: jetonBakiye(m.email),
      rapor: rs.length, hazir: rs.filter((r) => r.durum === "hazir").length,
      maliyetUsd: Number(rs.reduce((t, r) => t + (r.maliyet?.usd ?? 0), 0).toFixed(3)),
    };
  });
  return NextResponse.json({
    astrologlar,
    raporlar: raporlar.map((r) => ({ ...r, silmeTarih: proSilmeTarihi(r).toISOString() })),
    hareketler: getJetonHareketleri().slice(0, 300),
    ayar: getProAyar(),
  });
}

const s = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

export async function POST(req: Request) {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const action = String(b.action ?? "");

  if (action === "hesap") {
    const r = astrologHesapKur(s(b.email), String(b.sifre ?? ""), {
      ad: s(b.ad, 80), tel: s(b.tel, 40) || undefined, marka: s(b.marka, 80) || undefined, not: s(b.not, 500) || undefined,
    });
    if (r.error) return NextResponse.json({ error: r.error }, { status: 400 });
    // İlk jeton yüklemesi (opsiyonel)
    const n = Math.trunc(Number(b.jeton) || 0);
    if (n > 0) jetonYukle(s(b.email), n, s(b.aciklama) || "Açılış yüklemesi", u.email);
    return NextResponse.json({ ok: true, yukseltildi: !!r.yukseltildi });
  }
  if (action === "jeton") {
    const r = jetonYukle(s(b.email), Number(b.miktar), s(b.aciklama), u.email);
    if (r.error) return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  if (action === "profil") {
    const ok = astrologProfilGuncelle(s(b.email), {
      ad: s(b.ad, 80), tel: s(b.tel, 40) || undefined, marka: s(b.marka, 80) || undefined, not: s(b.not, 500) || undefined,
    });
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Astrolog bulunamadı." }, { status: 404 });
  }
  if (action === "rolKaldir") {
    return astrologRolKaldir(s(b.email)) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Astrolog bulunamadı." }, { status: 404 });
  }
  if (action === "ayar") {
    const a = (b.ayar ?? {}) as Partial<ProAyar>;
    const patch: Partial<ProAyar> = {};
    if (a.model === "claude-opus-5-5" || a.model === "claude-fable-5-1") patch.model = a.model;
    if (a.effort === "low" || a.effort === "medium" || a.effort === "high") patch.effort = a.effort;
    if (a.eszaman !== undefined) patch.eszaman = Math.max(1, Math.min(4, Math.trunc(Number(a.eszaman)) || 1));
    if (a.saklamaGun !== undefined) patch.saklamaGun = Math.max(30, Math.min(1095, Math.trunc(Number(a.saklamaGun)) || 365));
    if (Array.isArray(a.paketler)) {
      patch.paketler = a.paketler
        .map((p) => ({ jeton: Math.trunc(Number(p.jeton)) || 0, fiyat: Math.round(Number(p.fiyat)) || 0, etiket: s(p.etiket, 40) || undefined }))
        .filter((p) => p.jeton > 0)
        .slice(0, 6);
    }
    if (a.whatsapp !== undefined) patch.whatsapp = s(a.whatsapp, 40);
    if (a.eposta !== undefined) patch.eposta = s(a.eposta, 120);
    if (a.ornekPdf !== undefined) patch.ornekPdf = s(a.ornekPdf, 300);
    return NextResponse.json({ ok: true, ayar: setProAyar(patch) });
  }
  return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 });
}

export async function DELETE(req: Request) {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const { id } = await req.json().catch(() => ({}));
  const r = deleteProReport(String(id ?? ""));
  if (r.error) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
