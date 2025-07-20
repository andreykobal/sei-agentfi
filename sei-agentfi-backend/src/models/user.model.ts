import { MongoClient, Db, Collection } from "mongodb";
import { getClient } from "../config/database";

export interface User {
  _id?: string;
  email: string;
  walletAddress: string;
  privateKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UserModel {
  private static DB_NAME = "seiagentfi";
  private static COLLECTION_NAME = "users";

  private static getCollection(): Collection<User> {
    const client = getClient();
    const db: Db = client.db(this.DB_NAME);
    return db.collection<User>(this.COLLECTION_NAME);
  }

  // Create a new user
  static async create(
    userData: Omit<User, "_id" | "createdAt" | "updatedAt">
  ): Promise<User> {
    const collection = this.getCollection();

    const user: Omit<User, "_id"> = {
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(user);

    return {
      _id: result.insertedId.toString(),
      ...user,
    };
  }

  // Find user by email
  static async findByEmail(email: string): Promise<User | null> {
    const collection = this.getCollection();
    const user = await collection.findOne({ email });

    if (user) {
      return {
        ...user,
        _id: user._id?.toString(),
      };
    }

    return null;
  }

  // Find user by wallet address
  static async findByWalletAddress(
    walletAddress: string
  ): Promise<User | null> {
    const collection = this.getCollection();
    const user = await collection.findOne({ walletAddress });

    if (user) {
      return {
        ...user,
        _id: user._id?.toString(),
      };
    }

    return null;
  }

  // Update user
  static async update(
    email: string,
    updateData: Partial<Omit<User, "_id" | "email" | "createdAt">>
  ): Promise<User | null> {
    const collection = this.getCollection();

    const result = await collection.findOneAndUpdate(
      { email },
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (result) {
      return {
        ...result,
        _id: result._id?.toString(),
      };
    }

    return null;
  }

  // Create index on email for faster lookups
  static async createIndexes(): Promise<void> {
    const collection = this.getCollection();

    await collection.createIndex({ email: 1 }, { unique: true });
    await collection.createIndex({ walletAddress: 1 }, { unique: true });
  }
}
