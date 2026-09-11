import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "@/styles/tokens.css";
import "@/styles/globals.css";
import { LanguageProvider } from "@/lib/i18n/context";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-mono",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://droppr.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Droppr — Personal Airdrop Workspace & Mission Control",
    template: "%s | Droppr",
  },
  description:
    "Mission-control workspace for crypto airdrop hunters. Track testnets, mainnets, multi-wallet allocations, daily routine reset (07:00 WIB), and auto-import Telegram alpha signals with complete privacy.",
  keywords: [
    "airdrop tracker",
    "crypto airdrop workspace",
    "airdrop hunter tools",
    "pelacak airdrop crypto",
    "telegram airdrop signals",
    "multi-wallet tracker",
    "sybil resistance strategy",
    "daily crypto tasks checklist",
    "airdrop spreadsheet alternative",
    "web3 mission control",
    "airdrop reminder",
    "manajemen garapan airdrop",
    "testnet tracking tool",
  ],
  authors: [{ name: "Droppr Team", url: siteUrl }],
  creator: "Droppr",
  publisher: "Droppr",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    alternateLocale: ["en_US"],
    url: siteUrl,
    title: "Droppr — Personal Airdrop Workspace & Mission Control",
    description:
      "Mission-control workspace for crypto airdrop hunters. Track testnets, multi-wallet allocations, daily routine reset, and auto-import Telegram signals with 100% privacy.",
    siteName: "Droppr",
  },
  twitter: {
    card: "summary_large_image",
    title: "Droppr — Personal Airdrop Workspace & Mission Control",
    description:
      "Mission-control workspace for crypto airdrop hunters. Track multi-wallet allocations and daily routine tasks with zero private keys.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "finance",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Droppr",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Mission-control personal workspace for crypto airdrop hunters. Track testnets, multi-wallet allocations, daily routine reset (07:00 WIB), and auto-import Telegram signals.",
    featureList: [
      "Telegram Airdrop Signal Auto-Import with Dual-Way Translation",
      "Multi-Wallet Portfolio Tracking without Private Keys",
      "Daily Routine Task Management with 07:00 WIB Reset",
      "Sybil Resistance Strategy & Allocation Notes",
      "JSON and CSV Relational Data Export",
      "Private Row-Level Security on Supabase",
    ],
  };

  return (
    <html lang="id" className={`${ibmPlexSans.variable} ${ibmPlexMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=window.location.pathname;if(p===''||p==='/'||p.startsWith('/login')||p.startsWith('/auth'))return;var t=localStorage.getItem('droppr-theme');if(t==='light')document.documentElement.classList.add('light')}catch(e){}})();(function(){try{if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(regs){for(var i=0;i<regs.length;i++){regs[i].unregister()}}).catch(function(){})}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-bg-base text-text-primary antialiased">
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}

