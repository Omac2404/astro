import { ForgotPassword } from "@/components/forgot-password";
import { currentUser } from "@/lib/session";

export default async function UyeSifreSifirla() {
  const u = await currentUser();
  const uyeGirisli = !!u && u.type === "member";
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-5 py-16">
      <ForgotPassword
        scope="member"
        title={uyeGirisli ? "Şifre Değiştir" : "Şifremi Unuttum"}
        backHref={uyeGirisli ? "/hesabim" : "/giris"}
        backLabel={uyeGirisli ? "Hesabıma dön" : "Giriş ekranına dön"}
      />
    </div>
  );
}
