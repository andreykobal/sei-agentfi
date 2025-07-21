"use client";

import { use } from "react";
import { TokenChart } from "@/components/shared/token-chart";
import { TokenSwap } from "@/components/shared/token-swap";
import { FaGlobe, FaTwitter, FaTelegramPlane, FaDiscord } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface TokenPageProps {
  params: Promise<{
    tokenAddress: string;
  }>;
}

export default function TokenPage({ params }: TokenPageProps) {
  const { tokenAddress } = use(params);

  // Helper function to shorten address like on home page
  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
    const creatorAddress = "0x1234567890abcdef1234567890abcdef12345678";
    try {
      await navigator.clipboard.writeText(creatorAddress);
      toast.success("Creator address copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy creator address:", error);
      toast.error("Failed to copy creator address");
    }
  };

  return (
    <div className="h-full bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Token Stats Cards */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* First Card - Token Info (2x size) */}
          <div className="md:col-span-2 lg:col-span-2 bg-card rounded-lg p-6 border">
            <div className="flex gap-4">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  🚀
                </div>
              </div>

              {/* Token Details */}
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold mb-1">RocketCoin</h3>
                <p className="text-sm text-muted-foreground font-mono mb-1">
                  $ROCKET
                </p>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  The next-generation meme token taking crypto to the moon with
                  innovative DeFi features.
                </p>

                {/* Socials */}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="p-2">
                    <FaGlobe className="w-4 h-4 text-white" />
                  </Button>
                  <Button size="sm" variant="outline" className="p-2">
                    <FaTwitter className="w-4 h-4 text-white" />
                  </Button>
                  <Button size="sm" variant="outline" className="p-2">
                    <FaTelegramPlane className="w-4 h-4 text-white" />
                  </Button>
                  <Button size="sm" variant="outline" className="p-2">
                    <FaDiscord className="w-4 h-4 text-white" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Second Card - Address & Creator Info */}
          <div className="bg-card rounded-lg p-4 border">
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
                  {shortenAddress("0x1234567890abcdef1234567890abcdef12345678")}
                </button>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm">2 days ago</p>
              </div>
            </div>
          </div>

          {/* Third Card - Price */}
          <div className="bg-card rounded-lg p-4 border">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              Price
            </h3>
            <p className="text-2xl font-bold">$0.0125</p>
            <p className="text-sm text-green-500">+8.4%</p>
          </div>

          {/* Fourth Card - Market Cap */}
          <div className="bg-card rounded-lg p-4 border">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              Market Cap
            </h3>
            <p className="text-2xl font-bold">$12.5M</p>
            <p className="text-sm text-green-500">+5.2%</p>
          </div>

          {/* Fifth Card - Volume 24h */}
          <div className="bg-card rounded-lg p-4 border">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              24h Volume
            </h3>
            <p className="text-2xl font-bold">$2.1M</p>
            <p className="text-sm text-red-500">-2.1%</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Section - Takes up 2/3 of the width on large screens */}
          <div className="lg:col-span-2">
            <TokenChart tokenAddress={tokenAddress} className="h-full" />
          </div>

          {/* Swap Section - Takes up 1/3 of the width on large screens */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <TokenSwap tokenAddress={tokenAddress} className="w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
