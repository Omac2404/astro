"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Panel, PageHead, Badge } from "@/components/admin-ui";
import { PRODUCTS } from "@/lib/products";
import { PersonFields, bosKisi, toDogum, type Kisi } from "@/components/birth-form";
import { MemberSelect } from "@/components/member-select";

const URETILEBILIR = ["natal", "ask", "kariyer", "saglik", "solar", "lilith", "sinastri-sevgili", "sinastri-arkadas"];

type Dogum = { ad: string; tarih: string; saat: string; yer: string };
type Gen = { id: string; slug: string; urunAd: string; dogum: Dogum; dogum2?: Dogum; durum: "olusturuluyor" | "hazir" | "hata"; dosya?: string; hata?: string; atandi?: string; tarih: string };
type Member = { id: string; email: string };

const TONE = { olusturuluyor: "blue", hazir: "green", hata: "rose" } as const;
const ETIKET = { olusturuluyor: "Oluşturuluyor…", hazir: "Hazır", hata: "Hata" } as const;

export default function RaporOlusturPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [gens, setGens] = useState<Gen[]>([]);
  const [slug, setSlug] = useState("natal");
  const [k1, setK1] = useState<Kisi>(bosKisi());
  const [k2, setK2] = useState<Kisi>(bosKisi());
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cift = slug.startsWith("sinastri");

  const loadGens = useCallback(async () => {
    const r = await fetch("/api/admin/generated");
    const d = await r.json();
    setGens(d.generated ?? []);
  }, []);

  useEffect(() => {
    fetch("/api/admin/members").then((r) => r.json()).then((d) => setMembers(d.members ?? [])).catch(() => {});
    loadGens();
  }, [loadGens]);

  useEffect(() => {
    const aktif = gens.some((g) => g.durum === "olusturuluyor");
    if (aktif && !pollRef.current) pollRef.current = setInterval(loadGens, 4000);
    else if (!aktif && pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [gens, loadGens]);

  const uret = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setBusy(true);
    const body: Record<string, unknown> = { slug, dogum: toDogum(k1) };
    if (cift) body.dogum2 = toDogum(k2);
    const r = await fetch("/api/admin/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setMsg(d.error || "Hata."); return; }
    setMsg("");
    setK1(bosKisi());
    setK2(bosKisi());
    loadGens();
  };

  return (
    <div>
      <PageHead title="Rapor Oluştur" desc="Ürünü seç, doğum bilgilerini gir (üye formuyla aynı), raporu burada üret. Hazır olunca bir müşteriye ata." />

      <div className="grid gap-6 lg:grid-cols-[420px_1fr] lg:items-start">
        {/* Üretim formu */}
        <Panel className="p-6">
          <form onSubmit={uret} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-parchment/55">Ürün / Analiz</label>
              <select value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full rounded-xl border border-gold/20 bg-night px-4 py-2.5 text-parchment outline-none focus:border-gold/55" style={{ colorScheme: "dark" }}>
                {PRODUCTS.map((p) => (
                  <option key={p.slug} value={p.slug} disabled={!URETILEBILIR.includes(p.slug)}>
                    {p.ad}{!URETILEBILIR.includes(p.slug) ? " (yakında)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {cift ? (
              <>
                <PersonFields k={k1} set={(patch) => setK1((s) => ({ ...s, ...patch }))} baslik="1. Kişi" />
                <div className="border-t border-gold/10" />
                <PersonFields k={k2} set={(patch) => setK2((s) => ({ ...s, ...patch }))} baslik="2. Kişi" />
              </>
            ) : (
              <PersonFields k={k1} set={(patch) => setK1((s) => ({ ...s, ...patch }))} />
            )}

            {msg && <p className="rounded-lg border border-gold/15 bg-night/40 px-3 py-2 text-sm text-parchment/75">{msg}</p>}
            <button type="submit" disabled={busy} className="w-full rounded-full bg-gold py-3 text-sm font-medium text-night-deep transition-colors hover:bg-gold-bright disabled:opacity-60">
              {busy ? "Başlatılıyor…" : "Raporu Oluştur"}
            </button>
          </form>
        </Panel>

        {/* Üretilen raporlar havuzu */}
        <Panel>
          <div className="border-b border-gold/15 px-5 py-3 text-sm font-medium text-parchment/70">Üretilen Raporlar</div>
          {gens.length === 0 ? (
            <div className="px-6 py-14 text-center text-parchment/45">Henüz rapor üretmedin.</div>
          ) : (
            <ul className="divide-y divide-white/5">
              {gens.map((g) => (
                <GenRow key={g.id} g={g} members={members} onAssigned={loadGens} />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function GenRow({ g, members, onAssigned }: { g: Gen; members: Member[]; onAssigned: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const kisiler = g.dogum2 ? `${g.dogum.ad} & ${g.dogum2.ad}` : g.dogum.ad;
  const yerler = g.dogum2 ? `${g.dogum.yer} · ${g.dogum2.yer}` : g.dogum.yer;

  const ata = async () => {
    if (!email) { setMsg("Müşteri seç."); return; }
    setBusy(true);
    setMsg("");
    const r = await fetch("/api/admin/generated/assign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ genId: g.id, email }) });
    const d = await r.json();
    setBusy(false);
    if (r.ok) { setMsg("Atandı ✓"); onAssigned(); }
    else setMsg(d.error || "Hata.");
  };

  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-parchment/90">{g.urunAd}</div>
          <div className="text-xs text-parchment/50">{kisiler} · {g.dogum.tarih} {g.dogum.saat} · {yerler}</div>
          {g.durum === "hata" && <div className="mt-1 max-w-md text-xs text-rose-300/80">{g.hata}</div>}
          {g.atandi && <div className="mt-1 text-xs text-emerald-300/80">→ {g.atandi} hesabına atandı</div>}
        </div>
        <Badge tone={TONE[g.durum]}>{ETIKET[g.durum]}</Badge>
      </div>

      {g.durum === "hazir" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <a href={`/api/files/${g.dosya}`} target="_blank" rel="noopener" className="rounded-lg border border-gold/25 px-3 py-1.5 text-xs text-parchment/75 hover:text-gold-bright">İndir / Görüntüle</a>
          {!g.atandi && (
            <>
              <div className="min-w-[220px]">
                <MemberSelect members={members} value={email} onChange={setEmail} />
              </div>
              <button onClick={ata} disabled={busy} className="rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-night-deep transition-colors hover:bg-gold-bright disabled:opacity-50">
                {busy ? "…" : "Müşteriye Ata"}
              </button>
            </>
          )}
          {msg && <span className="text-xs text-parchment/70">{msg}</span>}
        </div>
      )}
    </li>
  );
}
