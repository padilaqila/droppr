import { AppShell } from "@/components/features/app-shell";
import { Web3Provider } from "@/lib/wallet/provider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Web3Provider>
      <AppShell>{children}</AppShell>
    </Web3Provider>
  );
}
