import mitt from "mitt";

// Define event types for type safety
type Events = {
  refresh_tokens: void;
  refresh_token_data: { tokenAddress?: string };
};

// Create a global event emitter instance using mitt
export const chatEventEmitter = mitt<Events>();

// Event types for easy reference
export const CHAT_EVENTS = {
  REFRESH_TOKENS: "refresh_tokens" as const,
  REFRESH_TOKEN_DATA: "refresh_token_data" as const,
} as const;
