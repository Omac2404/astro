"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AddressFields, bosAdres, type Adres } from "@/components/address-fields";

const inputCls = "w-full rounded-xl border border-gold/20 bg-night px-4 py-2.5 text-parchment placeholder:text-parchment/35 outline-none transition-colors focus:border-gold/55";
const labelCls = "mb-1.5 block text-xs uppercase tracking-[0.15em] text-parchment/55";

export default function FaturaPage() {
  const router = useRouter();
  const [f, setF] = useState({ ad: "", email: "", tel: "" });
  const [adr, setAdr] = useState<Adres>(bosAdres());
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [yuk, setYuk] = useState(false);
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    fetch("/api/account/fatura")
      .then((r) => r.json())
      .then((d) => {
        if (d.fatura) {
          setF({ ad: d.fatura.ad ?? "", email: d.fatura.email ?? d.email ?? "", tel: d.fatura.tel ?? "" });
          setAdr({
            yurtdisi: !!d.fatura.yurtdisi,
            il: d.fatura.il ?? "", ilce: d.fatura.ilce ?? "",
            ulke: d.fatura.ulke ?? "", sehir: d.fatura.sehir ?? "",
            acikAdres: d.fatura.acikAdres ?? "",
          });
        } else if (d.email) setF((s) => ({ ...s, email: d.email }));
      })
      .catch(() => {});
  }, []);

  const kaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setYuk(true);
    const r = await fetch("/api/account/fatura", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, ...adr }) });
    const d = await r.json();
    setYuk(false);
    if (r.ok) { setOk(true); setMsg("Fatura bilgilerin kaydedildi."); }
    else { setOk(false); setMsg(d.error || "Kaydedilemedi."); }
  };

  return (
    <div className="mx-auto max-w-lg px-5 py-14">
      <Link href="/hesabim" className="text-sm text-parchment/55 hover:text-gold-bright">← Hesabım</Link>
      <h1 className="mt-3 font-display text-4xl font-semibold">Fatura Bilgileri</h1>
      <p className="mt-2 text-sm text-parchment/60">Dijital ürün — bu bilgiler faturan için kullanılır.</p>

      <form onSubmit={kaydet} className="mt-8 space-y-4 rounded-2xl border border-gold/15 bg-night-deep p-6">
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
        {msg && <p className={`text-sm ${ok ? "text-emerald-300" : "text-rose-300"}`}>{msg}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={yuk} className="rounded-full bg-gold px-6 py-2.5 font-medium text-night-deep transition-colors hover:bg-gold-bright disabled:opacity-60">
            {yuk ? "Kaydediliyor…" : "Kaydet"}
          </button>
          <button type="button" onClick={() => router.push("/hesabim")} className="rounded-full border border-gold/30 px-6 py-2.5 font-medium text-parchment/75 transition-colors hover:text-gold-bright">
            Vazgeç
          </button>
        </div>
      </form>
    </div>
  );
}
