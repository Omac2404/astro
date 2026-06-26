// Google OAuth 2.0 (Authorization Code akışı) — hafif, harici kütüphane yok.
// GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET ortam değişkenlerinden gelir (EasyPanel env / .env.local).
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export function googleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

// Sitenin genel adresi: APP_BASE_URL varsa onu, yoksa proxy başlıklarından türet (localhost'ta http).
export function baseUrl(req: Request): string {
  const env = process.env.APP_BASE_URL;
  if (env) return env.replace(/\/+$/, "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || (/^(localhost|127\.)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}

// Google Console'a kayıtlı "Authorized redirect URI" ile BİREBİR aynı olmalı.
export function redirectUri(req: Request): string {
  return baseUrl(req) + "/api/auth/google/callback";
}

// Kullanıcının yönlendirileceği Google onay ekranı URL'i.
export function authUrl(req: Request, state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(req),
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `${AUTH_URL}?${p.toString()}`;
}

type Profile = { email: string; emailVerified: boolean; ad: string };

// code -> token; id_token'dan e-posta/ad çözülür.
// id_token doğrudan Google'ın token uç noktasından (sunucu-sunucu, TLS) geldiği için
// imza doğrulaması atlanabilir (Google'ın resmi olarak izin verdiği durum).
export async function exchangeCode(req: Request, code: string): Promise<Profile> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uri: redirectUri(req),
    grant_type: "authorization_code",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error("Google ile bağlantı kurulamadı.");
  const data = (await res.json()) as { id_token?: string };
  if (!data.id_token) throw new Error("Google kimlik bilgisi alınamadı.");
  const payload = decodeJwtPayload(data.id_token);
  const email = String(payload.email ?? "").toLowerCase().trim();
  const emailVerified = payload.email_verified === true || payload.email_verified === "true";
  const ad = String(payload.name ?? "").trim();
  if (!email) throw new Error("Google hesabından e-posta alınamadı.");
  return { email, emailVerified, ad };
}

function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const part = jwt.split(".")[1] || "";
  const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
}
