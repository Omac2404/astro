import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Streaming metadata'yı kapat: metadata (favicon + SEO head meta'ları, ör. google-site-verification)
  // her istekte bloklayarak <head>'e basılsın. Aksi halde tarayıcıya stream edilip body'ye düşebiliyor
  // ve Google doğrulama tarayıcısı head'de bulamıyordu. Metadata'mız senkron (hızlı), gecikme yok.
  htmlLimitedBots: /.*/,
};

export default nextConfig;
