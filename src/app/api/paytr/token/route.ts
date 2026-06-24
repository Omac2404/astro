import { NextResponse } from "next/server";
import { getPaytr, getOrdersByEmail, paytrOid, faturaAdres } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { odemeToken, userBasket, GET_TOKEN_URL, IFRAME_URL } from "@/lib/paytr";

export const runtime = "nodejs";
export const maxDuration = 30;

// Üyenin mevcut siparişi için PayTR iframe token'ı üretir.
export async function POST(req: Request) {
  const u = await currentUser();
  if (!u || u.type !== "member") return NextResponse.json({ error: "Önce üye girişi yapmalısın." }, { status: 401 });

  const { orderId } = await req.json().catch(() => ({}));
  const order = getOrdersByEmail(u.email).find((o) => o.id === String(orderId ?? ""));
  if (!order) return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
  if (order.total <= 0) return NextResponse.json({ error: "Ödenecek tutar yok." }, { status: 400 });

  const c = getPaytr();
  if (!c.aktif) return NextResponse.json({ error: "Sanal pos şu an kapalı." }, { status: 400 });
  if (!c.merchantId || !c.merchantKey || !c.merchantSalt) return NextResponse.json({ error: "PayTR bilgileri eksik." }, { status: 400 });

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "127.0.0.1";
  const origin = req.headers.get("origin") || (req.headers.get("host") ? `https://${req.headers.get("host")}` : "");

  const merchantOid = paytrOid(order.id);
  const paymentAmount = Math.round(order.total * 100); // kuruş
  const basket = userBasket(order.items);
  const noInstallment = c.tekCekim ? "1" : "0";
  const maxInstallment = String(c.maxTaksit || 0);
  const currency = "TL";
  const testMode = c.testMod ? "1" : "0";
  const email = order.fatura?.email || u.email;

  const token = odemeToken(
    { merchantId: c.merchantId, merchantKey: c.merchantKey, merchantSalt: c.merchantSalt },
    { userIp: ip, merchantOid, email, paymentAmount, userBasket: basket, noInstallment, maxInstallment, currency, testMode }
  );

  const form = new URLSearchParams({
    merchant_id: c.merchantId,
    user_ip: ip,
    merchant_oid: merchantOid,
    email,
    payment_amount: String(paymentAmount),
    paytr_token: token,
    user_basket: basket,
    debug_on: c.testMod ? "1" : "0",
    no_installment: noInstallment,
    max_installment: maxInstallment,
    user_name: order.fatura?.ad || u.email,
    user_address: faturaAdres(order.fatura) || "-",
    user_phone: order.fatura?.tel || "-",
    merchant_ok_url: `${origin}/hesabim`,
    merchant_fail_url: `${origin}/sepet`,
    timeout_limit: "30",
    currency,
    test_mode: testMode,
  });

  try {
    const res = await fetch(GET_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      signal: AbortSignal.timeout(20000),
    });
    const data = await res.json();
    if (data?.status !== "success") {
      return NextResponse.json({ error: data?.reason || "PayTR token alınamadı." }, { status: 400 });
    }
    return NextResponse.json({ token: data.token, iframeUrl: IFRAME_URL + data.token });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "PayTR bağlantı hatası." }, { status: 502 });
  }
}
