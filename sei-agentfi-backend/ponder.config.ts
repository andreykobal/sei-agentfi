import { createConfig } from "ponder";

import { PoolManagerAbi } from "./abis/PoolManagerAbi";
import { BondingCurveAbi } from "./abis/BondingCurveAbi";

export default createConfig({
  chains: {
    sei: {
      id: 1328,
      rpc: process.env.PONDER_RPC_URL_1328!,
    },
  },
  contracts: {
    BondingCurve: {
      chain: "sei",
      abi: BondingCurveAbi,
      address: "0xA79c48f309eA5aAc68CC7197f7679db936030088",
      startBlock: 186342869,
    },
    PoolManager: {
      chain: "sei",
      abi: PoolManagerAbi,
      address: "0xa97749a2623590CA356e09A90615543b5Cfee99b",
      startBlock: 186342869,
    },
  },
});
