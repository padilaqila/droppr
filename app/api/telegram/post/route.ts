import { NextResponse } from "next/server";
import { cleanTelegramHtml } from "@/lib/utils/clean-links";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawUrl = body?.url?.trim();

    if (!rawUrl) {
      return NextResponse.json(
        { error: "URL Telegram wajib diisi." },
        { status: 400 }
      );
    }

    // Parse channel and message ID from telegram URL
    // Format: https://t.me/channel_name/1234 or https://t.me/s/channel_name/1234
    const match = rawUrl.match(/t\.me\/(?:s\/)?([a-zA-Z0-9_+]+)\/([0-9]+)/i);
    if (!match || !match[1] || !match[2]) {
      return NextResponse.json(
        {
          error:
            "Format link tidak valid. Gunakan format link postingan Telegram seperti: https://t.me/dutacryptoairdrop/1234",
        },
        { status: 400 }
      );
    }

    const channel = match[1];
    const messageId = match[2];
    const embedUrl = `https://t.me/${channel}/${messageId}?embed=1`;

    const res = await fetch(embedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Gagal mengambil pesan dari Telegram (Status ${res.status}). Pastikan channel bersifat publik.` },
        { status: 400 }
      );
    }

    const html = await res.text();

    // 1. Extract message text
    const textMatch = /<div[^>]*class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(html);
    const rawHtmlText = textMatch ? textMatch[1] : "";
    const cleanText = cleanTelegramHtml(rawHtmlText);

    if (!cleanText) {
      return NextResponse.json(
        {
          error:
            "Pesan tidak ditemukan atau channel bersifat privat. Pastikan link berasal dari channel publik.",
        },
        { status: 404 }
      );
    }

    // 2. Extract Channel Name
    const authorMatch = /<div[^>]*class="[^"]*tgme_widget_message_owner_name[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(html);
    const channelName = authorMatch
      ? authorMatch[1].replace(/<[^>]+>/g, "").trim()
      : channel;

    // 3. Extract Date
    const timeMatch = /<time[^>]*datetime="([^"]+)"/i.exec(html);
    const date = timeMatch ? timeMatch[1] : new Date().toISOString();

    // 4. Extract external links
    const linkMatches = cleanText.match(/https?:\/\/[^\s)]+/g) || [];
    const links = Array.from(new Set(linkMatches));

    // 5. Guess Project Name from first line or title
    const firstLine = cleanText.split("\n")[0]?.replace(/[*_#•\-]/g, "").trim() || "";
    let guessedName = firstLine.slice(0, 40);
    // If first line has words like "AIRDROP", extract it
    const airdropMatch = cleanText.match(/(?:TESTNET|AIRDROP|AIRDROP TESTNET)\s+([A-Z0-9\s]+)/i);
    if (airdropMatch && airdropMatch[1]) {
      guessedName = airdropMatch[1].trim().slice(0, 30);
    }

    return NextResponse.json({
      success: true,
      data: {
        text: cleanText,
        channel,
        channelName,
        channelHandle: `@${channel}`,
        postUrl: `https://t.me/${channel}/${messageId}`,
        date,
        links,
        guessedName,
      },
    });
  } catch (error: any) {
    console.error("Telegram post fetch error:", error);
    return NextResponse.json(
      { error: error?.message || "Terjadi kesalahan saat mengambil postingan Telegram." },
      { status: 500 }
    );
  }
}
