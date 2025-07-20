import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { client, graphql } from "ponder";
import { connectToMongoDB } from "../config/database";
import auth from "./auth";

const app = new Hono();

// Initialize MongoDB connection on startup
connectToMongoDB().catch(console.error);

// Mount auth routes
app.route("/auth", auth);

app.use("/sql/*", client({ db, schema }));

app.use("/", graphql({ db, schema }));
app.use("/graphql", graphql({ db, schema }));

export default app;
