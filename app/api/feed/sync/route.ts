import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cleanTelegramHtml } from "@/lib/utils/clean-links";

interface ParsedRawPost {
  channel: "dutacryptoairdrop" | "airdropfind";
  channelName: string;
  postUrl: string;
  date: string;
  title: string;
  summary: string;
  category: "testnet" | "airdrop" | "waitlist" | "retro" | "general";
  cost: string | null;
  tasks: string[];
  rawText: string;
}

/**
 * Sanitize strings to avoid PostgreSQL invalid JSON surrogate error (22P02)
 */
function sanitizeSurrogates(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "")
    .replace(/\0/g, "");
}

/**
 * Filter and extract Airdrop Post from Duta Crypto
 */
function parseDutaCryptoPost(text: string, postUrl: string, date: string): ParsedRawPost | null {
  // Ignore update posts (e.g. "🔄 Update ORBINUM 🔄") and weekly digest ("🔥 UPDATE MINGGUAN 🔥")
  if (/🔄\s*Update\s+|UPDATE\s+MINGGUAN/i.test(text)) {
    return null;
  }

  const rawTitle = text.split("\n")[0]?.replace(/^[^\w]+|[^\w]+$/g, "").trim() || "";
  const lowerText = text.toLowerCase();
  const lowerTitle = rawTitle.toLowerCase();

  // Exclude Waitlist / Whitelist completely — they have a dedicated /waitlist page!
  if (
    lowerText.includes("waitlist") ||
    lowerText.includes("whitelist") ||
    lowerTitle.includes("waitlist") ||
    lowerTitle.includes("whitelist")
  ) {
    return null;
  }

  // Must have Cost or Title matching New Airdrop/Testnet template
  const hasCost = /Cost:\s*([^\n]+)/i.test(text);
  const hasHeader = /(?:TESTNET|AIRDROP|FREE)\s+[A-Z0-9_\s]+/i.test(text);

  if (!hasCost && !hasHeader) {
    return null;
  }

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  const costMatch = text.match(/Cost:\s*([^\n]+)/i);
  let cost = costMatch ? costMatch[1].trim() : null;

  let category: "testnet" | "airdrop" | "retro" | "general" = "airdrop";
  const lowerCost = (cost || "").toLowerCase();

  const isCostFree =
    lowerCost.includes("free") ||
    lowerCost.includes("gratis") ||
    lowerCost === "$0" ||
    lowerCost === "0" ||
    /^\$?0(\.0+)?$/.test(lowerCost.trim()) ||
    lowerCost.includes("testnet");

  const isCostPaid =
    /\$(?!0(\.0+)?(\s|$|\)))[0-9]+/.test(lowerCost) ||
    lowerCost.includes("fee") ||
    lowerCost.includes("gas") ||
    lowerCost.includes("retro") ||
    lowerCost.includes("depo") ||
    lowerCost.includes("modal") ||
    lowerCost.includes("eth") ||
    lowerCost.includes("sol");

  if (
    lowerText.includes("retro") ||
    lowerTitle.includes("retro") ||
    (isCostPaid && !isCostFree) ||
    (lowerText.includes("mainnet") && !lowerText.includes("testnet")) ||
    /\b(bridge|swap|volume|liquidity|stake)\b/i.test(lowerText)
  ) {
    category = "retro";
    if (!cost || isCostFree) cost = "Berbayar (Gas Fee)";
  } else if (lowerText.includes("testnet") || lowerTitle.includes("testnet") || lowerText.includes("faucet")) {
    category = "testnet";
    if (!cost) cost = "Gratis (Testnet)";
  } else {
    // Default fallback for Free Airdrops / Tasks
    category = "airdrop";
    cost = cost || "Gratis ($0)";
  }

  // Normalize cost label if it's free
  if (isCostFree && !cost.toLowerCase().includes("gratis")) {
    cost = `Gratis (${cost})`;
  }

  // Extract tasks (lines starting with - or bullet points)
  const taskLines: string[] = [];
  lines.forEach((l) => {
    if (/^[-•*👉➡️]\s*/.test(l)) {
      const cleanLine = l.replace(/^[-•*👉➡️]\s*/, "").trim();
      if (cleanLine.length > 3 && !cleanLine.startsWith("http")) {
        taskLines.push(cleanLine);
      }
    }
  });

  // Summary: line 2 or 3
  const summary =
    lines
      .slice(1, 3)
      .filter((l) => !l.startsWith("Cost:") && !l.startsWith("http"))
      .join(" ") ||
    lines[1] ||
    "";

  return {
    channel: "dutacryptoairdrop",
    channelName: "Duta Crypto Airdrop",
    postUrl,
    date,
    title: rawTitle,
    summary: summary.slice(0, 200),
    category,
    cost,
    tasks: taskLines.slice(0, 8),
    rawText: text,
  };
}

/**
 * Filter and extract Airdrop Post from Airdrop Finder
 */
function parseAirdropFinderPost(text: string, postUrl: string, date: string): ParsedRawPost | null {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  const rawTitle = lines[0].trim();
  const lowerText = text.toLowerCase();
  const lowerTitle = rawTitle.toLowerCase();

  // Exclude Waitlist / Whitelist completely — they have a dedicated /waitlist page!
  if (
    lowerText.includes("waitlist") ||
    lowerText.includes("whitelist") ||
    lowerTitle.includes("waitlist") ||
    lowerTitle.includes("whitelist")
  ) {
    return null;
  }

  // Exclude non-crypto community jokes (e.g. Jumatan / Pahala)
  if (/pahala|masjid|sholat|khutbah/i.test(lowerText)) {
    return null;
  }

  // Pattern: "New Airdrop : ...", "New Airdrops : ...", "New Guaranteed Airdrops : ...", "New Testnet: ...", "New Retro: ..."
  const isNewPost = /New\s+(?:Guaranteed\s+)?(?:Airdrops?|Testnet|Retro)\s*[:|-]/i.test(text);

  if (!isNewPost) {
    return null;
  }

  // Detect cost if mentioned
  let cost = "";
  const costMatch = text.match(/(?:Cost|Fee|Modal):\s*([^\n]+)/i);
  if (costMatch) cost = costMatch[1].trim();
  const lowerCost = cost.toLowerCase();

  const isCostFreeExplicit =
    lowerCost.includes("free") ||
    lowerCost.includes("gratis") ||
    lowerCost === "$0" ||
    lowerCost === "0" ||
    /^\$?0(\.0+)?$/.test(lowerCost.trim());

  const isCostPaidExplicit =
    /\$(?!0(\.0+)?(\s|$|\)))[0-9]+/.test(lowerCost) ||
    lowerCost.includes("fee") ||
    lowerCost.includes("gas") ||
    lowerCost.includes("depo") ||
    lowerCost.includes("modal") ||
    lowerCost.includes("eth") ||
    lowerCost.includes("sol");

  let category: "testnet" | "airdrop" | "retro" | "general" = "airdrop";

  // 1. Testnet detection: Faucet, Testnet RPC, Sepolia, Holesky, etc.
  if (
    lowerTitle.includes("testnet") ||
    lowerText.includes("testnet") ||
    lowerText.includes("faucet") ||
    lowerText.includes("sepolia") ||
    lowerText.includes("holesky") ||
    lowerText.includes("devnet")
  ) {
    category = "testnet";
    cost = cost || "Gratis (Testnet)";
  }
  // 2. Retroactive detection: On-chain capital actions (Bridge, Swap, Deposit, LP, Stake, Mainnet Gas)
  else if (
    lowerTitle.includes("retro") ||
    lowerText.includes("retro") ||
    isCostPaidExplicit ||
    (lowerText.includes("mainnet") && !lowerText.includes("testnet")) ||
    /\b(bridge|swap|volume|liquidity|deposit|depo|stake)\b/i.test(lowerText)
  ) {
    category = "retro";
    cost = cost || "Berbayar (Gas Fee)";
  }
  // 3. Free Web3 Airdrop / Social Quest / Daily Check-in / Points
  else {
    category = "airdrop";
    cost = cost || "Gratis ($0)";
  }

  if (isCostFreeExplicit && !cost.toLowerCase().includes("gratis")) {
    cost = `Gratis (${cost})`;
  }

  // Extract tasks (lines starting with - or ➖)
  const taskLines: string[] = [];
  lines.forEach((l) => {
    if (/^[-➖•*]\s*/.test(l)) {
      const cleanLine = l.replace(/^[-➖•*]\s*/, "").trim();
      if (cleanLine.length > 3 && !cleanLine.startsWith("http")) {
        taskLines.push(cleanLine);
      }
    }
  });

  // Summary: reward line or second line
  const summaryLine = lines.find((l) => /Reward|Register|Go to/i.test(l)) || lines[1] || "";

  return {
    channel: "airdropfind",
    channelName: "Airdrop Finder",
    postUrl,
    date,
    title: rawTitle,
    summary: summaryLine.slice(0, 200),
    category,
    cost,
    tasks: taskLines.slice(0, 8),
    rawText: text,
  };
}

/**
 * Fetch messages from a Telegram public channel with backward pagination
 */
async function fetchChannelMessages(
  username: string,
  cutoffDate: Date,
  maxPages = 8
): Promise<{ block: string; dataPost: string; date: string }[]> {
  let url = `https://t.me/s/${username}`;
  let page = 0;
  const messages: { block: string; dataPost: string; date: string }[] = [];

  while (page < maxPages && url) {
    page++;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        cache: "no-store",
      });

      if (!res.ok) break;

      const html = await res.text();
      const messageRegex =
        /<div[^>]*class="[^"]*tgme_widget_message[^"]*"[^>]*data-post="([^"]+)"[\s\S]*?(?=<div[^>]*class="[^"]*tgme_widget_message[^"]*"[^>]*data-post=|$)/gi;

      let match: RegExpExecArray | null;
      let pagePostsCount = 0;
      let oldestDateInPage: Date | null = null;
      let oldestIdInPage: string | null = null;

      while ((match = messageRegex.exec(html)) !== null) {
        const block = match[0];
        const dataPost = match[1];
        pagePostsCount++;

        if (!oldestIdInPage && dataPost.includes("/")) {
          oldestIdInPage = dataPost.split("/")[1];
        }

        const timeMatch = /<time[^>]*datetime="([^"]+)"/i.exec(block);
        const dateStr = timeMatch ? timeMatch[1] : "";
        const postDateObj = dateStr ? new Date(dateStr) : null;

        if (postDateObj && !isNaN(postDateObj.getTime())) {
          if (!oldestDateInPage || postDateObj < oldestDateInPage) {
            oldestDateInPage = postDateObj;
          }
          if (postDateObj >= cutoffDate) {
            messages.push({ block, dataPost, date: dateStr });
          }
        } else {
          messages.push({ block, dataPost, date: dateStr || new Date().toISOString() });
        }
      }

      if (pagePostsCount === 0 || !oldestIdInPage) break;
      if (oldestDateInPage && oldestDateInPage < cutoffDate) {
        break;
      }

      url = `https://t.me/s/${username}?before=${oldestIdInPage}`;
    } catch (err) {
      console.error(`Error fetching page ${page} of ${username}:`, err);
      break;
    }
  }

  return messages;
}

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const channels = [
      { username: "dutacryptoairdrop", parser: parseDutaCryptoPost },
      { username: "airdropfind", parser: parseAirdropFinderPost },
    ];

    const allNewFeeds: ParsedRawPost[] = [];

    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = new Date(now - thirtyDaysMs);

    // Fetch both channels concurrently with pagination
    await Promise.all(
      channels.map(async (ch) => {
        try {
          const rawMessages = await fetchChannelMessages(ch.username, oneMonthAgo, 8);
          for (const msg of rawMessages) {
            // Prioritize js-message_text so update replies capture the actual update body, not the quoted snippet
            const textMatch =
              /<div[^>]*class="[^"]*js-message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(msg.block) ||
              /<div[^>]*class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(msg.block);
            const rawHtml = textMatch ? textMatch[1] : "";
            const cleanText = cleanTelegramHtml(rawHtml);

            if (cleanText) {
              const parsed = ch.parser(cleanText, `https://t.me/${msg.dataPost}`, msg.date);
              if (parsed) {
                allNewFeeds.push(parsed);
              }
            }
          }
        } catch (fetchErr) {
          console.error(`Error scraping channel ${ch.username}:`, fetchErr);
        }
      })
    );

    // Upsert into public.airdrop_feeds
    let insertedCount = 0;
    if (allNewFeeds.length > 0) {
      const rows = allNewFeeds.map((feed) => {
        const postTime = feed.date ? new Date(feed.date).getTime() : now;
        const validTime = !isNaN(postTime) ? postTime : now;
        return {
          user_id: user.id,
          channel: feed.channel,
          channel_name: sanitizeSurrogates(feed.channelName),
          title: sanitizeSurrogates(feed.title),
          summary: sanitizeSurrogates(feed.summary),
          category: feed.category,
          cost: sanitizeSurrogates(feed.cost || ""),
          tasks: feed.tasks.map((t) => sanitizeSurrogates(t)),
          source_url: feed.postUrl,
          raw_text: sanitizeSurrogates(feed.rawText),
          created_at: new Date(validTime).toISOString(),
          expires_at: new Date(validTime + thirtyDaysMs).toISOString(),
        };
      });

      // Upsert using onConflict on source_url (shared catalog across users)
      const { data, error } = await (supabase as any)
        .from("airdrop_feeds")
        .upsert(rows, { onConflict: "source_url", ignoreDuplicates: true })
        .select("id");

      if (error) {
        console.error("Airdrop feeds upsert error:", error);
      }

      if (!error && Array.isArray(data)) {
        insertedCount = data.length;
      }
    }

    return NextResponse.json({
      success: true,
      scannedCount: allNewFeeds.length,
      insertedCount,
      message: `Berhasil memindai ${allNewFeeds.length} peluang airdrop baru.`,
    });
  } catch (error: any) {
    console.error("Feed sync route error:", error);
    return NextResponse.json(
      { error: error?.message || "Terjadi kesalahan saat menyinkronkan feed." },
      { status: 500 }
    );
  }
}
