"use client";

import { useState, useEffect } from "react";
import { formatUnits } from "viem";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Loader2 } from "lucide-react";
import { FaGlobe, FaTwitter, FaTelegramPlane, FaDiscord } from "react-icons/fa";
import { toast } from "sonner";

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
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  success: boolean;
  data: Token[];
  count: number;
  message: string;
}

interface CreateTokenForm {
  name: string;
  symbol: string;
  description: string;
  website: string;
  twitter: string;
  telegram: string;
  discord: string;
}

interface CreateTokenResponse {
  success: boolean;
  data?: {
    transactionHash: string;
    tokenAddress?: string;
    message: string;
  };
  error?: string;
}

export default function Home() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateTokenForm>({
    name: "",
    symbol: "",
    description: "",
    website: "",
    twitter: "",
    telegram: "",
    discord: "",
  });
  const { get, post } = useApi();

  useEffect(() => {
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      symbol: "",
      description: "",
      website: "",
      twitter: "",
      telegram: "",
      discord: "",
    });
    setCreateError(null);
  };

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

  const handleCreateToken = async () => {
    if (!formData.name || !formData.symbol || !formData.description) {
      setCreateError(
        "Please fill in all required fields (Name, Symbol, Description)"
      );
      return;
    }

    // Basic validation
    if (formData.symbol.length > 10) {
      setCreateError("Symbol must be 10 characters or less");
      return;
    }

    if (formData.name.length > 50) {
      setCreateError("Name must be 50 characters or less");
      return;
    }

    try {
      setIsCreating(true);
      setCreateError(null);

      const tokenData = {
        ...formData,
        symbol: formData.symbol.toUpperCase(),
      };

      console.log("Creating token with data:", tokenData);

      const response = await post<CreateTokenResponse>(
        "/create-token",
        tokenData
      );

      if (response.data.success) {
        console.log("Token created successfully:", response.data);

        // Close dialog and reset form
        setIsCreateDialogOpen(false);
        resetForm();

        // Wait 500ms then refresh tokens
        setTimeout(() => {
          fetchTokens();
        }, 500);
      } else {
        setCreateError(response.data.error || "Failed to create token");
      }
    } catch (err: any) {
      console.error("Error creating token:", err);
      setCreateError(
        err.response?.data?.error ||
          err.response?.data?.details ||
          "Failed to create token"
      );
    } finally {
      setIsCreating(false);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create Token Card */}
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Card className="w-full hover:shadow-lg transition-shadow duration-200 border-dashed border-2 border-muted-foreground/25 hover:border-muted-foreground/50 cursor-pointer bg-muted/10 hover:bg-muted/20">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Plus className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <CardTitle className="text-lg text-muted-foreground mb-2">
                    Create New Token
                  </CardTitle>
                  <CardDescription className="text-center">
                    Launch your own AI agent token on Sei
                  </CardDescription>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Token</DialogTitle>
                <DialogDescription>
                  Fill in the details below to create your AI agent token on the
                  Sei network. Required fields are marked with *.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {createError && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-2 rounded-md text-sm">
                    {createError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">
                      Token Name *
                    </label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="e.g., AI Agent"
                      value={formData.name}
                      onChange={handleInputChange}
                      maxLength={50}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="symbol" className="text-sm font-medium">
                      Symbol *
                    </label>
                    <Input
                      id="symbol"
                      name="symbol"
                      placeholder="e.g., AGT"
                      value={formData.symbol}
                      onChange={handleInputChange}
                      maxLength={10}
                      style={{ textTransform: "uppercase" }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    placeholder="Describe your AI agent token..."
                    value={formData.description}
                    onChange={handleInputChange}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    maxLength={500}
                    rows={3}
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Social Links (Optional)
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="website" className="text-sm font-medium">
                        Website
                      </label>
                      <Input
                        id="website"
                        name="website"
                        placeholder="https://example.com"
                        value={formData.website}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="twitter" className="text-sm font-medium">
                        Twitter
                      </label>
                      <Input
                        id="twitter"
                        name="twitter"
                        placeholder="https://twitter.com/..."
                        value={formData.twitter}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="telegram" className="text-sm font-medium">
                        Telegram
                      </label>
                      <Input
                        id="telegram"
                        name="telegram"
                        placeholder="https://t.me/..."
                        value={formData.telegram}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="discord" className="text-sm font-medium">
                        Discord
                      </label>
                      <Input
                        id="discord"
                        name="discord"
                        placeholder="https://discord.gg/..."
                        value={formData.discord}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    resetForm();
                  }}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateToken} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Token...
                    </>
                  ) : (
                    "Create Token"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Existing Tokens */}
          {tokens.length === 0 && !loading ? (
            <Card className="w-full col-span-full max-w-md mx-auto">
              <CardHeader>
                <CardTitle>No Tokens Found</CardTitle>
                <CardDescription>
                  No tokens have been created yet. Be the first to create one!
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            tokens.map((token) => (
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
                      <span className="text-muted-foreground">Price:</span>
                      <span className="font-mono text-green-600">
                        {formatPrice(token.price)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Market Cap:</span>
                      <span className="font-mono text-blue-600">
                        {formatMarketCap(token.marketCap)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Creator:</span>
                      <button
                        onClick={() => handleCopyCreatorAddress(token.creator)}
                        className="font-mono hover:bg-muted/50 rounded px-1 py-0.5 transition-colors cursor-pointer"
                        title="Click to copy address"
                      >
                        {shortenAddress(token.creator)}
                      </button>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Contract:</span>
                      <button
                        onClick={() =>
                          handleCopyContractAddress(token.tokenAddress)
                        }
                        className="font-mono hover:bg-muted/50 rounded px-1 py-0.5 transition-colors cursor-pointer"
                        title="Click to copy address"
                      >
                        {shortenAddress(token.tokenAddress)}
                      </button>
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
                      <FaGlobe className="h-4 w-4 text-white" />
                    </Button>
                  )}
                  {token.twitter && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openLink(token.twitter)}
                    >
                      <FaTwitter className="h-4 w-4 text-white" />
                    </Button>
                  )}
                  {token.telegram && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openLink(token.telegram)}
                    >
                      <FaTelegramPlane className="h-4 w-4 text-white" />
                    </Button>
                  )}
                  {token.discord && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openLink(token.discord)}
                    >
                      <FaDiscord className="h-4 w-4 text-white" />
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
