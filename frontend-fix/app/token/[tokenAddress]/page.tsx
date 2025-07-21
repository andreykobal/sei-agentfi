"use client";

import { use, useState, useEffect } from "react";
import { formatUnits } from "viem";
import { useApi } from "@/hooks/useApi";
import { useChatStore } from "@/stores/chatStore";
import { TokenChart } from "@/components/shared/token-chart";
import { TokenSwap } from "@/components/shared/token-swap";
import { FaGlobe, FaTwitter, FaTelegramPlane, FaDiscord } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { chatEventEmitter, CHAT_EVENTS } from "@/lib/eventEmitter";

interface TokenHolder {
  address: string;
  balance: string; // Token balance in wei
  percentage: number; // Percentage of total supply (0-100)
}

interface TokenTransaction {
  type: "buy" | "sell";
  wallet: string;
  amountIn: string;
  amountOut: string;
  timestamp: string;
  blockNumber: string;
  eventId: string;
}

interface Token {
  _id: string;
  eventId: string;
  tokenAddress: string;
  creator: string;
  name: string;
  symbol: string;
  decimals: number;
  description: string;
  image: string;
  website: string;
  twitter: string;
  telegram: string;
  discord: string;
  timestamp: string;
  blockNumber: string;
  price?: string; // Token price in USDT (wei)
  marketCap?: string; // Market cap in USDT (wei)
  totalUsdtRaised?: string; // Total USDT raised via bonding curve (wei)
  volume24hBuy?: string; // 24h buy volume in USDT (wei)
  volume24hSell?: string; // 24h sell volume in USDT (wei)
  volume24hTotal?: string; // 24h total volume in USDT (wei)
  userTokenBalance?: string; // User's balance of this token (wei)
  holders?: TokenHolder[]; // Top 10 holders
  recentTransactions?: TokenTransaction[]; // Recent buy/sell transactions
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  success: boolean;
  data: Token;
  message: string;
}

interface TokenPageProps {
  params: Promise<{
    tokenAddress: string;
  }>;
}

export default function TokenPage({ params }: TokenPageProps) {
  const { tokenAddress } = use(params);
  const [token, setToken] = useState<Token | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { get } = useApi();
  const { setCurrentToken, clearCurrentToken } = useChatStore();

  useEffect(() => {
    fetchTokenData();
  }, [tokenAddress, get]);

  // Set token context for chat when token data is available
  useEffect(() => {
    if (token) {
      console.log(`[TOKEN PAGE] Setting chat context for token:`, {
        address: tokenAddress,
        name: token.name,
        symbol: token.symbol,
      });
      setCurrentToken(tokenAddress, token.name, token.symbol);
    }
  }, [token, tokenAddress, setCurrentToken]);

  // Clear token context when leaving the page
  useEffect(() => {
    return () => {
      console.log(`[TOKEN PAGE] Clearing chat context on page unmount`);
      clearCurrentToken();
    };
  }, [clearCurrentToken]);

  // Listen for chat refresh events
  useEffect(() => {
    const handleRefreshTokenData = (data: { tokenAddress?: string }) => {
      console.log(
        `[TOKEN PAGE] Received refresh token data event from chat:`,
        data
      );
      // Refresh if no specific token address provided, or if it matches our current token
      if (!data.tokenAddress || data.tokenAddress === tokenAddress) {
        console.log(`[TOKEN PAGE] Refreshing token data for: ${tokenAddress}`);
        fetchTokenData(true); // Silent refresh
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
  }, [tokenAddress]);

  const fetchTokenData = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      console.log("🔍 [TokenPage] Fetching token data for:", tokenAddress);

      const response = await get<ApiResponse>(
        `/tokens/address/${tokenAddress}`
      );

      console.log("📥 [TokenPage] API response:", {
        success: response.data.success,
        hasData: !!response.data.data,
        userTokenBalance: response.data.data?.userTokenBalance,
        tokenName: response.data.data?.name,
        tokenSymbol: response.data.data?.symbol,
      });

      if (response.data.success) {
        setToken(response.data.data);
        console.log("✅ [TokenPage] Token data set:", {
          userTokenBalance: response.data.data.userTokenBalance,
          name: response.data.data.name,
          symbol: response.data.data.symbol,
        });
      } else {
        console.log("❌ [TokenPage] Token not found");
        setError("Token not found");
      }
    } catch (err: any) {
      console.error("❌ [TokenPage] Error fetching token:", err);
      setError(err.response?.data?.error || "Failed to fetch token data");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (priceWei: string | undefined) => {
    if (!priceWei || priceWei === "0") return "N/A";
    try {
      const price = parseFloat(formatUnits(BigInt(priceWei), 18));
      return `$${price.toFixed(6)}`;
    } catch {
      return "N/A";
    }
  };

  const formatMarketCap = (marketCapWei: string | undefined) => {
    if (!marketCapWei || marketCapWei === "0") return "N/A";
    try {
      const marketCap = parseFloat(formatUnits(BigInt(marketCapWei), 18));
      if (marketCap >= 1e9) {
        return `$${(marketCap / 1e9).toFixed(2)}B`;
      } else if (marketCap >= 1e6) {
        return `$${(marketCap / 1e6).toFixed(2)}M`;
      } else if (marketCap >= 1e3) {
        return `$${(marketCap / 1e3).toFixed(2)}K`;
      } else {
        return `$${marketCap.toFixed(2)}`;
      }
    } catch {
      return "N/A";
    }
  };

  const formatVolume = (volumeWei: string | undefined) => {
    if (!volumeWei || volumeWei === "0") return "N/A";
    try {
      const volume = parseFloat(formatUnits(BigInt(volumeWei), 18));
      if (volume >= 1e9) {
        return `$${(volume / 1e9).toFixed(2)}B`;
      } else if (volume >= 1e6) {
        return `$${(volume / 1e6).toFixed(2)}M`;
      } else if (volume >= 1e3) {
        return `$${(volume / 1e3).toFixed(2)}K`;
      } else {
        return `$${volume.toFixed(2)}`;
      }
    } catch {
      return "N/A";
    }
  };

  const formatTokenBalance = (balanceWei: string) => {
    try {
      const balance = parseFloat(formatUnits(BigInt(balanceWei), 18));
      if (balance >= 1e9) {
        return `${(balance / 1e9).toFixed(2)}B`;
      } else if (balance >= 1e6) {
        return `${(balance / 1e6).toFixed(2)}M`;
      } else if (balance >= 1e3) {
        return `${(balance / 1e3).toFixed(2)}K`;
      } else {
        return balance.toFixed(2);
      }
    } catch {
      return "0";
    }
  };

  const getHolderDisplayName = (address: string) => {
    const BONDING_CURVE_ADDRESS = "0x34F494c5FC1535Bc20DcECa39b6A590C743fc088";
    if (address.toLowerCase() === BONDING_CURVE_ADDRESS.toLowerCase()) {
      return "Bonding Curve";
    }
    return shortenAddress(address);
  };

  // Helper function to shorten address like on home page
  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Helper function to format relative time
  const formatRelativeTime = (timestampString: string) => {
    const timestamp = parseInt(timestampString) * 1000; // Convert to milliseconds
    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return `${seconds}s ago`;
    }
  };

  // Copy functions
  const handleCopyTokenAddress = async () => {
    try {
      await navigator.clipboard.writeText(tokenAddress);
      toast.success("Token address copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy token address:", error);
      toast.error("Failed to copy token address");
    }
  };

  const handleCopyCreatorAddress = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token.creator);
      toast.success("Creator address copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy creator address:", error);
      toast.error("Failed to copy creator address");
    }
  };

  const openLink = (url: string) => {
    if (url && url !== "") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          {/* Loading Skeleton for Token Stats Cards */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="md:col-span-2 lg:col-span-2 bg-zinc-900/80 rounded-lg p-6 border">
              <div className="flex gap-4">
                <Skeleton className="w-16 h-16 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </div>
            </div>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-zinc-900/80 rounded-lg p-4 border">
                <Skeleton className="h-4 w-20 mb-3" />
                <Skeleton className="h-8 w-24 mb-1" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
          {/* Loading for chart and swap */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Skeleton className="h-96 w-full" />
            </div>
            <div className="lg:col-span-1">
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {error || "Token not found"}
            </p>
            <Button
              onClick={() => window.history.back()}
              className="w-full mt-4"
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="container mx-auto px-4 py-8 pb-32">
        {/* Token Stats Cards */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* First Card - Token Info (2x size) */}
          <div className="md:col-span-2 lg:col-span-2 bg-zinc-900/80 rounded-lg p-6 border">
            <div className="flex gap-4">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {token.image ? (
                  <img
                    src={token.image}
                    alt={token.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-border"
                    onError={(e) => {
                      (
                        e.target as HTMLImageElement
                      ).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        token.name
                      )}&background=random`;
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                    {token.symbol.charAt(0)}
                  </div>
                )}
              </div>

              {/* Token Details */}
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold mb-1">{token.name}</h3>
                <p className="text-sm text-muted-foreground font-mono mb-1">
                  ${token.symbol}
                </p>
                {token.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {token.description.length > 120
                      ? `${token.description.substring(0, 120)}...`
                      : token.description}
                  </p>
                )}

                {/* Socials */}
                <div className="flex gap-2">
                  {token.website && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="p-2"
                      onClick={() => openLink(token.website)}
                    >
                      <FaGlobe className="w-4 h-4 text-white" />
                    </Button>
                  )}
                  {token.twitter && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="p-2"
                      onClick={() => openLink(token.twitter)}
                    >
                      <FaTwitter className="w-4 h-4 text-white" />
                    </Button>
                  )}
                  {token.telegram && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="p-2"
                      onClick={() => openLink(token.telegram)}
                    >
                      <FaTelegramPlane className="w-4 h-4 text-white" />
                    </Button>
                  )}
                  {token.discord && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="p-2"
                      onClick={() => openLink(token.discord)}
                    >
                      <FaDiscord className="w-4 h-4 text-white" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Second Card - Address & Creator Info */}
          <div className="bg-zinc-900/80 rounded-lg p-4 border">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Contract Info
            </h3>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Address</p>
                <button
                  onClick={handleCopyTokenAddress}
                  className="text-sm font-mono hover:bg-muted/50 rounded px-1 py-0.5 transition-colors cursor-pointer"
                  title="Click to copy address"
                >
                  {shortenAddress(tokenAddress)}
                </button>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Creator</p>
                <button
                  onClick={handleCopyCreatorAddress}
                  className="text-sm font-mono hover:bg-muted/50 rounded px-1 py-0.5 transition-colors cursor-pointer"
                  title="Click to copy address"
                >
                  {shortenAddress(token.creator)}
                </button>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm">{formatDate(token.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Third Card - Price */}
          <div className="bg-zinc-900/80 rounded-lg p-4 border">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              Price
            </h3>
            <p className="text-2xl font-bold">{formatPrice(token.price)}</p>
            <p className="text-sm text-muted-foreground">Current price</p>
          </div>

          {/* Fourth Card - Market Cap */}
          <div className="bg-zinc-900/80 rounded-lg p-4 border">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              Market Cap
            </h3>
            <p className="text-2xl font-bold">
              {formatMarketCap(token.marketCap)}
            </p>
            <p className="text-sm text-muted-foreground">Total value</p>
          </div>

          {/* Fifth Card - Volume 24h */}
          <div className="bg-zinc-900/80 rounded-lg p-4 border">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              24h Volume
            </h3>
            <p className="text-2xl font-bold">
              {formatVolume(token.volume24hTotal)}
            </p>
            <p className="text-sm text-muted-foreground">Trading volume</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Section - Takes up 2/3 of the width on large screens */}
          <div className="lg:col-span-2 space-y-6">
            <TokenChart tokenAddress={tokenAddress} />

            {/* Recent Transactions Card */}
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-lg">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {token?.recentTransactions &&
                token.recentTransactions.length > 0 ? (
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-transparent hover:bg-transparent z-10">
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Wallet</TableHead>
                          <TableHead className="text-right">USDT</TableHead>
                          <TableHead className="text-right">Tokens</TableHead>
                          <TableHead className="text-right">Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {token.recentTransactions.map((tx) => (
                          <TableRow key={tx.eventId}>
                            <TableCell>
                              <Badge
                                className={
                                  tx.type === "buy"
                                    ? "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
                                    : "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
                                }
                              >
                                {tx.type.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <button
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(
                                      tx.wallet
                                    );
                                    toast.success("Wallet address copied!");
                                  } catch (error) {
                                    toast.error("Failed to copy address");
                                  }
                                }}
                                className="font-mono hover:bg-muted/50 rounded px-1 py-0.5 transition-colors cursor-pointer"
                                title="Click to copy address"
                              >
                                {shortenAddress(tx.wallet)}
                              </button>
                            </TableCell>
                            <TableCell className="text-right">
                              {tx.type === "buy"
                                ? `$${parseFloat(
                                    formatUnits(BigInt(tx.amountIn), 18)
                                  ).toFixed(2)}`
                                : `$${parseFloat(
                                    formatUnits(BigInt(tx.amountOut), 18)
                                  ).toFixed(2)}`}
                            </TableCell>
                            <TableCell className="text-right">
                              {tx.type === "buy"
                                ? formatTokenBalance(tx.amountOut)
                                : formatTokenBalance(tx.amountIn)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {formatRelativeTime(tx.timestamp)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {token.recentTransactions.length > 0 && (
                      <div className="text-center text-sm text-muted-foreground py-3">
                        Showing {token.recentTransactions.length} transactions
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    No transactions yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Swap Section - Takes up 1/3 of the width on large screens */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-4">
              <TokenSwap
                tokenAddress={tokenAddress}
                token={
                  token
                    ? {
                        name: token.name,
                        symbol: token.symbol,
                        image: token.image,
                        price: token.price,
                        totalUsdtRaised: token.totalUsdtRaised,
                        userTokenBalance: token.userTokenBalance,
                      }
                    : null
                }
                className="w-full"
                onRefresh={() => fetchTokenData(true)}
              />

              {/* Token Holders Card */}
              <Card className="w-full">
                <CardHeader>
                  <CardTitle className="text-lg">Top Holders</CardTitle>
                </CardHeader>
                <CardContent>
                  {token?.holders && token.holders.length > 0 ? (
                    <div className="space-y-3">
                      {token.holders.slice(0, 10).map((holder, index) => (
                        <div
                          key={holder.address}
                          className="flex items-center justify-between py-2 border-b border-border/30 last:border-b-0"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground font-mono">
                              #{index + 1}
                            </span>
                            <button
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(
                                    holder.address
                                  );
                                  toast.success("Address copied to clipboard!");
                                } catch (error) {
                                  toast.error("Failed to copy address");
                                }
                              }}
                              className="text-sm font-mono hover:bg-muted/50 rounded px-2 py-1 transition-colors cursor-pointer"
                              title="Click to copy address"
                            >
                              {getHolderDisplayName(holder.address)}
                            </button>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {holder.percentage.toFixed(2)}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatTokenBalance(holder.balance)}{" "}
                              {token.symbol}
                            </div>
                          </div>
                        </div>
                      ))}
                      {token.holders.length > 10 && (
                        <div className="text-center text-sm text-muted-foreground py-2">
                          ... and {token.holders.length - 10} more holders
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-sm text-muted-foreground py-4">
                      No holder data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
