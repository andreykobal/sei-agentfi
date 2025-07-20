import { Hono } from "hono";
import { TokenProjection } from "../read/token.projection";

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

    return c.json({
      success: true,
      data: token,
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

export default tokens;
