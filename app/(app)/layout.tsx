import { AppShell } from "@/components/features/app-shell";
import { Web3Provider } from "@/lib/wallet/provider";
import { LanguageProvider } from "@/lib/i18n/context";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <Web3Provider>
        <AppShell>{children}</AppShell>
      </Web3Provider>
    </LanguageProvider>
  );
}
