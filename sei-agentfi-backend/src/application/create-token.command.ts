import { writeContractWithAccount } from "../infrastructure/transaction.service";
import { UserModel } from "../models/user.model";
import { BONDING_CURVE_ADDRESS } from "../config/env.config";
import { BondingCurveAbi } from "../../abis/BondingCurveAbi";
import type { Hash } from "viem";

export interface CreateTokenParams {
  name: string;
  symbol: string;
  description: string;
  image: string;
  website: string;
  twitter: string;
  telegram: string;
  discord: string;
}

export interface CreateTokenResult {
  transactionHash: Hash;
  tokenAddress?: string; // Will be extracted from transaction receipt
  success: boolean;
  error?: string;
}

export class CreateTokenCommand {
  /**
   * Create a new token using the bonding curve contract
   */
  static async execute(
    userEmail: string,
    params: CreateTokenParams
  ): Promise<CreateTokenResult> {
    try {
      console.log(
        `🪙 [CREATE TOKEN] Starting token creation for user: ${userEmail}`
      );
      console.log(`🪙 [CREATE TOKEN] Token params:`, {
        name: params.name,
        symbol: params.symbol,
        description: params.description.substring(0, 100) + "...",
      });

      // Validate input parameters
      this.validateParams(params);

      // Get user from database
      const user = await UserModel.findByEmail(userEmail);
      if (!user) {
        throw new Error(`User not found with email: ${userEmail}`);
      }

      console.log(
        `🪙 [CREATE TOKEN] Found user with wallet: ${user.walletAddress}`
      );

      // Prepare contract arguments
      const contractArgs = [
        params.name,
        params.symbol,
        params.description,
        params.image,
        params.website,
        params.twitter,
        params.telegram,
        params.discord,
      ] as const;

      console.log(
        `🪙 [CREATE TOKEN] Calling bonding curve contract at: ${BONDING_CURVE_ADDRESS}`
      );
      console.log(`🪙 [CREATE TOKEN] Contract args:`, contractArgs);

      // Execute the contract call
      const transactionHash = await writeContractWithAccount({
        address: BONDING_CURVE_ADDRESS as `0x${string}`,
        abi: BondingCurveAbi,
        functionName: "createToken",
        args: contractArgs,
        account: {
          address: user.walletAddress,
          privateKey: user.privateKey,
        },
      });

      console.log(
        `🪙 [CREATE TOKEN] ✅ Token creation transaction sent: ${transactionHash}`
      );

      // TODO: Extract token address from transaction receipt
      // For now, we'll return the transaction hash and let the frontend handle it
      return {
        transactionHash,
        success: true,
      };
    } catch (error) {
      console.error(`🪙 [CREATE TOKEN] ❌ Error creating token:`, error);

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
   * Validate token creation parameters
   */
  private static validateParams(params: CreateTokenParams): void {
    const errors: string[] = [];

    // Validate required string fields
    if (!params.name || params.name.trim().length === 0) {
      errors.push("Token name is required");
    }
    if (params.name && params.name.length > 50) {
      errors.push("Token name must be 50 characters or less");
    }

    if (!params.symbol || params.symbol.trim().length === 0) {
      errors.push("Token symbol is required");
    }
    if (params.symbol && params.symbol.length > 10) {
      errors.push("Token symbol must be 10 characters or less");
    }

    if (!params.description || params.description.trim().length === 0) {
      errors.push("Token description is required");
    }
    if (params.description && params.description.length > 500) {
      errors.push("Token description must be 500 characters or less");
    }

    // Validate optional URL fields (if provided, must be valid URLs)
    const urlFields = [
      { field: params.image, name: "image URL" },
      { field: params.website, name: "website URL" },
      { field: params.twitter, name: "twitter URL" },
      { field: params.telegram, name: "telegram URL" },
      { field: params.discord, name: "discord URL" },
    ];

    urlFields.forEach(({ field, name }) => {
      if (field && field.trim().length > 0) {
        try {
          new URL(field);
        } catch {
          errors.push(`${name} must be a valid URL`);
        }
      }
    });

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(", ")}`);
    }
  }
}
