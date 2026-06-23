"use client";

import { useCallback, useEffect, useState } from "react";
import { Panel, PageHead, Badge } from "@/components/admin-ui";

const inputCls = "rounded-lg border border-gold/20 bg-night px-3 py-2 text-sm text-parchment placeholder:text-parchment/35 outline-none focus:border-gold/55";
const labelCls = "block text-sm font-medium text-parchment/85";

type Sekme = "genel" | "adminler" | "smtp" | "bildirim" | "sanalpos" | "yasal" | "seo";

export default function AyarlarPage() {
  const [sekme, setSekme] = useState<Sekme>("genel");
  return (
    <div>
      <PageHead title="Yönetim & Ayarlar" />
      <div className="mb-6 flex gap-2 border-b border-gold/15">
        {([["genel", "Genel Ayarlar"], ["adminler", "Adminler"], ["smtp", "SMTP Ayarları"], ["bildirim", "E-posta Bildirimleri"], ["sanalpos", "Sanal POS"], ["yasal", "Yasal Sayfalar"], ["seo", "SEO ve Sitemap"]] as const).map(([t, l]) => (
          <button
            key={t}
            onClick={() => setSekme(t)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${sekme === t ? "border-gold text-gold-bright" : "border-transparent text-parchment/55 hover:text-parchment"}`}
          >
            {l}
          </button>
        ))}
      </div>
      {sekme === "genel" && <GenelBolum />}
      {sekme === "adminler" && <AdminlerBolum />}
      {sekme === "smtp" && <SmtpBolum />}
      {sekme === "bildirim" && <BildirimBolum />}
      {sekme === "sanalpos" && <SanalPosBolum />}
      {sekme === "yasal" && <YasalBolum />}
      {sekme === "seo" && <SeoBolum />}
    </div>
  );
}

// ---------------- SEO ve Sitemap ----------------
type SeoSayfa = { yol: string; ad: string; baslik: string; aciklama: string; anahtar: string; og: string; oncelik: number; siklik: string; sitemap: boolean; noindex: boolean };
type Seo = { siteUrl: string; favicon: string; sayfalar: SeoSayfa[]; yasalSitemap: boolean; ekstraUrl: string; headKod: string; headAktif: boolean; bodyKod: string; bodyAktif: boolean };
const SIKLIKLAR = ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"];

function SeoBolum() {
  const [s, setS] = useState<Seo | null>(null);
  const [acik, setAcik] = useState<number | null>(0);
  const [msg, setMsg] = useState("");
  const [yuk, setYuk] = useState(false);
  const [yetki, setYetki] = useState(true);
  const [kop, setKop] = useState("");

  useEffect(() => {
    fetch("/api/admin/seo").then((r) => r.json().then((d) => ({ ok: r.ok, d }))).then(({ ok, d }) => {
      if (!ok) { setYetki(false); return; }
      if (d.seo) setS(d.seo);
    }).catch(() => {});
  }, []);

  if (!yetki) return <Panel className="p-8 text-center text-parchment/45">Bu ayarları yalnızca süper admin görebilir.</Panel>;
  if (!s) return <Panel className="p-8 text-center text-parchment/45">Yükleniyor…</Panel>;

  const base = s.siteUrl.replace(/\/+$/, "");
  const sayfaSet = (i: number, k: keyof SeoSayfa, v: string | number | boolean) => setS((p) => p && ({ ...p, sayfalar: p.sayfalar.map((x, j) => (j === i ? { ...x, [k]: v } : x)) }));
  const set = <K extends keyof Seo>(k: K, v: Seo[K]) => setS((p) => p && ({ ...p, [k]: v }));
  const kopyala = (t: string, ad: string) => { navigator.clipboard?.writeText(t); setKop(ad); setTimeout(() => setKop(""), 1500); };

  const kaydet = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(""); setYuk(true);
    const r = await fetch("/api/admin/seo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
    const d = await r.json(); setYuk(false);
    setMsg(r.ok ? "SEO ayarları kaydedildi." : d.error || "Hata.");
    if (r.ok && d.seo) setS(d.seo);
  };

  const renkUzunluk = (uz: number, ideal: number, max: number) => (uz === 0 ? "text-parchment/40" : uz <= ideal ? "text-emerald-300" : uz <= max ? "text-amber-300" : "text-rose-300");

  return (
    <form onSubmit={kaydet} className="max-w-4xl space-y-5">
      {/* Site adresi */}
      <Panel className="p-6">
        <h2 className="font-display text-lg font-semibold text-parchment">Site Adresi & İkon</h2>
        <p className="mb-3 mt-0.5 text-xs text-parchment/45">Sitemap, robots.txt ve paylaşım görselleri için tam adres; sekmede görünen site ikonu (favicon).</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Site adresi</label>
            <input value={s.siteUrl} onChange={(e) => set("siteUrl", e.target.value)} placeholder="https://gokname.com" className={`${inputCls} mt-1.5 w-full`} />
          </div>
          <div>
            <label className={labelCls}>Site ikonu (favicon)</label>
            <div className="mt-1.5 flex items-center gap-2.5">
              {s.favicon && <img src={s.favicon} alt="" className="h-8 w-8 shrink-0 rounded border border-gold/20 bg-night object-contain p-0.5" />}
              <input value={s.favicon} onChange={(e) => set("favicon", e.target.value)} placeholder="/favicon/favicon.png" className={`${inputCls} w-full`} />
            </div>
          </div>
        </div>
      </Panel>

      {/* Sayfa bazlı SEO */}
      <Panel className="p-6">
        <h2 className="font-display text-lg font-semibold text-parchment">Sayfa Bazlı SEO</h2>
        <p className="mb-4 mt-0.5 text-xs text-parchment/45">Her statik sayfa için başlık, açıklama, paylaşım görseli, noindex ve sitemap kontrolleri.</p>
        <div className="space-y-3">
          {s.sayfalar.map((p, i) => {
            const url = p.yol === "/" ? base + "/" : base + p.yol;
            return (
              <div key={p.yol} className="rounded-xl border border-gold/15 bg-night">
                <button type="button" onClick={() => setAcik(acik === i ? null : i)} className="flex w-full items-center gap-2 p-3 text-left">
                  <span className="text-sm font-medium text-parchment/90">{p.ad}</span>
                  <span className="rounded bg-night-deep px-1.5 py-0.5 text-[11px] text-parchment/45">{p.yol}</span>
                  {p.noindex && <span className="rounded-full border border-rose-400/30 px-2 py-0.5 text-[10px] text-rose-300">noindex</span>}
                  <span className="ml-auto text-xs text-parchment/40">{acik === i ? "▲" : "▼"}</span>
                </button>
                {acik === i && (
                  <div className="space-y-3 border-t border-gold/10 p-4">
                    {/* Google önizleme */}
                    <div className="rounded-lg border border-gold/10 bg-night-deep p-3">
                      <div className="text-[10px] uppercase tracking-wider text-parchment/40">Google önizleme</div>
                      <div className="mt-1.5 truncate text-[12px] text-emerald-300/80">{url}</div>
                      <div className="truncate text-[15px] text-[#8ab4f8]">{p.baslik || p.ad}</div>
                      <div className="line-clamp-2 text-[12px] text-parchment/55">{p.aciklama || "Açıklama girilmedi."}</div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className={labelCls}>Başlık (title)</label>
                        <span className={`text-[11px] ${renkUzunluk(p.baslik.length, 60, 70)}`}>{p.baslik.length}/60</span>
                      </div>
                      <input value={p.baslik} onChange={(e) => sayfaSet(i, "baslik", e.target.value)} className={`${inputCls} mt-1 w-full`} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className={labelCls}>Açıklama (description)</label>
                        <span className={`text-[11px] ${renkUzunluk(p.aciklama.length, 160, 180)}`}>{p.aciklama.length}/160</span>
                      </div>
                      <textarea value={p.aciklama} onChange={(e) => sayfaSet(i, "aciklama", e.target.value)} rows={2} className={`${inputCls} mt-1 w-full resize-none`} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className={labelCls}>Anahtar kelimeler</label>
                        <input value={p.anahtar} onChange={(e) => sayfaSet(i, "anahtar", e.target.value)} placeholder="virgülle ayır" className={`${inputCls} mt-1 w-full`} />
                      </div>
                      <div>
                        <label className={labelCls}>OG / paylaşım görseli</label>
                        <input value={p.og} onChange={(e) => sayfaSet(i, "og", e.target.value)} placeholder="/gorsel/og.png" className={`${inputCls} mt-1 w-full`} />
                      </div>
                      <div>
                        <label className={labelCls}>Sitemap önceliği (0-1)</label>
                        <input type="number" step="0.1" min="0" max="1" value={p.oncelik} onChange={(e) => sayfaSet(i, "oncelik", Number(e.target.value))} className={`${inputCls} mt-1 w-full`} />
                      </div>
                      <div>
                        <label className={labelCls}>Değişim sıklığı</label>
                        <select value={p.siklik} onChange={(e) => sayfaSet(i, "siklik", e.target.value)} className={`${inputCls} mt-1 w-full`} style={{ colorScheme: "dark" }}>
                          {SIKLIKLAR.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-5 pt-1">
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-parchment/80">
                        <input type="checkbox" checked={p.sitemap} onChange={(e) => sayfaSet(i, "sitemap", e.target.checked)} className="h-4 w-4 accent-[#c2a36b]" /> Sitemap'e dahil et
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-parchment/80">
                        <input type="checkbox" checked={p.noindex} onChange={(e) => sayfaSet(i, "noindex", e.target.checked)} className="h-4 w-4 accent-[#c2a36b]" /> noindex (arama motorlarına gösterme)
                      </label>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Sitemap & robots */}
      <Panel className="p-6">
        <h2 className="font-display text-lg font-semibold text-parchment">Sitemap & robots</h2>
        <p className="mb-4 mt-0.5 text-xs text-parchment/45">Search Console'a vereceğin sitemap URL'i, yasal sayfa kontrolü ve manuel URL ekleme.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[["Sitemap", `${base}/sitemap.xml`], ["robots.txt", `${base}/robots.txt`]].map(([ad, link]) => (
            <div key={ad} className="rounded-lg border border-gold/15 bg-night p-3">
              <div className="text-[10px] uppercase tracking-wider text-parchment/45">{ad}</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[13px] text-parchment/75">{link}</span>
                <button type="button" onClick={() => kopyala(link, ad)} className="shrink-0 rounded-md border border-gold/30 px-2.5 py-1 text-[11px] text-gold-bright hover:bg-gold/10">{kop === ad ? "✓" : "Kopyala"}</button>
                <a href={link} target="_blank" rel="noopener" className="shrink-0 rounded-md border border-gold/25 px-2.5 py-1 text-[11px] text-parchment/70 hover:text-gold-bright">Aç</a>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-gold/15 bg-night-deep p-3 text-xs leading-relaxed text-parchment/55">
          <b className="text-parchment/75">Google Search Console</b> kaydı için: search.google.com/search-console → mülk seç → Site haritaları → yukarıdaki sitemap URL'ini ekle.
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-parchment/80">
          <input type="checkbox" checked={s.yasalSitemap} onChange={(e) => set("yasalSitemap", e.target.checked)} className="h-4 w-4 accent-[#c2a36b]" /> Yasal sayfaları sitemap'e dahil et
        </label>
        <div className="mt-4">
          <label className={labelCls}>Manuel ekstra URL'ler</label>
          <p className="mt-0.5 text-xs text-parchment/45">Her satıra bir URL — site içi yol (/ornek) veya tam URL.</p>
          <textarea value={s.ekstraUrl} onChange={(e) => set("ekstraUrl", e.target.value)} rows={3} placeholder={"/ozel-sayfa\nhttps://baska-alan.gokname.com/icerik"} className={`${inputCls} mt-1.5 w-full resize-y font-mono text-[12.5px]`} />
        </div>
      </Panel>

      {/* Kod Ekleme */}
      <Panel className="p-6">
        <h2 className="font-display text-lg font-semibold text-parchment">Kod Ekleme</h2>
        <p className="mb-4 mt-0.5 text-xs text-parchment/45">Search Console doğrulaması, Google Analytics/Ads, Meta Pixel gibi üçüncü parti kodlar. Kodu etiketleriyle birlikte yapıştır; tüm ziyaretçi sayfalarında çalışır (admin panelinde çalışmaz).</p>
        <div className="space-y-5">
          <div>
            <label className="flex cursor-pointer items-center justify-between">
              <span className={labelCls}>Header (head) kodu</span>
              <span className="flex items-center gap-2 text-xs text-parchment/60"><input type="checkbox" checked={s.headAktif} onChange={(e) => set("headAktif", e.target.checked)} className="h-4 w-4 accent-[#c2a36b]" /> Aktif</span>
            </label>
            <textarea value={s.headKod} onChange={(e) => set("headKod", e.target.value)} rows={6} placeholder="<!-- Google Tag Manager / Search Console meta / gtag -->" className={`${inputCls} mt-1.5 w-full resize-y font-mono text-[12px]`} />
          </div>
          <div>
            <label className="flex cursor-pointer items-center justify-between">
              <span className={labelCls}>Body (body sonu) kodu</span>
              <span className="flex items-center gap-2 text-xs text-parchment/60"><input type="checkbox" checked={s.bodyAktif} onChange={(e) => set("bodyAktif", e.target.checked)} className="h-4 w-4 accent-[#c2a36b]" /> Aktif</span>
            </label>
            <textarea value={s.bodyKod} onChange={(e) => set("bodyKod", e.target.value)} rows={5} placeholder="<!-- chat widget, dönüşüm/uzak API scriptleri -->" className={`${inputCls} mt-1.5 w-full resize-y font-mono text-[12px]`} />
          </div>
        </div>
      </Panel>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={yuk} className="rounded-full bg-gold px-6 py-2.5 text-sm font-medium text-night-deep transition-colors hover:bg-gold-bright disabled:opacity-60">{yuk ? "Kaydediliyor…" : "Kaydet"}</button>
        {msg && <span className="text-sm text-emerald-300">{msg}</span>}
      </div>
    </form>
  );
}

// ---------------- Yasal Sayfalar ----------------
type Yasal = { slug: string; baslik: string; icerik: string };

function YasalBolum() {
  const [list, setList] = useState<Yasal[]>([]);
  const [acik, setAcik] = useState<number | null>(0);
  const [msg, setMsg] = useState("");
  const [yuk, setYuk] = useState(false);
  const [yetki, setYetki] = useState(true);

  useEffect(() => {
    fetch("/api/admin/settings").then((r) => r.json().then((d) => ({ ok: r.ok, d }))).then(({ ok, d }) => {
      if (!ok) { setYetki(false); return; }
      if (d.ayar?.yasal) setList(d.ayar.yasal);
    }).catch(() => {});
  }, []);

  const set = (i: number, k: keyof Yasal, v: string) => setList((l) => l.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  const ekle = () => { setList((l) => [...l, { slug: "", baslik: "", icerik: "" }]); setAcik(list.length); };
  const sil = (i: number) => setList((l) => l.filter((_, j) => j !== i));
  const tasi = (i: number, yon: -1 | 1) => setList((l) => {
    const j = i + yon; if (j < 0 || j >= l.length) return l;
    const a = [...l]; [a[i], a[j]] = [a[j], a[i]]; return a;
  });

  const kaydet = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(""); setYuk(true);
    const r = await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ yasal: list }) });
    const d = await r.json(); setYuk(false);
    setMsg(r.ok ? "Yasal sayfalar kaydedildi." : d.error || "Hata.");
    if (r.ok && d.ayar?.yasal) setList(d.ayar.yasal);
  };

  if (!yetki) return <Panel className="p-8 text-center text-parchment/45">Bu ayarları yalnızca süper admin görebilir.</Panel>;

  return (
    <form onSubmit={kaydet} className="max-w-3xl space-y-5">
      <Panel className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-parchment">Yasal Sayfalar</h2>
            <p className="mt-0.5 text-xs text-parchment/45">Footer'da ve <code className="rounded bg-night px-1 text-gold-bright">/yasal/&lt;adres&gt;</code> sayfasında görünür. İçerikte <code className="rounded bg-night px-1 text-gold-bright">## Başlık</code> ile alt başlık, boş satırla paragraf ayırırsın.</p>
          </div>
          <span className="shrink-0 rounded-full border border-gold/20 px-2.5 py-1 text-xs text-parchment/55">{list.length} sayfa</span>
        </div>

        <div className="mt-4 space-y-3">
          {list.map((it, i) => (
            <div key={i} className="rounded-xl border border-gold/15 bg-night">
              <div className="flex items-center gap-2 p-3">
                <button type="button" onClick={() => setAcik(acik === i ? null : i)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-medium text-parchment/90">{it.baslik || "(başlıksız)"}</span>
                  <span className="block truncate text-[11px] text-parchment/40">/yasal/{it.slug || "…"}</span>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => tasi(i, -1)} disabled={i === 0} title="Yukarı" className="rounded-md border border-gold/20 px-2 py-1 text-xs text-parchment/60 hover:text-gold-bright disabled:opacity-30">↑</button>
                  <button type="button" onClick={() => tasi(i, 1)} disabled={i === list.length - 1} title="Aşağı" className="rounded-md border border-gold/20 px-2 py-1 text-xs text-parchment/60 hover:text-gold-bright disabled:opacity-30">↓</button>
                  <button type="button" onClick={() => sil(i)} title="Sil" className="rounded-md border border-rose-400/30 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10">✕</button>
                  <button type="button" onClick={() => setAcik(acik === i ? null : i)} className="rounded-md border border-gold/20 px-2 py-1 text-xs text-parchment/60 hover:text-gold-bright">{acik === i ? "▲" : "▼"}</button>
                </div>
              </div>
              {acik === i && (
                <div className="space-y-2.5 border-t border-gold/10 p-3">
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>Başlık</label>
                      <input value={it.baslik} onChange={(e) => set(i, "baslik", e.target.value)} placeholder="Mesafeli Satış Sözleşmesi" className={`${inputCls} mt-1 w-full`} />
                    </div>
                    <div>
                      <label className={labelCls}>Adres (slug)</label>
                      <input value={it.slug} onChange={(e) => set(i, "slug", e.target.value)} placeholder="mesafeli-satis" className={`${inputCls} mt-1 w-full`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>İçerik</label>
                    <textarea value={it.icerik} onChange={(e) => set(i, "icerik", e.target.value)} rows={12} className={`${inputCls} mt-1 w-full resize-y font-mono text-[12.5px] leading-relaxed`} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <button type="button" onClick={ekle} className="mt-3 rounded-full border border-gold/30 px-4 py-2 text-sm font-medium text-gold-bright transition-colors hover:bg-gold/10">+ Sayfa Ekle</button>
      </Panel>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={yuk} className="rounded-full bg-gold px-6 py-2.5 text-sm font-medium text-night-deep transition-colors hover:bg-gold-bright disabled:opacity-60">{yuk ? "Kaydediliyor…" : "Kaydet"}</button>
        {msg && <span className="text-sm text-emerald-300">{msg}</span>}
      </div>
    </form>
  );
}

// ---------------- Sanal POS (PayTR) ----------------
type Paytr = { aktif: boolean; merchantId: string; testMod: boolean; maxTaksit: number; tekCekim: boolean; basvuruModu: boolean; hasKey?: boolean; hasSalt?: boolean };
const PAYTR_BOS: Paytr = { aktif: false, merchantId: "", testMod: true, maxTaksit: 0, tekCekim: false, basvuruModu: false };

function SanalPosBolum() {
  const [f, setF] = useState<Paytr>(PAYTR_BOS);
  const [key, setKey] = useState("");
  const [salt, setSalt] = useState("");
  const [msg, setMsg] = useState("");
  const [yuk, setYuk] = useState(false);
  const [yetki, setYetki] = useState(true);
  const [kopyalandi, setKopyalandi] = useState(false);
  const set = <K extends keyof Paytr>(k: K, v: Paytr[K]) => setF((s) => ({ ...s, [k]: v }));

  const callbackUrl = typeof window !== "undefined" ? `${window.location.origin}/api/paytr/callback` : "/api/paytr/callback";

  useEffect(() => {
    fetch("/api/admin/paytr").then((r) => r.json().then((d) => ({ ok: r.ok, d }))).then(({ ok, d }) => {
      if (!ok) { setYetki(false); return; }
      if (d.paytr) setF({ ...PAYTR_BOS, ...d.paytr });
    }).catch(() => {});
  }, []);

  const kaydet = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(""); setYuk(true);
    const body: Record<string, unknown> = { aktif: f.aktif, merchantId: f.merchantId, testMod: f.testMod, maxTaksit: f.maxTaksit, tekCekim: f.tekCekim, basvuruModu: f.basvuruModu };
    if (key) body.merchantKey = key;
    if (salt) body.merchantSalt = salt;
    const r = await fetch("/api/admin/paytr", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json(); setYuk(false);
    setMsg(r.ok ? "Sanal pos ayarları kaydedildi." : d.error || "Hata.");
    if (r.ok) { setKey(""); setSalt(""); setF((s) => ({ ...s, hasKey: s.hasKey || !!key, hasSalt: s.hasSalt || !!salt })); }
  };

  const kopyala = () => { navigator.clipboard?.writeText(callbackUrl); setKopyalandi(true); setTimeout(() => setKopyalandi(false), 1500); };

  if (!yetki) return <Panel className="p-8 text-center text-parchment/45">Sanal pos ayarlarını yalnızca süper admin görebilir.</Panel>;

  const Tik = ({ k, baslik, renk }: { k: keyof Paytr; baslik: string; renk?: string }) => (
    <label className="flex cursor-pointer items-center gap-3">
      <input type="checkbox" checked={!!f[k]} onChange={(e) => set(k, e.target.checked as never)} className={`h-4 w-4 ${renk ?? "accent-[#c2a36b]"}`} />
      <span className={labelCls}>{baslik}</span>
    </label>
  );

  return (
    <form onSubmit={kaydet} className="max-w-5xl">
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {/* Sol: mağaza bilgileri */}
        <div className="space-y-5">
          <Panel className="p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-parchment">PayTR Mağaza Bilgileri</h2>
            <div className="space-y-4">
              <Tik k="aktif" baslik="Sanal pos ödeme akışı aktif" />
              <div>
                <label className={labelCls}>Mağaza No (Merchant ID)</label>
                <input value={f.merchantId} onChange={(e) => set("merchantId", e.target.value)} placeholder="123456" className={`${inputCls} mt-1.5 w-full`} />
              </div>
              <div>
                <label className={labelCls}>Mağaza Parolası (Merchant Key)</label>
                <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder={f.hasKey ? "••••••••" : "Mağaza parolası"} autoComplete="off" className={`${inputCls} mt-1.5 w-full`} />
              </div>
              <div>
                <label className={labelCls}>Mağaza Gizli Anahtarı (Merchant Salt)</label>
                <input type="password" value={salt} onChange={(e) => setSalt(e.target.value)} placeholder={f.hasSalt ? "••••••••" : "Mağaza gizli anahtarı"} autoComplete="off" className={`${inputCls} mt-1.5 w-full`} />
              </div>
            </div>
          </Panel>
        </div>

        {/* Sağ: ödeme seçenekleri + bildirim url */}
        <div className="space-y-5">
          <Panel className="p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-parchment">Ödeme Seçenekleri</h2>
            <div className="space-y-4">
              <Tik k="testMod" baslik="Test modu (test_mode)" />
              <Tik k="tekCekim" baslik="Taksidi kapat (yalnız tek çekim)" />
              <div>
                <label className={labelCls}>Maksimum taksit</label>
                <input type="number" min="0" max="12" value={f.maxTaksit} onChange={(e) => set("maxTaksit", Number(e.target.value))} className={`${inputCls} mt-1.5 w-full`} />
                <p className="mt-1 text-xs text-parchment/40">0 = PayTR varsayılanı.</p>
              </div>
            </div>
          </Panel>

          <Panel className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-parchment">Başvuru Modu</h2>
                <p className="mt-0.5 text-xs text-parchment/45">Açıkken ödeme akışı görünür ama “Ödemeyi Tamamla”ya basınca <b className="text-parchment/70">“Sanal pos bağlantısı bekleniyor”</b> uyarısı verir, sipariş oluşmaz. PayTR başvurusu sırasında kullan.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={f.basvuruModu}
                onClick={() => set("basvuruModu", !f.basvuruModu)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${f.basvuruModu ? "bg-amber-500" : "bg-white/15"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-night-deep transition-all ${f.basvuruModu ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
          </Panel>

          <Panel className="p-6">
            <h2 className="mb-2 font-display text-lg font-semibold text-parchment">Bildirim (Callback) URL</h2>
            <p className="mb-3 text-xs text-parchment/45">PayTR mağaza panelinde “Bildirim URL” alanına bu adresi gir.</p>
            <div className="flex items-center gap-2">
              <input readOnly value={callbackUrl} className={`${inputCls} w-full text-parchment/70`} onFocus={(e) => e.target.select()} />
              <button type="button" onClick={kopyala} className="shrink-0 rounded-lg border border-gold/30 px-3 py-2 text-sm text-gold-bright transition-colors hover:bg-gold/10">{kopyalandi ? "Kopyalandı ✓" : "Kopyala"}</button>
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button type="submit" disabled={yuk} className="rounded-full bg-gold px-6 py-2.5 text-sm font-medium text-night-deep transition-colors hover:bg-gold-bright disabled:opacity-60">{yuk ? "Kaydediliyor…" : "Kaydet"}</button>
        {msg && <span className="text-sm text-emerald-300">{msg}</span>}
      </div>
    </form>
  );
}

// ---------------- Genel Ayarlar (maliyet/oran + bakım modu) ----------------
type Sss = { q: string; a: string; btnText?: string; btnHref?: string };
type Hero = { baslik: string; altMetin: string; rozet: string; fiyatMetin: string; eskiFiyat: string; yeniFiyat: string; btn1Metin: string; btn1Link: string; btn2Metin: string; btn2Link: string };
const HERO_BOS: Hero = { baslik: "", altMetin: "", rozet: "", fiyatMetin: "", eskiFiyat: "", yeniFiyat: "", btn1Metin: "", btn1Link: "", btn2Metin: "", btn2Link: "" };
type Iletisim = { eposta: string; telefon: string; adres: string; instagram: string; x: string; tiktok: string; instagramAktif: boolean; xAktif: boolean; tiktokAktif: boolean };
const ILETISIM_BOS: Iletisim = { eposta: "", telefon: "", adres: "", instagram: "", x: "", tiktok: "", instagramAktif: false, xAktif: false, tiktokAktif: false };

// Küçük aç/kapa switch'i (bakım modu switch'iyle aynı stil) — sosyal medya görünürlüğü için
function MiniSwitch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      title={on ? "Sitede gösteriliyor" : "Sitede gizli"}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-emerald-500" : "bg-white/15"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-night-deep transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}
type Genel = { apiMaliyetUSD: number; posOrani: number; bakimModu: boolean; bakimMesaj: string; bakimBitis: string; sss: Sss[]; hero: Hero; iletisim: Iletisim };
const GENEL_BOS: Genel = { apiMaliyetUSD: 0.225, posOrani: 0, bakimModu: false, bakimMesaj: "", bakimBitis: "", sss: [], hero: HERO_BOS, iletisim: ILETISIM_BOS };

// ISO ↔ datetime-local (input value) dönüşümü, yerel saatle
function isoToLocal(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}
function localToIso(local: string): string {
  if (!local) return "";
  const d = new Date(local);
  return isNaN(d.getTime()) ? "" : d.toISOString();
}

function GenelBolum() {
  const [g, setG] = useState<Genel>(GENEL_BOS);
  const [msg, setMsg] = useState("");
  const [yuk, setYuk] = useState(false);
  const [yetki, setYetki] = useState(true);
  const set = <K extends keyof Genel>(k: K, v: Genel[K]) => setG((s) => ({ ...s, [k]: v }));
  const heroSet = (k: keyof Hero, v: string) => setG((s) => ({ ...s, hero: { ...s.hero, [k]: v } }));
  const ilSet = (k: keyof Iletisim, v: string) => setG((s) => ({ ...s, iletisim: { ...s.iletisim, [k]: v } }));
  const ilToggle = (k: "instagramAktif" | "xAktif" | "tiktokAktif") => setG((s) => ({ ...s, iletisim: { ...s.iletisim, [k]: !s.iletisim[k] } }));

  useEffect(() => {
    fetch("/api/admin/settings").then((r) => r.json().then((d) => ({ ok: r.ok, d }))).then(({ ok, d }) => {
      if (!ok) { setYetki(false); return; }
      if (d.ayar) setG({ ...GENEL_BOS, ...d.ayar, hero: { ...HERO_BOS, ...(d.ayar.hero ?? {}) }, iletisim: { ...ILETISIM_BOS, ...(d.ayar.iletisim ?? {}) } });
    }).catch(() => {});
  }, []);

  const kaydet = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(""); setYuk(true);
    const r = await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(g) });
    const d = await r.json(); setYuk(false);
    setMsg(r.ok ? "Ayarlar kaydedildi." : d.error || "Hata.");
  };

  // Geri sayım bitişini "şimdi + saat" olarak ayarla
  const saatSonra = (saat: number) => set("bakimBitis", new Date(Date.now() + saat * 3600_000).toISOString());

  // SSS yardımcıları
  const sssSet = (i: number, k: keyof Sss, v: string) => setG((s) => ({ ...s, sss: s.sss.map((it, j) => (j === i ? { ...it, [k]: v } : it)) }));
  const sssEkle = () => setG((s) => ({ ...s, sss: [...s.sss, { q: "", a: "", btnText: "", btnHref: "" }] }));
  const sssSil = (i: number) => setG((s) => ({ ...s, sss: s.sss.filter((_, j) => j !== i) }));
  const sssTasi = (i: number, yon: -1 | 1) => setG((s) => {
    const j = i + yon;
    if (j < 0 || j >= s.sss.length) return s;
    const arr = [...s.sss];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return { ...s, sss: arr };
  });
  // Seçili metni **...** ile vurgula (seçim yoksa imlece **vurgu** ekler)
  const sssVurgula = (i: number) => {
    const ta = document.getElementById(`sss-a-${i}`) as HTMLTextAreaElement | null;
    const val = g.sss[i].a;
    const s = ta ? ta.selectionStart : val.length;
    const e = ta ? ta.selectionEnd : val.length;
    const sec = val.slice(s, e);
    const yeni = sec ? val.slice(0, s) + "**" + sec + "**" + val.slice(e) : val.slice(0, s) + "**vurgu**" + val.slice(e);
    sssSet(i, "a", yeni);
    // imleci vurgu içine konumla
    requestAnimationFrame(() => {
      if (!ta) return;
      ta.focus();
      const pos = sec ? e + 4 : s + 2;
      ta.setSelectionRange(sec ? s + 2 : s + 2, sec ? e + 2 : pos + 5);
    });
  };

  if (!yetki) return <Panel className="p-8 text-center text-parchment/45">Bu ayarları yalnızca süper admin görebilir.</Panel>;

  return (
    <form onSubmit={kaydet} className="max-w-6xl space-y-5">
      {/* Anasayfa Hero */}
      <Panel className="p-6">
        <h2 className="font-display text-lg font-semibold text-parchment">Anasayfa Hero</h2>
        <p className="mb-4 mt-0.5 text-xs text-parchment/45">Giriş bölümündeki başlık, metin ve butonlar. Boş bıraktığın alan sitede gösterilmez.</p>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Başlık <span className="font-normal text-parchment/40">— altın vurgu için **çift yıldız**</span></label>
            <input value={g.hero.baslik} onChange={(e) => heroSet("baslik", e.target.value)} placeholder="Sana, **seni anlatalım.**" className={`${inputCls} mt-1.5 w-full`} />
          </div>
          <div>
            <label className={labelCls}>Alt metin</label>
            <textarea value={g.hero.altMetin} onChange={(e) => heroSet("altMetin", e.target.value)} rows={2} className={`${inputCls} mt-1.5 w-full resize-none`} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Rozet (üst etiket)</label>
              <input value={g.hero.rozet} onChange={(e) => heroSet("rozet", e.target.value)} placeholder="Lansmana özel" className={`${inputCls} mt-1.5 w-full`} />
            </div>
            <div>
              <label className={labelCls}>Fiyat satırı metni</label>
              <input value={g.hero.fiyatMetin} onChange={(e) => heroSet("fiyatMetin", e.target.value)} placeholder="Tüm analizler kısa süreliğine" className={`${inputCls} mt-1.5 w-full`} />
            </div>
            <div>
              <label className={labelCls}>Eski fiyat (üstü çizili)</label>
              <input value={g.hero.eskiFiyat} onChange={(e) => heroSet("eskiFiyat", e.target.value)} placeholder="249 ₺" className={`${inputCls} mt-1.5 w-full`} />
            </div>
            <div>
              <label className={labelCls}>Yeni fiyat</label>
              <input value={g.hero.yeniFiyat} onChange={(e) => heroSet("yeniFiyat", e.target.value)} placeholder="99 ₺" className={`${inputCls} mt-1.5 w-full`} />
            </div>
            <div>
              <label className={labelCls}>1. Buton metni</label>
              <input value={g.hero.btn1Metin} onChange={(e) => heroSet("btn1Metin", e.target.value)} placeholder="Analizleri Keşfet" className={`${inputCls} mt-1.5 w-full`} />
            </div>
            <div>
              <label className={labelCls}>1. Buton linki</label>
              <input value={g.hero.btn1Link} onChange={(e) => heroSet("btn1Link", e.target.value)} placeholder="/analizler" className={`${inputCls} mt-1.5 w-full`} />
            </div>
            <div>
              <label className={labelCls}>2. Buton metni</label>
              <input value={g.hero.btn2Metin} onChange={(e) => heroSet("btn2Metin", e.target.value)} placeholder="Örnekler" className={`${inputCls} mt-1.5 w-full`} />
            </div>
            <div>
              <label className={labelCls}>2. Buton linki</label>
              <input value={g.hero.btn2Link} onChange={(e) => heroSet("btn2Link", e.target.value)} placeholder="/ornekler" className={`${inputCls} mt-1.5 w-full`} />
            </div>
          </div>
        </div>
      </Panel>

      {/* İletişim bilgileri */}
      <Panel className="p-6">
        <h2 className="font-display text-lg font-semibold text-parchment">İletişim Bilgileri</h2>
        <p className="mb-4 mt-0.5 text-xs text-parchment/45">İletişim sayfasında gösterilir. Boş bıraktığın alan görünmez.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>E-posta</label>
            <input type="email" value={g.iletisim.eposta} onChange={(e) => ilSet("eposta", e.target.value)} placeholder="destek@gokname.com" className={`${inputCls} mt-1.5 w-full`} />
          </div>
          <div>
            <label className={labelCls}>Telefon</label>
            <input value={g.iletisim.telefon} onChange={(e) => ilSet("telefon", e.target.value)} placeholder="+90 5xx xxx xx xx" className={`${inputCls} mt-1.5 w-full`} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Adres</label>
            <input value={g.iletisim.adres} onChange={(e) => ilSet("adres", e.target.value)} placeholder="Mahalle, Cadde No, İlçe / İl" className={`${inputCls} mt-1.5 w-full`} />
          </div>
          <div className="sm:col-span-2 mt-1 grid gap-3 border-t border-gold/10 pt-4">
            <p className="text-xs text-parchment/45">Sosyal medya: switch <span className="text-emerald-300">açık</span> olan hesaplar sitede (footer + iletişim sayfası) görünür. Kapalıysa link girilmiş olsa bile gizlenir.</p>
            <div>
              <label className={labelCls}>Instagram (link)</label>
              <div className="mt-1.5 flex items-center gap-2.5">
                <input value={g.iletisim.instagram} onChange={(e) => ilSet("instagram", e.target.value)} placeholder="https://instagram.com/..." className={`${inputCls} min-w-0 flex-1`} />
                <MiniSwitch on={g.iletisim.instagramAktif} onToggle={() => ilToggle("instagramAktif")} label="Instagram'ı sitede göster" />
              </div>
            </div>
            <div>
              <label className={labelCls}>X (link)</label>
              <div className="mt-1.5 flex items-center gap-2.5">
                <input value={g.iletisim.x} onChange={(e) => ilSet("x", e.target.value)} placeholder="https://x.com/..." className={`${inputCls} min-w-0 flex-1`} />
                <MiniSwitch on={g.iletisim.xAktif} onToggle={() => ilToggle("xAktif")} label="X'i sitede göster" />
              </div>
            </div>
            <div>
              <label className={labelCls}>TikTok (link)</label>
              <div className="mt-1.5 flex items-center gap-2.5">
                <input value={g.iletisim.tiktok} onChange={(e) => ilSet("tiktok", e.target.value)} placeholder="https://tiktok.com/@..." className={`${inputCls} min-w-0 flex-1`} />
                <MiniSwitch on={g.iletisim.tiktokAktif} onToggle={() => ilToggle("tiktokAktif")} label="TikTok'u sitede göster" />
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {/* Sol: Sıkça Sorulan Sorular */}
        <Panel className="p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-lg font-semibold text-parchment">Sıkça Sorulan Sorular</h2>
            <span className="shrink-0 rounded-full border border-gold/20 px-2.5 py-1 text-xs text-parchment/55">{g.sss.length} soru</span>
          </div>

          <div className="mt-4 space-y-3">
            {g.sss.map((it, i) => (
              <div key={i} className="rounded-xl border border-gold/15 bg-night p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-2 font-body text-xs text-parchment/35">{i + 1}</span>
                  <div className="min-w-0 flex-1 space-y-2.5">
                    <input value={it.q} onChange={(e) => sssSet(i, "q", e.target.value)} placeholder="Soru" className={`${inputCls} w-full font-medium`} />
                    <div>
                      <textarea id={`sss-a-${i}`} value={it.a} onChange={(e) => sssSet(i, "a", e.target.value)} placeholder="Cevap — vurgulamak istediğin yeri seçip “Vurgula”ya bas" rows={3} className={`${inputCls} w-full resize-none`} />
                      <div className="mt-1.5 flex items-center gap-2">
                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => sssVurgula(i)} title="Seçili metni vurgula (**...**)" className="inline-flex items-center gap-1 rounded-md border border-gold/30 px-2.5 py-1 text-[11px] font-medium text-gold-bright transition-colors hover:bg-gold/10">
                          ✦ Vurgula
                        </button>
                        <span className="text-[11px] text-parchment/40">Bir kelimeyi seçip bas; sitede altın renkte görünür.</span>
                      </div>
                    </div>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <input value={it.btnText ?? ""} onChange={(e) => sssSet(i, "btnText", e.target.value)} placeholder="Buton metni (ops.)" className={`${inputCls} w-full`} />
                      <input value={it.btnHref ?? ""} onChange={(e) => sssSet(i, "btnHref", e.target.value)} placeholder="Buton linki (ör. /ornekler)" className={`${inputCls} w-full`} />
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button type="button" onClick={() => sssTasi(i, -1)} disabled={i === 0} title="Yukarı" className="rounded-md border border-gold/20 px-2 py-1 text-xs text-parchment/60 hover:text-gold-bright disabled:opacity-30">↑</button>
                    <button type="button" onClick={() => sssTasi(i, 1)} disabled={i === g.sss.length - 1} title="Aşağı" className="rounded-md border border-gold/20 px-2 py-1 text-xs text-parchment/60 hover:text-gold-bright disabled:opacity-30">↓</button>
                    <button type="button" onClick={() => sssSil(i)} title="Sil" className="rounded-md border border-rose-400/30 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10">✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={sssEkle} className="mt-3 rounded-full border border-gold/30 px-4 py-2 text-sm font-medium text-gold-bright transition-colors hover:bg-gold/10">+ Soru Ekle</button>
        </Panel>

        {/* Sağ: Maliyet & Komisyon + Bakım Modu */}
        <div className="space-y-5">
          <Panel className="p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-parchment">Maliyet & Komisyon</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>API maliyeti (üretim başına, $)</label>
                <input type="number" step="0.001" min="0" value={g.apiMaliyetUSD} onChange={(e) => set("apiMaliyetUSD", Number(e.target.value))} className={`${inputCls} mt-1.5 w-full`} />
              </div>
              <div>
                <label className={labelCls}>Sanal POS oranı (%)</label>
                <input type="number" step="0.01" min="0" value={g.posOrani} onChange={(e) => set("posOrani", Number(e.target.value))} className={`${inputCls} mt-1.5 w-full`} />
              </div>
            </div>
          </Panel>

          <Panel className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-parchment">Bakım Modu</h2>
                <p className="mt-0.5 text-xs text-parchment/45">Açıkken site ziyaretçilere kapanır; logo, açıklama ve geri sayım görünür. Admin paneli açık kalır.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={g.bakimModu}
                onClick={() => set("bakimModu", !g.bakimModu)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${g.bakimModu ? "bg-rose-500" : "bg-white/15"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-night-deep transition-all ${g.bakimModu ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
            <div className={`mt-4 space-y-4 ${g.bakimModu ? "" : "opacity-50"}`}>
              <div>
                <label className={labelCls}>Açıklama (logo altı)</label>
                <textarea value={g.bakimMesaj} onChange={(e) => set("bakimMesaj", e.target.value)} placeholder="48 saat sonra yeniden sizlerleyiz." rows={2} className={`${inputCls} mt-1.5 w-full resize-none`} />
              </div>
              <div>
                <label className={labelCls}>Geri sayım bitişi</label>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <input type="datetime-local" value={isoToLocal(g.bakimBitis)} onChange={(e) => set("bakimBitis", localToIso(e.target.value))} className={`${inputCls} date-white`} style={{ colorScheme: "dark" }} />
                  {[24, 48, 72].map((s) => (
                    <button key={s} type="button" onClick={() => saatSonra(s)} className="rounded-lg border border-gold/25 px-3 py-2 text-sm text-parchment/70 transition-colors hover:text-gold-bright">+{s}s</button>
                  ))}
                  {g.bakimBitis && <button type="button" onClick={() => set("bakimBitis", "")} className="rounded-lg border border-gold/25 px-3 py-2 text-sm text-parchment/55 hover:text-gold-bright">Temizle</button>}
                </div>
                <p className="mt-1.5 text-xs text-parchment/40">Boş bırakılırsa geri sayım gösterilmez, sadece açıklama görünür.</p>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={yuk} className="rounded-full bg-gold px-6 py-2.5 text-sm font-medium text-night-deep transition-colors hover:bg-gold-bright disabled:opacity-60">{yuk ? "Kaydediliyor…" : "Kaydet"}</button>
        {msg && <span className="text-sm text-emerald-300">{msg}</span>}
      </div>
    </form>
  );
}

// ---------------- Adminler ----------------
type Admin = { email: string; ad: string; super: boolean };
function AdminlerBolum() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [meSuper, setMeSuper] = useState(false);
  const [ad, setAd] = useState("");
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState("");
  const [ok, setOk] = useState("");
  const [yuk, setYuk] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/admins");
    const d = await r.json();
    if (r.ok) { setAdmins(d.admins); setMeSuper(!!d.me?.super); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const ekle = async (e: React.FormEvent) => {
    e.preventDefault(); setHata(""); setOk(""); setYuk(true);
    const r = await fetch("/api/admin/admins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ad, email, sifre }) });
    const d = await r.json(); setYuk(false);
    if (!r.ok) return setHata(d.error || "Oluşturulamadı.");
    setOk(`${email} admin olarak eklendi.`); setAd(""); setEmail(""); setSifre(""); load();
  };
  const sil = async (e: string) => {
    if (!confirm(`${e} adlı admini silmek istediğine emin misin?`)) return;
    const r = await fetch("/api/admin/admins", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: e }) });
    if (r.ok) load();
  };

  return (
    <div>
      {meSuper && (
        <Panel className="mb-6 p-5">
          <h2 className="mb-4 font-display text-lg font-semibold text-parchment">Yeni admin oluştur</h2>
          <form onSubmit={ekle} className="flex flex-wrap items-end gap-3">
            <input value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Ad" required className={inputCls} />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-posta" required className={`${inputCls} min-w-[220px]`} />
            <input type="password" value={sifre} onChange={(e) => setSifre(e.target.value)} placeholder="Şifre (min 6)" required minLength={6} className={inputCls} />
            <button disabled={yuk} className="rounded-full bg-gold px-4 py-2 text-sm font-medium text-night-deep transition-colors hover:bg-gold-bright disabled:opacity-60">{yuk ? "Ekleniyor…" : "+ Ekle"}</button>
          </form>
          {hata && <p className="mt-3 text-sm text-rose-300">{hata}</p>}
          {ok && <p className="mt-3 text-sm text-emerald-300">{ok}</p>}
        </Panel>
      )}
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-gold/15 text-left text-xs uppercase tracking-wider text-parchment/45">
                <th className="px-4 py-3 font-medium">Ad</th>
                <th className="px-4 py-3 font-medium">E-posta</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.email} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium text-parchment/90">{a.ad}</td>
                  <td className="px-4 py-3 text-parchment/65">{a.email}</td>
                  <td className="px-4 py-3"><Badge tone={a.super ? "amber" : "gray"}>{a.super ? "Süper Admin" : "Admin"}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    {meSuper && !a.super ? (
                      <button onClick={() => sil(a.email)} className="rounded-lg border border-rose-400/30 px-3 py-1.5 text-xs text-rose-300 transition-colors hover:bg-rose-500/10">Sil</button>
                    ) : (<span className="text-xs text-parchment/30">—</span>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

// ---------------- E-posta Bildirim Adresleri + Olaylar ----------------
type BildirimKey = "uyeKayit" | "siparisMusteri" | "siparisAdmin" | "sifreKodu" | "hediyeKodu" | "raporIletildi" | "faturaEklendi" | "iletisimForm";
const OLAYLAR: { key: BildirimKey; baslik: string; aciklama: string; alici: "Müşteri" | "Admin" | "İletişim" }[] = [
  { key: "uyeKayit", baslik: "Üyelik / hoş geldin", aciklama: "Müşteri üye olduğunda karşılama (hoş geldin) e-postası gider.", alici: "Müşteri" },
  { key: "siparisMusteri", baslik: "Sipariş onayı", aciklama: "Müşteri sipariş verdiğinde müşteriye sipariş özeti gider.", alici: "Müşteri" },
  { key: "siparisAdmin", baslik: "Yeni sipariş bildirimi", aciklama: "Müşteri sipariş verdiğinde admin bildirim adresine haber gider.", alici: "Admin" },
  { key: "sifreKodu", baslik: "Şifre değişim kodu", aciklama: "Müşteri şifresini değiştirmek istediğinde doğrulama kodu gider.", alici: "Müşteri" },
  { key: "hediyeKodu", baslik: "Hediye kodu tanımlandı", aciklama: "Admin müşteriye hediye kodu tanımladığında müşteriye bilgi gider.", alici: "Müşteri" },
  { key: "raporIletildi", baslik: "Rapor iletildi", aciklama: "Admin müşteriye bir rapor oluşturup ilettiğinde müşteriye bilgi gider.", alici: "Müşteri" },
  { key: "faturaEklendi", baslik: "Fatura eklendi", aciklama: "Admin siparişe fatura eklediğinde müşteriye fatura ekli e-posta gider.", alici: "Müşteri" },
  { key: "iletisimForm", baslik: "İletişim formu mesajı", aciklama: "Ziyaretçi iletişim formunu doldurduğunda mesaj iletişim adresine düşer.", alici: "İletişim" },
];
const ALICI_TONE: Record<string, string> = { "Müşteri": "border-emerald-400/30 bg-emerald-400/10 text-emerald-300", "Admin": "border-gold/30 bg-gold/10 text-gold-bright", "İletişim": "border-violet-400/30 bg-violet-400/10 text-violet-300" };

function BildirimBolum() {
  const [fromEmail, setFromEmail] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [iletisimEmail, setIletisimEmail] = useState("");
  const [bildirimler, setBildirimler] = useState<Record<BildirimKey, boolean>>({ uyeKayit: true, siparisMusteri: true, siparisAdmin: true, sifreKodu: true, hediyeKodu: true, raporIletildi: true, faturaEklendi: true, iletisimForm: true });
  const [msg, setMsg] = useState("");
  const [yuk, setYuk] = useState(false);
  const [yetki, setYetki] = useState(true);

  useEffect(() => {
    fetch("/api/admin/smtp").then((r) => r.json().then((d) => ({ ok: r.ok, d }))).then(({ ok, d }) => {
      if (!ok) { setYetki(false); return; }
      if (d.smtp) {
        setFromEmail(d.smtp.fromEmail || ""); setAdminEmail(d.smtp.adminEmail || ""); setIletisimEmail(d.smtp.iletisimEmail || "");
        if (d.smtp.bildirimler) setBildirimler((b) => ({ ...b, ...d.smtp.bildirimler }));
      }
    }).catch(() => {});
  }, []);

  const tikle = (k: BildirimKey) => setBildirimler((b) => ({ ...b, [k]: !b[k] }));

  const kaydet = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(""); setYuk(true);
    const r = await fetch("/api/admin/smtp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ adminEmail, iletisimEmail, bildirimler }) });
    const d = await r.json(); setYuk(false);
    setMsg(r.ok ? "Ayarlar kaydedildi." : d.error || "Hata.");
  };

  if (!yetki) return <Panel className="p-8 text-center text-parchment/45">Bu ayarları yalnızca süper admin görebilir.</Panel>;

  return (
    <form onSubmit={kaydet} className="max-w-5xl space-y-5">
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <Panel className="p-6">
          <h2 className="font-display text-lg font-semibold text-parchment">Bildirim Olayları</h2>
          <p className="mb-4 text-xs text-parchment/45">Hangi durumda e-posta gönderileceğini tek tek aç/kapa. Kapalı olanlar gönderilmez.</p>
          <div className="divide-y divide-white/5">
            {OLAYLAR.map((o) => (
              <div key={o.key} className="flex items-start gap-4 py-3.5 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-parchment/90">{o.baslik}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${ALICI_TONE[o.alici]}`}>{o.alici}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-parchment/45">{o.aciklama}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={bildirimler[o.key]}
                  onClick={() => tikle(o.key)}
                  className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${bildirimler[o.key] ? "bg-gold" : "bg-white/15"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-night-deep transition-all ${bildirimler[o.key] ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-6">
          <h2 className="font-display text-lg font-semibold text-parchment">Bildirim Adresleri</h2>
          <p className="mb-4 text-xs text-parchment/45">Hangi mailin kimden çıkıp nereye düşeceği.</p>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Müşteri bildirimleri — gönderen (From)</label>
              <input value={fromEmail} disabled className={`${inputCls} mt-1.5 w-full opacity-60`} />
            </div>
            <div>
              <label className={labelCls}>Admin bildirim e-postası — alıcı</label>
              <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="siparis@example.com" className={`${inputCls} mt-1.5 w-full`} />
            </div>
            <div>
              <label className={labelCls}>İletişim formu e-postası — alıcı</label>
              <input type="email" value={iletisimEmail} onChange={(e) => setIletisimEmail(e.target.value)} placeholder="iletisim@example.com" className={`${inputCls} mt-1.5 w-full`} />
            </div>
          </div>
        </Panel>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={yuk} className="rounded-full bg-gold px-6 py-2.5 text-sm font-medium text-night-deep transition-colors hover:bg-gold-bright disabled:opacity-60">{yuk ? "Kaydediliyor…" : "Kaydet"}</button>
        {msg && <span className="text-sm text-emerald-300">{msg}</span>}
      </div>
    </form>
  );
}

// ---------------- SMTP ----------------
type Smtp = { aktif: boolean; host: string; port: number; sifreleme: "ssl" | "tls" | "yok"; auth: boolean; username: string; fromEmail: string; fromName: string; forceFrom: boolean; sslDogrulama: boolean; adminEmail: string; iletisimEmail: string; hasPassword?: boolean };
const SMTP_BOS: Smtp = { aktif: false, host: "", port: 465, sifreleme: "ssl", auth: true, username: "", fromEmail: "", fromName: "", forceFrom: false, sslDogrulama: true, adminEmail: "", iletisimEmail: "" };

function SmtpBolum() {
  const [f, setF] = useState<Smtp>(SMTP_BOS);
  const [sifre, setSifre] = useState("");
  const [msg, setMsg] = useState("");
  const [yuk, setYuk] = useState(false);
  const [yetki, setYetki] = useState(true);
  const [testAdres, setTestAdres] = useState("");
  const [testMsg, setTestMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [testYuk, setTestYuk] = useState(false);
  const set = <K extends keyof Smtp>(k: K, v: Smtp[K]) => setF((s) => ({ ...s, [k]: v }));

  const testGonder = async () => {
    setTestMsg(null); setTestYuk(true);
    try {
      const r = await fetch("/api/admin/smtp/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: testAdres }) });
      const d = await r.json().catch(() => ({}));
      setTestMsg({ ok: r.ok, t: r.ok ? "Test e-postası gönderildi ✓ (gelen kutunu kontrol et)" : d.error || "Gönderilemedi." });
    } catch {
      setTestMsg({ ok: false, t: "Bağlantı hatası — SMTP sunucusuna ulaşılamadı." });
    } finally {
      setTestYuk(false);
    }
  };

  useEffect(() => {
    fetch("/api/admin/smtp").then((r) => r.json().then((d) => ({ ok: r.ok, d }))).then(({ ok, d }) => {
      if (!ok) { setYetki(false); return; }
      if (d.smtp) setF({ ...SMTP_BOS, ...d.smtp });
    }).catch(() => {});
  }, []);

  const kaydet = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(""); setYuk(true);
    const body: Record<string, unknown> = { ...f };
    if (sifre) body.password = sifre;
    const r = await fetch("/api/admin/smtp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json(); setYuk(false);
    setMsg(r.ok ? "SMTP ayarları kaydedildi." : d.error || "Hata.");
    if (r.ok) setSifre("");
  };

  if (!yetki) return <Panel className="p-8 text-center text-parchment/45">SMTP ayarlarını yalnızca süper admin görebilir.</Panel>;

  const Tik = ({ k, baslik }: { k: keyof Smtp; baslik: string }) => (
    <label className="flex cursor-pointer items-center gap-3">
      <input type="checkbox" checked={!!f[k]} onChange={(e) => set(k, e.target.checked as never)} className="h-4 w-4 accent-[#c2a36b]" />
      <span className={labelCls}>{baslik}</span>
    </label>
  );

  return (
    <form onSubmit={kaydet} className="max-w-5xl">
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {/* Sol kolon */}
        <div className="space-y-5">
          <Panel className="p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-parchment">Gönderici</h2>
            <div className="space-y-4">
              <Tik k="aktif" baslik="SMTP gönderim aktif" />
              <div>
                <label className={labelCls}>SMTP Host</label>
                <input value={f.host} onChange={(e) => set("host", e.target.value)} placeholder="mail.example.com" className={`${inputCls} mt-1.5 w-full`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>SMTP Port</label>
                  <input type="number" value={f.port} onChange={(e) => set("port", Number(e.target.value))} className={`${inputCls} mt-1.5 w-full`} />
                </div>
                <div>
                  <label className={labelCls}>Şifreleme türü</label>
                  <select value={f.sifreleme} onChange={(e) => set("sifreleme", e.target.value as Smtp["sifreleme"])} className={`${inputCls} mt-1.5 w-full`} style={{ colorScheme: "dark" }}>
                    <option value="ssl">SSL</option>
                    <option value="tls">TLS</option>
                    <option value="yok">Yok</option>
                  </select>
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-parchment">From Bilgileri</h2>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>From Email Address</label>
                <input value={f.fromEmail} onChange={(e) => set("fromEmail", e.target.value)} placeholder="form@example.com" className={`${inputCls} mt-1.5 w-full`} />
              </div>
              <div>
                <label className={labelCls}>From Name</label>
                <input value={f.fromName} onChange={(e) => set("fromName", e.target.value)} placeholder="Gökname" className={`${inputCls} mt-1.5 w-full`} />
              </div>
              <Tik k="forceFrom" baslik="Force From Address" />
            </div>
          </Panel>
        </div>

        {/* Sağ kolon */}
        <div className="space-y-5">
          <Panel className="p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-parchment">Kimlik Doğrulama</h2>
            <div className="space-y-4">
              <Tik k="auth" baslik="SMTP Authentication" />
              <div>
                <label className={labelCls}>SMTP Username</label>
                <input value={f.username} onChange={(e) => set("username", e.target.value)} placeholder="form@example.com" className={`${inputCls} mt-1.5 w-full`} />
              </div>
              <div>
                <label className={labelCls}>SMTP Password</label>
                <input type="password" value={sifre} onChange={(e) => setSifre(e.target.value)} placeholder={f.hasPassword ? "••••••••" : "Şifre"} className={`${inputCls} mt-1.5 w-full`} />
              </div>
            </div>
          </Panel>

          <Panel className="p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-parchment">İleri Ayarlar</h2>
            <label className="flex cursor-pointer items-center gap-3">
              <input type="checkbox" checked={!f.sslDogrulama} onChange={(e) => set("sslDogrulama", !e.target.checked)} className="h-4 w-4 accent-[#c2a36b]" />
              <span className={labelCls}>SSL/TLS doğrulamasını devre dışı bırak</span>
            </label>
          </Panel>

          <Panel className="p-6">
            <h2 className="mb-3 font-display text-lg font-semibold text-parchment">Test E-postası</h2>
            <div className="flex flex-wrap items-center gap-3">
              <input type="email" value={testAdres} onChange={(e) => setTestAdres(e.target.value)} placeholder="test@adres.com" className={`${inputCls} min-w-[200px] flex-1`} />
              <button type="button" onClick={testGonder} disabled={testYuk || !testAdres} className="rounded-full border border-gold/40 px-5 py-2 text-sm font-medium text-gold-bright transition-colors hover:bg-gold/10 disabled:opacity-50">{testYuk ? "Gönderiliyor…" : "Test Gönder"}</button>
            </div>
            {testMsg && <span className={`mt-2 block text-sm ${testMsg.ok ? "text-emerald-300" : "text-rose-300"}`}>{testMsg.t}</span>}
          </Panel>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button type="submit" disabled={yuk} className="rounded-full bg-gold px-6 py-2.5 text-sm font-medium text-night-deep transition-colors hover:bg-gold-bright disabled:opacity-60">{yuk ? "Kaydediliyor…" : "Kaydet"}</button>
        {msg && <span className="text-sm text-emerald-300">{msg}</span>}
      </div>
    </form>
  );
}
