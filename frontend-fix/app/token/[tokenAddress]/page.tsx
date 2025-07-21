import { TokenChart } from "@/components/shared/token-chart";
import { TokenSwap } from "@/components/shared/token-swap";

interface TokenPageProps {
  params: Promise<{
    tokenAddress: string;
  }>;
}

export default async function TokenPage({ params }: TokenPageProps) {
  const { tokenAddress } = await params;

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
                <p className="text-sm text-muted-foreground mb-1">$ROCKET</p>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  The next-generation meme token taking crypto to the moon with
                  innovative DeFi features.
                </p>

                {/* Socials */}
                <div className="flex gap-2">
                  <a
                    href="#"
                    className="text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80"
                  >
                    🌐 Website
                  </a>
                  <a
                    href="#"
                    className="text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80"
                  >
                    🐦 Twitter
                  </a>
                  <a
                    href="#"
                    className="text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80"
                  >
                    💬 Telegram
                  </a>
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
                <p className="text-sm font-mono break-all">
                  {tokenAddress.slice(0, 8)}...{tokenAddress.slice(-6)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Creator</p>
                <p className="text-sm font-mono">0x1234...5678</p>
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

// Generate metadata for the page
export async function generateMetadata({ params }: TokenPageProps) {
  const { tokenAddress } = await params;

  return {
    title: `Token ${tokenAddress.slice(0, 8)}... | Sei AgentFi`,
    description: `View detailed information and trade token ${tokenAddress}`,
  };
}
