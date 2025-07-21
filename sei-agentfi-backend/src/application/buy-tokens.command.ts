import { writeContractWithAccount } from "../infrastructure/transaction.service";
import { UserModel } from "../models/user.model";
import { BONDING_CURVE_ADDRESS, USDT_ADDRESS } from "../config/env.config";
import { BondingCurveAbi } from "../../abis/BondingCurveAbi";
import { MockERC20Abi } from "../../abis/MockERC20Abi";
import type { Hash } from "viem";
import { parseEther } from "viem";

export interface BuyTokensParams {
  tokenAddress: string;
  usdtAmount: string; // Amount in USDT (as string to handle precision)
}

export interface BuyTokensResult {
  transactionHash: Hash;
  success: boolean;
  error?: string;
}

export class BuyTokensCommand {
  /**
   * Buy tokens using the bonding curve contract
   */
  static async execute(
    userEmail: string,
    params: BuyTokensParams
  ): Promise<BuyTokensResult> {
    try {
      console.log(
        `💰 [BUY TOKENS] Starting token purchase for user: ${userEmail}`
      );
      console.log(`💰 [BUY TOKENS] Purchase params:`, {
        tokenAddress: params.tokenAddress,
        usdtAmount: params.usdtAmount,
      });

      // Validate input parameters
      this.validateParams(params);

      // Get user from database
      const user = await UserModel.findByEmail(userEmail);
      if (!user) {
        throw new Error(`User not found with email: ${userEmail}`);
      }

      console.log(
        `💰 [BUY TOKENS] Found user with wallet: ${user.walletAddress}`
      );

      // Convert USDT amount to wei (assuming 18 decimals for USDT)
      const usdtAmountWei = parseEther(params.usdtAmount);

      console.log(
        `💰 [BUY TOKENS] Step 1: Approving USDT for BondingCurve contract`
      );

      // Step 1: Approve USDT for the BondingCurve contract
      await writeContractWithAccount({
        address: USDT_ADDRESS as `0x${string}`,
        abi: MockERC20Abi,
        functionName: "approve",
        args: [BONDING_CURVE_ADDRESS as `0x${string}`, usdtAmountWei] as const,
        account: {
          address: user.walletAddress,
          privateKey: user.privateKey,
        },
      });

      console.log(`💰 [BUY TOKENS] ✅ USDT approval successful`);

      // Prepare contract arguments for buyTokens
      const contractArgs = [
        params.tokenAddress as `0x${string}`,
        usdtAmountWei,
      ] as const;

      console.log(
        `💰 [BUY TOKENS] Step 2: Calling buyTokens on bonding curve contract at: ${BONDING_CURVE_ADDRESS}`
      );
      console.log(`💰 [BUY TOKENS] Contract args:`, {
        tokenAddress: params.tokenAddress,
        usdtAmountWei: usdtAmountWei.toString(),
      });

      // Step 2: Execute the buyTokens contract call
      const transactionHash = await writeContractWithAccount({
        address: BONDING_CURVE_ADDRESS as `0x${string}`,
        abi: BondingCurveAbi,
        functionName: "buyTokens",
        args: contractArgs,
        account: {
          address: user.walletAddress,
          privateKey: user.privateKey,
        },
      });

      console.log(
        `💰 [BUY TOKENS] ✅ Token purchase transaction sent: ${transactionHash}`
      );

      return {
        transactionHash,
        success: true,
      };
    } catch (error) {
      console.error(`💰 [BUY TOKENS] ❌ Error buying tokens:`, error);

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
   * Validate buy tokens parameters
   */
  private static validateParams(params: BuyTokensParams): void {
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

    // Validate USDT amount
    if (!params.usdtAmount || params.usdtAmount.trim().length === 0) {
      errors.push("USDT amount is required");
    }

    if (params.usdtAmount) {
      const amount = parseFloat(params.usdtAmount);
      if (isNaN(amount) || amount <= 0) {
        errors.push("USDT amount must be a positive number");
      }
      if (amount > 1000000) {
        errors.push("USDT amount too large (max 1,000,000)");
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(", ")}`);
    }
  }
}
