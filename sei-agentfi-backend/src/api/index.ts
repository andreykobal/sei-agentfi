import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { client, graphql } from "ponder";
import { connectToMongoDB } from "../config/database";
import auth from "./auth";
import tokens from "./tokens.api";

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

app.use("/sql/*", client({ db, schema }));

app.use("/", graphql({ db, schema }));
app.use("/graphql", graphql({ db, schema }));

export default app;
