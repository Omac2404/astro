"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, PageHead, Badge, StatCard } from "@/components/admin-ui";

type Astrolog = { email: string; kayit: string; ad: string; tel?: string; marka?: string; not?: string; bakiye: number; rapor: number; hazir: number; maliyetUsd: number };
type Rapor = {
  id: string; email: string; urunAd: string; durum: "olusturuluyor" | "hazir" | "hata"; dosya?: string; hata?: string; iade?: boolean;
  jeton: number; tarih: string; hazirTarih?: string; silmeTarih: string;
  danisan: { ad: string; tarih: string; saat: string; yer: string; saatKesin: string; olaylar?: unknown[]; sorular?: string };
  maliyet?: { usd: number; girdi: number; cikti: number; dusunme?: number; model: string; sure?: number };
};
type Hareket = { id: string; email: string; tip: string; miktar: number; aciklama: string; admin?: string; tarih: string };
type Paket = { jeton: number; hediye?: number; fiyat: number; etiket?: string };
type Ayar = { model: string; effort: string; eszaman: number; saklamaGun: number; paketler: Paket[]; whatsapp: string; eposta: string; ornekPdf: string; sayfaAcik: boolean };

const inp = "w-full rounded-lg border border-gold/20 bg-night px-3 py-2 text-sm text-parchment outline-none placeholder:text-parchment/30 focus:border-gold/55";
const lbl = "mb-1 block text-[11px] uppercase tracking-[0.14em] text-parchment/50";
const TONE = { olusturuluyor: "blue", hazir: "green", hata: "rose" } as const;
const ETIKET = { olusturuluyor: "Üretiliyor", hazir: "Hazır", hata: "Hata" } as const;
const tarih = (iso: string) => { try { return new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return iso; } };
const MODEL_AD: Record<string, string> = { "claude-opus-5-5": "Opus 5.5", "claude-fable-5-1": "Fable 5.1" };

async function post(body: unknown) {
  const r = await fetch("/api/admin/astrolog-pro", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  return r.ok ? { ok: true as const, d } : { ok: false as const, error: d.error || "Hata." };
}

const getir = () => fetch("/api/admin/astrolog-pro").then((r) => r.json()).then((d) => (d.error ? null : d)).catch(() => null);

export default function AstrologProPage() {
  const [astrologlar, setAstrologlar] = useState<Astrolog[]>([]);
  const [raporlar, setRaporlar] = useState<Rapor[]>([]);
  const [hareketler, setHareketler] = useState<Hareket[]>([]);
  const [ayar, setAyar] = useState<Ayar | null>(null);
  const [kurdan, setKurdan] = useState(10);

  const uygula = useCallback((d: { astrologlar: Astrolog[]; raporlar: Rapor[]; hareketler: Hareket[]; ayar: Ayar } | null) => {
    if (!d) return;
    setAstrologlar(d.astrologlar); setRaporlar(d.raporlar); setHareketler(d.hareketler); setAyar(d.ayar);
  }, []);
  const yukle = useCallback(() => getir().then(uygula), [uygula]);
  useEffect(() => {
    let aktif = true;
    getir().then((d) => { if (aktif) uygula(d); });
    return () => { aktif = false; };
  }, [uygula]);
  const uretimde = raporlar.some((r) => r.durum === "olusturuluyor");
  useEffect(() => {
    if (!uretimde) return;
    const i = setInterval(yukle, 6000);
    return () => clearInterval(i);
  }, [uretimde, yukle]);

  const ozet = useMemo(() => {
    const m = raporlar.filter((r) => r.maliyet);
    const usd = m.reduce((t, r) => t + (r.maliyet?.usd ?? 0), 0);
    return { bakiye: astrologlar.reduce((t, a) => t + a.bakiye, 0), usd, ort: m.length ? usd / m.length : 0, n: m.length };
  }, [raporlar, astrologlar]);

  return (
    <div>
      <PageHead title="Astrolog Pro" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Astrolog hesabı" value={astrologlar.length} />
        <StatCard label="Dağıtılmış bakiye" value={ozet.bakiye} hint="kullanılmamış jeton toplamı" tone="amber" />
        <StatCard label="Pro rapor" value={raporlar.length} hint={`${raporlar.filter((r) => r.durum === "hazir").length} hazır · ${raporlar.filter((r) => r.durum === "hata").length} hata`} tone="green" />
        <StatCard label="Ort. API maliyeti" value={`$${ozet.ort.toFixed(3)}`} hint={`${ozet.n} rapor · toplam $${ozet.usd.toFixed(2)}`} tone="blue" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[400px_1fr] xl:items-start">
        <div className="space-y-6">
          <HesapFormu kurdan={kurdan} setKurdan={setKurdan} bitti={yukle} />
          {ayar && <AyarPanel ayar={ayar} kaydedildi={setAyar} />}
        </div>

        <div className="space-y-6">
          <Panel>
            <div className="border-b border-gold/15 px-5 py-3 text-sm font-medium text-parchment/70">Astrologlar</div>
            {astrologlar.length === 0 ? (
              <div className="px-6 py-12 text-center text-parchment/45">Henüz astrolog hesabı yok. Soldaki formdan aç.</div>
            ) : (
              <ul className="divide-y divide-white/5">{astrologlar.map((a) => <AstrologSatir key={a.email} a={a} bitti={yukle} />)}</ul>
            )}
          </Panel>

          <Panel>
            <div className="border-b border-gold/15 px-5 py-3 text-sm font-medium text-parchment/70">Pro raporlar</div>
            {raporlar.length === 0 ? (
              <div className="px-6 py-12 text-center text-parchment/45">Henüz Pro rapor yok.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-[11px] uppercase tracking-wider text-parchment/45">
                    <tr><th className="px-4 py-2.5">Tarih</th><th className="px-4">Astrolog</th><th className="px-4">Danışan</th><th className="px-4">Durum</th><th className="px-4">Model · token</th><th className="px-4">Maliyet</th><th className="px-4"></th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {raporlar.map((r) => (
                      <tr key={r.id} className="align-top">
                        <td className="whitespace-nowrap px-4 py-3 text-parchment/60">{tarih(r.tarih)}<div className="text-[11px] text-parchment/35">{r.id}</div></td>
                        <td className="px-4 py-3 text-parchment/75">{r.email}</td>
                        <td className="px-4 py-3">
                          <div className="text-parchment/90">{r.danisan.ad}</div>
                          <div className="text-[11px] text-parchment/45">{r.danisan.tarih} {r.danisan.saat || "—"} · {r.danisan.yer}{r.danisan.olaylar?.length ? ` · ${r.danisan.olaylar.length} olay` : ""}{r.danisan.sorular ? " · sorulu" : ""}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={TONE[r.durum]}>{ETIKET[r.durum]}</Badge>
                          {r.durum === "hata" && <div className="mt-1 max-w-[220px] text-[11px] text-rose-300/75">{r.hata}{r.iade ? " · iade edildi" : ""}</div>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[12px] text-parchment/60">
                          {r.maliyet ? <>{MODEL_AD[r.maliyet.model] ?? r.maliyet.model}<div className="text-[11px] text-parchment/40">girdi {r.maliyet.girdi.toLocaleString("tr-TR")} · çıktı {r.maliyet.cikti.toLocaleString("tr-TR")}{r.maliyet.sure ? ` · ${Math.round(r.maliyet.sure / 60)} dk` : ""}</div></> : "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-body text-parchment/85">{r.maliyet ? `$${r.maliyet.usd.toFixed(3)}` : "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          {r.dosya && <a href={`/api/files/${r.dosya}`} target="_blank" rel="noopener" className="mr-2 rounded-lg border border-gold/25 px-2.5 py-1 text-xs text-parchment/75 hover:text-gold-bright">PDF</a>}
                          {r.durum !== "olusturuluyor" && (
                            <button
                              onClick={async () => {
                                if (!confirm("Rapor ve danışan verisi kalıcı olarak silinsin mi? (Jeton iadesi yapılmaz.)")) return;
                                await fetch("/api/admin/astrolog-pro", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id }) });
                                yukle();
                              }}
                              className="rounded-lg border border-rose-400/25 px-2.5 py-1 text-xs text-rose-300/80 hover:border-rose-400/60"
                            >Sil</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel>
            <div className="border-b border-gold/15 px-5 py-3 text-sm font-medium text-parchment/70">Jeton hareketleri</div>
            <ul className="scroll-soft max-h-96 divide-y divide-white/5 overflow-y-auto">
              {hareketler.length === 0 && <li className="px-5 py-8 text-center text-sm text-parchment/45">Hareket yok.</li>}
              {hareketler.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="truncate text-parchment/80">{h.aciklama}</div>
                    <div className="text-[11px] text-parchment/40">{tarih(h.tarih)} · {h.email}{h.admin ? ` · ${h.admin}` : ""}</div>
                  </div>
                  <span className={`shrink-0 font-body font-semibold ${h.miktar > 0 ? "text-emerald-300" : "text-rose-300"}`}>{h.miktar > 0 ? "+" : ""}{h.miktar}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function HesapFormu({ kurdan, setKurdan, bitti }: { kurdan: number; setKurdan: (n: number) => void; bitti: () => void }) {
  const [f, setF] = useState({ ad: "", marka: "", email: "", sifre: "", tel: "", not: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg("");
    const r = await post({ action: "hesap", ...f, jeton: kurdan });
    setBusy(false);
    if (!r.ok) { setMsg(r.error); return; }
    setMsg(r.d.yukseltildi ? "Mevcut üye astrolog hesabına yükseltildi ✓" : "Astrolog hesabı açıldı ✓");
    setF({ ad: "", marka: "", email: "", sifre: "", tel: "", not: "" });
    bitti();
  };
  return (
    <Panel className="p-5">
      <h2 className="mb-1 font-display text-xl font-semibold text-parchment">Astrolog hesabı aç</h2>
      <p className="mb-4 text-xs text-parchment/45">Astrolog bu e-posta ve şifreyle sitedeki “Giriş” ekranından girer; paneli otomatik astrolog paneline döner. E-posta zaten üyeyse hesap astroloğa yükseltilir (şifre boş bırakılırsa mevcut şifre korunur).</p>
      <form onSubmit={gonder} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Ad soyad</label><input required value={f.ad} onChange={set("ad")} className={inp} /></div>
          <div><label className={lbl}>Marka / ofis</label><input value={f.marka} onChange={set("marka")} placeholder="Rapor kapağında" className={inp} /></div>
        </div>
        <div><label className={lbl}>E-posta</label><input required type="email" value={f.email} onChange={set("email")} className={inp} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Şifre</label><input value={f.sifre} onChange={set("sifre")} placeholder="en az 6 karakter" className={inp} /></div>
          <div><label className={lbl}>Telefon</label><input value={f.tel} onChange={set("tel")} className={inp} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Açılış jetonu</label><input type="number" min={0} value={kurdan} onChange={(e) => setKurdan(Number(e.target.value))} className={inp} /></div>
          <div><label className={lbl}>Not</label><input value={f.not} onChange={set("not")} placeholder="ör. 50'lik paket, havale" className={inp} /></div>
        </div>
        {msg && <p className="text-sm text-parchment/75">{msg}</p>}
        <button disabled={busy} className="w-full rounded-full bg-gold py-2.5 text-sm font-medium text-night-deep transition-colors hover:bg-gold-bright disabled:opacity-60">{busy ? "…" : "Hesabı aç"}</button>
      </form>
    </Panel>
  );
}

function AstrologSatir({ a, bitti }: { a: Astrolog; bitti: () => void }) {
  const [miktar, setMiktar] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [msg, setMsg] = useState("");
  const yukle = async () => {
    const n = Number(miktar);
    if (!n) { setMsg("Miktar gir."); return; }
    if (!confirm(`${a.email} hesabına ${n > 0 ? "+" : ""}${n} jeton işlenecek. Onaylıyor musun?`)) return;
    const r = await post({ action: "jeton", email: a.email, miktar: n, aciklama });
    if (!r.ok) { setMsg(r.error); return; }
    setMiktar(""); setAciklama(""); setMsg("İşlendi ✓"); bitti();
  };
  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-parchment/90">{a.ad}{a.marka ? <span className="text-parchment/50"> · {a.marka}</span> : null}</div>
          <div className="text-xs text-parchment/50">{a.email}{a.tel ? ` · ${a.tel}` : ""}</div>
          <div className="mt-1 text-xs text-parchment/45">{a.rapor} rapor ({a.hazir} hazır) · API ${a.maliyetUsd.toFixed(2)}{a.not ? ` · ${a.not}` : ""}</div>
        </div>
        <div className="text-right">
          <div className="font-body text-2xl font-semibold text-gold-bright">{a.bakiye}</div>
          <div className="text-[11px] text-parchment/45">jeton</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input type="number" value={miktar} onChange={(e) => setMiktar(e.target.value)} placeholder="+50 / −1" className={inp + " !w-28"} />
        <input value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="Açıklama (ör. 50 paket · havale)" className={inp + " !w-64"} />
        <button onClick={yukle} className="rounded-lg bg-gold px-3 py-2 text-xs font-medium text-night-deep hover:bg-gold-bright">Jeton işle</button>
        <button
          onClick={async () => {
            if (!confirm("Astrolog rolü kaldırılsın mı? Hesap normal üyeye döner; raporlar ve jeton defteri korunur.")) return;
            const r = await post({ action: "rolKaldir", email: a.email });
            if (r.ok) bitti(); else setMsg(r.error);
          }}
          className="rounded-lg border border-rose-400/25 px-3 py-2 text-xs text-rose-300/80 hover:border-rose-400/60"
        >Rolü kaldır</button>
        {msg && <span className="text-xs text-parchment/65">{msg}</span>}
      </div>
    </li>
  );
}

function AyarPanel({ ayar, kaydedildi }: { ayar: Ayar; kaydedildi: (a: Ayar) => void }) {
  const [a, setA] = useState<Ayar>(ayar);
  const [msg, setMsg] = useState("");
  const kaydet = async () => {
    const r = await post({ action: "ayar", ayar: a });
    if (!r.ok) { setMsg(r.error); return; }
    kaydedildi(r.d.ayar); setA(r.d.ayar); setMsg("Kaydedildi ✓");
  };
  const paket = (i: number, k: keyof Paket, v: string) =>
    setA((s) => ({ ...s, paketler: s.paketler.map((p, j) => (j === i ? { ...p, [k]: k === "etiket" ? v : Number(v) } : p)) }));
  return (
    <Panel className="p-5">
      <h2 className="mb-4 font-display text-xl font-semibold text-parchment">Pro ayarları</h2>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Sentez modeli</label>
            <select value={a.model} onChange={(e) => setA({ ...a, model: e.target.value })} className={inp} style={{ colorScheme: "dark" }}>
              <option value="claude-opus-5-5">Claude Opus 5.5</option>
              <option value="claude-fable-5-1">Claude Fable 5.1 (≈2,5× maliyet)</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Düşünme seviyesi</label>
            <select value={a.effort} onChange={(e) => setA({ ...a, effort: e.target.value })} className={inp} style={{ colorScheme: "dark" }}>
              <option value="low">Düşük (ucuz)</option><option value="medium">Orta</option><option value="high">Yüksek (pahalı)</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Eşzamanlı üretim</label><input type="number" min={1} max={4} value={a.eszaman} onChange={(e) => setA({ ...a, eszaman: Number(e.target.value) })} className={inp} /></div>
          <div><label className={lbl}>Saklama (gün)</label><input type="number" min={30} max={1095} value={a.saklamaGun} onChange={(e) => setA({ ...a, saklamaGun: Number(e.target.value) })} className={inp} /></div>
        </div>
        <div>
          <label className={lbl}>Jeton paketleri (satış sayfası) · jeton / hediye / ₺ / etiket</label>
          <div className="space-y-2">
            {a.paketler.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_0.8fr_1.2fr_1.3fr_auto] gap-2">
                <input type="number" value={p.jeton} onChange={(e) => paket(i, "jeton", e.target.value)} placeholder="jeton" className={inp} />
                <input type="number" min={0} value={p.hediye ?? 0} onChange={(e) => paket(i, "hediye", e.target.value)} placeholder="+hediye" title="Hediye jeton" className={inp} />
                <input type="number" value={p.fiyat} onChange={(e) => paket(i, "fiyat", e.target.value)} placeholder="₺" className={inp} />
                <input value={p.etiket ?? ""} onChange={(e) => paket(i, "etiket", e.target.value)} placeholder="etiket" className={inp} />
                <button onClick={() => setA((s) => ({ ...s, paketler: s.paketler.filter((_, j) => j !== i) }))} className="px-2 text-parchment/45 hover:text-rose-300">✕</button>
              </div>
            ))}
            {a.paketler.length < 6 && <button onClick={() => setA((s) => ({ ...s, paketler: [...s.paketler, { jeton: 0, fiyat: 0 }] }))} className="text-xs text-gold-bright hover:underline">+ Paket ekle</button>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>WhatsApp</label><input value={a.whatsapp} onChange={(e) => setA({ ...a, whatsapp: e.target.value })} placeholder="boşsa genel numara" className={inp} /></div>
          <div><label className={lbl}>E-posta</label><input value={a.eposta} onChange={(e) => setA({ ...a, eposta: e.target.value })} placeholder="boşsa iletişim e-postası" className={inp} /></div>
        </div>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-gold/20 bg-night px-3 py-2.5">
          <span>
            <span className="block text-sm text-parchment/85">&quot;Astrolog musunuz?&quot; sayfasını sitede göster</span>
            <span className="block text-[11px] text-parchment/45">Açık: header + footer linki, herkese açık, sitemap. Kapalı: yalnız admin ve astrologlar görür.</span>
          </span>
          <input type="checkbox" checked={!!a.sayfaAcik} onChange={(e) => setA({ ...a, sayfaAcik: e.target.checked })} className="h-4 w-4 accent-[#c2a36b]" />
        </label>
        <div><label className={lbl}>Örnek Pro rapor PDF yolu</label><input value={a.ornekPdf} onChange={(e) => setA({ ...a, ornekPdf: e.target.value })} placeholder="/ornekler/natal-pro.pdf" className={inp} /></div>
        {msg && <p className="text-sm text-parchment/75">{msg}</p>}
        <button onClick={kaydet} className="w-full rounded-full bg-gold py-2.5 text-sm font-medium text-night-deep transition-colors hover:bg-gold-bright">Kaydet</button>
      </div>
    </Panel>
  );
}
