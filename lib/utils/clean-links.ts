/**
 * Utilities for cleaning and deduplicating URLs in Telegram messages and text content.
 */

/**
 * Normalize URL or domain string for reliable comparison (strips protocol, www, trailing slashes, and lowercases).
 */
export function normalizeUrlForCompare(url: string): string {
  if (!url || typeof url !== "string") return "";
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}

/**
 * Remove duplicate repeated links in text (e.g. "https://hyperanon.org (https://hyperanon.org/)").
 * Preserves legitimate distinct links and non-duplicate parentheses.
 */
export function cleanDuplicateLinks(text: string): string {
  if (!text || typeof text !== "string") return "";

  let result = text;

  // 1. Markdown link followed by duplicate bracketed link: [Text](url1) (url2)
  result = result.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)\s*[\(\[\<]\s*(https?:\/\/[^\s\)\]\>]+)\s*[\)\]\>]/gi,
    (match, label, url1, url2) => {
      if (
        normalizeUrlForCompare(url1) === normalizeUrlForCompare(url2) ||
        normalizeUrlForCompare(label) === normalizeUrlForCompare(url2)
      ) {
        return `[${label}](${url1})`;
      }
      return match;
    }
  );

  // 2. URL followed by parenthesized or bracketed duplicate URL: url1 (url2) or url1 [url2]
  result = result.replace(
    /(https?:\/\/[^\s\)\],]+)\s*[\(\[\<]\s*(https?:\/\/[^\s\)\]\>]+)\s*[\)\]\>]/gi,
    (match, url1, url2) => {
      if (normalizeUrlForCompare(url1) === normalizeUrlForCompare(url2)) {
        return url1;
      }
      return match;
    }
  );

  // 3. Domain or handle followed by parenthesized URL if identical: domain.com (https://domain.com)
  result = result.replace(
    /((?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9][-a-zA-Z0-9.]*\.[a-zA-Z]{2,}(?:\/[^\s\)\],]*)?)\s*[\(\[\<]\s*(https?:\/\/[^\s\)\]\>]+)\s*[\)\]\>]/gi,
    (match, textLabel, url) => {
      if (normalizeUrlForCompare(textLabel) === normalizeUrlForCompare(url)) {
        return url;
      }
      return match;
    }
  );

  // 4. Consecutive identical URLs separated by whitespace or dashes
  result = result.replace(
    /(https?:\/\/[^\s\)\],]+)\s+(?:[-–—:]\s+)?(https?:\/\/[^\s\)\],]+)/gi,
    (match, url1, url2) => {
      if (normalizeUrlForCompare(url1) === normalizeUrlForCompare(url2)) {
        return url1;
      }
      return match;
    }
  );

  return result;
}

/**
 * Format an HTML anchor tag safely, preventing duplicate links
 */
export function formatTelegramHtmlLink(href: string, text: string): string {
  const cleanHref = (href || "").trim();
  const cleanText = (text || "").replace(/<[^>]+>/g, "").trim();

  if (!cleanHref) return cleanText;
  if (!cleanText) return cleanHref;

  // If text and href point to the exact same URL or domain
  if (normalizeUrlForCompare(cleanText) === normalizeUrlForCompare(cleanHref)) {
    return cleanHref;
  }

  // If text is descriptive (e.g. "Register here", "Docs", "Twitter")
  return `${cleanText} (${cleanHref})`;
}

/**
 * Standardized HTML cleaner for Telegram messages across all scrapers and API routes.
 */
export function cleanTelegramHtml(rawHtml: string): string {
  if (!rawHtml) return "";

  const text = rawHtml
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) =>
      formatTelegramHtmlLink(href, text)
    )
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "$1")
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "$1")
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "$1")
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "$1")
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`")
    .replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, "$1")
    .replace(/<tg-emoji[^>]*>(.*?)<\/tg-emoji>/gi, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&#036;|&dollar;/g, "$")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();

  // Deduplicate any repeated links that exist in the text
  return cleanDuplicateLinks(text);
}
