import mongoose, { Schema, Document } from "mongoose";

export interface IChatMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  name?: string; // For tool calls
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string; // For tool responses
  timestamp: Date;
}

export interface IChat extends Document {
  userEmail: string;
  messages: IChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    role: {
      type: String,
      required: true,
      enum: ["user", "assistant", "tool"],
    },
    content: {
      type: String,
      required: true,
      minlength: [1, "Content cannot be empty"],
    },
    name: { type: String, required: false },
    tool_calls: [
      {
        id: { type: String, required: false },
        type: { type: String, required: false },
        function: {
          name: { type: String, required: false },
          arguments: { type: String, required: false },
        },
      },
    ],
    tool_call_id: { type: String, required: false },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const chatSchema = new Schema<IChat>(
  {
    userEmail: { type: String, required: true, index: true, unique: true },
    messages: [chatMessageSchema],
  },
  {
    timestamps: true,
  }
);

// Static methods
chatSchema.statics.findByUserEmail = function (email: string) {
  return this.findOne({ userEmail: email });
};

chatSchema.statics.createOrUpdateChat = async function (
  email: string,
  message: IChatMessage
) {
  const chat = await this.findOneAndUpdate(
    { userEmail: email },
    {
      $push: { messages: message },
      $setOnInsert: { userEmail: email },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
    }
  );
  return chat;
};

chatSchema.statics.getSlidingContext = async function (
  email: string,
  maxMessages: number = 20
) {
  const chat = await this.findOne({ userEmail: email });
  if (!chat || !chat.messages) {
    return [];
  }

  // Return the last N messages for sliding context window
  return chat.messages.slice(-maxMessages);
};

chatSchema.statics.clearChatHistory = async function (email: string) {
  return this.findOneAndUpdate(
    { userEmail: email },
    { $set: { messages: [] } },
    { new: true }
  );
};

export interface IChatModel extends mongoose.Model<IChat> {
  findByUserEmail(email: string): Promise<IChat | null>;
  createOrUpdateChat(email: string, message: IChatMessage): Promise<IChat>;
  getSlidingContext(
    email: string,
    maxMessages?: number
  ): Promise<IChatMessage[]>;
  clearChatHistory(email: string): Promise<IChat | null>;
}

export const Chat = mongoose.model<IChat, IChatModel>("Chat", chatSchema);
