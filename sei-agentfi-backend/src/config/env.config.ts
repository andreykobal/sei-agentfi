import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export const RESEND_API_KEY = process.env.RESEND_API_KEY;
export const MONGODB_URL = process.env.MONGODB_URL;
export const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

// Validate that required environment variables are present
if (!RESEND_API_KEY) {
  throw new Error(
    "RESEND_API_KEY is required but not found in environment variables"
  );
}

if (!MONGODB_URL) {
  throw new Error(
    "MONGODB_URL is required but not found in environment variables"
  );
}

export const config = {
  RESEND_API_KEY,
  MONGODB_URL,
  JWT_SECRET,
} as const;
