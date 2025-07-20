import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserState {
  // Auth state
  isAuthenticated: boolean;
  userEmail: string;
  walletAddress: string;

  // UI state
  isLoading: boolean;
  isVerifying: boolean;

  // Actions
  setAuthenticated: (authenticated: boolean) => void;
  setUserData: (email: string, walletAddress: string) => void;
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

      setLoading: (loading) => set({ isLoading: loading }),

      setVerifying: (verifying) => set({ isVerifying: verifying }),

      logout: () =>
        set({
          isAuthenticated: false,
          userEmail: "",
          walletAddress: "",
          isLoading: false,
          isVerifying: false,
        }),

      reset: () =>
        set({
          isAuthenticated: false,
          userEmail: "",
          walletAddress: "",
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
      }),
    }
  )
);
