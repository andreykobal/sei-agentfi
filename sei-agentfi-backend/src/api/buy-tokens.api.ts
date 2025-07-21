import { Hono } from "hono";
import { cors } from "hono/cors";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
  BuyTokensCommand,
  type BuyTokensParams,
} from "../application/buy-tokens.command";

const buyTokens = new Hono();

// Enable CORS for frontend communication
buyTokens.use(
  "/*",
  cors({
    origin: "*", // Allow all origins
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// POST /buy-tokens - Buy tokens using the bonding curve contract
buyTokens.post("/", verifyJWT, async (c: any) => {
  const requestId = `buy-tokens-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const userEmail = c.get("userEmail") as string;
    console.log(
      `[${requestId}] Token purchase request received from user: ${userEmail}`
    );

    // Parse request body
    const body = await c.req.json();
    console.log(`[${requestId}] Request body:`, {
      tokenAddress: body.tokenAddress,
      usdtAmount: body.usdtAmount,
    });

    // Validate required fields
    const requiredFields = ["tokenAddress", "usdtAmount"];
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

    // Prepare buy tokens parameters
    const buyParams: BuyTokensParams = {
      tokenAddress: body.tokenAddress.trim(),
      usdtAmount: body.usdtAmount.trim(),
    };

    console.log(`[${requestId}] Executing buy tokens command...`);

    // Execute buy tokens command
    const result = await BuyTokensCommand.execute(userEmail, buyParams);

    if (result.success) {
      console.log(`[${requestId}] ✅ Token purchase successful`);
      console.log(`[${requestId}] Transaction hash: ${result.transactionHash}`);

      return c.json({
        success: true,
        data: {
          transactionHash: result.transactionHash,
          message: "Token purchase transaction submitted successfully",
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      console.log(`[${requestId}] ❌ Token purchase failed: ${result.error}`);

      return c.json(
        {
          success: false,
          error: result.error || "Token purchase failed",
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  } catch (error) {
    console.error(
      `[${requestId}] ❌ Unexpected error in token purchase:`,
      error
    );
    console.error(
      `[${requestId}] Error stack:`,
      error instanceof Error ? error.stack : "No stack trace"
    );

    const errorResponse = {
      success: false,
      error: "Failed to purchase tokens",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
});

// GET /buy-tokens/status - Check if buy-tokens service is available
buyTokens.get("/status", async (c) => {
  return c.json({
    success: true,
    status: "Buy tokens service is running",
    timestamp: new Date().toISOString(),
  });
});

// POST /buy-tokens/validate - Validate buy tokens parameters without executing
buyTokens.post("/validate", verifyJWT, async (c: any) => {
  try {
    const body = await c.req.json();

    // Prepare buy tokens parameters for validation
    const buyParams: BuyTokensParams = {
      tokenAddress: body.tokenAddress?.trim() || "",
      usdtAmount: body.usdtAmount?.trim() || "",
    };

    // This will throw an error if validation fails
    BuyTokensCommand["validateParams"](buyParams);

    return c.json({
      success: true,
      message: "Buy tokens parameters are valid",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Validation failed",
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

export default buyTokens;
