import { NextResponse } from "next/server";
import { cleanTelegramHtml } from "@/lib/utils/clean-links";

export interface TelegramUpdateItem {
  id: string;
  channel: string;
  channelName: string;
  postUrl: string;
  date: string;
  text: string;
}

const TARGET_CHANNELS = [
  { username: "airdropfind", name: "Airdrop Finder" },
  { username: "dutacryptoairdrop", name: "Duta Crypto Airdrop" },
];

/**
 * Parse telegram public preview HTML messages
 */
function parseTelegramHtml(html: string, channel: string, channelName: string): TelegramUpdateItem[] {
  const items: TelegramUpdateItem[] = [];

  // Match message containers
  // Regex to extract message block with data-post
  const messageRegex = /<div[^>]*class="[^"]*tgme_widget_message[^"]*"[^>]*data-post="([^"]+)"[\s\S]*?(?=<div[^>]*class="[^"]*tgme_widget_message[^"]*"[^>]*data-post=|$)/gi;

  let match: RegExpExecArray | null;
  while ((match = messageRegex.exec(html)) !== null) {
    const block = match[0];
    const dataPost = match[1]; // e.g. "airdropfind/12345"

    // Extract date
    const timeMatch = /<time[^>]*datetime="([^"]+)"/i.exec(block);
    const date = timeMatch ? timeMatch[1] : new Date().toISOString();

    // Extract text content
    const textMatch = /<div[^>]*class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(block);
    const rawText = textMatch ? textMatch[1] : "";
    const cleanText = cleanTelegramHtml(rawText);

    if (cleanText) {
      items.push({
        id: dataPost,
        channel: channel,
        channelName: channelName,
        postUrl: `https://t.me/${dataPost}`,
        date: date,
        text: cleanText,
      });
    }
  }

  return items;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const channelParam = searchParams.get("channel")?.trim().toLowerCase();

  if (!query) {
    return NextResponse.json(
      { error: "Parameter pencarian 'q' (nama proyek) harus diisi." },
      { status: 400 }
    );
  }

  // Filter channels: if user specified channel, use only that one (as requested)
  const channelsToScan = channelParam
    ? TARGET_CHANNELS.filter((c) => c.username.toLowerCase() === channelParam)
    : [TARGET_CHANNELS[0]]; // Default to single channel: airdropfind

  const activeChannels = channelsToScan.length > 0 ? channelsToScan : [TARGET_CHANNELS[0]];

  try {
    // Fetch search results from the active channel
    const fetchPromises = activeChannels.map(async (ch) => {
      const url = `https://t.me/s/${ch.username}?q=${encodeURIComponent(query)}`;
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml",
          },
          next: { revalidate: 60 }, // Cache 60 seconds to avoid spamming
        });

        if (!res.ok) {
          return [];
        }

        const html = await res.text();
        return parseTelegramHtml(html, ch.username, ch.name);
      } catch (err) {
        console.error(`Failed to fetch telegram channel ${ch.username}:`, err);
        return [];
      }
    });

    const results = await Promise.all(fetchPromises);
    const allUpdates = results.flat();

    // Sort descending by date (newest first)
    allUpdates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      query,
      channel: activeChannels[0].username,
      channels: activeChannels.map((c) => c.name),
      count: allUpdates.length,
      updates: allUpdates,
    });
  } catch (error: any) {
    console.error("Telegram update search error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memindai update Telegram." },
      { status: 500 }
    );
  }
}
