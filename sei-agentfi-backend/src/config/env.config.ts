import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export const RESEND_API_KEY = process.env.RESEND_API_KEY;
export const MONGODB_URL = process.env.MONGODB_URL;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
export const USDT_ADDRESS = process.env.USDT_ADDRESS;
export const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
export const BONDING_CURVE_ADDRESS = process.env.BONDING_CURVE_ADDRESS;

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

if (!OPENAI_API_KEY) {
  throw new Error(
    "OPENAI_API_KEY is required but not found in environment variables"
  );
}

if (!USDT_ADDRESS) {
  throw new Error(
    "USDT_ADDRESS is required but not found in environment variables"
  );
}

if (!ADMIN_PRIVATE_KEY) {
  throw new Error(
    "ADMIN_PRIVATE_KEY is required but not found in environment variables"
  );
}

if (!BONDING_CURVE_ADDRESS) {
  throw new Error(
    "BONDING_CURVE_ADDRESS is required but not found in environment variables"
  );
}

export const config = {
  RESEND_API_KEY,
  MONGODB_URL,
  OPENAI_API_KEY,
  JWT_SECRET,
  USDT_ADDRESS,
  ADMIN_PRIVATE_KEY,
  BONDING_CURVE_ADDRESS,
} as const;
