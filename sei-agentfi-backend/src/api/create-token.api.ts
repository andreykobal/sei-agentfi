import { Hono } from "hono";
import { cors } from "hono/cors";
import { verifyJWT } from "../middleware/auth.middleware";
import {
  CreateTokenCommand,
  type CreateTokenParams,
} from "../commands/create-token.command";

const createToken = new Hono();

// Enable CORS for frontend communication
createToken.use(
  "/*",
  cors({
    origin: "*", // Allow all origins
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// POST /create-token - Create a new token using the bonding curve contract
createToken.post("/", verifyJWT, async (c: any) => {
  const requestId = `create-token-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const userEmail = c.get("userEmail") as string;
    console.log(
      `[${requestId}] Token creation request received from user: ${userEmail}`
    );

    // Parse request body
    const body = await c.req.json();
    console.log(`[${requestId}] Request body:`, {
      name: body.name,
      symbol: body.symbol,
      initialSupply: body.initialSupply,
      description: body.description?.substring(0, 100) + "...",
      hasImage: !!body.image,
      hasWebsite: !!body.website,
      hasTwitter: !!body.twitter,
      hasTelegram: !!body.telegram,
      hasDiscord: !!body.discord,
    });

    // Validate required fields
    const requiredFields = ["name", "symbol", "description"];
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

    // Prepare token creation parameters
    const tokenParams: CreateTokenParams = {
      name: body.name.trim(),
      symbol: body.symbol.trim().toUpperCase(),
      initialSupply: body.initialSupply?.toString() || "0", // Default to 0 for bonding curve tokens
      description: body.description.trim(),
      image: body.image?.trim() || "",
      website: body.website?.trim() || "",
      twitter: body.twitter?.trim() || "",
      telegram: body.telegram?.trim() || "",
      discord: body.discord?.trim() || "",
    };

    console.log(`[${requestId}] Executing token creation command...`);

    // Execute token creation command
    const result = await CreateTokenCommand.execute(userEmail, tokenParams);

    if (result.success) {
      console.log(`[${requestId}] ✅ Token creation successful`);
      console.log(`[${requestId}] Transaction hash: ${result.transactionHash}`);

      return c.json({
        success: true,
        data: {
          transactionHash: result.transactionHash,
          tokenAddress: result.tokenAddress,
          message: "Token creation transaction submitted successfully",
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      console.log(`[${requestId}] ❌ Token creation failed: ${result.error}`);

      return c.json(
        {
          success: false,
          error: result.error || "Token creation failed",
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  } catch (error) {
    console.error(
      `[${requestId}] ❌ Unexpected error in token creation:`,
      error
    );
    console.error(
      `[${requestId}] Error stack:`,
      error instanceof Error ? error.stack : "No stack trace"
    );

    const errorResponse = {
      success: false,
      error: "Failed to create token",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
});

// GET /create-token/status - Check if create-token service is available
createToken.get("/status", async (c) => {
  return c.json({
    success: true,
    status: "Create token service is running",
    timestamp: new Date().toISOString(),
  });
});

// GET /create-token/validate - Validate token parameters without creating
createToken.post("/validate", verifyJWT, async (c: any) => {
  try {
    const body = await c.req.json();

    // Prepare token creation parameters for validation
    const tokenParams: CreateTokenParams = {
      name: body.name?.trim() || "",
      symbol: body.symbol?.trim().toUpperCase() || "",
      initialSupply: body.initialSupply?.toString() || "0", // Default to 0 for bonding curve tokens
      description: body.description?.trim() || "",
      image: body.image?.trim() || "",
      website: body.website?.trim() || "",
      twitter: body.twitter?.trim() || "",
      telegram: body.telegram?.trim() || "",
      discord: body.discord?.trim() || "",
    };

    // This will throw an error if validation fails
    CreateTokenCommand["validateParams"](tokenParams);

    return c.json({
      success: true,
      message: "Token parameters are valid",
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

export default createToken;
