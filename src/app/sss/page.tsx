import Link from "next/link";
import { Faq } from "@/components/faq";
import { getGenelAyar } from "@/lib/db";
import { seoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const generateMetadata = () => seoMetadata("/sss");

export default function SSSPage() {
  const SSS = getGenelAyar().sss;
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <header className="text-center">
        <h1 className="font-display text-5xl font-semibold">Sıkça sorulan sorular</h1>
      </header>

      <div className="mt-12">
        <Faq items={SSS} />
      </div>

      <div className="mt-12 text-center text-parchment/65">
        Başka bir sorun mu var?{" "}
        <Link href="/iletisim" className="text-gold-bright hover:underline">
          Bize ulaş
        </Link>
        .
      </div>
    </div>
  );
}
