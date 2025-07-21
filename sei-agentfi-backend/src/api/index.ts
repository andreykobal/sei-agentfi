import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { client, graphql } from "ponder";
import { connectToMongoDB } from "../config/database.config";
import auth from "./auth.api";
import tokens from "./tokens.api";
import chat from "./chat.api";
import createToken from "./create-token.api";
import buyTokens from "./buy-tokens.api";
import sellTokens from "./sell-tokens.api";

const app = new Hono();

// Initialize MongoDB connection on startup
async function initializeDatabase() {
  try {
    await connectToMongoDB();
    console.log("Database initialized successfully with Mongoose");
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
}

initializeDatabase().catch(console.error);

// Mount auth routes
app.route("/auth", auth);

// Mount tokens routes
app.route("/tokens", tokens);

// Mount chat routes
app.route("/chat", chat);

// Mount create-token routes
app.route("/create-token", createToken);

// Mount buy-tokens routes
app.route("/buy-tokens", buyTokens);

// Mount sell-tokens routes
app.route("/sell-tokens", sellTokens);

app.use("/sql/*", client({ db, schema }));

app.use("/", graphql({ db, schema }));
app.use("/graphql", graphql({ db, schema }));

export default app;
