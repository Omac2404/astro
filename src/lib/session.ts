// Cookie tabanlı oturum yardımcıları (sunucu). httpOnly cookie + db oturum kaydı.
import { cookies } from "next/headers";
import { readSession, findAdmin } from "@/lib/db";

const COOKIE = "gn_session";

export async function setSessionCookie(token: string) {
  const c = await cookies();
  c.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getSessionToken(): Promise<string | undefined> {
  const c = await cookies();
  return c.get(COOKIE)?.value;
}

export async function clearSessionCookie() {
  const c = await cookies();
  c.delete(COOKIE);
}

export type CurrentUser =
  | { type: "member"; email: string }
  | { type: "admin"; email: string; super: boolean; ad: string }
  | null;

export async function currentUser(): Promise<CurrentUser> {
  const token = await getSessionToken();
  const rec = readSession(token);
  if (!rec) return null;
  if (rec.type === "admin") {
    const a = findAdmin(rec.email);
    if (!a) return null;
    return { type: "admin", email: a.email, super: a.super, ad: a.ad };
  }
  return { type: "member", email: rec.email };
}

export async function requireAdmin(): Promise<Extract<CurrentUser, { type: "admin" }> | null> {
  const u = await currentUser();
  return u && u.type === "admin" ? u : null;
}
