import { http, createConfig } from "wagmi";
import { mainnet, sepolia, arbitrum, optimism, base } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia, arbitrum, optimism, base],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
  },
  ssr: true,
});
