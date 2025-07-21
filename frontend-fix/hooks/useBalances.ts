import { useCallback, useEffect, useRef } from "react";
import { useApi } from "./useApi";
import { useUserStore } from "@/stores/userStore";
import { formatUnits } from "viem";

export const useBalances = () => {
  const api = useApi();
  const {
    isAuthenticated,
    ethBalance,
    usdtBalance,
    tokenBalances,
    balancesLoading,
    setBalances,
    setBalancesLoading,
  } = useUserStore();

  // Ref to prevent multiple simultaneous fetches
  const fetchingRef = useRef(false);

  const fetchBalances = useCallback(async () => {
    if (!isAuthenticated || fetchingRef.current) return;

    fetchingRef.current = true;
    setBalancesLoading(true);
    try {
      const response = await api.get("/auth/balances");

      if (response.status === 200) {
        const { balances, tokenBalances: responseTokenBalances } =
          response.data;
        setBalances(balances.eth, balances.usdt, responseTokenBalances || []);
      }
    } catch (error) {
      console.error("Error fetching balances:", error);
    } finally {
      setBalancesLoading(false);
      fetchingRef.current = false;
    }
  }, [isAuthenticated]); // Remove api and store methods from dependencies

  // Refresh balances on mount if authenticated - only depend on isAuthenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchBalances();
    }
  }, [isAuthenticated]); // Remove fetchBalances from dependencies

  // Format balances for display
  const formattedEthBalance = ethBalance
    ? parseFloat(formatUnits(BigInt(ethBalance), 18)).toFixed(4)
    : "0.0000";

  const formattedUsdtBalance = usdtBalance
    ? parseFloat(formatUnits(BigInt(usdtBalance), 18)).toFixed(2)
    : "0.00";

  return {
    ethBalance: formattedEthBalance,
    usdtBalance: formattedUsdtBalance,
    tokenBalances,
    balancesLoading,
    fetchBalances,
  };
};
