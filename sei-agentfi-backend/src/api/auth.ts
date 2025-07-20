import { Hono } from "hono";
import { cors } from "hono/cors";
import * as jwt from "jsonwebtoken";
import { Resend } from "resend";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { RESEND_API_KEY, JWT_SECRET } from "../config/env.config";
import { connectToMongoDB } from "../config/database";
import { UserModel, IUserData, User } from "../models/user.model";

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
      from: "Sei AgentFi <noreply@avaethernity.top>", // Add sender name
      to: email,
      subject: "Your Sign-In Link for Sei AgentFi",
      // Add proper headers for better deliverability
      headers: {
        "Reply-To": "support@avaethernity.top",
        "X-Entity-Ref-ID": `magic-link-${Date.now()}`,
      },
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Sign in to Sei AgentFi</title>
        </head>
        <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); overflow: hidden;">
            <div style="background-color: #1f2937; padding: 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Sei AgentFi</h1>
            </div>
            <div style="padding: 32px 24px;">
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; font-weight: 600;">Sign in to your account</h2>
              <p style="color: #4b5563; margin: 0 0 24px 0; line-height: 1.5;">
                You requested to sign in to Sei AgentFi. Click the button below to access your account securely.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${magicLink}" 
                   style="display: inline-block; 
                          padding: 16px 32px; 
                          background-color: #3b82f6; 
                          color: #ffffff; 
                          text-decoration: none; 
                          border-radius: 6px; 
                          font-weight: 600;
                          font-size: 16px;
                          border: none;
                          cursor: pointer;">
                  Sign In to Sei AgentFi
                </a>
              </div>
              <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 32px;">
                <p style="color: #6b7280; margin: 0 0 12px 0; font-size: 14px; line-height: 1.4;">
                  This link will expire in 15 minutes for your security.
                </p>
                <p style="color: #6b7280; margin: 0 0 12px 0; font-size: 14px; line-height: 1.4;">
                  If you didn't request this sign-in link, you can safely ignore this email.
                </p>
                <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.4;">
                  If the button doesn't work, copy and paste this link into your browser:<br>
                  <span style="word-break: break-all; color: #3b82f6;">${magicLink}</span>
                </p>
              </div>
            </div>
            <div style="background-color: #f9fafb; padding: 16px 24px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} Sei AgentFi. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Sign in to Sei AgentFi
      
You requested to sign in to your Sei AgentFi account.

Click this link to sign in: ${magicLink}

This link will expire in 15 minutes for your security.

If you didn't request this sign-in link, you can safely ignore this email.

---
© ${new Date().getFullYear()} Sei AgentFi. All rights reserved.`,
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

    // Connect to database
    await connectToMongoDB();

    // Check if user exists
    let user = await UserModel.findByEmail(payload.email);

    if (!user) {
      // Generate new wallet for the user
      const privateKey = generatePrivateKey();
      const account = privateKeyToAccount(privateKey);

      // Create new user with wallet
      user = await UserModel.create({
        email: payload.email,
        walletAddress: account.address,
        privateKey: privateKey,
      });

      console.log(
        `Created new user: ${payload.email} with wallet: ${account.address}`
      );
    } else {
      console.log(
        `User ${payload.email} already exists with wallet: ${user.walletAddress}`
      );
    }

    return c.json({
      success: true,
      email: payload.email,
      walletAddress: user.walletAddress,
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

    // Connect to database and get user info
    await connectToMongoDB();
    const user = await UserModel.findByEmail(payload.email);

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json({
      email: payload.email,
      walletAddress: user.walletAddress,
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
