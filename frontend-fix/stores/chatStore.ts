import { create } from "zustand";

interface ChatState {
  // Current context
  currentTokenAddress: string | null;
  currentTokenName: string | null;
  currentTokenSymbol: string | null;

  // Actions
  setCurrentToken: (address: string, name?: string, symbol?: string) => void;
  clearCurrentToken: () => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  // Initial state
  currentTokenAddress: null,
  currentTokenName: null,
  currentTokenSymbol: null,

  // Actions
  setCurrentToken: (address, name, symbol) =>
    set({
      currentTokenAddress: address,
      currentTokenName: name || null,
      currentTokenSymbol: symbol || null,
    }),

  clearCurrentToken: () =>
    set({
      currentTokenAddress: null,
      currentTokenName: null,
      currentTokenSymbol: null,
    }),
}));
