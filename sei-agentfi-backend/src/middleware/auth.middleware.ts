import * as jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.config";

// JWT verification middleware
export const verifyJWT = async (c: any, next: any) => {
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
