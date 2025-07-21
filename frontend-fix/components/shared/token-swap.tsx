"use client";

import React, { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ArrowUpDown, User } from "lucide-react";
import { formatUnits } from "viem";
import { useUserStore } from "@/stores/userStore";
import { useApi } from "@/hooks/useApi";
import { useBalances } from "@/hooks/useBalances";
import { toast } from "sonner";
import { chatEventEmitter, CHAT_EVENTS } from "@/lib/eventEmitter";

interface Token {
  name: string;
  symbol: string;
  image: string;
  price?: string; // Token price in USDT (wei)
  totalUsdtRaised?: string; // Total USDT raised via bonding curve (wei)
  userTokenBalance?: string; // User's balance of this token (wei)
}

interface TokenSwapProps {
  tokenAddress: string;
  token: Token | null;
  className?: string;
  onRefresh?: () => void; // Callback to refresh token data after successful transactions
}

export function TokenSwap({
  tokenAddress,
  token,
  className,
  onRefresh,
}: TokenSwapProps) {
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [isTokenToUsdt, setIsTokenToUsdt] = useState(false); // true = token to USDT, false = USDT to token
  const [isLoading, setIsLoading] = useState(false); // Loading state for transactions

  // Get USDT balance from user store and balances hook
  const { usdtBalance: usdtBalanceWei, isAuthenticated } = useUserStore();
  const { fetchBalances } = useBalances();

  // Debug log when token prop changes
  useEffect(() => {
    console.log("🔄 [TokenSwap] Token prop updated:", {
      tokenAddress,
      hasToken: !!token,
      tokenName: token?.name,
      tokenSymbol: token?.symbol,
      userTokenBalance: token?.userTokenBalance,
      price: token?.price,
      totalUsdtRaised: token?.totalUsdtRaised,
    });
  }, [token, tokenAddress]);

  // Listen for chat refresh events
  useEffect(() => {
    const handleRefreshTokenData = (data: { tokenAddress?: string }) => {
      console.log(
        `[TOKEN SWAP] Received refresh token data event from chat:`,
        data
      );
      // Refresh if no specific token address provided, or if it matches our current token
      if (!data.tokenAddress || data.tokenAddress === tokenAddress) {
        console.log(`[TOKEN SWAP] Triggering refresh for: ${tokenAddress}`);
        // Refresh token data
        onRefresh?.();
        // Refresh user balances (USDT, ETH)
        fetchBalances();
      }
    };

    // Register event listener
    chatEventEmitter.on(CHAT_EVENTS.REFRESH_TOKEN_DATA, handleRefreshTokenData);

    // Cleanup event listener on unmount
    return () => {
      chatEventEmitter.off(
        CHAT_EVENTS.REFRESH_TOKEN_DATA,
        handleRefreshTokenData
      );
    };
  }, [tokenAddress, onRefresh, fetchBalances]);

  // API hook for making requests
  const { post } = useApi();

  // Format USDT balance from wei to readable format
  const formatUsdtBalance = () => {
    if (!usdtBalanceWei || usdtBalanceWei === "0") return "0.00";
    try {
      const balance = parseFloat(formatUnits(BigInt(usdtBalanceWei), 18));
      return balance.toFixed(2);
    } catch {
      return "0.00";
    }
  };

  // Format token balance from wei to readable format
  const formatTokenBalance = () => {
    console.log("🔍 [TokenSwap] Formatting token balance:", {
      hasToken: !!token,
      userTokenBalance: token?.userTokenBalance,
      tokenSymbol: token?.symbol,
      tokenName: token?.name,
    });

    if (!token?.userTokenBalance || token.userTokenBalance === "0") {
      console.log("⚠️ [TokenSwap] No token balance or balance is 0");
      return "0.000";
    }

    try {
      const balanceWei = BigInt(token.userTokenBalance);
      const balance = parseFloat(formatUnits(balanceWei, 18));
      const formattedBalance = balance.toFixed(3);

      console.log("✅ [TokenSwap] Token balance formatted:", {
        balanceWei: balanceWei.toString(),
        balanceFormatted: balance,
        finalDisplay: formattedBalance,
      });

      return formattedBalance;
    } catch (error) {
      console.error("❌ [TokenSwap] Error formatting token balance:", {
        userTokenBalance: token?.userTokenBalance,
        error,
      });
      return "0.000";
    }
  };

  // Token details from props
  const tokenSymbol = token?.symbol || "TOKEN";
  const tokenBalance = formatTokenBalance();
  const usdtBalance = formatUsdtBalance();

  // Debug log the final balance values used in UI
  console.log("🎨 [TokenSwap] Final UI balance values:", {
    tokenSymbol,
    tokenBalance,
    usdtBalance,
    isTokenToUsdt,
    fromBalance: isTokenToUsdt ? tokenBalance : usdtBalance,
    toBalance: isTokenToUsdt ? usdtBalance : tokenBalance,
  });

  // Bonding curve constants (from smart contract)
  const VIRTUAL_USDT_RESERVE = 6000; // 6000 USDT (natural units)
  const VIRTUAL_TOKEN_RESERVE = 1073000191; // ~1.073B tokens (natural units)
  const BONDING_CURVE_K = VIRTUAL_USDT_RESERVE * VIRTUAL_TOKEN_RESERVE; // k = 6,438,000,006,000

  // Get token price in USDT (wei)
  const getTokenPriceInUsdt = () => {
    if (!token?.price || token.price === "0") return BigInt(0);
    try {
      return BigInt(token.price);
    } catch {
      return BigInt(0);
    }
  };

  const tokenPriceWei = getTokenPriceInUsdt();

  // Calculate current virtual reserves from totalUsdtRaised
  const getCurrentVirtualReserves = () => {
    try {
      // Get total USDT raised so far
      const totalUsdtRaisedWei = token?.totalUsdtRaised || "0";
      const totalUsdtRaisedNatural = Number(
        formatUnits(BigInt(totalUsdtRaisedWei), 18)
      );

      // Virtual reserves calculation (same as smart contract)
      const virtualUsdtNatural = VIRTUAL_USDT_RESERVE + totalUsdtRaisedNatural;
      const virtualTokensNatural = BONDING_CURVE_K / virtualUsdtNatural;

      return { virtualUsdtNatural, virtualTokensNatural };
    } catch {
      return {
        virtualUsdtNatural: VIRTUAL_USDT_RESERVE,
        virtualTokensNatural: VIRTUAL_TOKEN_RESERVE,
      };
    }
  };

  // Calculate tokens to receive for USDT input (buying tokens)
  const calculateTokensToReceive = (usdtAmountWei: bigint) => {
    try {
      const { virtualUsdtNatural, virtualTokensNatural } =
        getCurrentVirtualReserves();

      // Convert USDT from wei to natural units
      const usdtAmountNatural = Number(formatUnits(usdtAmountWei, 18));

      // New virtual state after purchase
      const newVirtualUsdtNatural = virtualUsdtNatural + usdtAmountNatural;
      const newVirtualTokensNatural = BONDING_CURVE_K / newVirtualUsdtNatural;

      // Tokens to mint in natural units
      const tokensToMintNatural =
        virtualTokensNatural - newVirtualTokensNatural;

      return tokensToMintNatural;
    } catch {
      return 0;
    }
  };

  // Calculate USDT to receive for token input (selling tokens)
  const calculateUsdtToReceive = (tokenAmountNatural: number) => {
    try {
      const { virtualUsdtNatural, virtualTokensNatural } =
        getCurrentVirtualReserves();

      // New virtual state after selling tokens
      const newVirtualTokensNatural = virtualTokensNatural + tokenAmountNatural;
      const newVirtualUsdtNatural = BONDING_CURVE_K / newVirtualTokensNatural;

      // USDT to return in natural units
      const usdtToReturnNatural = virtualUsdtNatural - newVirtualUsdtNatural;

      return usdtToReturnNatural;
    } catch {
      return 0;
    }
  };

  // Calculate exchange rate and amounts using bonding curve
  useEffect(() => {
    if (!fromAmount || fromAmount === "" || !token?.totalUsdtRaised) {
      setToAmount("");
      return;
    }

    const fromValue = parseFloat(fromAmount);
    if (isNaN(fromValue) || fromValue <= 0) {
      setToAmount("");
      return;
    }

    let calculatedToAmount;
    if (isTokenToUsdt) {
      // Selling tokens for USDT
      calculatedToAmount = calculateUsdtToReceive(fromValue);
    } else {
      // Buying tokens with USDT
      const usdtAmountWei = BigInt(Math.floor(fromValue * 1e18));
      calculatedToAmount = calculateTokensToReceive(usdtAmountWei);
    }

    setToAmount(calculatedToAmount.toFixed(6));
  }, [fromAmount, isTokenToUsdt, token?.totalUsdtRaised]);

  // Get current price in natural units for display (calculated from virtual reserves)
  const getCurrentPriceNatural = () => {
    try {
      const { virtualUsdtNatural, virtualTokensNatural } =
        getCurrentVirtualReserves();
      // Price = virtualUsdtNatural / virtualTokensNatural (in natural units)
      return virtualUsdtNatural / virtualTokensNatural;
    } catch {
      return 0;
    }
  };

  const currentPriceNatural = getCurrentPriceNatural();

  const exchangeRate = isTokenToUsdt
    ? `1 ${tokenSymbol} = ${currentPriceNatural.toFixed(6)} USDT`
    : `1 USDT = ${
        currentPriceNatural > 0 ? (1 / currentPriceNatural).toFixed(6) : "0"
      } ${tokenSymbol}`;

  const usdValue = isTokenToUsdt
    ? `$${(parseFloat(fromAmount || "0") * currentPriceNatural).toFixed(2)}`
    : `$${parseFloat(fromAmount || "0").toFixed(2)}`;

  const handleSwapDirection = () => {
    setIsTokenToUsdt(!isTokenToUsdt);
    // Clear amounts when swapping direction
    setFromAmount("");
    setToAmount("");
  };

  const handleMaxClick = () => {
    setFromAmount(isTokenToUsdt ? tokenBalance : usdtBalance);
  };

  // Buy tokens function
  const handleBuyTokens = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      toast.error("Please enter a valid USDT amount");
      return;
    }

    setIsLoading(true);
    try {
      console.log("🛒 Buying tokens:", {
        tokenAddress,
        usdtAmount: fromAmount,
      });

      const response = await post("/buy-tokens", {
        tokenAddress,
        usdtAmount: fromAmount,
      });

      if (response.data.success) {
        toast.success("Tokens purchased successfully!");
        console.log(
          "🛒 Purchase transaction hash:",
          response.data.data.transactionHash
        );

        // Clear form
        setFromAmount("");
        setToAmount("");

        // Wait 1 second then refresh data
        setTimeout(() => {
          onRefresh?.();
          fetchBalances(); // Refresh user balances
          // Also emit event to refresh chart data
          chatEventEmitter.emit(CHAT_EVENTS.REFRESH_TOKEN_DATA, {
            tokenAddress,
          });
        }, 1000);
      } else {
        toast.error(response.data.error || "Failed to purchase tokens");
      }
    } catch (error: any) {
      console.error("🛒 Error purchasing tokens:", error);
      toast.error(error.response?.data?.error || "Failed to purchase tokens");
    } finally {
      setIsLoading(false);
    }
  };

  // Sell tokens function
  const handleSellTokens = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      toast.error("Please enter a valid token amount");
      return;
    }

    setIsLoading(true);
    try {
      console.log("💰 Selling tokens:", {
        tokenAddress,
        tokenAmount: fromAmount,
      });

      const response = await post("/sell-tokens", {
        tokenAddress,
        tokenAmount: fromAmount,
      });

      if (response.data.success) {
        toast.success("Tokens sold successfully!");
        console.log(
          "💰 Sale transaction hash:",
          response.data.data.transactionHash
        );

        // Clear form
        setFromAmount("");
        setToAmount("");

        // Wait 1 second then refresh data
        setTimeout(() => {
          onRefresh?.();
          fetchBalances(); // Refresh user balances
          // Also emit event to refresh chart data
          chatEventEmitter.emit(CHAT_EVENTS.REFRESH_TOKEN_DATA, {
            tokenAddress,
          });
        }, 1000);
      } else {
        toast.error(response.data.error || "Failed to sell tokens");
      }
    } catch (error: any) {
      console.error("💰 Error selling tokens:", error);
      toast.error(error.response?.data?.error || "Failed to sell tokens");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle swap execution
  const handleSwap = async () => {
    if (isTokenToUsdt) {
      await handleSellTokens();
    } else {
      await handleBuyTokens();
    }
  };

  const fromTokenSymbol = isTokenToUsdt ? tokenSymbol : "USDT";
  const toTokenSymbol = isTokenToUsdt ? "USDT" : tokenSymbol;
  const fromBalance = isTokenToUsdt ? tokenBalance : usdtBalance;
  const toBalance = isTokenToUsdt ? usdtBalance : tokenBalance;

  const USDTIcon = () => (
    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
      <span className="text-white font-bold text-sm">$</span>
    </div>
  );

  const TokenAvatar = () =>
    token?.image ? (
      <img
        src={token.image}
        alt={token.name}
        className="w-8 h-8 rounded-full object-cover border border-border"
        onError={(e) => {
          (
            e.target as HTMLImageElement
          ).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
            token.name
          )}&background=random&size=32`;
        }}
      />
    ) : (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
        {tokenSymbol.charAt(0)}
      </div>
    );

  const TokenDisplay = ({
    symbol,
    isUsdt,
  }: {
    symbol: string;
    isUsdt: boolean;
  }) => (
    <div className="flex items-center gap-2 h-16 px-4 py-3 bg-muted rounded-lg min-w-[120px]">
      {isUsdt ? <USDTIcon /> : <TokenAvatar />}
      <span className="font-semibold">{symbol}</span>
    </div>
  );

  if (!isAuthenticated) {
    return (
      <Card className={`p-6 max-w-md ${className}`}>
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <User className="w-12 h-12 text-muted-foreground/50" />
          <h2 className="text-xl font-semibold text-muted-foreground">
            Sign in to Swap
          </h2>
          <p className="text-center text-sm text-muted-foreground">
            Please sign in to swap tokens and access trading features
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 max-w-md ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold">Swap</h2>
        </div>

        {/* From Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">You pay</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                type="text"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="text-3xl font-bold h-16 border-none text-right pr-2"
                placeholder="0.0"
              />
            </div>
            <TokenDisplay symbol={fromTokenSymbol} isUsdt={!isTokenToUsdt} />
          </div>

          <div className="flex justify-between items-center text-sm">
            <div className="text-muted-foreground">{usdValue}</div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                Balance: {fromBalance}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMaxClick}
                className="h-6 px-2 text-xs text-foreground hover:text-muted-foreground"
              >
                MAX
              </Button>
            </div>
          </div>
        </div>

        {/* Swap Direction Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSwapDirection}
            className="rounded-full w-10 h-10 p-0 border-2"
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>

        {/* To Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">You receive</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="text-3xl font-bold text-sm h-16 flex items-center justify-end pr-2 bg-muted/50 rounded-md text-muted-foreground">
                {toAmount || "0.0"}
              </div>
            </div>
            <TokenDisplay symbol={toTokenSymbol} isUsdt={isTokenToUsdt} />
          </div>

          <div className="flex justify-between items-center text-sm">
            <div className="text-muted-foreground">{usdValue}</div>
            <span className="text-muted-foreground">Balance: {toBalance}</span>
          </div>
        </div>

        {/* Exchange Rate */}
        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
          <span className="text-sm">{exchangeRate}</span>
        </div>

        {/* Swap Button */}
        <Button
          size="lg"
          className="w-full h-14 text-lg font-semibold bg-purple-600 text-white hover:bg-purple-700"
          onClick={handleSwap}
          disabled={isLoading || !fromAmount || parseFloat(fromAmount) <= 0}
        >
          {isLoading
            ? "Processing..."
            : isTokenToUsdt
            ? "Sell Tokens"
            : "Buy Tokens"}
        </Button>
      </div>
    </Card>
  );
}
