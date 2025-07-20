import { createConfig } from "ponder";

import { PoolManagerAbi } from "./abis/PoolManagerAbi";
import { TokenFactoryAbi } from "./abis/TokenFactoryAbi";

export default createConfig({
  chains: {
    sei: {
      id: 1328,
      rpc: process.env.PONDER_RPC_URL_1328!,
    },
  },
  contracts: {
    TokenFactory: {
      chain: "sei",
      abi: TokenFactoryAbi,
      address: "0x12c7dE8d71820772Fe64942Bd8384C720E298480",
      startBlock: 186179144,
    },
    PoolManager: {
      chain: "sei",
      abi: PoolManagerAbi,
      address: "0xe1af8ECcF5e46dF48953D52bD57005900f3d2753",
      startBlock: 186179144,
    },
  },
});
