import { http, createConfig } from "wagmi";
import { mainnet, sepolia, arbitrum, optimism, base } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

export const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "placeholder-project-id";

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia, arbitrum, optimism, base],
  connectors: [
    injected(),
    ...(projectId && projectId !== "placeholder-project-id"
      ? [walletConnect({ projectId })]
      : []),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
  },
  ssr: true,
});
