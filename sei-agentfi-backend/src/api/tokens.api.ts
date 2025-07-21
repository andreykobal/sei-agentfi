import { Hono } from "hono";
import { TokenProjection } from "../read/token.projection";
import { ChartService } from "../services/chart.service";
import { WalletService } from "../services/wallet.service";
import { User } from "../models/user.model";

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
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const email = authHeader.replace("Bearer ", "");
        const user = await User.findOne({ email });
        if (user && user.walletAddress) {
          userTokenBalance = await WalletService.getTokenBalance(
            user.walletAddress as `0x${string}`,
            address as `0x${string}`
          );
        }
      }
    } catch (balanceError) {
      console.log("Could not fetch user token balance:", balanceError);
      // Continue without balance - user might not be authenticated
    }

    return c.json({
      success: true,
      data: {
        ...token,
        userTokenBalance,
      },
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
    const days = parseInt(c.req.query("days") || "7");

    // Validate days parameter
    if (days < 1 || days > 30) {
      return c.json(
        {
          success: false,
          error: "Days parameter must be between 1 and 30",
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
