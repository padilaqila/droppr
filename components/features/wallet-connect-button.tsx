"use client";

import React, { useState } from "react";
import { useAccount, useConnect, useDisconnect, useBalance } from "wagmi";
import { injected } from "wagmi/connectors";
import { Wallet, LogOut, ChevronDown } from "lucide-react";
import { ButtonSecondary } from "@/components/ui/button";

export function WalletConnectButton() {
  const { address, isConnected, chain } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Read native balance on-chain
  const { data: balanceData } = useBalance({
    address: address,
  });

  if (isConnected && address) {
    const truncatedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
    const formattedBalance = balanceData
      ? `${Number(balanceData.formatted).toFixed(4)} ${balanceData.symbol}`
      : "...";

    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-bg-elevated text-text-primary border border-border-hairline text-body-sm hover:bg-bg-elevated-2 transition-colors font-mono"
        >
          <div className="w-2 h-2 rounded-full bg-status-completed" />
          <span className="text-accent font-semibold">{formattedBalance}</span>
          <span className="text-text-secondary">|</span>
          <span>{truncatedAddress}</span>
          <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-1 w-56 p-2 rounded-lg bg-bg-elevated border border-border-hairline shadow-xl z-50 text-body-sm space-y-2">
            <div className="px-2 py-1 border-b border-border-hairline">
              <div className="text-[11px] text-text-tertiary">Jaringan On-chain</div>
              <div className="text-text-primary font-medium">{chain?.name || "EVM"}</div>
            </div>
            <div className="px-2 py-1 border-b border-border-hairline font-mono text-[11px] text-text-secondary break-all">
              {address}
            </div>
            <button
              type="button"
              onClick={() => {
                disconnect();
                setDropdownOpen(false);
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-caption text-status-overdue hover:bg-bg-elevated-2 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Putuskan Koneksi</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <ButtonSecondary
      onClick={() => connect({ connector: injected() })}
      disabled={isPending}
      className="!py-1.5 !px-3 text-body-sm inline-flex items-center gap-1.5"
    >
      <Wallet className="w-4 h-4 text-accent" />
      <span>{isPending ? "Menghubungkan..." : "Connect Wallet"}</span>
    </ButtonSecondary>
  );
}
