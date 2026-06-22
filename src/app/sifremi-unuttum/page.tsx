import { ForgotPassword } from "@/components/forgot-password";

export default function UyeSifreSifirla() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-5 py-16">
      <ForgotPassword scope="member" title="Şifremi Unuttum" backHref="/giris" />
    </div>
  );
}
