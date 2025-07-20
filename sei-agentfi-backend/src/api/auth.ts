import { Hono } from "hono";
import { cors } from "hono/cors";
import * as jwt from "jsonwebtoken";
import { Resend } from "resend";
import { RESEND_API_KEY, JWT_SECRET } from "../config/env.config";

const auth = new Hono();
const resend = new Resend(RESEND_API_KEY);

// Ensure JWT_SECRET is available
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required");
}

// Enable CORS for frontend communication
auth.use(
  "/*",
  cors({
    origin: "*", // Allow all origins
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Send magic link endpoint
auth.post("/send-magic-link", async (c) => {
  try {
    const { email } = await c.req.json();

    if (!email) {
      return c.json({ error: "Email is required" }, 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ error: "Invalid email format" }, 400);
    }

    // Generate JWT token with email and expiration
    const token = jwt.sign(
      { email, type: "magic-link" },
      JWT_SECRET,
      { expiresIn: "15m" } // Token expires in 15 minutes
    );

    // Create magic link URL (update this to your frontend domain)
    const magicLink = `http://localhost:3000/?token=${token}`;

    // Send email using Resend
    const emailResult = await resend.emails.send({
      from: "noreply@avaethernity.top", // Update this to your verified domain
      to: email,
      subject: "Your Magic Link - Sei AgentFi",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Sei AgentFi</h2>
          <p>Click the link below to sign in to your account:</p>
          <a href="${magicLink}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Sign In
          </a>
          <p>This link will expire in 15 minutes.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
      text: `Welcome to Sei AgentFi! Click this link to sign in: ${magicLink}. This link expires in 15 minutes.`,
    });

    if (emailResult.error) {
      console.error("Failed to send email:", emailResult.error);
      return c.json({ error: "Failed to send email" }, 500);
    }

    return c.json({
      success: true,
      message: "Magic link sent to your email",
      emailId: emailResult.data?.id,
    });
  } catch (error) {
    console.error("Error sending magic link:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Verify magic link token endpoint
auth.post("/verify-token", async (c) => {
  try {
    const { token } = await c.req.json();

    if (!token) {
      return c.json({ error: "Token is required" }, 400);
    }

    // Verify JWT token
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

    return c.json({
      success: true,
      email: payload.email,
      message: "Authentication successful",
      token: token, // Return the token for the frontend to store in headers
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return c.json({ error: "Token has expired" }, 401);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return c.json({ error: "Invalid token" }, 401);
    }

    console.error("Error verifying token:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get user info endpoint (requires Authorization header)
auth.get("/me", async (c) => {
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

    return c.json({
      email: payload.email,
      authenticated: true,
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return c.json({ error: "Token has expired" }, 401);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return c.json({ error: "Invalid token" }, 401);
    }

    console.error("Error getting user info:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default auth;
