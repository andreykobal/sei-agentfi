import { defineChain } from "viem";

export const seiTestnet = defineChain({
  id: 1328,
  name: "Sei Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Sei",
    symbol: "SEI",
  },
  rpcUrls: {
    default: {
      http: ["https://evm-rpc-testnet.sei-apis.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "Sei Explorer",
      url: "https://seitrace.com",
    },
  },
  testnet: true,
});
