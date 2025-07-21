import mongoose from "mongoose";
import { MONGODB_URL } from "./env.config";

let isConnected = false;

export async function connectToMongoDB(): Promise<void> {
  try {
    if (isConnected) {
      console.log("MongoDB already connected");
      return;
    }

    if (!MONGODB_URL) {
      throw new Error("MONGODB_URL is not defined");
    }

    console.log("Connecting to MongoDB with Mongoose...");

    await mongoose.connect(MONGODB_URL);

    isConnected = true;
    console.log("Successfully connected to MongoDB with Mongoose");

    // Clean up collections on startup
    try {
      const { TokenProjection } = await import(
        "../projections/token.projection"
      );
      await TokenProjection.cleanupCollections();
    } catch (cleanupError) {
      console.error("Failed to cleanup collections:", cleanupError);
      // Don't throw here, just log the error
    }
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

export async function disconnectFromMongoDB(): Promise<void> {
  try {
    if (isConnected) {
      await mongoose.disconnect();
      isConnected = false;
      console.log("Disconnected from MongoDB");
    }
  } catch (error) {
    console.error("Error disconnecting from MongoDB:", error);
    throw error;
  }
}

export function isMongoConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Received SIGINT, closing MongoDB connection...");
  await disconnectFromMongoDB();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM, closing MongoDB connection...");
  await disconnectFromMongoDB();
  process.exit(0);
});
