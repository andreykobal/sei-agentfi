import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { client, graphql } from "ponder";
import { connectToMongoDB } from "../config/database";
import { UserModel } from "../models/user.model";
import auth from "./auth";

const app = new Hono();

// Initialize MongoDB connection and indexes on startup
async function initializeDatabase() {
  try {
    await connectToMongoDB();
    await UserModel.createIndexes();
    console.log("Database initialized successfully with indexes");
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
}

initializeDatabase().catch(console.error);

// Mount auth routes
app.route("/auth", auth);

app.use("/sql/*", client({ db, schema }));

app.use("/", graphql({ db, schema }));
app.use("/graphql", graphql({ db, schema }));

export default app;
