import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  parseUnits,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { seiTestnet } from "../config/chains.config.js";
import { MockERC20Abi } from "../../abis/MockERC20Abi.js";
import { ADMIN_PRIVATE_KEY, USDT_ADDRESS } from "../config/env.config.js";
import { TokenProjection } from "../projections/token.projection.js";

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
   * Waits for both transactions to be confirmed before returning
   */
  static async fundNewUser(
    userAddress: Address
  ): Promise<{ ethTxHash: string; usdtTxHash: string }> {
    try {
      console.log(
        `🚀 [WalletService] Starting funding for user: ${userAddress}`
      );

      // Send 0.1 ETH
      console.log("💰 [WalletService] Sending ETH...");
      const ethTxHash = await walletClient.sendTransaction({
        to: userAddress,
        value: parseEther("0.1"),
      });

      // Wait for ETH transaction confirmation
      console.log(
        `⏳ [WalletService] Waiting for ETH transaction confirmation: ${ethTxHash}`
      );
      const ethReceipt = await publicClient.waitForTransactionReceipt({
        hash: ethTxHash,
        confirmations: 1,
      });

      if (ethReceipt.status !== "success") {
        throw new Error(`ETH transaction failed: ${ethTxHash}`);
      }
      console.log(`✅ [WalletService] ETH transaction confirmed: ${ethTxHash}`);

      // Send 10000 USDT (18 decimals)
      console.log("💰 [WalletService] Sending USDT...");
      const usdtTxHash = await walletClient.writeContract({
        address: USDT_ADDRESS as Address,
        abi: MockERC20Abi,
        functionName: "transfer",
        args: [userAddress, parseUnits("10000", 18)],
      });

      // Wait for USDT transaction confirmation
      console.log(
        `⏳ [WalletService] Waiting for USDT transaction confirmation: ${usdtTxHash}`
      );
      const usdtReceipt = await publicClient.waitForTransactionReceipt({
        hash: usdtTxHash,
        confirmations: 1,
      });

      if (usdtReceipt.status !== "success") {
        throw new Error(`USDT transaction failed: ${usdtTxHash}`);
      }
      console.log(
        `✅ [WalletService] USDT transaction confirmed: ${usdtTxHash}`
      );

      console.log(
        `🎉 [WalletService] Successfully funded user ${userAddress} with ETH and USDT`
      );
      return { ethTxHash, usdtTxHash };
    } catch (error) {
      console.error("❌ [WalletService] Error funding user wallet:", error);
      throw new Error(
        `Failed to fund user wallet: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
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
      console.log("🔍 [WalletService] Getting token balance for:", {
        userAddress,
        tokenAddress,
      });

      const tokenBalance = await publicClient.readContract({
        address: tokenAddress as Address,
        abi: MockERC20Abi,
        functionName: "balanceOf",
        args: [userAddress],
      });

      const balanceString = (tokenBalance as bigint).toString();
      console.log("✅ [WalletService] Token balance retrieved:", {
        userAddress,
        tokenAddress,
        balance: balanceString,
        balanceBigInt: tokenBalance,
      });

      return balanceString;
    } catch (error) {
      console.error("❌ [WalletService] Error getting token balance:", {
        userAddress,
        tokenAddress,
        error,
      });
      return "0"; // Return 0 if error occurred
    }
  }

  /**
   * Get user's USDT balance only
   */
  static async getUsdtBalance(userAddress: Address): Promise<string> {
    try {
      console.log("🔍 [WalletService] Getting USDT balance for:", userAddress);

      const usdtBalance = await publicClient.readContract({
        address: USDT_ADDRESS as Address,
        abi: MockERC20Abi,
        functionName: "balanceOf",
        args: [userAddress],
      });

      const balanceString = (usdtBalance as bigint).toString();
      console.log("✅ [WalletService] USDT balance retrieved:", {
        userAddress,
        balance: balanceString,
      });

      return balanceString;
    } catch (error) {
      console.error("❌ [WalletService] Error getting USDT balance:", {
        userAddress,
        error,
      });
      return "0"; // Return 0 if error occurred
    }
  }

  /**
   * Get user's USDT and specific token balances (optimized for market maker)
   */
  static async getUsdtAndTokenBalances(
    userAddress: Address,
    tokenAddress: Address
  ): Promise<{ usdtBalance: string; tokenBalance: string }> {
    try {
      console.log("🔍 [WalletService] Getting USDT and token balances for:", {
        userAddress,
        tokenAddress,
      });

      // Execute both balance calls in parallel for better performance
      const [usdtBalance, tokenBalance] = await Promise.all([
        publicClient.readContract({
          address: USDT_ADDRESS as Address,
          abi: MockERC20Abi,
          functionName: "balanceOf",
          args: [userAddress],
        }),
        publicClient.readContract({
          address: tokenAddress as Address,
          abi: MockERC20Abi,
          functionName: "balanceOf",
          args: [userAddress],
        }),
      ]);

      const result = {
        usdtBalance: (usdtBalance as bigint).toString(),
        tokenBalance: (tokenBalance as bigint).toString(),
      };

      console.log("✅ [WalletService] USDT and token balances retrieved:", {
        userAddress,
        tokenAddress,
        ...result,
      });

      return result;
    } catch (error) {
      console.error(
        "❌ [WalletService] Error getting USDT and token balances:",
        {
          userAddress,
          tokenAddress,
          error,
        }
      );
      return {
        usdtBalance: "0",
        tokenBalance: "0",
      };
    }
  }

  /**
   * Get user's balances for all tokens in the platform
   */
  static async getAllTokenBalances(userAddress: Address): Promise<
    Array<{
      tokenAddress: string;
      name: string;
      symbol: string;
      balance: string;
      decimals: number;
    }>
  > {
    try {
      console.log(
        "🔍 [WalletService] Getting all token balances for:",
        userAddress
      );

      // Get all tokens from the platform
      const allTokens = await TokenProjection.getAllTokens();
      console.log(
        `🔍 [WalletService] Found ${allTokens.length} tokens to check`
      );

      const tokenBalances = [];

      // Check balance for each token
      for (const token of allTokens) {
        try {
          const balance = await this.getTokenBalance(
            userAddress,
            token.tokenAddress as Address
          );

          // Only include tokens with non-zero balance
          if (balance !== "0") {
            tokenBalances.push({
              tokenAddress: token.tokenAddress,
              name: token.name,
              symbol: token.symbol,
              balance: balance,
              decimals: token.decimals,
            });
            console.log(
              `✅ [WalletService] Found balance for ${token.symbol}: ${balance}`
            );
          }
        } catch (error) {
          console.error(
            `❌ [WalletService] Error checking balance for token ${token.symbol}:`,
            error
          );
          // Continue with other tokens
        }
      }

      console.log(
        `✅ [WalletService] Found ${tokenBalances.length} tokens with balances`
      );
      return tokenBalances;
    } catch (error) {
      console.error(
        "❌ [WalletService] Error getting all token balances:",
        error
      );
      return [];
    }
  }

  /**
   * Transfer USDT from one wallet to another
   */
  static async transferUsdt(
    fromPrivateKey: string,
    toAddress: Address,
    amountInUsdt: string
  ): Promise<string> {
    try {
      console.log(
        `💸 [WalletService] Transferring ${amountInUsdt} USDT to ${toAddress}`
      );

      // Create wallet client with sender's private key
      const senderAccount = privateKeyToAccount(
        fromPrivateKey as `0x${string}`
      );
      const senderWalletClient = createWalletClient({
        chain: seiTestnet,
        transport: http(),
        account: senderAccount,
      });

      // Convert amount to wei (18 decimals)
      const amountWei = parseUnits(amountInUsdt, 18);

      // Execute transfer
      const txHash = await senderWalletClient.writeContract({
        address: USDT_ADDRESS as Address,
        abi: MockERC20Abi,
        functionName: "transfer",
        args: [toAddress, amountWei],
      });

      // Wait for transaction confirmation
      console.log(
        `⏳ [WalletService] Waiting for USDT transfer confirmation: ${txHash}`
      );
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1,
      });

      if (receipt.status !== "success") {
        throw new Error(`USDT transfer failed: ${txHash}`);
      }

      console.log(
        `✅ [WalletService] USDT transfer confirmed: ${txHash} (${amountInUsdt} USDT → ${toAddress})`
      );
      return txHash;
    } catch (error) {
      console.error("❌ [WalletService] Error transferring USDT:", error);
      throw new Error(
        `Failed to transfer USDT: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Transfer tokens from one wallet to another
   */
  static async transferToken(
    fromPrivateKey: string,
    toAddress: Address,
    tokenAddress: Address,
    amountInTokens: string
  ): Promise<string> {
    try {
      console.log(
        `💸 [WalletService] Transferring ${amountInTokens} tokens (${tokenAddress}) to ${toAddress}`
      );

      // Create wallet client with sender's private key
      const senderAccount = privateKeyToAccount(
        fromPrivateKey as `0x${string}`
      );
      const senderWalletClient = createWalletClient({
        chain: seiTestnet,
        transport: http(),
        account: senderAccount,
      });

      // Convert amount to wei (18 decimals)
      const amountWei = parseUnits(amountInTokens, 18);

      // Execute transfer
      const txHash = await senderWalletClient.writeContract({
        address: tokenAddress,
        abi: MockERC20Abi,
        functionName: "transfer",
        args: [toAddress, amountWei],
      });

      // Wait for transaction confirmation
      console.log(
        `⏳ [WalletService] Waiting for token transfer confirmation: ${txHash}`
      );
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1,
      });

      if (receipt.status !== "success") {
        throw new Error(`Token transfer failed: ${txHash}`);
      }

      console.log(
        `✅ [WalletService] Token transfer confirmed: ${txHash} (${amountInTokens} tokens → ${toAddress})`
      );
      return txHash;
    } catch (error) {
      console.error("❌ [WalletService] Error transferring tokens:", error);
      throw new Error(
        `Failed to transfer tokens: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
