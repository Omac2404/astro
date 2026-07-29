import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { getMemberDogum, findMember } from "@/lib/db";
import { LogoutButton } from "@/components/account-actions";
import { Analizlerim } from "@/components/account-panels";
import { KartIkon } from "@/components/kart-ikon";

export const dynamic = "force-dynamic";

export default async function HesabimPage() {
  const u = await currentUser();
  if (!u || u.type !== "member") redirect("/giris?next=/hesabim");
  const dogum = getMemberDogum(u.email);
  const googleUye = !!findMember(u.email)?.google; // Google ile kayıt: şifresi yok, değiştirme satırı gösterilmez

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      {/* Başlık */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-gold/15 pb-7">
        <div>
          <span className="text-xs uppercase tracking-[0.25em] text-gold-bright/70">Hesabım</span>
          <h1 className="mt-2 font-display text-4xl font-semibold text-parchment">Hoş geldin</h1>
          <p className="mt-1 text-parchment/60">{u.email}</p>
        </div>
        <LogoutButton />
      </header>

      {/* Hesap + Analizlerim */}
      <div className="mt-8 grid gap-5 lg:grid-cols-3 lg:items-start">
        <section className="overflow-hidden rounded-2xl border border-gold/15 bg-night p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-parchment">
            <KartIkon d="account" />
            Hesap
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-parchment/50">E-posta</dt>
              <dd className="truncate text-parchment/85">{u.email}</dd>
            </div>
            {googleUye ? (
              <div className="flex items-center justify-between gap-4 border-t border-gold/10 pt-3">
                <dt className="text-parchment/50">Giriş</dt>
                <dd className="text-parchment/70">Google ile</dd>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4 border-t border-gold/10 pt-3">
                <dt className="text-parchment/50">Şifre</dt>
                <dd>
                  <a href="/sifremi-unuttum" className="text-gold-bright hover:underline">Değiştir</a>
                </dd>
              </div>
            )}
            <div className="border-t border-gold/10 pt-3">
              <dt className="mb-1 text-parchment/50">Doğum bilgin <span className="text-[11px] text-parchment/35">(değiştirilemez)</span></dt>
              <dd>
                {dogum ? (
                  <div className="text-parchment/85">{dogum.ad} · {dogum.tarih}{dogum.saat ? ` ${dogum.saat}` : ""} · {dogum.yer}</div>
                ) : (
                  <a href="/hesabim/dogum" className="text-gold-bright hover:underline">Doğum bilgini gir →</a>
                )}
              </dd>
            </div>
          </dl>
        </section>

        <div className="lg:col-span-2">
          <Analizlerim />
        </div>
      </div>
    </div>
  );
}
