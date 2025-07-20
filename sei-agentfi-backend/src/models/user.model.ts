import mongoose, { Schema, Document } from "mongoose";

export interface IUserData {
  email: string;
  walletAddress: string;
  privateKey: string;
}

export interface IUser extends IUserData, Document {
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    walletAddress: { type: String, required: true, unique: true, index: true },
    privateKey: { type: String, required: true },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

export const User = mongoose.model<IUser>("User", userSchema);

export class UserModel {
  // Create a new user
  static async create(userData: IUserData): Promise<IUser> {
    const user = new User(userData);
    return await user.save();
  }

  // Find user by email
  static async findByEmail(email: string): Promise<IUser | null> {
    return await User.findOne({ email });
  }

  // Find user by wallet address
  static async findByWalletAddress(
    walletAddress: string
  ): Promise<IUser | null> {
    return await User.findOne({ walletAddress });
  }

  // Update user
  static async update(
    email: string,
    updateData: Partial<IUserData>
  ): Promise<IUser | null> {
    return await User.findOneAndUpdate(
      { email },
      { $set: updateData },
      { new: true, runValidators: true }
    );
  }

  // Get all users (for admin purposes)
  static async findAll(): Promise<IUser[]> {
    return await User.find({}).sort({ createdAt: -1 });
  }

  // Delete user
  static async deleteByEmail(email: string): Promise<boolean> {
    const result = await User.deleteOne({ email });
    return result.deletedCount > 0;
  }
}
