import { writeContractWithAccount } from "../infrastructure/transaction.service";
import { UserModel } from "../models/user.model";
import { BONDING_CURVE_ADDRESS } from "../config/env.config";
import { BondingCurveAbi } from "../../abis/BondingCurveAbi";
import { MockERC20Abi } from "../../abis/MockERC20Abi";
import type { Hash } from "viem";
import { parseEther } from "viem";

export interface SellTokensParams {
  tokenAddress: string;
  tokenAmount: string; // Amount of tokens to sell (as string to handle precision)
}

export interface SellTokensResult {
  transactionHash: Hash;
  success: boolean;
  error?: string;
}

export class SellTokensCommand {
  /**
   * Sell tokens using the bonding curve contract
   */
  static async execute(
    userEmail: string,
    params: SellTokensParams
  ): Promise<SellTokensResult> {
    try {
      console.log(
        `💸 [SELL TOKENS] Starting token sale for user: ${userEmail}`
      );
      console.log(`💸 [SELL TOKENS] Sale params:`, {
        tokenAddress: params.tokenAddress,
        tokenAmount: params.tokenAmount,
      });

      // Validate input parameters
      this.validateParams(params);

      // Get user from database
      const user = await UserModel.findByEmail(userEmail);
      if (!user) {
        throw new Error(`User not found with email: ${userEmail}`);
      }

      console.log(
        `💸 [SELL TOKENS] Found user with wallet: ${user.walletAddress}`
      );

      // Convert token amount to wei (assuming 18 decimals for tokens)
      const tokenAmountWei = parseEther(params.tokenAmount);

      console.log(
        `💸 [SELL TOKENS] Step 1: Approving tokens for BondingCurve contract`
      );

      // Step 1: Approve tokens for the BondingCurve contract
      await writeContractWithAccount({
        address: params.tokenAddress as `0x${string}`,
        abi: MockERC20Abi,
        functionName: "approve",
        args: [BONDING_CURVE_ADDRESS as `0x${string}`, tokenAmountWei] as const,
        account: {
          address: user.walletAddress,
          privateKey: user.privateKey,
        },
      });

      console.log(`💸 [SELL TOKENS] ✅ Token approval successful`);

      // Prepare contract arguments for sellTokens
      const contractArgs = [
        params.tokenAddress as `0x${string}`,
        tokenAmountWei,
      ] as const;

      console.log(
        `💸 [SELL TOKENS] Step 2: Calling sellTokens on bonding curve contract at: ${BONDING_CURVE_ADDRESS}`
      );
      console.log(`💸 [SELL TOKENS] Contract args:`, {
        tokenAddress: params.tokenAddress,
        tokenAmountWei: tokenAmountWei.toString(),
      });

      // Step 2: Execute the sellTokens contract call
      const transactionHash = await writeContractWithAccount({
        address: BONDING_CURVE_ADDRESS as `0x${string}`,
        abi: BondingCurveAbi,
        functionName: "sellTokens",
        args: contractArgs,
        account: {
          address: user.walletAddress,
          privateKey: user.privateKey,
        },
      });

      console.log(
        `💸 [SELL TOKENS] ✅ Token sale transaction sent: ${transactionHash}`
      );

      return {
        transactionHash,
        success: true,
      };
    } catch (error) {
      console.error(`💸 [SELL TOKENS] ❌ Error selling tokens:`, error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      return {
        transactionHash: "0x" as Hash, // placeholder
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Validate sell tokens parameters
   */
  private static validateParams(params: SellTokensParams): void {
    const errors: string[] = [];

    // Validate token address
    if (!params.tokenAddress || params.tokenAddress.trim().length === 0) {
      errors.push("Token address is required");
    }

    // Basic check for Ethereum address format
    if (
      params.tokenAddress &&
      !params.tokenAddress.match(/^0x[a-fA-F0-9]{40}$/)
    ) {
      errors.push("Invalid token address format");
    }

    // Validate token amount
    if (!params.tokenAmount || params.tokenAmount.trim().length === 0) {
      errors.push("Token amount is required");
    }

    if (params.tokenAmount) {
      const amount = parseFloat(params.tokenAmount);
      if (isNaN(amount) || amount <= 0) {
        errors.push("Token amount must be a positive number");
      }
      if (amount > 1000000000) {
        errors.push("Token amount too large (max 1,000,000,000)");
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(", ")}`);
    }
  }

  /**
   * Sell tokens using bot's dedicated wallet (for market maker bots)
   */
  static async executeWithWallet(
    walletAddress: string,
    privateKey: string,
    params: SellTokensParams
  ): Promise<SellTokensResult> {
    try {
      console.log(
        `💰 [SELL TOKENS BOT] Starting token sale for bot wallet: ${walletAddress}`
      );
      console.log(`💰 [SELL TOKENS BOT] Sale params:`, {
        tokenAddress: params.tokenAddress,
        tokenAmount: params.tokenAmount,
      });

      // Validate input parameters
      this.validateParams(params);

      console.log(`💰 [SELL TOKENS BOT] Using bot wallet: ${walletAddress}`);

      // Convert token amount to wei (assuming 18 decimals for tokens)
      const tokenAmountWei = parseEther(params.tokenAmount);

      console.log(
        `💰 [SELL TOKENS BOT] Step 1: Approving tokens for BondingCurve contract`
      );

      // Step 1: Approve tokens for the BondingCurve contract
      await writeContractWithAccount({
        address: params.tokenAddress as `0x${string}`,
        abi: MockERC20Abi,
        functionName: "approve",
        args: [BONDING_CURVE_ADDRESS as `0x${string}`, tokenAmountWei] as const,
        account: {
          address: walletAddress,
          privateKey: privateKey,
        },
      });

      console.log(`💰 [SELL TOKENS BOT] ✅ Token approval successful`);

      // Prepare contract arguments for sellTokens
      const contractArgs = [
        params.tokenAddress as `0x${string}`,
        tokenAmountWei,
      ] as const;

      console.log(
        `💰 [SELL TOKENS BOT] Step 2: Calling sellTokens on bonding curve contract at: ${BONDING_CURVE_ADDRESS}`
      );
      console.log(`💰 [SELL TOKENS BOT] Contract args:`, {
        tokenAddress: params.tokenAddress,
        tokenAmountWei: tokenAmountWei.toString(),
      });

      // Step 2: Execute the sellTokens contract call
      const transactionHash = await writeContractWithAccount({
        address: BONDING_CURVE_ADDRESS as `0x${string}`,
        abi: BondingCurveAbi,
        functionName: "sellTokens",
        args: contractArgs,
        account: {
          address: walletAddress,
          privateKey: privateKey,
        },
      });

      console.log(
        `💰 [SELL TOKENS BOT] ✅ Transaction completed successfully!`
      );
      console.log(`💰 [SELL TOKENS BOT] Transaction hash: ${transactionHash}`);

      return {
        transactionHash,
        success: true,
      };
    } catch (error) {
      console.error(`❌ [SELL TOKENS BOT] Transaction failed:`, error);
      return {
        transactionHash: "0x" as Hash,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
