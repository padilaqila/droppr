import { NextResponse } from "next/server";

export interface LiveFeedItem {
  id: string;
  channelKey: "airdropfind" | "dutacryptoairdrop";
  channelName: string;
  channelLogo: string;
  title: string;
  ecosystem: string;
  category: "testnet" | "mainnet" | "waitlist";
  status: "ready-claim" | "in-progress" | "waiting";
  statusLabel: string;
  taskHeadline: string;
  postUrl: string;
  claimUrl?: string | null;
  targetUrl?: string | null;
  isClaim?: boolean;
  isWaitlist?: boolean;
  date: string;
  actionText: string;
}

const FALLBACK_FEEDS: LiveFeedItem[] = [
  {
    id: "pawffle-whitelist",
    channelKey: "airdropfind",
    channelName: "Airdrop Finder",
    channelLogo: "/images/credits/airdropfinder.webp",
    title: "New Whitelist: Pawffle",
    ecosystem: "Solana & EVM Ecosystem",
    category: "waitlist",
    status: "waiting",
    statusLabel: "Waitlist",
    taskHeadline: "Register: https://www.pawffles.xyz - Early whitelist registration",
    postUrl: "https://t.me/airdropfind",
    targetUrl: "https://www.pawffles.xyz",
    isWaitlist: true,
    date: new Date().toISOString(),
    actionText: "Daftar",
  },
  {
    id: "berachain-v2",
    channelKey: "airdropfind",
    channelName: "Airdrop Finder",
    channelLogo: "/images/credits/airdropfinder.webp",
    title: "Berachain V2 (Boyco)",
    ecosystem: "Boyco Ecosystem · Artio EVM",
    category: "testnet",
    status: "ready-claim",
    statusLabel: "Siap Klaim",
    taskHeadline: "Validator delegation terbuka & reward bGT siap diklaim via faucet",
    postUrl: "https://t.me/airdropfind",
    claimUrl: "https://t.me/airdropfind",
    isClaim: true,
    date: new Date().toISOString(),
    actionText: "Klaim",
  },
  {
    id: "monad-testnet",
    channelKey: "dutacryptoairdrop",
    channelName: "Duta Crypto",
    channelLogo: "/images/credits/dutacrypto.webp",
    title: "Monad Testnet 10k TPS",
    ecosystem: "High-Performance EVM L1",
    category: "testnet",
    status: "in-progress",
    statusLabel: "Aktif",
    taskHeadline: "Interaksi swap smart contract & daily faucet checkpoint aktif",
    postUrl: "https://t.me/dutacryptoairdrop",
    claimUrl: null,
    isClaim: false,
    date: new Date().toISOString(),
    actionText: "Cek Task",
  },
  {
    id: "story-protocol-phase1",
    channelKey: "airdropfind",
    channelName: "Airdrop Finder",
    channelLogo: "/images/credits/airdropfinder.webp",
    title: "Story Protocol",
    ecosystem: "IP Asset World · Mainnet Phase 1",
    category: "mainnet",
    status: "waiting",
    statusLabel: "Menunggu",
    taskHeadline: "Snapshot Q3 2026 terkonfirmasi · Registrasi IP asset",
    postUrl: "https://t.me/airdropfind",
    claimUrl: null,
    isClaim: false,
    date: new Date().toISOString(),
    actionText: "Snapshot",
  },
];

function cleanTelegramHtml(rawHtml: string): string {
  return rawHtml
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)")
    .replace(/<b[^>]*>(.*?)<\/b>/gi, "$1")
    .replace(/<i[^>]*>(.*?)<\/i>/gi, "$1")
    .replace(/<code[^>]*>(.*?)<\/code>/gi, "$1")
    .replace(/<span[^>]*>(.*?)<\/span>/gi, "$1")
    .replace(/<tg-emoji[^>]*>(.*?)<\/tg-emoji>/gi, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&#036;|&dollar;/g, "$")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

async function scrapeTelegramChannel(
  channelUsername: "airdropfind" | "dutacryptoairdrop",
  channelName: string,
  channelLogo: string
): Promise<LiveFeedItem[]> {
  try {
    const res = await fetch(`https://t.me/s/${channelUsername}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const items: LiveFeedItem[] = [];
    const messageRegex = /<div[^>]*class="[^"]*tgme_widget_message[^"]*"[^>]*data-post="([^"]+)"[\s\S]*?(?=<div[^>]*class="[^"]*tgme_widget_message[^"]*"[^>]*data-post=|$)/gi;

    let match: RegExpExecArray | null;
    while ((match = messageRegex.exec(html)) !== null) {
      const block = match[0];
      const dataPost = match[1];

      const timeMatch = /<time[^>]*datetime="([^"]+)"/i.exec(block);
      const date = timeMatch ? timeMatch[1] : new Date().toISOString();

      const textMatch = /<div[^>]*class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(block);
      const rawText = textMatch ? textMatch[1] : "";
      const text = cleanTelegramHtml(rawText);

      // Extract all URLs and hrefs inside the message block
      const hrefs: string[] = [];
      const hrefRegex = /href="([^"]+)"/gi;
      let hrefMatch: RegExpExecArray | null;
      while ((hrefMatch = hrefRegex.exec(block)) !== null) {
        if (hrefMatch[1] && !hrefMatch[1].startsWith("tg://")) {
          hrefs.push(hrefMatch[1]);
        }
      }

      if (text && text.length > 15) {
        const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
        const title = lines[0]?.replace(/^[^\w\s]+|[^\w\s]+$/g, "").trim() || "Airdrop Update";
        const taskHeadline = lines[1] || lines[0] || "Update task airdrop baru";
        const lower = text.toLowerCase();

        // Check waitlist / whitelist
        const isWaitlist =
          /(?:waitlist|whitelist|\bwl\b|early access|early bird|pre-register|form pendaftaran|register waitlist)/i.test(lower) ||
          hrefs.some((h) => /(?:waitlist|whitelist|early|form|tally)/i.test(h));

        // Check claim
        const claimUrl =
          hrefs.find((h) => /(?:claim|klaim|vesting|checker|allocation)/i.test(h)) || null;
        const hasClaimKeyword = /(?:claim|klaim|vesting|checker|elig|distribusi)/i.test(lower);
        const isClaim = Boolean(claimUrl || hasClaimKeyword);

        const isMainnet = lower.includes("mainnet") || lower.includes("staking") || lower.includes("bridge");
        const category: "testnet" | "mainnet" | "waitlist" = isWaitlist
          ? "waitlist"
          : isMainnet
          ? "mainnet"
          : "testnet";

        const isWaiting = lower.includes("snapshot") || lower.includes("tba") || lower.includes("tunggu");
        const status: "ready-claim" | "in-progress" | "waiting" = isClaim
          ? "ready-claim"
          : isWaitlist || isWaiting
          ? "waiting"
          : "in-progress";

        const statusLabel = isWaitlist ? "Waitlist" : isClaim ? "Siap Klaim" : isWaiting ? "Menunggu" : "Aktif";
        const actionText = isWaitlist ? "Daftar" : isClaim ? "Klaim" : isWaiting ? "Snapshot" : "Detail";

        const targetUrl = hrefs[0] || (isWaitlist ? `https://t.me/${dataPost}` : claimUrl || `https://t.me/${dataPost}`);

        items.push({
          id: dataPost,
          channelKey: channelUsername,
          channelName,
          channelLogo,
          title: title.slice(0, 45),
          ecosystem: `${channelName} (Telegram)`,
          category,
          status,
          statusLabel,
          taskHeadline: taskHeadline.slice(0, 75),
          postUrl: `https://t.me/${dataPost}`,
          claimUrl: claimUrl || null,
          targetUrl,
          isClaim,
          isWaitlist,
          date,
          actionText,
        });
      }
    }

    return items.slice(-25).reverse();
  } catch (err) {
    console.error(`Error scraping telegram channel ${channelUsername}:`, err);
    return [];
  }
}

export async function GET() {
  try {
    const [finderItems, dutaItems] = await Promise.all([
      scrapeTelegramChannel("airdropfind", "Airdrop Finder", "/images/credits/airdropfinder.webp"),
      scrapeTelegramChannel("dutacryptoairdrop", "Duta Crypto", "/images/credits/dutacrypto.webp"),
    ]);

    const combined = [...finderItems, ...dutaItems];

    if (combined.length >= 3) {
      combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return NextResponse.json({
        success: true,
        source: "live_telegram",
        updatedAt: new Date().toISOString(),
        items: combined.slice(0, 40),
      });
    }

    return NextResponse.json({
      success: true,
      source: "curated_fallback",
      updatedAt: new Date().toISOString(),
      items: FALLBACK_FEEDS,
    });
  } catch (error: any) {
    console.error("Live feed API error:", error);
    return NextResponse.json({
      success: true,
      source: "curated_fallback",
      updatedAt: new Date().toISOString(),
      items: FALLBACK_FEEDS,
    });
  }
}
