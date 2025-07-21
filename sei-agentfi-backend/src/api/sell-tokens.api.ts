import { Hono } from "hono";
import { cors } from "hono/cors";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
  SellTokensCommand,
  type SellTokensParams,
} from "../application/sell-tokens.command";

const sellTokens = new Hono();

// Enable CORS for frontend communication
sellTokens.use(
  "/*",
  cors({
    origin: "*", // Allow all origins
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// POST /sell-tokens - Sell tokens using the bonding curve contract
sellTokens.post("/", verifyJWT, async (c: any) => {
  const requestId = `sell-tokens-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const userEmail = c.get("userEmail") as string;
    console.log(
      `[${requestId}] Token sale request received from user: ${userEmail}`
    );

    // Parse request body
    const body = await c.req.json();
    console.log(`[${requestId}] Request body:`, {
      tokenAddress: body.tokenAddress,
      tokenAmount: body.tokenAmount,
    });

    // Validate required fields
    const requiredFields = ["tokenAddress", "tokenAmount"];
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

    // Prepare sell tokens parameters
    const sellParams: SellTokensParams = {
      tokenAddress: body.tokenAddress.trim(),
      tokenAmount: body.tokenAmount.trim(),
    };

    console.log(`[${requestId}] Executing sell tokens command...`);

    // Execute sell tokens command
    const result = await SellTokensCommand.execute(userEmail, sellParams);

    if (result.success) {
      console.log(`[${requestId}] ✅ Token sale successful`);
      console.log(`[${requestId}] Transaction hash: ${result.transactionHash}`);

      return c.json({
        success: true,
        data: {
          transactionHash: result.transactionHash,
          message: "Token sale transaction submitted successfully",
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      console.log(`[${requestId}] ❌ Token sale failed: ${result.error}`);

      return c.json(
        {
          success: false,
          error: result.error || "Token sale failed",
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  } catch (error) {
    console.error(`[${requestId}] ❌ Unexpected error in token sale:`, error);
    console.error(
      `[${requestId}] Error stack:`,
      error instanceof Error ? error.stack : "No stack trace"
    );

    const errorResponse = {
      success: false,
      error: "Failed to sell tokens",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
});

// GET /sell-tokens/status - Check if sell-tokens service is available
sellTokens.get("/status", async (c) => {
  return c.json({
    success: true,
    status: "Sell tokens service is running",
    timestamp: new Date().toISOString(),
  });
});

// POST /sell-tokens/validate - Validate sell tokens parameters without executing
sellTokens.post("/validate", verifyJWT, async (c: any) => {
  try {
    const body = await c.req.json();

    // Prepare sell tokens parameters for validation
    const sellParams: SellTokensParams = {
      tokenAddress: body.tokenAddress?.trim() || "",
      tokenAmount: body.tokenAmount?.trim() || "",
    };

    // This will throw an error if validation fails
    SellTokensCommand["validateParams"](sellParams);

    return c.json({
      success: true,
      message: "Sell tokens parameters are valid",
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

export default sellTokens;
