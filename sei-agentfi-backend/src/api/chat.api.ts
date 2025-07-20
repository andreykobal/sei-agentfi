import { Hono } from "hono";
import { cors } from "hono/cors";
import * as jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.config";
import { openAIService } from "../services/openai.service";

const chat = new Hono();

// Enable CORS for frontend communication
chat.use(
  "/*",
  cors({
    origin: "*", // Allow all origins
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// JWT verification middleware
const verifyJWT = async (c: any, next: any) => {
  try {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json(
        { error: "Authorization header with Bearer token required" },
        401
      );
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return c.json({ error: "Token is required" }, 401);
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (
      typeof decoded === "string" ||
      !decoded ||
      typeof decoded.email !== "string"
    ) {
      return c.json({ error: "Invalid token format" }, 400);
    }

    const payload = decoded as jwt.JwtPayload & { email: string; type: string };

    if (payload.type !== "magic-link") {
      return c.json({ error: "Invalid token type" }, 400);
    }

    // Add user email to context for use in handlers
    c.set("userEmail", payload.email);
    await next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return c.json({ error: "Token has expired" }, 401);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return c.json({ error: "Invalid token" }, 401);
    }

    console.error("Error verifying JWT:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
};

// POST /chat/message - Send a message to the AI chat
chat.post("/message", verifyJWT, async (c: any) => {
  const requestId = `req-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  try {
    const userEmail = c.get("userEmail") as string;
    const { message } = await c.req.json();

    console.log(`[${requestId}] Chat request received from user: ${userEmail}`);
    console.log(
      `[${requestId}] Message content: "${message}" (type: ${typeof message}, length: ${
        message?.length || 0
      })`
    );

    if (
      !message ||
      typeof message !== "string" ||
      message.trim().length === 0
    ) {
      console.log(`[${requestId}] Validation failed: empty or invalid message`);
      return c.json({ error: "Message is required and cannot be empty" }, 400);
    }

    if (message.length > 2000) {
      console.log(
        `[${requestId}] Validation failed: message too long (${message.length} chars)`
      );
      return c.json({ error: "Message too long (max 2000 characters)" }, 400);
    }

    console.log(`[${requestId}] Calling OpenAI service...`);
    // Call OpenAI service
    const response = await openAIService.chat(
      userEmail as string,
      message.trim()
    );

    console.log(
      `[${requestId}] OpenAI service response received: "${response}" (length: ${
        response?.length || 0
      })`
    );

    const result = {
      success: true,
      response: response,
      timestamp: new Date().toISOString(),
    };

    console.log(`[${requestId}] Sending successful response to client`);
    return c.json(result);
  } catch (error) {
    console.error(`[${requestId}] Error in chat message:`, error);
    console.error(
      `[${requestId}] Error stack:`,
      error instanceof Error ? error.stack : "No stack trace"
    );

    const errorResponse = {
      success: false,
      error: "Failed to process chat message",
      details: error instanceof Error ? error.message : "Unknown error",
    };

    console.log(`[${requestId}] Sending error response:`, errorResponse);
    return c.json(errorResponse, 500);
  }
});

// GET /chat/history - Get chat history for the user
chat.get("/history", verifyJWT, async (c: any) => {
  try {
    const userEmail = c.get("userEmail") as string;
    const history = await openAIService.getChatHistory(userEmail);

    return c.json({
      success: true,
      history: history.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        ...(msg.name && { name: msg.name }),
        ...(msg.tool_calls &&
          msg.tool_calls.length > 0 && { tool_calls: msg.tool_calls }),
        ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
      })),
      count: history.length,
    });
  } catch (error) {
    console.error("Error getting chat history:", error);
    return c.json(
      {
        success: false,
        error: "Failed to get chat history",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// DELETE /chat/history - Clear chat history for the user
chat.delete("/history", verifyJWT, async (c: any) => {
  try {
    const userEmail = c.get("userEmail") as string;
    await openAIService.clearChatHistory(userEmail);

    return c.json({
      success: true,
      message: "Chat history cleared successfully",
    });
  } catch (error) {
    console.error("Error clearing chat history:", error);
    return c.json(
      {
        success: false,
        error: "Failed to clear chat history",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// POST /chat/cleanup - Clear all chat histories (useful for removing old function_call format data)
chat.post("/cleanup", async (c) => {
  try {
    await openAIService.clearAllChatHistories();

    return c.json({
      success: true,
      message: "All chat histories cleared successfully",
    });
  } catch (error) {
    console.error("Error clearing all chat histories:", error);
    return c.json(
      {
        success: false,
        error: "Failed to clear all chat histories",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// GET /chat/status - Check if chat service is available
chat.get("/status", async (c) => {
  return c.json({
    success: true,
    status: "Chat service is running",
    timestamp: new Date().toISOString(),
  });
});

export default chat;
