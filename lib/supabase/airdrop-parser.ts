/**
 * Airdrop & Waitlist Text/Link Parser Utility
 * 100% deterministic, instant, zero AI token cost.
 * Extracts: Clean Name, Chain, Classified Resource Links (Website, DApp, Faucet, Docs, X, Telegram, Discord, Ref Link, Custom Links), Tasks, and Guide Content.
 */

export interface ParsedAirdropData {
  name: string;
  chain: string;
  social_links: {
    website?: string;
    dapp_url?: string;
    faucet_url?: string;
    docs_url?: string;
    twitter?: string;
    telegram?: string;
    telegram_post_url?: string;
    discord?: string;
    ref_link?: string;
    custom_links?: Array<{ label: string; url: string }>;
    [key: string]: any;
  };
  tasks: Array<{
    title: string;
    type: "one_time" | "daily";
  }>;
  guide_content: string;
}

/**
 * Clean up URLs from accidental trailing punctuation or brackets
 */
export function sanitizeUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  // Remove wrapping parentheses or brackets like (https://...) or <https://...>
  if (url.startsWith("(") && url.endsWith(")")) url = url.slice(1, -1);
  if (url.startsWith("<") && url.endsWith(">")) url = url.slice(1, -1);
  if (url.startsWith("[") && url.endsWith("]")) url = url.slice(1, -1);

  // Remove trailing trailing punctuation that often gets caught by regex
  url = url.replace(/[.,;:\)\]>'"\\]+$/, "");
  return url.trim();
}

/**
 * Extract clean project name from feed / telegram title
 */
export function cleanProjectName(rawTitle: string): string {
  if (!rawTitle) return "Airdrop Project";

  let name = rawTitle
    // Strip common prefixes
    .replace(/^(\[NEW\]|\(NEW\)|NEW AIRDROPS?|NEW TESTNET|NEW WAITLIST|NEW RETRO|NEW WHITELIST)\s*[:|-]?\s*/i, "")
    .replace(/^(TESTNET|AIRDROP|FREE|RETRO|CONFIRMED AIRDROP)\s*[:|-]?\s*/i, "")
    .replace(/^(JOIN WAITLIST|DAFTAR WAITLIST|WAITLIST|WHITELIST)\s*[:|-]?\s*/i, "")
    .replace(/^(AIRDROP|TESTNET|WAITLIST|WHITELIST)\s+/i, "")
    // Strip trailing tags
    .replace(/\s*[:|-]?\s*(TESTNET|AIRDROP|WAITLIST|WHITELIST|FREE|CONFIRMED)$/i, "")
    // Strip edge emojis and special characters
    .replace(/^[^\w\d\(\)]+|[^\w\d\(\)]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  // If clean resulted in empty string, fallback to original title trimmed
  if (!name) {
    name = rawTitle.replace(/^[^\w\d]+|[^\w\d]+$/g, "").trim() || "Airdrop Project";
  }

  // Capitalize neatly if all lowercase
  if (name === name.toLowerCase()) {
    name = name
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  return name;
}

/**
 * Detect blockchain network / chain from text or title
 */
export function detectChain(text: string, title: string = ""): string {
  const combined = `${title} ${text}`.toLowerCase();

  const chainRules: Array<{ pattern: RegExp; chain: string }> = [
    { pattern: /\b(monad)\b/i, chain: "Monad" },
    { pattern: /\b(berachain|bera|bartio|artio)\b/i, chain: "Berachain" },
    { pattern: /\b(solana|phantom|sol)\b/i, chain: "Solana" },
    { pattern: /\b(base\s+chain|base\s+network|on\s+base|base\s+sepolia)\b/i, chain: "Base" },
    { pattern: /\b(arbitrum|arb|nitro)\b/i, chain: "Arbitrum" },
    { pattern: /\b(sui\s+network|sui)\b/i, chain: "Sui" },
    { pattern: /\b(aptos|petra)\b/i, chain: "Aptos" },
    { pattern: /\b(movement|mevm)\b/i, chain: "Movement" },
    { pattern: /\b(story\s+protocol|story\s+network|iliad|odyssey)\b/i, chain: "Story Protocol" },
    { pattern: /\b(nexus|nexus\s+zk)\b/i, chain: "Nexus" },
    { pattern: /\b(sonic|fantom\s+sonic)\b/i, chain: "Sonic" },
    { pattern: /\b(initia)\b/i, chain: "Initia" },
    { pattern: /\b(eclipse)\b/i, chain: "Eclipse" },
    { pattern: /\b(megaeth)\b/i, chain: "MegaETH" },
    { pattern: /\b(linea)\b/i, chain: "Linea" },
    { pattern: /\b(scroll)\b/i, chain: "Scroll" },
    { pattern: /\b(zksync|era)\b/i, chain: "zkSync" },
    { pattern: /\b(blast)\b/i, chain: "Blast" },
    { pattern: /\b(polygon|matic|amoy)\b/i, chain: "Polygon" },
    { pattern: /\b(bsc|bnb|binance\s+smart\s+chain|opbnb)\b/i, chain: "BNB Chain" },
    { pattern: /\b(injective|inj)\b/i, chain: "Injective" },
    { pattern: /\b(ton|tonkeeper|telegram\s+open\s+network)\b/i, chain: "TON" },
    { pattern: /\b(plume|plume\s+network)\b/i, chain: "Plume" },
    { pattern: /\b(abstract|abs)\b/i, chain: "Abstract" },
    { pattern: /\b(babylon)\b/i, chain: "Babylon" },
    { pattern: /\b(hemi|hemi\s+network)\b/i, chain: "Hemi" },
    { pattern: /\b(taiko)\b/i, chain: "Taiko" },
    { pattern: /\b(morph)\b/i, chain: "Morph" },
    { pattern: /\b(aleo)\b/i, chain: "Aleo" },
    { pattern: /\b(sepolia|holesky|ethereum|eth|evm|mainnet\s+eth|erc20)\b/i, chain: "Ethereum / EVM" },
  ];

  for (const rule of chainRules) {
    if (rule.pattern.test(combined)) {
      return rule.chain;
    }
  }

  return "Multi-chain";
}

/**
 * Extract all URLs along with line context
 */
export function extractUrlsWithContext(text: string): Array<{ url: string; line: string }> {
  if (!text) return [];
  const lines = text.split("\n");
  const results: Array<{ url: string; line: string }> = [];
  const urlRegex = /(https?:\/\/[^\s<>"'\)]+)/gi;

  lines.forEach((line) => {
    let match: RegExpExecArray | null;
    while ((match = urlRegex.exec(line)) !== null) {
      const sanitized = sanitizeUrl(match[1]);
      if (sanitized && sanitized.startsWith("http")) {
        results.push({ url: sanitized, line: line.trim() });
      }
    }
  });

  return results;
}

/**
 * Classify and extract all social and resource links from text
 */
export function parseResourceLinks(
  rawText: string,
  options: {
    sourceUrl?: string | null;
    fallbackRefLink?: string | null;
  } = {}
) {
  const social_links: Record<string, any> = {};
  const custom_links: Array<{ label: string; url: string }> = [];
  const seenUrls = new Set<string>();

  // If sourceUrl provided (e.g. Telegram post URL)
  if (options.sourceUrl && options.sourceUrl.startsWith("http")) {
    social_links.telegram_post_url = sanitizeUrl(options.sourceUrl);
    social_links.telegram = sanitizeUrl(options.sourceUrl);
    seenUrls.add(social_links.telegram_post_url);
  }

  // If fallbackRefLink provided (from waitlist table)
  if (options.fallbackRefLink && options.fallbackRefLink.startsWith("http")) {
    social_links.ref_link = sanitizeUrl(options.fallbackRefLink);
  }

  const urlsWithCtx = extractUrlsWithContext(rawText);

  const addCustomLink = (label: string, url: string) => {
    if (seenUrls.has(url)) return;
    seenUrls.add(url);
    custom_links.push({ label, url });
  };

  urlsWithCtx.forEach(({ url, line }) => {
    const lowerUrl = url.toLowerCase();
    const lowerLine = line.toLowerCase();

    // 1. Twitter / X Link
    if (lowerUrl.includes("twitter.com/") || lowerUrl.includes("x.com/")) {
      if (!social_links.twitter) {
        social_links.twitter = url;
        seenUrls.add(url);
      }
      return;
    }

    // 2. Discord Link
    if (lowerUrl.includes("discord.gg/") || lowerUrl.includes("discord.com/invite/")) {
      if (!social_links.discord) {
        social_links.discord = url;
        seenUrls.add(url);
      }
      return;
    }

    // 3. Telegram Link
    if (lowerUrl.includes("t.me/")) {
      if (
        !lowerUrl.includes("dutacryptoairdrop") &&
        !lowerUrl.includes("airdropfind") &&
        (!social_links.telegram || social_links.telegram.includes("dutacryptoairdrop") || social_links.telegram.includes("airdropfind"))
      ) {
        social_links.telegram = url;
        seenUrls.add(url);
      }
      return;
    }

    // 4. Faucet Link
    if (
      lowerUrl.includes("faucet") ||
      lowerUrl.includes("dripper") ||
      lowerLine.includes("faucet") ||
      lowerLine.includes("claim faucet") ||
      lowerLine.includes("mint faucet")
    ) {
      if (!social_links.faucet_url) {
        social_links.faucet_url = url;
        seenUrls.add(url);
        return;
      }
    }

    // 5. Documentation / Guide / Medium Link
    if (
      lowerUrl.includes("docs.") ||
      lowerUrl.includes("gitbook.io") ||
      lowerUrl.includes("notion.site") ||
      lowerUrl.includes("medium.com") ||
      lowerUrl.includes("mirror.xyz") ||
      lowerLine.includes("docs") ||
      lowerLine.includes("guide") ||
      lowerLine.includes("tutorial")
    ) {
      if (!social_links.docs_url) {
        social_links.docs_url = url;
        seenUrls.add(url);
        return;
      }
    }

    // 6. Referral Link
    const hasRefParam =
      /[?&](ref|referral|r|invite|code|invitedBy)=/i.test(url) ||
      lowerLine.includes("ref ") ||
      lowerLine.includes("referral") ||
      lowerLine.includes("kode ref");

    if (hasRefParam && !social_links.ref_link) {
      social_links.ref_link = url;
    }

    // 7. Google Form / Typeform / Survey
    if (
      lowerUrl.includes("forms.gle") ||
      lowerUrl.includes("docs.google.com/forms") ||
      lowerUrl.includes("typeform.com") ||
      lowerUrl.includes("tally.so") ||
      lowerLine.includes("form")
    ) {
      addCustomLink("Form Pendaftaran", url);
      return;
    }

    // 8. Quest / Campaign Platforms (Galxe, Zealy, Taskon, Guild, QuestN)
    if (lowerUrl.includes("galxe.com")) {
      addCustomLink("Galxe Quest", url);
      return;
    }
    if (lowerUrl.includes("zealy.io")) {
      addCustomLink("Zealy Sprint", url);
      return;
    }
    if (lowerUrl.includes("guild.xyz")) {
      addCustomLink("Guild Role", url);
      return;
    }
    if (lowerUrl.includes("taskon.xyz")) {
      addCustomLink("TaskOn Event", url);
      return;
    }

    // 9. Chrome Webstore / Wallet Extension
    if (lowerUrl.includes("chromewebstore.google.com") || lowerUrl.includes("chrome.google.com/webstore")) {
      addCustomLink("Ekstensi Browser", url);
      return;
    }

    // 10. Blockchain Explorer / GitHub
    if (lowerUrl.includes("explorer") || lowerUrl.includes("scan.")) {
      addCustomLink("Block Explorer", url);
      return;
    }
    if (lowerUrl.includes("github.com")) {
      addCustomLink("GitHub Repo", url);
      return;
    }

    // 11. DApp / Testnet App vs Official Website
    const isAppLikely =
      lowerUrl.includes("app.") ||
      lowerUrl.includes("testnet.") ||
      lowerUrl.includes("beta.") ||
      lowerUrl.includes("launch.") ||
      lowerUrl.includes("portal.") ||
      lowerUrl.includes("dashboard.") ||
      lowerUrl.includes("swap.") ||
      lowerUrl.includes("dex.") ||
      lowerUrl.includes("bridge.") ||
      lowerLine.includes("testnet") ||
      lowerLine.includes("app") ||
      lowerLine.includes("dapp") ||
      lowerLine.includes("link testnet") ||
      lowerLine.includes("web app");

    if (isAppLikely && !social_links.dapp_url) {
      social_links.dapp_url = url;
      seenUrls.add(url);
      return;
    }

    // Otherwise candidate for Website or DApp
    if (!social_links.website) {
      social_links.website = url;
      seenUrls.add(url);
    } else if (!social_links.dapp_url) {
      social_links.dapp_url = url;
      seenUrls.add(url);
    } else {
      addCustomLink("Tautan Garapan", url);
    }
  });

  // Cross-assignment fallbacks to guarantee Primary Action buttons work:
  if (!social_links.dapp_url && social_links.ref_link) {
    social_links.dapp_url = social_links.ref_link;
  }
  if (!social_links.dapp_url && social_links.website) {
    social_links.dapp_url = social_links.website;
  }
  if (!social_links.website && social_links.dapp_url) {
    social_links.website = social_links.dapp_url;
  }

  if (custom_links.length > 0) {
    social_links.custom_links = custom_links;
  }

  return social_links;
}

/**
 * Clean up raw task text line to make it readable in task checklist
 */
export function cleanTaskLine(rawLine: string): string {
  let line = rawLine
    // Strip numbered markers like 1., 1), [1], (1)
    .replace(/^\[?\(?\d+[\]\)\.]*\s*/, "")
    // Strip bullets and action emojis
    .replace(/^[-➖•*👉➡️✓✔✅#~]+\s*/, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  line = line.replace(/\s*\((https?:\/\/[^\)]+)\)/gi, "");
  line = line.replace(/\s*https?:\/\/[^\s]+/gi, "");
  line = line.replace(/[:\-–—\s]+$/, "").trim();

  return line;
}

/**
 * Extract clean step-by-step tasks categorized into one_time vs daily
 */
export function parseTasks(
  text: string,
  projectName: string = ""
): Array<{ title: string; type: "one_time" | "daily" }> {
  if (!text) return [];

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const tasks: Array<{ title: string; type: "one_time" | "daily" }> = [];
  const seenTitles = new Set<string>();

  const isDailyKeyword = (t: string) => {
    const l = t.toLowerCase();
    return (
      l.includes("daily") ||
      l.includes("harian") ||
      l.includes("checkin") ||
      l.includes("check-in") ||
      l.includes("gm") ||
      l.includes("setiap hari") ||
      (l.includes("faucet") && (l.includes("claim") || l.includes("mint") || l.includes("ambil")))
    );
  };

  const isJustLinkHeader = (raw: string, cleaned: string) => {
    if (!raw.includes("http")) return false;
    const lowerCleaned = cleaned.toLowerCase().trim();
    const linkLabels = new Set([
      "register",
      "registration",
      "daftar",
      "join",
      "link daftar",
      "link pendaftaran",
      "waitlist",
      "whitelist",
      "dapp",
      "dapp testnet",
      "testnet",
      "testnet app",
      "app",
      "web app",
      "website",
      "web",
      "official web",
      "official website",
      "site",
      "link",
      "link testnet",
      "faucet",
      "faucet token",
      "docs",
      "documentation",
      "panduan",
      "twitter",
      "x",
      "discord",
      "telegram",
      "form",
      "google form",
      "ref",
      "referral",
      "kode ref",
      "invite",
      "code",
      "explorer",
      "extension",
    ]);
    return linkLabels.has(lowerCleaned);
  };

  const isSectionHeader = (cleaned: string) => {
    const l = cleaned.toLowerCase();
    if (projectName && l.includes(projectName.toLowerCase())) return true;
    if (/^(langkah|panduan|tata\s+cara|cara\s+garap|step\s*by\s*step|tutorial|rules|tasks?|steps?|catatan|note)\s*[:|-]?$/i.test(cleaned)) return true;
    if (/^(join\s+waitlist|daftar\s+waitlist|new\s+airdrop|new\s+testnet)/i.test(cleaned)) return true;
    return false;
  };

  lines.forEach((line) => {
    const isBulletOrStep =
      /^\[?\(?\d+[\]\)\.]*\s*/.test(line) ||
      /^[-➖•*👉➡️✓✔✅#~]+\s*/.test(line) ||
      /(?:claim|faucet|connect|swap|bridge|stake|mint|vote|complete|submit|register|download|follow|join|verify|bind)\s+/i.test(
        line
      );

    if (isBulletOrStep) {
      const cleaned = cleanTaskLine(line);
      if (
        cleaned.length >= 4 &&
        cleaned.length <= 140 &&
        !cleaned.toLowerCase().startsWith("cost") &&
        !cleaned.toLowerCase().startsWith("fee") &&
        !isJustLinkHeader(line, cleaned) &&
        !isSectionHeader(cleaned) &&
        !seenTitles.has(cleaned.toLowerCase())
      ) {
        seenTitles.add(cleaned.toLowerCase());
        tasks.push({
          title: cleaned,
          type: isDailyKeyword(cleaned) ? "daily" : "one_time",
        });
      }
    }
  });

  if (tasks.length === 0) {
    const firstUsefulLine = lines.find((l) => !l.startsWith("http") && l.length > 5) || "Selesaikan tugas airdrop";
    tasks.push({
      title: cleanTaskLine(firstUsefulLine).slice(0, 100),
      type: "one_time",
    });
  }

  return tasks.slice(0, 12);
}

/**
 * Formats guide_content into a structured markdown document
 */
export function formatGuideContent(params: {
  name: string;
  chain: string;
  cost?: string | null;
  social_links: Record<string, any>;
  tasks: Array<{ title: string; type: string }>;
  rawText: string;
  accountNote?: string | null;
}): string {
  const parts: string[] = [];

  parts.push(`### Panduan Garapan: ${params.name}`);
  parts.push(`**Network/Chain:** ${params.chain || "Multi-chain"}`);
  if (params.cost) {
    parts.push(`**Estimasi Biaya:** ${params.cost}`);
  }
  if (params.accountNote) {
    parts.push(`**Akun Terdaftar:** ${params.accountNote}`);
  }

  parts.push("\n#### 🔗 Tautan Penting");
  const s = params.social_links || {};
  if (s.dapp_url) parts.push(`- **DApp / Testnet:** ${s.dapp_url}`);
  if (s.website && s.website !== s.dapp_url) parts.push(`- **Website Resmi:** ${s.website}`);
  if (s.ref_link && s.ref_link !== s.dapp_url) parts.push(`- **Link Referral:** ${s.ref_link}`);
  if (s.faucet_url) parts.push(`- **Faucet Token:** ${s.faucet_url}`);
  if (s.docs_url) parts.push(`- **Dokumentasi/Docs:** ${s.docs_url}`);
  if (s.twitter) parts.push(`- **X / Twitter:** ${s.twitter}`);
  if (s.discord) parts.push(`- **Discord:** ${s.discord}`);
  if (s.telegram_post_url) parts.push(`- **Postingan Sumber:** ${s.telegram_post_url}`);

  if (Array.isArray(s.custom_links) && s.custom_links.length > 0) {
    s.custom_links.forEach((cl: { label: string; url: string }) => {
      parts.push(`- **${cl.label}:** ${cl.url}`);
    });
  }

  if (params.tasks.length > 0) {
    parts.push("\n#### 📋 Langkah Pengerjaan");
    params.tasks.forEach((t, i) => {
      parts.push(`${i + 1}. [${t.type === "daily" ? "HARIAN" : "SEKALI"}] ${t.title}`);
    });
  }

  parts.push("\n---\n#### 📄 Catatan / Pesan Asli Sumber");
  parts.push(params.rawText.trim());

  return parts.join("\n");
}

/**
 * Main parser entrypoint for converting any airdrop text/feed/waitlist into a complete project payload
 */
export function parseAirdropProjectData(
  title: string,
  rawText: string,
  options: {
    sourceUrl?: string | null;
    refLink?: string | null;
    cost?: string | null;
    accountNote?: string | null;
    existingTasks?: string[];
  } = {}
): ParsedAirdropData {
  const name = cleanProjectName(title);
  const chain = detectChain(rawText, title);
  const social_links = parseResourceLinks(rawText, {
    sourceUrl: options.sourceUrl,
    fallbackRefLink: options.refLink,
  });

  const tasks = parseTasks(rawText, name);
  if (options.existingTasks && options.existingTasks.length > 0) {
    const existingParsed = options.existingTasks.map((t) => ({
      title: cleanTaskLine(t),
      type: (t.toLowerCase().includes("daily") || t.toLowerCase().includes("harian") ? "daily" : "one_time") as
        | "one_time"
        | "daily",
    }));
    const titlesSet = new Set(tasks.map((t) => t.title.toLowerCase()));
    existingParsed.forEach((et) => {
      if (et.title.length > 3 && !titlesSet.has(et.title.toLowerCase())) {
        tasks.unshift(et);
        titlesSet.add(et.title.toLowerCase());
      }
    });
  }

  const guide_content = formatGuideContent({
    name,
    chain,
    cost: options.cost,
    social_links,
    tasks,
    rawText,
    accountNote: options.accountNote,
  });

  return {
    name,
    chain,
    social_links,
    tasks,
    guide_content,
  };
}
