// PayTR iFrame API yardımcıları — resmi hash algoritması (HMAC-SHA256 + base64).
// Dokümana göre token: base64( HMAC-SHA256( hashStr + merchant_salt, merchant_key ) )
import crypto from "node:crypto";

type Creds = { merchantId: string; merchantKey: string; merchantSalt: string };

// get-token isteği için paytr_token
export function odemeToken(
  c: Creds,
  f: { userIp: string; merchantOid: string; email: string; paymentAmount: number; userBasket: string; noInstallment: string; maxInstallment: string; currency: string; testMode: string }
): string {
  const hashStr =
    c.merchantId + f.userIp + f.merchantOid + f.email + f.paymentAmount + f.userBasket + f.noInstallment + f.maxInstallment + f.currency + f.testMode;
  return crypto.createHmac("sha256", c.merchantKey).update(hashStr + c.merchantSalt).digest("base64");
}

// Bildirim (callback) doğrulama hash'i
export function callbackHash(c: Creds, f: { merchantOid: string; status: string; totalAmount: string }): string {
  const str = f.merchantOid + c.merchantSalt + f.status + f.totalAmount;
  return crypto.createHmac("sha256", c.merchantKey).update(str).digest("base64");
}

// Sepeti PayTR formatına çevir: [ [ad, birim fiyat (string), adet], ... ] → base64(JSON)
export function userBasket(items: { ad: string; fiyat: number }[]): string {
  const arr = items.map((i) => [i.ad, i.fiyat.toFixed(2), 1]);
  return Buffer.from(JSON.stringify(arr)).toString("base64");
}

export const IFRAME_URL = "https://www.paytr.com/odeme/guzel-bldir/";
export const GET_TOKEN_URL = "https://www.paytr.com/odeme/api/get-token";
