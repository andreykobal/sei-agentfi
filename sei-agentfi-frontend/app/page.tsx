"use client";

import { useState, useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Token {
  _id: string;
  eventId: string;
  tokenAddress: string;
  creator: string;
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: string;
  description: string;
  image: string;
  website: string;
  twitter: string;
  telegram: string;
  discord: string;
  timestamp: string;
  blockNumber: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  success: boolean;
  data: Token[];
  count: number;
  message: string;
}

export default function Home() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { get } = useApi();

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        setLoading(true);
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
        setLoading(false);
      }
    };

    fetchTokens();
  }, [get]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatSupply = (supply: string) => {
    const num = BigInt(supply);
    const formatted = (Number(num) / 1e18).toLocaleString();
    return formatted;
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const openLink = (url: string) => {
    if (url && url !== "") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-4" />
            <Skeleton className="h-6 w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="w-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-24 mb-2" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-4" />
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-4 w-40" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-8 w-20 mr-2" />
                  <Skeleton className="h-8 w-20 mr-2" />
                  <Skeleton className="h-8 w-20" />
                </CardFooter>
              </Card>
            ))}
          </div>
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
          <CardFooter>
            <Button onClick={() => window.location.reload()} className="w-full">
              Retry
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Sei AgentFi
          </h1>
          <p className="text-lg text-muted-foreground">
            Discover and explore AI agents created on the Sei network
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {tokens.length} AI agent{tokens.length !== 1 ? "s" : ""} found
          </p>
        </div>

        {/* Tokens Grid */}
        {tokens.length === 0 ? (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle>No Tokens Found</CardTitle>
              <CardDescription>
                No tokens have been created yet on this network.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tokens.map((token) => (
              <Card
                key={token._id}
                className="w-full hover:shadow-lg transition-shadow duration-200"
              >
                <CardHeader>
                  <div className="flex items-start gap-3">
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
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">
                        {token.name}
                      </CardTitle>
                      <CardDescription className="font-mono">
                        ${token.symbol}
                      </CardDescription>
                    </div>
                    <CardAction>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(token.createdAt)}
                      </span>
                    </CardAction>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {token.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3 overflow-hidden">
                      {token.description.length > 150
                        ? `${token.description.substring(0, 150)}...`
                        : token.description}
                    </p>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Supply:</span>
                      <span className="font-mono">
                        {formatSupply(token.initialSupply)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Creator:</span>
                      <span className="font-mono">
                        {shortenAddress(token.creator)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Contract:</span>
                      <span className="font-mono">
                        {shortenAddress(token.tokenAddress)}
                      </span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="gap-2">
                  {token.website && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openLink(token.website)}
                    >
                      Website
                    </Button>
                  )}
                  {token.twitter && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openLink(token.twitter)}
                    >
                      Twitter
                    </Button>
                  )}
                  {token.telegram && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openLink(token.telegram)}
                    >
                      Telegram
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
