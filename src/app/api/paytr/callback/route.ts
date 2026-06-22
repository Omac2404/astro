import { getPaytr, markOrderPaidByOid } from "@/lib/db";
import { callbackHash } from "@/lib/paytr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PayTR bildirim (callback) URL'i. PayTR mağaza panelinde bu adres tanımlanır.
// Hash doğrulanır; başarılıysa sipariş "ödendi" işaretlenir ve düz metin "OK" döner.
export async function POST(req: Request) {
  const c = getPaytr();
  const form = await req.formData().catch(() => null);
  if (!form) return new Response("PAYTR notification failed: no data", { status: 400 });

  const merchantOid = String(form.get("merchant_oid") ?? "");
  const status = String(form.get("status") ?? "");
  const totalAmount = String(form.get("total_amount") ?? "");
  const hash = String(form.get("hash") ?? "");

  if (!c.merchantKey || !c.merchantSalt) return new Response("PAYTR notification failed: not configured", { status: 400 });

  const beklenen = callbackHash(
    { merchantId: c.merchantId, merchantKey: c.merchantKey, merchantSalt: c.merchantSalt },
    { merchantOid, status, totalAmount }
  );
  if (hash !== beklenen) return new Response("PAYTR notification failed: bad hash", { status: 400 });

  if (status === "success") {
    markOrderPaidByOid(merchantOid);
  }
  // PayTR tekrar denemesini durdurmak için her zaman OK döndürülmeli (hash doğrulandıktan sonra)
  return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
}
