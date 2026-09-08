import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "@/styles/globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Droppr — Personal Airdrop Workspace",
  description: "Mission-control workspace for airdrop hunters",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>
      <body className="min-h-screen bg-bg-base text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
