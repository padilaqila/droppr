import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cleanTelegramHtml } from "@/lib/utils/clean-links";

interface ParsedWaitlistPost {
  channel: "dutacryptoairdrop" | "airdropfind";
  sourceUrl: string;
  date: string;
  projectName: string;
  title: string;
  summary: string;
  refLink: string | null;
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
 * Extract referral or registration link from text
 */
function extractRefLink(text: string): string | null {
  const linkPatterns = [
    /(?:Register|Waitlist|Join|Link|Form|Website)\s*[:|-]?\s*(https?:\/\/[^\s\)\n]+)/i,
    /(https?:\/\/[^\s\)\n]+)/i,
  ];

  for (const pat of linkPatterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      const url = match[1];
      if (!url.includes("t.me/dutacryptoairdrop") && !url.includes("t.me/airdropfind")) {
        return url;
      }
    }
  }
  return null;
}

/**
 * Clean and normalize project name from title
 */
function extractProjectName(title: string): string {
  return (
    title
      .replace(/^New\s+(?:Waitlist|Whitelist|Airdrops?|Testnet)\s*[:|-]\s*/i, "")
      .replace(/^JOIN\s+(?:WAITLIST|WHITELIST)\s*[:|-]?\s*/i, "")
      .replace(/^DAFTAR\s+(?:WAITLIST|WHITELIST)\s*[:|-]?\s*/i, "")
      .replace(/\b(?:WAITLIST|WHITELIST)\b/gi, "")
      .replace(/^[^\w]+|[^\w]+$/g, "")
      .replace(/\s{2,}/g, " ")
      .trim() || "Airdrop Waitlist"
  );
}

/**
 * Filter and extract Waitlist Post from Duta Crypto
 * Template: "JOIN WAITLIST ..." or text containing "JOIN WAITLIST" / "DAFTAR WAITLIST" / "WAITLIST" / "WHITELIST"
 */
function parseDutaCryptoWaitlist(text: string, postUrl: string, date: string): ParsedWaitlistPost | null {
  // Exclude weekly digests / recaps that aren't single waitlist projects
  if (/UPDATE\s+MINGGUAN|REKAP/i.test(text.slice(0, 60))) {
    return null;
  }

  const isWaitlist = /(?:JOIN\s+(?:WAITLIST|WHITELIST)|DAFTAR\s+(?:WAITLIST|WHITELIST)|\bWAITLIST\b|\bWHITELIST\b)/i.test(
    text
  );
  if (!isWaitlist) {
    return null;
  }

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  const rawTitle = lines[0].replace(/^[^\w]+|[^\w]+$/g, "").trim();
  const projectName = extractProjectName(rawTitle);

  // Extract tasks
  const taskLines: string[] = [];
  lines.forEach((l) => {
    if (/^[-•*👉➡️]\s*/.test(l)) {
      const cleanLine = l.replace(/^[-•*👉➡️]\s*/, "").trim();
      if (cleanLine.length > 3 && !cleanLine.startsWith("http")) {
        taskLines.push(cleanLine);
      }
    }
  });

  const summary = lines.slice(1, 3).filter((l) => !l.startsWith("http") && !l.startsWith("Cost:")).join(" ") || lines[1] || "";
  const refLink = extractRefLink(text);

  return {
    channel: "dutacryptoairdrop",
    sourceUrl: postUrl,
    date,
    projectName,
    title: rawTitle,
    summary: summary.slice(0, 250),
    refLink,
    tasks: taskLines.slice(0, 8),
    rawText: text,
  };
}

/**
 * Filter and extract Waitlist Post from Airdrop Finder
 * Template: "New Waitlist: ...", "New Whitelist: ...", or mentions Whitelist/Waitlist in header
 */
function parseAirdropFinderWaitlist(text: string, postUrl: string, date: string): ParsedWaitlistPost | null {
  const isWaitlist =
    /New\s+(?:Waitlist|Whitelist)\s*[:|-]/i.test(text) ||
    /\b(?:Waitlist|Whitelist)\b/i.test(text.slice(0, 100));
  if (!isWaitlist) {
    return null;
  }

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  const rawTitle = lines[0].trim();
  const projectName = extractProjectName(rawTitle);

  // Extract tasks
  const taskLines: string[] = [];
  lines.forEach((l) => {
    if (/^[-➖•*]\s*/.test(l)) {
      const cleanLine = l.replace(/^[-➖•*]\s*/, "").trim();
      if (cleanLine.length > 3 && !cleanLine.startsWith("http")) {
        taskLines.push(cleanLine);
      }
    }
  });

  const summary = lines.find((l) => /Reward|Register|Go to|Submit/i.test(l)) || lines[1] || "";
  const refLink = extractRefLink(text);

  return {
    channel: "airdropfind",
    sourceUrl: postUrl,
    date,
    projectName,
    title: rawTitle,
    summary: summary.slice(0, 250),
    refLink,
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
      { username: "dutacryptoairdrop", parser: parseDutaCryptoWaitlist },
      { username: "airdropfind", parser: parseAirdropFinderWaitlist },
    ];

    const allNewWaitlists: ParsedWaitlistPost[] = [];

    const now = Date.now();
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000; // 3 bulan
    const threeMonthsAgo = new Date(now - ninetyDaysMs);

    // Fetch both channels concurrently with pagination
    await Promise.all(
      channels.map(async (ch) => {
        try {
          const rawMessages = await fetchChannelMessages(ch.username, threeMonthsAgo, 8);
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
                allNewWaitlists.push(parsed);
              }
            }
          }
        } catch (fetchErr) {
          console.error(`Error scraping waitlist channel ${ch.username}:`, fetchErr);
        }
      })
    );

    let insertedCount = 0;
    if (allNewWaitlists.length > 0) {
      const rows = allNewWaitlists.map((item) => {
        const postTime = item.date ? new Date(item.date).getTime() : now;
        const validTime = !isNaN(postTime) ? postTime : now;

        return {
          user_id: user.id,
          project_name: sanitizeSurrogates(item.projectName),
          title: sanitizeSurrogates(item.title),
          summary: sanitizeSurrogates(item.summary),
          channel: item.channel,
          source_url: item.sourceUrl,
          raw_text: sanitizeSurrogates(item.rawText),
          status: "pending",
          ref_link: item.refLink,
          tasks: item.tasks.map((t) => sanitizeSurrogates(t)),
          created_at: new Date(validTime).toISOString(),
          expires_at: new Date(validTime + ninetyDaysMs).toISOString(),
        };
      });

      // Upsert based on unique constraint source_url (shared catalog across users)
      const { data, error } = await (supabase as any)
        .from("waitlists")
        .upsert(rows, { onConflict: "source_url", ignoreDuplicates: true })
        .select("id");

      if (error) {
        console.error("Waitlists upsert error:", error);
      }

      if (!error && Array.isArray(data)) {
        insertedCount = data.length;
      }
    }

    return NextResponse.json({
      success: true,
      scannedCount: allNewWaitlists.length,
      insertedCount,
      message: `Berhasil memindai ${allNewWaitlists.length} peluang waitlist/whitelist dalam 3 bulan terakhir.`,
    });
  } catch (error: any) {
    console.error("Waitlist sync route error:", error);
    return NextResponse.json(
      { error: error?.message || "Terjadi kesalahan saat menyinkronkan waitlist." },
      { status: 500 }
    );
  }
}
