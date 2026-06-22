import { ForgotPassword } from "@/components/forgot-password";

export default function AdminSifreSifirla() {
  return <ForgotPassword scope="admin" title="Admin · Şifremi Unuttum" backHref="/admin/giris" />;
}
