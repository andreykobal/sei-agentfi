import { Hono } from "hono";
import { TokenProjection } from "../projections/token.projection";
import { ChartService } from "../infrastructure/chart.service";
import { WalletService } from "../infrastructure/wallet.service";
import { User } from "../models/user.model";
import { verifyJWT } from "../middlewares/auth.middleware";
import * as jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.config";

const tokens = new Hono();

// GET /tokens - Get all tokens
tokens.get("/", async (c) => {
  try {
    const allTokens = await TokenProjection.getAllTokens();

    return c.json({
      success: true,
      data: allTokens,
      count: allTokens.length,
      message: "Tokens retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching tokens:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch tokens",
        data: [],
      },
      500
    );
  }
});

// GET /tokens/recent?limit=10 - Get recent tokens
tokens.get("/recent", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "10");
    const recentTokens = await TokenProjection.getRecentTokens(limit);

    return c.json({
      success: true,
      data: recentTokens,
      count: recentTokens.length,
      message: `${limit} most recent tokens retrieved successfully`,
    });
  } catch (error) {
    console.error("Error fetching recent tokens:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch recent tokens",
        data: [],
      },
      500
    );
  }
});

// GET /tokens/address/:address - Get token by address
tokens.get("/address/:address", async (c) => {
  try {
    const address = c.req.param("address");
    const token = await TokenProjection.getTokenByAddress(address);

    if (!token) {
      return c.json(
        {
          success: false,
          error: "Token not found",
          data: null,
        },
        404
      );
    }

    // Try to get user's token balance if authenticated
    let userTokenBalance = "0";
    try {
      const authHeader = c.req.header("Authorization");
      console.log(
        "🔍 [TokensAPI] Auth header:",
        authHeader ? "Present" : "Missing"
      );

      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "");
        console.log("🔍 [TokensAPI] Extracted JWT token");

        // Decode the JWT token to get the email
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          const email = decoded.email;

          console.log("🔍 [TokensAPI] Decoded email from JWT:", email);

          if (!email) {
            console.log("⚠️ [TokensAPI] No email found in JWT payload");
          } else {
            const user = await User.findOne({ email });
            console.log(
              "🔍 [TokensAPI] User found:",
              user
                ? {
                    email: user.email,
                    walletAddress: user.walletAddress,
                    hasWallet: !!user.walletAddress,
                  }
                : "No user found"
            );

            if (user && user.walletAddress) {
              console.log("🔍 [TokensAPI] Fetching token balance for:", {
                userWallet: user.walletAddress,
                tokenAddress: address,
              });

              userTokenBalance = await WalletService.getTokenBalance(
                user.walletAddress as `0x${string}`,
                address as `0x${string}`
              );

              console.log(
                "✅ [TokensAPI] User token balance retrieved:",
                userTokenBalance
              );
            } else {
              console.log("⚠️ [TokensAPI] User not found or no wallet address");
            }
          }
        } catch (jwtError) {
          console.error("❌ [TokensAPI] JWT decode error:", jwtError);
        }
      } else {
        console.log("⚠️ [TokensAPI] No valid auth header");
      }
    } catch (balanceError) {
      console.error(
        "❌ [TokensAPI] Could not fetch user token balance:",
        balanceError
      );
      // Continue without balance - user might not be authenticated
    }

    // Get recent transactions for this token
    const recentTransactions = await TokenProjection.getRecentTransactions(
      address,
      100
    );

    const responseData = {
      ...token,
      userTokenBalance,
      recentTransactions,
    };

    console.log("📤 [TokensAPI] Returning token data:", {
      tokenAddress: address,
      tokenName: token.name,
      tokenSymbol: token.symbol,
      userTokenBalance,
      price: token.price,
      totalUsdtRaised: token.totalUsdtRaised,
      transactionsCount: recentTransactions.length,
    });

    return c.json({
      success: true,
      data: responseData,
      message: "Token retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching token by address:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch token",
        data: null,
      },
      500
    );
  }
});

// GET /tokens/creator/:creator - Get tokens by creator
tokens.get("/creator/:creator", async (c) => {
  try {
    const creator = c.req.param("creator");
    const creatorTokens = await TokenProjection.getTokensByCreator(creator);

    return c.json({
      success: true,
      data: creatorTokens,
      count: creatorTokens.length,
      message: "Creator tokens retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching tokens by creator:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch creator tokens",
        data: [],
      },
      500
    );
  }
});

// GET /tokens/chart/:address - Get chart data for token
tokens.get("/chart/:address", async (c) => {
  try {
    const address = c.req.param("address");
    const days = parseInt(c.req.query("days") || "0"); // 0 means all historical data

    // Validate days parameter - allow 0 for full history, or any positive number
    if (days < 0) {
      return c.json(
        {
          success: false,
          error: "Days parameter must be 0 (for all data) or a positive number",
          data: null,
        },
        400
      );
    }

    const chartData = await ChartService.getTokenChartData(address, days);

    return c.json({
      success: true,
      data: chartData,
      message: "Chart data retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching chart data:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch chart data",
        data: null,
      },
      500
    );
  }
});

export default tokens;
