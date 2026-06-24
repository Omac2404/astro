"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import { PaymentBadges } from "@/components/payment-badges";
import { AddressFields, bosAdres, type Adres } from "@/components/address-fields";

const inputCls =
  "w-full rounded-xl border border-gold/20 bg-night/50 px-4 py-2.5 text-parchment placeholder:text-parchment/35 outline-none transition-colors focus:border-gold/55";
const labelCls = "mb-1.5 block text-xs uppercase tracking-[0.15em] text-parchment/55";

export default function OdemePage() {
  const { items, total, count, clear } = useCart();
  const router = useRouter();
  const [uye, setUye] = useState<boolean | null>(null);
  const [f, setF] = useState({ ad: "", email: "", tel: "" });
  const [adr, setAdr] = useState<Adres>(bosAdres());
  const [onay, setOnay] = useState(false);
  const [hata, setHata] = useState("");
  const [yuk, setYuk] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const m = d.user?.type === "member";
        setUye(m);
        if (m && d.user.email) setF((s) => ({ ...s, email: d.user.email }));
        if (m) {
          // Kayıtlı fatura bilgilerini otomatik doldur
          fetch("/api/account/fatura")
            .then((r) => r.json())
            .then((fd) => {
              if (fd.fatura) {
                setF((s) => ({
                  ad: fd.fatura.ad ?? s.ad,
                  email: fd.fatura.email ?? s.email,
                  tel: fd.fatura.tel ?? s.tel,
                }));
                setAdr((s) => ({
                  yurtdisi: !!fd.fatura.yurtdisi,
                  il: fd.fatura.il ?? "",
                  ilce: fd.fatura.ilce ?? "",
                  ulke: fd.fatura.ulke ?? "",
                  sehir: fd.fatura.sehir ?? "",
                  acikAdres: fd.fatura.acikAdres ?? "",
                }));
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => setUye(false));
  }, []);

  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  const ode = async (e: React.FormEvent) => {
    e.preventDefault();
    setHata("");
    if (!onay) return setHata("Devam etmek için ön bilgilendirme ve mesafeli satış sözleşmesini onaylamalısın.");
    setYuk(true);
    const fatura = { ad: f.ad, email: f.email, tel: f.tel, yurtdisi: adr.yurtdisi, il: adr.il, ilce: adr.ilce, ulke: adr.ulke, sehir: adr.sehir, acikAdres: adr.acikAdres };
    let kaynak: string | undefined;
    try { kaynak = localStorage.getItem("gn_source") || undefined; } catch {}
    const r = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: items.flatMap((i) => Array(i.qty).fill({ slug: i.slug, hediye: !!i.hediye })), fatura, kaynak }),
    });
    const d = await r.json();
    setYuk(false);
    if (!r.ok) {
      if (d.needLogin) router.push("/giris?next=/odeme");
      else setHata(d.error || "Ödeme başarısız.");
      return;
    }
    clear();
    router.push("/hesabim?yeni=1");
    router.refresh();
  };

  if (uye === false) {
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold">Üye girişi gerekli</h1>
        <p className="mt-3 text-parchment/65">Ödemeye geçmek için üye olmalı ya da giriş yapmalısın.</p>
        <Link href="/giris?next=/odeme" className="mt-6 inline-block rounded-full bg-gold px-6 py-3 font-medium text-night-deep transition-colors hover:bg-gold-bright">
          Üye Ol / Giriş Yap
        </Link>
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold">Sepetin boş</h1>
        <Link href="/analizler" className="mt-6 inline-block rounded-full bg-gold px-6 py-3 font-medium text-night-deep transition-colors hover:bg-gold-bright">
          Analizleri Keşfet
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-14">
      <h1 className="font-display text-4xl font-semibold">Ödeme</h1>

      <form onSubmit={ode} className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        {/* Fatura bilgileri */}
        <div className="rounded-2xl border border-gold/15 bg-night p-6">
          <h2 className="font-display text-2xl font-semibold text-parchment">Fatura Bilgileri</h2>

          <div className="mt-5 space-y-4">
            <div>
              <label className={labelCls}>Ad Soyad</label>
              <input required value={f.ad} onChange={(e) => set("ad", e.target.value)} placeholder="Ad Soyad" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>E-posta</label>
              <input required type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="ornek@eposta.com" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Telefon</label>
              <input required type="tel" value={f.tel} onChange={(e) => set("tel", e.target.value)} placeholder="05xx xxx xx xx" className={inputCls} />
            </div>
            <AddressFields a={adr} set={(p) => setAdr((s) => ({ ...s, ...p }))} inputCls={inputCls} labelCls={labelCls} />
          </div>

          {/* Onay tiki — mesafeli satış mevzuatı: ön bilgilendirme + sözleşme + dijital üründe cayma hakkı */}
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-gold/10 bg-night/40 px-3 py-3 text-sm text-parchment/70">
            <input type="checkbox" checked={onay} onChange={(e) => setOnay(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#c2a36b]" />
            <span>
              <Link href="/yasal/on-bilgilendirme" target="_blank" className="text-gold-bright hover:underline">Ön Bilgilendirme Formu</Link>’nu,{" "}
              <Link href="/yasal/mesafeli-satis" target="_blank" className="text-gold-bright hover:underline">Mesafeli Satış Sözleşmesi</Link>’ni ve{" "}
              <Link href="/yasal/kullanim" target="_blank" className="text-gold-bright hover:underline">Kullanım Koşulları</Link>’nı okudum; ürünün kişiye özel dijital içerik olması nedeniyle{" "}
              <Link href="/yasal/iade" target="_blank" className="text-gold-bright hover:underline">cayma hakkımın bulunmadığını</Link> kabul ediyorum.
            </span>
          </label>
        </div>

        {/* Özet */}
        <aside className="rounded-2xl border border-gold/20 bg-night p-5 lg:sticky lg:top-32">
          <h3 className="font-display text-lg font-semibold text-parchment">Sipariş Özeti</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {items.map((it) => (
              <li key={`${it.slug}${it.hediye ? ":h" : ""}`} className="flex justify-between gap-3 text-parchment/75">
                <span className="min-w-0 truncate">{it.ad}{it.hediye ? " (hediye)" : ""}{it.qty > 1 ? ` ×${it.qty}` : ""}</span>
                <span className="shrink-0 text-gold-bright">{it.fiyat * it.qty} ₺</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-gold/10 pt-3">
            <span className="text-parchment/70">{count} ürün</span>
            <span className="font-body text-2xl font-semibold text-gold-bright">{total} ₺</span>
          </div>
          {hata && <p className="mt-3 text-sm text-rose-300">{hata}</p>}
          <button type="submit" disabled={yuk} className="mt-4 w-full rounded-full bg-gold py-3 font-medium text-night-deep transition-colors hover:bg-gold-bright disabled:opacity-60">
            {yuk ? "İşleniyor…" : "Ödemeyi Tamamla"}
          </button>
          <PaymentBadges />
          <Link href="/sepet" className="mt-3 block text-center text-sm text-parchment/55 hover:text-gold-bright">
            ← Sepete dön
          </Link>
        </aside>
      </form>
    </div>
  );
}
