import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

// API key sadece sunucuda okunur — tarayıcıya asla sızmaz.
const client = new Anthropic(); // ANTHROPIC_API_KEY ortam değişkeninden okunur

// Node.js runtime gerekir (SDK Edge'de çalışmaz).
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY tanımlı değil. .env.local dosyasını doldur." },
      { status: 500 },
    );
  }

  let message: string;
  try {
    const body = await req.json();
    message = body.message;
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON gövdesi." }, { status: 400 });
  }

  if (!message || typeof message !== "string") {
    return NextResponse.json(
      { error: "`message` alanı (string) gerekli." },
      { status: 400 },
    );
  }

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      messages: [{ role: "user", content: message }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    return NextResponse.json({ text });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status ?? 500 },
      );
    }
    return NextResponse.json({ error: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
