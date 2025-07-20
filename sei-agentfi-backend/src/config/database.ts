import { MongoClient } from "mongodb";
import { MONGODB_URL } from "./env.config";

let client: MongoClient | null = null;

export async function connectToMongoDB(): Promise<MongoClient> {
  try {
    if (client) {
      console.log("MongoDB already connected");
      return client;
    }

    if (!MONGODB_URL) {
      throw new Error("MONGODB_URL is not defined");
    }

    console.log("Connecting to MongoDB...");
    client = new MongoClient(MONGODB_URL);

    await client.connect();

    console.log("Successfully connected to MongoDB");

    // Test the connection
    await client.db().admin().ping();
    console.log("MongoDB ping successful");

    return client;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

export async function disconnectFromMongoDB(): Promise<void> {
  try {
    if (client) {
      await client.close();
      client = null;
      console.log("Disconnected from MongoDB");
    }
  } catch (error) {
    console.error("Error disconnecting from MongoDB:", error);
    throw error;
  }
}

export function getClient(): MongoClient {
  if (!client) {
    throw new Error(
      "MongoDB client not connected. Call connectToMongoDB() first."
    );
  }
  return client;
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
