"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PersonFields, bosKisi, toDogum, type Kisi } from "@/components/birth-form";

type Olay = { tarih: string; aciklama: string };
type Danisan = {
  ad: string; tarih: string; saat: string; yer: string; saatKesin: "kesin" | "yaklasik" | "bilinmiyor";
  cinsiyet?: string; meslek?: string; iliski?: string; sorular?: string; olaylar?: Olay[]; astrologNot?: string;
};
type Rapor = {
  id: string; slug: string; urunAd: string; durum: "olusturuluyor" | "hazir" | "hata"; dosya?: string; hata?: string;
  iade?: boolean; jeton: number; tarih: string; hazirTarih?: string; silmeTarih: string; danisan: Danisan;
};
type Hareket = { id: string; tip: "yukleme" | "kullanim" | "iade" | "duzeltme"; miktar: number; aciklama: string; tarih: string };
type Urun = { slug: string; ad: string; jeton: number; aktif: boolean; aciklama: string };
type Veri = { bakiye: number; hareketler: Hareket[]; raporlar: Rapor[]; urunler: Urun[]; profil: { ad: string; marka?: string } | null; saklamaGun: number };

// Form sınırları (sunucu da aynı sınırları uygular: api/pro/raporlar)
const SORU_MAX = 5, SORU_KARAKTER = 150, OLAY_KARAKTER = 100, NOT_KARAKTER = 500;
const inputCls = "w-full rounded-xl border border-gold/20 bg-night-deep px-4 py-2.5 text-parchment placeholder:text-parchment/35 outline-none transition-colors focus:border-gold/55";
const labelCls = "mb-1.5 block text-xs uppercase tracking-[0.15em] text-parchment/55";
const tarihTR = (iso?: string) => {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }); } catch { return iso.slice(0, 10); }
};
const saatTR = (iso: string) => {
  try { return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; }
};

// Doğum yerini forma geri yükle ("İl / İlçe" ya da "Şehir, Ülke")
function kisiFromDanisan(d: Danisan): Kisi {
  const k = bosKisi();
  k.ad = d.ad.slice(0, 25); k.tarih = d.tarih; k.saat = d.saat;
  if (d.yer.includes("/") || !d.yer.includes(",")) {
    const [il, ilce] = d.yer.split("/").map((x) => x.trim());
    k.il = il || ""; k.ilce = ilce || "";
  } else {
    const i = d.yer.lastIndexOf(",");
    k.yurtdisi = true; k.sehir = d.yer.slice(0, i).trim(); k.ulke = d.yer.slice(i + 1).trim();
  }
  return k;
}

const ETAP = ["Gökyüzü hesaplanıyor", "Açılar ve kalıplar çıkarılıyor", "12 aylık transitler taranıyor", "Derin yorum yazılıyor", "Seans rehberi hazırlanıyor", "PDF dizgisi yapılıyor"];
function Uretiliyor({ bas }: { bas: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const sn = Math.max(0, Math.floor((now - new Date(bas).getTime()) / 1000));
  const etap = ETAP[Math.min(ETAP.length - 1, Math.floor(sn / 45))];
  return (
    <span className="inline-flex items-center gap-2 text-xs text-sky-300">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-300" />
      {etap}… <span className="text-parchment/40">{Math.floor(sn / 60)}:{String(sn % 60).padStart(2, "0")}</span>
    </span>
  );
}

const getir = (): Promise<Veri | null> =>
  fetch("/api/pro/raporlar").then((r) => r.json()).then((d) => (d.error ? null : d)).catch(() => null);

export function AstrologPanel({ email }: { email: string }) {
  const [v, setV] = useState<Veri | null>(null);
  const [form, setForm] = useState(false);
  const [onDolu, setOnDolu] = useState<Danisan | null>(null);
  const [q, setQ] = useState("");
  const [hareketAcik, setHareketAcik] = useState(false);

  const yukle = useCallback(() => getir().then((d) => { if (d) setV(d); }), []);
  useEffect(() => {
    let aktif = true;
    getir().then((d) => { if (aktif && d) setV(d); });
    return () => { aktif = false; };
  }, []);
  const uretimde = !!v?.raporlar.some((r) => r.durum === "olusturuluyor");
  useEffect(() => {
    if (!uretimde) return;
    const i = setInterval(yukle, 5000);
    return () => clearInterval(i);
  }, [uretimde, yukle]);

  const liste = useMemo(() => {
    const s = q.trim().toLocaleLowerCase("tr");
    const all = v?.raporlar ?? [];
    return s ? all.filter((r) => r.danisan.ad.toLocaleLowerCase("tr").includes(s) || r.urunAd.toLocaleLowerCase("tr").includes(s)) : all;
  }, [v, q]);

  const sil = async (r: Rapor) => {
    if (!confirm(`${r.danisan.ad} için raporu ve danışan bilgilerini kalıcı olarak silmek istiyor musun?`)) return;
    const res = await fetch("/api/pro/raporlar", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id }) });
    const d = await res.json();
    if (!res.ok) alert(d.error || "Silinemedi.");
    yukle();
  };

  const ad = v?.profil?.marka || v?.profil?.ad || "";

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-gold/15 pb-7">
        <div>
          <span className="text-xs uppercase tracking-[0.25em] text-gold-bright/70">Astrolog Paneli</span>
          <h1 className="mt-2 font-display text-4xl font-semibold text-parchment">{ad ? `Hoş geldin, ${ad}` : "Hoş geldin"}</h1>
          <p className="mt-1 text-parchment/60">{email}</p>
        </div>
        <button
          onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); location.href = "/"; }}
          className="rounded-full border border-gold/25 px-4 py-2 text-sm text-parchment/70 transition-colors hover:border-gold/50 hover:text-gold-bright"
        >
          Çıkış yap
        </button>
      </header>

      <div className="mt-8 grid gap-5 lg:grid-cols-3 lg:items-start">
        {/* Sol: jeton */}
        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-night to-night-deep p-6">
            <div className="text-xs uppercase tracking-[0.2em] text-parchment/55">Jeton bakiyen</div>
            <div className="mt-2 flex items-end gap-2">
              <span className="font-body text-6xl font-semibold text-gold-bright">{v ? v.bakiye : "…"}</span>
              <span className="mb-2 text-parchment/55">jeton</span>
            </div>
            <p className="mt-3 text-sm text-parchment/65">1 jeton = 1 Natal Pro rapor. Üretim başarısız olursa jeton otomatik iade edilir.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => { setOnDolu(null); setForm(true); }}
                disabled={!v || v.bakiye < 1}
                className="rounded-full bg-gold px-5 py-2.5 text-sm font-medium text-night-deep transition-colors hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Yeni Pro Rapor
              </button>
              <Link href="/astrolog-musunuz#paketler" className="rounded-full border border-gold/30 px-5 py-2.5 text-sm text-parchment/80 transition-colors hover:border-gold/60 hover:text-gold-bright">
                Jeton al
              </Link>
            </div>
            {v && v.bakiye < 1 && <p className="mt-3 text-xs text-amber-300/90">Jetonun kalmadı. Yeni rapor için jeton yüklemesi gerekiyor.</p>}
          </section>

          <section className="overflow-hidden rounded-2xl border border-gold/15 bg-night p-5">
            <button onClick={() => setHareketAcik((x) => !x)} className="flex w-full items-center justify-between text-left">
              <h2 className="font-display text-xl font-semibold text-parchment">Jeton hareketleri</h2>
              <span className="text-parchment/50">{hareketAcik ? "−" : "+"}</span>
            </button>
            {hareketAcik && (
              <ul className="scroll-soft mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
                {(v?.hareketler ?? []).length === 0 && <li className="text-sm text-parchment/45">Henüz hareket yok.</li>}
                {(v?.hareketler ?? []).map((h) => (
                  <li key={h.id} className="flex items-start justify-between gap-3 border-b border-gold/10 pb-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate text-parchment/80">{h.aciklama}</div>
                      <div className="text-[11px] text-parchment/40">{tarihTR(h.tarih)} {saatTR(h.tarih)}</div>
                    </div>
                    <span className={`shrink-0 font-body font-semibold ${h.miktar > 0 ? "text-emerald-300" : "text-rose-300"}`}>{h.miktar > 0 ? "+" : ""}{h.miktar}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-gold/15 bg-night p-5 text-sm text-parchment/65">
            <h2 className="mb-2 font-display text-lg font-semibold text-parchment">Nasıl çalışır?</h2>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Danışanın doğum bilgilerini ve varsa ek bilgilerini gir.</li>
              <li>Rapor genellikle 4-8 dakikada hazırlanır; bu sayfayı kapatabilirsin.</li>
              <li>Raporların {v?.saklamaGun ?? 365} gün boyunca burada saklanır; PDF&apos;i indirip istediğin zaman kullanabilirsin.</li>
            </ul>
          </section>
        </div>

        {/* Sağ: form + raporlar */}
        <div className="space-y-5 lg:col-span-2">
          {form && v && (
            <YeniRaporFormu
              urunler={v.urunler}
              bakiye={v.bakiye}
              onDolu={onDolu}
              kapat={() => setForm(false)}
              basarili={() => { setForm(false); yukle(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            />
          )}

          <section className="overflow-hidden rounded-2xl border border-gold/15 bg-night p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-semibold text-parchment">Pro raporlarım</h2>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Danışan ara…" className="w-full max-w-[220px] rounded-full border border-gold/20 bg-night-deep px-4 py-1.5 text-sm text-parchment outline-none placeholder:text-parchment/35 focus:border-gold/50" />
            </div>
            {!v ? (
              <p className="mt-6 text-sm text-parchment/45">Yükleniyor…</p>
            ) : liste.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-gold/20 px-5 py-10 text-center">
                <div className="text-2xl text-gold-bright/50">✶</div>
                <p className="mt-2 text-sm text-parchment/70">{q ? "Aramaya uyan rapor yok." : "Henüz bir Pro rapor oluşturmadın."}</p>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-gold/10">
                {liste.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                    <div className="min-w-0">
                      <div className="font-medium text-parchment/90">{r.danisan.ad} <span className="text-sm font-normal text-parchment/45">· {r.urunAd}</span></div>
                      <div className="text-xs text-parchment/45">
                        {r.danisan.tarih} {r.danisan.saat || "(saat yok)"} · {r.danisan.yer} · oluşturma {tarihTR(r.tarih)}
                      </div>
                      {r.durum === "olusturuluyor" && <div className="mt-1"><Uretiliyor bas={r.tarih} /></div>}
                      {r.durum === "hata" && <div className="mt-1 text-xs text-rose-300/85">{r.hata || "Üretilemedi."}{r.iade ? " (jeton iade edildi)" : ""}</div>}
                      {r.durum === "hazir" && <div className="mt-1 text-[11px] text-parchment/40">Silinme: {tarihTR(r.silmeTarih)}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      {r.durum === "hazir" && r.dosya && (
                        <a href={`/api/files/${r.dosya}`} target="_blank" rel="noopener" className="rounded-full bg-gold px-4 py-1.5 text-xs font-medium text-night-deep transition-colors hover:bg-gold-bright">PDF&apos;i aç</a>
                      )}
                      {r.durum === "hata" && (
                        <button onClick={() => { setOnDolu(r.danisan); setForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-full border border-gold/30 px-4 py-1.5 text-xs text-parchment/80 hover:text-gold-bright">Tekrar oluştur</button>
                      )}
                      {r.durum !== "olusturuluyor" && (
                        <button onClick={() => sil(r)} title="Sil" className="rounded-full border border-rose-400/25 px-3 py-1.5 text-xs text-rose-300/80 hover:border-rose-400/60">Sil</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function YeniRaporFormu({ urunler, bakiye, onDolu, kapat, basarili }: { urunler: Urun[]; bakiye: number; onDolu: Danisan | null; kapat: () => void; basarili: () => void }) {
  const [slug, setSlug] = useState("natal");
  const [k, setK] = useState<Kisi>(() => (onDolu ? kisiFromDanisan(onDolu) : bosKisi()));
  const [saatKesin, setSaatKesin] = useState<Danisan["saatKesin"]>(onDolu?.saatKesin ?? "kesin");
  const [cinsiyet, setCinsiyet] = useState(onDolu?.cinsiyet ?? "");
  const [meslek, setMeslek] = useState(onDolu?.meslek ?? "");
  const [iliski, setIliski] = useState(onDolu?.iliski ?? "");
  // Sorular: en çok 5 ayrı alan × 150 karakter (kayıtta satır satır tek metin)
  const [sorular, setSorular] = useState<string[]>(() => {
    const l = (onDolu?.sorular ?? "").split("\n").map((x) => x.trim()).filter(Boolean).slice(0, SORU_MAX);
    return l.length ? l : [""];
  });
  const [not, setNot] = useState(onDolu?.astrologNot ?? "");
  const [olaylar, setOlaylar] = useState<Olay[]>(onDolu?.olaylar ?? []);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const urun = urunler.find((u) => u.slug === slug);

  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    if (saatKesin !== "bilinmiyor" && !k.saat) { setMsg("Doğum saatini gir ya da “Saat bilinmiyor”u seç."); return; }
    if (!urun?.aktif) { setMsg("Bu rapor türü henüz aktif değil."); return; }
    if (!confirm(`${k.ad} için ${urun.ad} oluşturulacak ve ${urun.jeton} jeton düşülecek. Onaylıyor musun?`)) return;
    setBusy(true);
    const danisan = {
      ...toDogum(k), saatKesin, cinsiyet, meslek, iliski, astrologNot: not,
      sorular: sorular.map((x) => x.trim()).filter(Boolean),
      olaylar: olaylar.filter((o) => o.tarih && o.aciklama.trim()),
    };
    const r = await fetch("/api/pro/raporlar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, danisan }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg(d.error || "Rapor başlatılamadı."); return; }
    basarili();
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-gold/30 bg-night p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold text-parchment">Yeni Pro Rapor</h2>
        <button onClick={kapat} className="text-sm text-parchment/50 hover:text-parchment">Kapat ✕</button>
      </div>
      <form onSubmit={gonder} className="space-y-6">
        <div>
          <label className={labelCls}>Rapor türü</label>
          <div className="grid gap-2 sm:grid-cols-2">
            {urunler.map((u) => (
              <button
                type="button" key={u.slug} disabled={!u.aktif} onClick={() => setSlug(u.slug)}
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${slug === u.slug ? "border-gold/70 bg-gold/10" : "border-gold/15 bg-night-deep"} ${u.aktif ? "hover:border-gold/45" : "cursor-not-allowed opacity-45"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-parchment/90">{u.ad}</span>
                  <span className="text-xs text-gold-bright">{u.aktif ? `${u.jeton} jeton` : "yakında"}</span>
                </div>
                {u.aktif && <div className="mt-1 text-xs text-parchment/50">{u.aciklama}</div>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-3 font-display text-lg font-semibold text-gold-bright">Danışanın doğum bilgileri</h3>
            <PersonFields k={k} set={(p) => setK((s) => ({ ...s, ...p }))} />
            <div className="mt-3">
              <label className={labelCls}>Doğum saati ne kadar kesin?</label>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {([["kesin", "Kesin"], ["yaklasik", "Yaklaşık"], ["bilinmiyor", "Bilinmiyor"]] as const).map(([val, lab]) => (
                  <button type="button" key={val} onClick={() => setSaatKesin(val)}
                    className={`rounded-lg border px-2 py-2 ${saatKesin === val ? "border-gold/70 bg-gold/10 text-gold-bright" : "border-gold/15 text-parchment/65"}`}>{lab}</button>
                ))}
              </div>
              {saatKesin === "bilinmiyor" && <p className="mt-1.5 text-[11px] text-amber-200/70">Saat 12:00 alınır; Yükselen ve evler raporda “doğrulanmalı” olarak işaretlenir.</p>}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="mb-3 font-display text-lg font-semibold text-gold-bright">Ek bilgiler <span className="text-xs font-normal text-parchment/45">(isteğe bağlı)</span></h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Cinsiyet</label>
                <select value={cinsiyet} onChange={(e) => setCinsiyet(e.target.value)} className={inputCls} style={{ colorScheme: "dark" }}>
                  <option value="">Belirtilmedi</option><option>Kadın</option><option>Erkek</option><option>Diğer</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>İlişki durumu</label>
                <select value={iliski} onChange={(e) => setIliski(e.target.value)} className={inputCls} style={{ colorScheme: "dark" }}>
                  <option value="">Belirtilmedi</option><option>Bekâr</option><option>İlişkisi var</option><option>Nişanlı</option><option>Evli</option><option>Boşanmış</option><option>Dul</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Meslek / uğraş</label>
              <input value={meslek} maxLength={80} onChange={(e) => setMeslek(e.target.value)} placeholder="örn. Mimar, kendi ofisi var" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Danışanın odak soruları <span className="normal-case tracking-normal text-parchment/35">(en çok {SORU_MAX}, her biri {SORU_KARAKTER} karakter)</span></label>
              <div className="space-y-2">
                {sorular.map((q, i) => (
                  <div key={i} className="relative">
                    <input value={q} maxLength={SORU_KARAKTER} onChange={(e) => setSorular((l) => l.map((x, j) => (j === i ? e.target.value : x)))}
                      placeholder={i === 0 ? "örn. Kendi işimi kurmak için doğru zaman ne?" : `${i + 1}. soru`} className={inputCls + " pr-24"} />
                    <span className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 text-[10px] text-parchment/35">{q.length}/{SORU_KARAKTER}</span>
                    {sorular.length > 1 && (
                      <button type="button" onClick={() => setSorular((l) => l.filter((_, j) => j !== i))} className="absolute right-3 top-1/2 -translate-y-1/2 text-parchment/40 hover:text-rose-300">✕</button>
                    )}
                  </div>
                ))}
                {sorular.length < SORU_MAX && (
                  <button type="button" onClick={() => setSorular((l) => [...l, ""])} className="text-xs text-gold-bright hover:underline">+ Soru ekle</button>
                )}
              </div>
            </div>
            <div>
              <label className={labelCls}>Astroloğun notu <span className="normal-case tracking-normal text-parchment/35">({not.length}/{NOT_KARAKTER})</span></label>
              <textarea value={not} maxLength={NOT_KARAKTER} onChange={(e) => setNot(e.target.value)} rows={3} placeholder="Seansta bilmen gereken bağlam, gözlemlerin…" className={inputCls} />
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-gold-bright">Önemli yaşam olayları <span className="text-xs font-normal text-parchment/45">(isteğe bağlı, en çok 12)</span></h3>
            {olaylar.length < 12 && (
              <button type="button" onClick={() => setOlaylar((o) => [...o, { tarih: "", aciklama: "" }])} className="rounded-full border border-gold/30 px-3 py-1 text-xs text-parchment/80 hover:text-gold-bright">+ Olay ekle</button>
            )}
          </div>
          <p className="mb-3 text-xs text-parchment/45">Evlilik, taşınma, kayıp, iş değişikliği gibi olayların tarihlerini gir; rapor o tarihlerdeki transitleri ve progresyonları analiz eder (saat doğrulamasına da yardımcı olur).</p>
          <div className="space-y-2">
            {olaylar.map((o, i) => (
              <div key={i} className="grid grid-cols-[150px_1fr_auto] gap-2">
                <input type="date" value={o.tarih} onChange={(e) => setOlaylar((l) => l.map((x, j) => (j === i ? { ...x, tarih: e.target.value } : x)))} className={inputCls + " date-white"} style={{ colorScheme: "dark" }} />
                <input value={o.aciklama} maxLength={OLAY_KARAKTER} onChange={(e) => setOlaylar((l) => l.map((x, j) => (j === i ? { ...x, aciklama: e.target.value } : x)))} placeholder="örn. Evlendi" className={inputCls} />
                <button type="button" onClick={() => setOlaylar((l) => l.filter((_, j) => j !== i))} className="rounded-lg px-3 text-parchment/45 hover:text-rose-300">✕</button>
              </div>
            ))}
          </div>
        </div>

        {msg && <p className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{msg}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gold/10 pt-5">
          <span className="text-sm text-parchment/55">Bakiye: <b className="text-gold-bright">{bakiye}</b> jeton · bu rapor: <b className="text-gold-bright">{urun?.jeton ?? 1}</b> jeton</span>
          <button type="submit" disabled={busy || bakiye < (urun?.jeton ?? 1)} className="rounded-full bg-gold px-7 py-3 text-sm font-medium text-night-deep transition-colors hover:bg-gold-bright disabled:opacity-50">
            {busy ? "Başlatılıyor…" : "Raporu oluştur"}
          </button>
        </div>
      </form>
    </section>
  );
}
