import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  parseUnits,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { seiTestnet } from "../config/chains.js";
import { MockERC20Abi } from "../../abis/MockERC20Abi.js";
import { ADMIN_PRIVATE_KEY, USDT_ADDRESS } from "../config/env.config.js";

// Create clients
const publicClient = createPublicClient({
  chain: seiTestnet,
  transport: http(),
});

const account = privateKeyToAccount(ADMIN_PRIVATE_KEY as `0x${string}`);

const walletClient = createWalletClient({
  chain: seiTestnet,
  transport: http(),
  account,
});

export class WalletService {
  /**
   * Fund a new user wallet with 1000 USDT and 0.001 ETH
   */
  static async fundNewUser(
    userAddress: Address
  ): Promise<{ ethTxHash: string; usdtTxHash: string }> {
    try {
      // Send 0.001 ETH
      const ethTxHash = await walletClient.sendTransaction({
        to: userAddress,
        value: parseEther("0.1"),
      });

      // Send 1000 USDT (18 decimals)
      const usdtTxHash = await walletClient.writeContract({
        address: USDT_ADDRESS as Address,
        abi: MockERC20Abi,
        functionName: "transfer",
        args: [userAddress, parseUnits("1000", 18)],
      });

      return { ethTxHash, usdtTxHash };
    } catch (error) {
      console.error("Error funding user wallet:", error);
      throw new Error("Failed to fund user wallet");
    }
  }

  /**
   * Get user's ETH and USDT balances
   */
  static async getUserBalances(
    userAddress: Address
  ): Promise<{ ethBalance: string; usdtBalance: string }> {
    try {
      // Get ETH balance
      const ethBalance = await publicClient.getBalance({
        address: userAddress,
      });

      // Get USDT balance
      const usdtBalance = await publicClient.readContract({
        address: USDT_ADDRESS as Address,
        abi: MockERC20Abi,
        functionName: "balanceOf",
        args: [userAddress],
      });

      return {
        ethBalance: ethBalance.toString(),
        usdtBalance: (usdtBalance as bigint).toString(),
      };
    } catch (error) {
      console.error("Error getting user balances:", error);
      throw new Error("Failed to get user balances");
    }
  }

  /**
   * Get user's token balance for a specific token
   */
  static async getTokenBalance(
    userAddress: Address,
    tokenAddress: Address
  ): Promise<string> {
    try {
      const tokenBalance = await publicClient.readContract({
        address: tokenAddress as Address,
        abi: MockERC20Abi,
        functionName: "balanceOf",
        args: [userAddress],
      });

      return (tokenBalance as bigint).toString();
    } catch (error) {
      console.error("Error getting token balance:", error);
      return "0"; // Return 0 if error occurred
    }
  }
}
