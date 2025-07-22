import { Hono } from "hono";
import { cors } from "hono/cors";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
  MarketMakerService,
  type MarketMakerConfig,
} from "../infrastructure/market-maker.service/";
import { MarketMakerModel } from "../models/market-maker.model";
import { connectToMongoDB } from "../config/database.config";

const marketMaker = new Hono();

// Enable CORS for frontend communication
marketMaker.use(
  "/*",
  cors({
    origin: "*", // Allow all origins
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// POST /market-maker/create - Create a new market maker bot
marketMaker.post("/create", verifyJWT, async (c: any) => {
  const requestId = `mm-create-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const userEmail = c.get("userEmail") as string;
    console.log(
      `[${requestId}] Market maker bot creation request from user: ${userEmail}`
    );

    // Ensure database connection
    await connectToMongoDB();

    // Parse request body
    const body = await c.req.json();
    console.log(`[${requestId}] Request body:`, {
      tokenAddress: body.tokenAddress,
      targetGrowthPerHour: body.targetGrowthPerHour,
      budget: body.budget,
    });

    // Validate required fields
    const requiredFields = ["tokenAddress", "targetGrowthPerHour", "budget"];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      console.log(
        `[${requestId}] Validation failed: missing fields - ${missingFields.join(
          ", "
        )}`
      );
      return c.json(
        {
          success: false,
          error: `Missing required fields: ${missingFields.join(", ")}`,
        },
        400
      );
    }

    // Prepare bot configuration (optimal parameters calculated automatically)
    const config: MarketMakerConfig = {
      tokenAddress: body.tokenAddress.trim(),
      targetGrowthPerHour: parseFloat(body.targetGrowthPerHour),
      budget: body.budget.trim(),
    };

    console.log(`[${requestId}] Creating market maker bot...`);

    // Create bot
    const bot = await MarketMakerService.createBot(userEmail, config);

    console.log(
      `[${requestId}] Bot created successfully: ${(bot._id as any).toString()}`
    );

    return c.json({
      success: true,
      data: {
        botId: (bot._id as any).toString(),
        tokenAddress: bot.tokenAddress,
        targetGrowthPerHour: bot.targetGrowthPerHour,
        budget: bot.budget,
        isActive: bot.isActive,
        createdAt: bot.createdAt,
      },
      message: "Market maker bot created successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[${requestId}] Error creating bot:`, error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return c.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// POST /market-maker/start - Start a market maker bot
marketMaker.post("/start", verifyJWT, async (c: any) => {
  const requestId = `mm-start-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const userEmail = c.get("userEmail") as string;
    console.log(
      `[${requestId}] Market maker bot start request from user: ${userEmail}`
    );

    // Ensure database connection
    await connectToMongoDB();

    // Parse request body
    const body = await c.req.json();
    const tokenAddress = body.tokenAddress?.trim();

    if (!tokenAddress) {
      return c.json(
        {
          success: false,
          error: "Token address is required",
        },
        400
      );
    }

    console.log(`[${requestId}] Starting bot for token: ${tokenAddress}`);

    // Start bot
    await MarketMakerService.startBot(userEmail, tokenAddress);

    console.log(`[${requestId}] Bot started successfully`);

    return c.json({
      success: true,
      message: "Market maker bot started successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[${requestId}] Error starting bot:`, error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return c.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// POST /market-maker/stop - Stop a market maker bot
marketMaker.post("/stop", verifyJWT, async (c: any) => {
  const requestId = `mm-stop-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const userEmail = c.get("userEmail") as string;
    console.log(
      `[${requestId}] Market maker bot stop request from user: ${userEmail}`
    );

    // Ensure database connection
    await connectToMongoDB();

    // Parse request body
    const body = await c.req.json();
    const tokenAddress = body.tokenAddress?.trim();

    if (!tokenAddress) {
      return c.json(
        {
          success: false,
          error: "Token address is required",
        },
        400
      );
    }

    console.log(`[${requestId}] Stopping bot for token: ${tokenAddress}`);

    // Stop bot
    await MarketMakerService.stopBot(userEmail, tokenAddress);

    console.log(`[${requestId}] Bot stopped successfully`);

    return c.json({
      success: true,
      message: "Market maker bot stopped successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[${requestId}] Error stopping bot:`, error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return c.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// GET /market-maker/status/:tokenAddress - Get bot status
marketMaker.get("/status/:tokenAddress", verifyJWT, async (c: any) => {
  const requestId = `mm-status-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const userEmail = c.get("userEmail") as string;
    const tokenAddress = c.req.param("tokenAddress");

    console.log(
      `[${requestId}] Market maker bot status request from user: ${userEmail}, token: ${tokenAddress}`
    );

    // Ensure database connection
    await connectToMongoDB();

    if (!tokenAddress) {
      return c.json(
        {
          success: false,
          error: "Token address is required",
        },
        400
      );
    }

    // Get bot status
    const status = await MarketMakerService.getBotStatus(
      userEmail,
      tokenAddress
    );

    if (!status) {
      return c.json(
        {
          success: false,
          error: "Bot not found",
          data: null,
        },
        404
      );
    }

    console.log(`[${requestId}] Bot status retrieved successfully`);

    return c.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[${requestId}] Error getting bot status:`, error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return c.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// GET /market-maker/bots - Get all user's bots
marketMaker.get("/bots", verifyJWT, async (c: any) => {
  const requestId = `mm-bots-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const userEmail = c.get("userEmail") as string;
    console.log(
      `[${requestId}] Market maker bots list request from user: ${userEmail}`
    );

    // Ensure database connection
    await connectToMongoDB();

    // Get all user's bots
    const bots = await MarketMakerModel.findUserBots(userEmail);

    console.log(`[${requestId}] Found ${bots.length} bots for user`);

    const formattedBots = bots.map((bot) => ({
      botId: (bot._id as any).toString(),
      tokenAddress: bot.tokenAddress,
      targetGrowthPerHour: bot.targetGrowthPerHour,
      budget: bot.budget,
      isActive: bot.isActive,
      totalTrades: bot.totalTrades,
      totalBuyVolume: bot.totalBuyVolume,
      totalSellVolume: bot.totalSellVolume,
      currentUsdtBalance: bot.currentUsdtBalance,
      currentTokenBalance: bot.currentTokenBalance,
      lastTradeAt: bot.lastTradeAt,
      nextTradeAt: bot.nextTradeAt,
      createdAt: bot.createdAt,
      updatedAt: bot.updatedAt,
    }));

    return c.json({
      success: true,
      data: formattedBots,
      count: formattedBots.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[${requestId}] Error getting user bots:`, error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return c.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// GET /market-maker/logs/:tokenAddress - Get bot trading logs
marketMaker.get("/logs/:tokenAddress", verifyJWT, async (c: any) => {
  const requestId = `mm-logs-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const userEmail = c.get("userEmail") as string;
    const tokenAddress = c.req.param("tokenAddress");
    const limit = parseInt(c.req.query("limit") || "100");

    console.log(
      `[${requestId}] Market maker bot logs request from user: ${userEmail}, token: ${tokenAddress}, limit: ${limit}`
    );

    // Ensure database connection
    await connectToMongoDB();

    if (!tokenAddress) {
      return c.json(
        {
          success: false,
          error: "Token address is required",
        },
        400
      );
    }

    // Get bot logs
    const logs = await MarketMakerModel.getUserLogs(
      userEmail,
      tokenAddress,
      limit
    );

    console.log(`[${requestId}] Found ${logs.length} logs for bot`);

    const formattedLogs = logs.map((log) => ({
      action: log.action,
      amount: log.amount,
      priceBefore: log.priceBefore,
      priceAfter: log.priceAfter,
      transactionHash: log.transactionHash,
      success: log.success,
      errorMessage: log.errorMessage,
      timestamp: log.timestamp,
      nextTradeScheduledAt: log.nextTradeScheduledAt,
      metadata: log.metadata,
    }));

    return c.json({
      success: true,
      data: formattedLogs,
      count: formattedLogs.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[${requestId}] Error getting bot logs:`, error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return c.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// DELETE /market-maker/:tokenAddress - Delete a market maker bot
marketMaker.delete("/:tokenAddress", verifyJWT, async (c: any) => {
  const requestId = `mm-delete-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const userEmail = c.get("userEmail") as string;
    const tokenAddress = c.req.param("tokenAddress");

    console.log(
      `[${requestId}] Market maker bot delete request from user: ${userEmail}, token: ${tokenAddress}`
    );

    // Ensure database connection
    await connectToMongoDB();

    if (!tokenAddress) {
      return c.json(
        {
          success: false,
          error: "Token address is required",
        },
        400
      );
    }

    // Delete bot (includes stopping and refunding all funds)
    await MarketMakerService.deleteBot(userEmail, tokenAddress);

    console.log(`[${requestId}] Bot deleted successfully with funds refunded`);

    return c.json({
      success: true,
      message:
        "Market maker bot deleted successfully. All funds have been returned to your wallet.",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[${requestId}] Error deleting bot:`, error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return c.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

export default marketMaker;
