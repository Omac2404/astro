import { NextResponse } from "next/server";
import { getSmtp, setSmtp, type SmtpConfig } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  if (!u.super) return NextResponse.json({ error: "Yalnızca süper admin." }, { status: 403 });
  const c = getSmtp();
  // Şifreyi gönderme; sadece kayıtlı olup olmadığını bildir
  const { password, ...rest } = c;
  return NextResponse.json({ smtp: { ...rest, hasPassword: !!password } });
}

export async function POST(req: Request) {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  if (!u.super) return NextResponse.json({ error: "Yalnızca süper admin yapılandırabilir." }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  // Kısmi güncelleme: yalnızca gönderilen alanlar değişir (SMTP sekmesi ve Bildirim sekmesi birbirini ezmesin)
  const patch: Partial<SmtpConfig> = {};
  if ("aktif" in b) patch.aktif = !!b.aktif;
  if ("host" in b) patch.host = String(b.host ?? "").trim();
  if ("port" in b) patch.port = Number(b.port) || 465;
  if ("sifreleme" in b) patch.sifreleme = ["ssl", "tls", "yok"].includes(b.sifreleme) ? b.sifreleme : "ssl";
  if ("auth" in b) patch.auth = !!b.auth;
  if ("username" in b) patch.username = String(b.username ?? "").trim();
  if ("fromEmail" in b) patch.fromEmail = String(b.fromEmail ?? "").trim();
  if ("fromName" in b) patch.fromName = String(b.fromName ?? "").trim();
  if ("forceFrom" in b) patch.forceFrom = !!b.forceFrom;
  if ("sslDogrulama" in b) patch.sslDogrulama = b.sslDogrulama !== false;
  if ("adminEmail" in b) patch.adminEmail = String(b.adminEmail ?? "").trim();
  if ("iletisimEmail" in b) patch.iletisimEmail = String(b.iletisimEmail ?? "").trim();
  if ("bildirimler" in b && b.bildirimler && typeof b.bildirimler === "object") {
    const bd: Partial<Record<string, boolean>> = {};
    for (const [k, v] of Object.entries(b.bildirimler)) bd[k] = !!v;
    patch.bildirimler = bd as SmtpConfig["bildirimler"];
  }
  // Şifre yalnızca doluysa güncellenir (boş bırakılırsa korunur)
  if (typeof b.password === "string" && b.password.length > 0) patch.password = b.password;

  setSmtp(patch);
  return NextResponse.json({ ok: true });
}
