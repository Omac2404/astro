import { NextResponse } from "next/server";
import { attachInvoice, saveFile, getOrders } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { sendEvent } from "@/lib/mail";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const form = await req.formData();
  const orderId = String(form.get("orderId") ?? "");
  const file = form.get("file");
  if (!orderId || !(file instanceof File)) return NextResponse.json({ error: "Sipariş ve dosya gerekli." }, { status: 400 });

  const order = getOrders().find((o) => o.id === orderId);
  if (!order) return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });

  const buf = Buffer.from(await file.arrayBuffer());
  const dosyaId = saveFile(buf, "pdf");
  attachInvoice(orderId, dosyaId);

  // Müşteriye fatura bildirimi (faturayı e-postaya ekli gönder)
  sendEvent(
    "faturaEklendi",
    order.email,
    `Faturan hazır — ${order.id}`,
    `${order.id} numaralı siparişinin faturası hazırlandı. Faturanı bu e-postanın ekinde bulabilir, dilersen hesabındaki "Siparişlerim" alanından da görüntüleyebilirsin.`,
    [{ filename: `fatura-${order.id}.pdf`, content: buf }]
  );
  return NextResponse.json({ ok: true });
}
