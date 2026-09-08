import { Sidebar } from "@/components/features/sidebar";
import { Topbar } from "@/components/features/topbar";
import { Web3Provider } from "@/lib/wallet/provider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Web3Provider>
      <div className="min-h-screen bg-bg-base flex">
        {/* Fixed Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 ml-64 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </Web3Provider>
  );
}
