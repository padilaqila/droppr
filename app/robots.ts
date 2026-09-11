import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://droppr.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/register", "/llms.txt", "/llms-full.txt"],
        disallow: [
          "/dashboard",
          "/projects",
          "/tasks",
          "/wallets",
          "/settings",
          "/reminders",
          "/api/",
          "/auth/",
        ],
      },
      // Explicit permission for modern AI search engines & LLM crawlers
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "ClaudeBot",
          "Claude-Web",
          "PerplexityBot",
          "Google-Extended",
          "Applebot-Extended",
          "CCBot",
          "cohere-ai",
        ],
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: [
          "/dashboard",
          "/projects",
          "/tasks",
          "/wallets",
          "/settings",
          "/reminders",
          "/api/",
          "/auth/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
