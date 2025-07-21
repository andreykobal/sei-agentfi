import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TokenBalance {
  tokenAddress: string;
  name: string;
  symbol: string;
  balance: string;
  decimals: number;
}

interface UserState {
  // Auth state
  isAuthenticated: boolean;
  userEmail: string;
  walletAddress: string;

  // Balance state
  ethBalance: string;
  usdtBalance: string;
  tokenBalances: TokenBalance[];
  balancesLoading: boolean;

  // UI state
  isLoading: boolean;
  isVerifying: boolean;

  // Actions
  setAuthenticated: (authenticated: boolean) => void;
  setUserData: (email: string, walletAddress: string) => void;
  setBalances: (
    ethBalance: string,
    usdtBalance: string,
    tokenBalances?: TokenBalance[]
  ) => void;
  setBalancesLoading: (loading: boolean) => void;
  setLoading: (loading: boolean) => void;
  setVerifying: (verifying: boolean) => void;
  logout: () => void;
  reset: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      // Initial state
      isAuthenticated: false,
      userEmail: "",
      walletAddress: "",
      ethBalance: "0",
      usdtBalance: "0",
      tokenBalances: [],
      balancesLoading: false,
      isLoading: false,
      isVerifying: false,

      // Actions
      setAuthenticated: (authenticated) =>
        set({ isAuthenticated: authenticated }),

      setUserData: (email, walletAddress) =>
        set({
          userEmail: email,
          walletAddress: walletAddress,
          isAuthenticated: true,
        }),

      setBalances: (ethBalance, usdtBalance, tokenBalances = []) =>
        set({ ethBalance, usdtBalance, tokenBalances }),

      setBalancesLoading: (balancesLoading) => set({ balancesLoading }),

      setLoading: (loading) => set({ isLoading: loading }),

      setVerifying: (verifying) => set({ isVerifying: verifying }),

      logout: () =>
        set({
          isAuthenticated: false,
          userEmail: "",
          walletAddress: "",
          ethBalance: "0",
          usdtBalance: "0",
          tokenBalances: [],
          balancesLoading: false,
          isLoading: false,
          isVerifying: false,
        }),

      reset: () =>
        set({
          isAuthenticated: false,
          userEmail: "",
          walletAddress: "",
          ethBalance: "0",
          usdtBalance: "0",
          tokenBalances: [],
          balancesLoading: false,
          isLoading: false,
          isVerifying: false,
        }),
    }),
    {
      name: "user-store",
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        userEmail: state.userEmail,
        walletAddress: state.walletAddress,
        ethBalance: state.ethBalance,
        usdtBalance: state.usdtBalance,
        tokenBalances: state.tokenBalances,
      }),
    }
  )
);
