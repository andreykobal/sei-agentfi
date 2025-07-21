"use client";

import { useState, useEffect } from "react";
import { formatUnits } from "viem";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import { FaGlobe, FaTwitter, FaTelegramPlane, FaDiscord } from "react-icons/fa";
import { toast } from "sonner";
import { chatEventEmitter, CHAT_EVENTS } from "@/lib/eventEmitter";

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
  volume24hBuy?: string; // 24h buy volume in USDT (wei)
  volume24hSell?: string; // 24h sell volume in USDT (wei)
  volume24hTotal?: string; // 24h total volume in USDT (wei)
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  success: boolean;
  data: Token[];
  count: number;
  message: string;
}

type SortOption = "default" | "price" | "marketCap" | "volume";

export default function TradePage() {
  const router = useRouter();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("marketCap"); // Default to market cap
  const { get } = useApi();

  useEffect(() => {
    fetchTokens();
  }, [get]);

  // Listen for chat refresh events
  useEffect(() => {
    const handleRefreshTokens = () => {
      console.log(`[TRADE PAGE] Received refresh tokens event from chat`);
      fetchTokens(true); // Silent refresh
    };

    // Register event listener
    chatEventEmitter.on(CHAT_EVENTS.REFRESH_TOKENS, handleRefreshTokens);

    // Cleanup event listener on unmount
    return () => {
      chatEventEmitter.off(CHAT_EVENTS.REFRESH_TOKENS, handleRefreshTokens);
    };
  }, []);

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
      const price = parseFloat(formatUnits(BigInt(priceWei), 18)); // Convert wei to USDT
      return `$${price.toFixed(6)}`; // Show 6 decimal places for price
    } catch {
      return "N/A";
    }
  };

  const formatMarketCap = (marketCapWei: string | undefined) => {
    if (!marketCapWei || marketCapWei === "0") return "N/A";
    try {
      const marketCap = parseFloat(formatUnits(BigInt(marketCapWei), 18)); // Convert wei to USDT
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
      const volume = parseFloat(formatUnits(BigInt(volumeWei), 18)); // Convert wei to USDT
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

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Copy functions for addresses
  const handleCopyCreatorAddress = async (creatorAddress: string) => {
    try {
      await navigator.clipboard.writeText(creatorAddress);
      toast.success("Creator address copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy creator address:", error);
      toast.error("Failed to copy creator address");
    }
  };

  const handleCopyContractAddress = async (contractAddress: string) => {
    try {
      await navigator.clipboard.writeText(contractAddress);
      toast.success("Contract address copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy contract address:", error);
      toast.error("Failed to copy contract address");
    }
  };

  const openLink = (url: string) => {
    if (url && url !== "") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const fetchTokens = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      const response = await get<ApiResponse>("/tokens");

      if (response.data.success) {
        setTokens(response.data.data);
      } else {
        setError("Failed to fetch tokens");
      }
    } catch (err: any) {
      console.error("Error fetching tokens:", err);
      setError(err.response?.data?.error || "Failed to fetch tokens");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Sort tokens based on selected option
  const getSortedTokens = () => {
    const tokensCopy = [...tokens];

    switch (sortBy) {
      case "price":
        return tokensCopy.sort((a, b) => {
          const priceA = a.price
            ? parseFloat(formatUnits(BigInt(a.price), 18))
            : 0;
          const priceB = b.price
            ? parseFloat(formatUnits(BigInt(b.price), 18))
            : 0;
          return priceB - priceA; // Descending order
        });
      case "marketCap":
        return tokensCopy.sort((a, b) => {
          const marketCapA = a.marketCap
            ? parseFloat(formatUnits(BigInt(a.marketCap), 18))
            : 0;
          const marketCapB = b.marketCap
            ? parseFloat(formatUnits(BigInt(b.marketCap), 18))
            : 0;
          return marketCapB - marketCapA; // Descending order
        });
      case "volume":
        return tokensCopy.sort((a, b) => {
          const volumeA = a.volume24hTotal
            ? parseFloat(formatUnits(BigInt(a.volume24hTotal), 18))
            : 0;
          const volumeB = b.volume24hTotal
            ? parseFloat(formatUnits(BigInt(b.volume24hTotal), 18))
            : 0;
          return volumeB - volumeA; // Descending order
        });
      case "default":
      default:
        return tokensCopy.sort((a, b) => {
          // Sort by creation date, newest first (default behavior)
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-4" />
            <Skeleton className="h-6 w-96" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>Failed to load tokens</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
          <div className="p-6">
            <Button onClick={() => window.location.reload()} className="w-full">
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 pb-32">
      <div className="max-w-7xl mx-auto">
        {/* Trading Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl">AI Agents</CardTitle>
                <CardDescription>
                  {tokens.length} AI agent{tokens.length !== 1 ? "s" : ""}{" "}
                  available
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-foreground" />
                <Select
                  value={sortBy}
                  onValueChange={(value: SortOption) => setSortBy(value)}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Latest</SelectItem>
                    <SelectItem value="price">Price</SelectItem>
                    <SelectItem value="marketCap">Market Cap</SelectItem>
                    <SelectItem value="volume">Volume</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {tokens.length === 0 && !loading ? (
              <div className="p-8 text-center">
                <CardTitle className="mb-2">No Tokens Found</CardTitle>
                <CardDescription>
                  No tokens are currently available for trading.
                </CardDescription>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="text-base">
                  <TableHeader>
                    <TableRow className="border-b-2 border-border/50">
                      <TableHead className="h-14 px-6 text-lg font-semibold">
                        Token
                      </TableHead>
                      <TableHead className="h-14 px-6 text-lg font-semibold text-right">
                        Price
                      </TableHead>
                      <TableHead className="h-14 px-6 text-lg font-semibold text-right">
                        Market Cap
                      </TableHead>
                      <TableHead className="h-14 px-6 text-lg font-semibold text-right">
                        24h Volume
                      </TableHead>
                      <TableHead className="h-14 px-6 text-lg font-semibold">
                        Creator
                      </TableHead>
                      <TableHead className="h-14 px-6 text-lg font-semibold">
                        Contract
                      </TableHead>
                      <TableHead className="h-14 px-6 text-lg font-semibold">
                        Socials
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getSortedTokens().map((token) => (
                      <TableRow
                        key={token._id}
                        className="border-b border-border/30 hover:bg-muted/30 cursor-pointer"
                        onClick={() =>
                          router.push(`/token/${token.tokenAddress}`)
                        }
                      >
                        <TableCell className="p-6">
                          <div className="flex items-center gap-4">
                            {token.image ? (
                              <img
                                src={token.image}
                                alt={token.name}
                                className="w-12 h-12 rounded-full object-cover border-2 border-border"
                                onError={(e) => {
                                  (
                                    e.target as HTMLImageElement
                                  ).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    token.name
                                  )}&background=random`;
                                }}
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center border-2 border-border">
                                <span className="text-lg font-semibold text-accent-foreground">
                                  {token.symbol.charAt(0)}
                                </span>
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-base text-foreground">
                                {token.name}
                              </div>
                              <div className="font-mono text-sm text-muted-foreground">
                                ${token.symbol}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="p-6 text-right">
                          <span className="font-mono text-base text-green-600 font-semibold">
                            {formatPrice(token.price)}
                          </span>
                        </TableCell>
                        <TableCell className="p-6 text-right">
                          <span className="font-mono text-base text-blue-600 font-semibold">
                            {formatMarketCap(token.marketCap)}
                          </span>
                        </TableCell>
                        <TableCell className="p-6 text-right">
                          <span className="font-mono text-base text-purple-600 font-semibold">
                            {formatVolume(token.volume24hTotal)}
                          </span>
                        </TableCell>
                        <TableCell className="p-6">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyCreatorAddress(token.creator);
                            }}
                            className="font-mono text-sm hover:bg-muted/50 rounded px-2 py-1 transition-colors cursor-pointer"
                            title="Click to copy address"
                          >
                            {shortenAddress(token.creator)}
                          </button>
                        </TableCell>
                        <TableCell className="p-6">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyContractAddress(token.tokenAddress);
                            }}
                            className="font-mono text-sm hover:bg-muted/50 rounded px-2 py-1 transition-colors cursor-pointer"
                            title="Click to copy address"
                          >
                            {shortenAddress(token.tokenAddress)}
                          </button>
                        </TableCell>
                        <TableCell className="p-6">
                          <div className="flex gap-2">
                            {token.website && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openLink(token.website);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <FaGlobe className="h-3 w-3" />
                              </Button>
                            )}
                            {token.twitter && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openLink(token.twitter);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <FaTwitter className="h-3 w-3" />
                              </Button>
                            )}
                            {token.telegram && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openLink(token.telegram);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <FaTelegramPlane className="h-3 w-3" />
                              </Button>
                            )}
                            {token.discord && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openLink(token.discord);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <FaDiscord className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
