"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import {
  Rocket,
  TrendingUp,
  BarChart3,
  User,
  LogOut,
  Check,
  Wallet,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import { useUserStore } from "@/stores/userStore";
import { useBalances } from "@/hooks/useBalances";
import { chatEventEmitter, CHAT_EVENTS } from "@/lib/eventEmitter";
import { formatUnits } from "viem";

// Navigation items
const items = [
  {
    title: "Launchpad",
    url: "/",
    icon: Rocket,
  },
  {
    title: "Trade",
    url: "/trade",
    icon: TrendingUp,
  },
  {
    title: "AI Assistant",
    url: "/chat",
    icon: MessageCircle,
  },
  // {
  //   title: "Insights",
  //   url: "/insights",
  //   icon: BarChart3,
  // },
];

export function AppSidebar() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const api = useApi();

  // Zustand store
  const {
    isAuthenticated,
    userEmail,
    walletAddress,
    isLoading,
    isVerifying,
    setUserData,
    setLoading,
    setVerifying,
    logout: storeLogout,
  } = useUserStore();

  // Balance management
  const {
    ethBalance,
    usdtBalance,
    tokenBalances,
    balancesLoading,
    fetchBalances,
  } = useBalances();

  // Token balance pagination
  const [showAllTokens, setShowAllTokens] = useState(false);
  const maxTokensToShow = 10;

  // Local UI state (not shared across components)
  const [email, setEmail] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMagicLinkSent, setIsMagicLinkSent] = useState(false);

  // Refs to track processing to prevent double execution
  const hasProcessedTokenRef = useRef(false);
  const hasCheckedSavedTokenRef = useRef(false);

  useEffect(() => {
    // Check for magic link token in URL
    const token = searchParams.get("token");
    if (token && !hasProcessedTokenRef.current) {
      hasProcessedTokenRef.current = true;
      verifyMagicLinkToken(token);
      return;
    }

    // Check if user is already authenticated - only run once on mount
    if (!token && !hasCheckedSavedTokenRef.current) {
      hasCheckedSavedTokenRef.current = true;
      const savedToken = localStorage.getItem("authToken");
      if (savedToken) {
        // Get current auth state from store
        const currentAuthState = useUserStore.getState().isAuthenticated;
        if (!currentAuthState) {
          verifyCurrentToken(savedToken);
        }
      }
    }
  }, [searchParams]); // Removed isAuthenticated dependency to prevent re-runs

  // Listen for chat refresh events to update balances
  useEffect(() => {
    const handleRefreshTokenData = () => {
      console.log(
        "[SIDEBAR] Received refresh token data event from chat - refreshing balances"
      );
      // Only refresh balances if user is authenticated
      if (isAuthenticated) {
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
  }, [isAuthenticated, fetchBalances]);

  const verifyMagicLinkToken = async (token: string) => {
    setVerifying(true);

    try {
      const response = await api.post("/auth/verify-token", { token });
      const data = response.data;

      if (response.status === 200 && data.success) {
        localStorage.setItem("authToken", data.token);

        setUserData(data.email, data.walletAddress);
        toast.success("Authentication successful! Welcome to Sei AgentFi.");

        window.history.replaceState({}, document.title, "/");
      } else {
        toast.error(data.error || "Authentication failed");
      }
    } catch (error: any) {
      console.error("Error verifying magic link:", error);
      const errorMessage =
        error.response?.data?.error ||
        "Network error occurred during verification";
      toast.error(errorMessage);
    } finally {
      setVerifying(false);
    }
  };

  const verifyCurrentToken = async (token: string) => {
    try {
      const response = await api.get("/auth/me");

      if (response.status === 200) {
        const data = response.data;
        setUserData(data.email, data.walletAddress);
      } else {
        localStorage.removeItem("authToken");
        storeLogout();
      }
    } catch (error) {
      console.error("Error verifying token:", error);
      localStorage.removeItem("authToken");
      storeLogout();
    }
  };

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post("/auth/send-magic-link", { email });
      const data = response.data;

      if (response.status === 200) {
        setEmail("");
        setIsMagicLinkSent(true);
        toast.success("Magic link sent! Check your email to sign in.");
      } else {
        toast.error(data.error || "Failed to send magic link");
      }
    } catch (error: any) {
      console.error("Error sending magic link:", error);
      const errorMessage =
        error.response?.data?.error || "Network error occurred";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    storeLogout();
    toast.info("You have been logged out");
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setTimeout(() => {
        setIsMagicLinkSent(false);
        setEmail("");
      }, 150);
    }
  };

  const handleCopyWallet = async () => {
    if (walletAddress) {
      try {
        await navigator.clipboard.writeText(walletAddress);
        toast.success("Wallet address copied to clipboard!");
      } catch (error) {
        console.error("Failed to copy wallet address:", error);
        toast.error("Failed to copy wallet address");
      }
    }
  };

  const truncateWallet = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 5)}...${address.slice(-5)}`;
  };

  const formatTokenBalance = (balance: string, decimals: number) => {
    try {
      const formatted = parseFloat(formatUnits(BigInt(balance), decimals));
      if (formatted === 0) return "0";
      if (formatted < 0.001) return "<0.001";
      return formatted.toFixed(3);
    } catch {
      return "0";
    }
  };

  const visibleTokenBalances = showAllTokens
    ? tokenBalances
    : tokenBalances.slice(0, maxTokensToShow);

  const hasMoreTokens = tokenBalances.length > maxTokensToShow;

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-zinc-900/50">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-purple-600 text-sidebar-primary-foreground">
                <TrendingUp className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Sei AgentFi</span>
                <span className="truncate text-xs">Platform</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                let isActive = pathname === item.url;

                // Special case for Trade: also active on /token paths
                if (item.url === "/trade") {
                  isActive =
                    pathname === "/trade" || pathname.startsWith("/token");
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a
                        href={item.url}
                        className={
                          isActive
                            ? "bg-zinc-900/50 dark:bg-zinc-900/50 text-sidebar-accent-foreground font-medium"
                            : "hover:bg-zinc-900/50"
                        }
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                {isAuthenticated ? (
                  <div className="flex flex-col gap-2">
                    <SidebarMenuButton className="hover:bg-zinc-900/50">
                      <User className="size-4" />
                      <span className="truncate">{userEmail}</span>
                    </SidebarMenuButton>
                    {walletAddress && (
                      <SidebarMenuButton
                        onClick={handleCopyWallet}
                        className="cursor-pointer hover:bg-zinc-900/50"
                      >
                        <Wallet className="size-4" />
                        <span className="text-xs font-mono">
                          {truncateWallet(walletAddress)}
                        </span>
                      </SidebarMenuButton>
                    )}

                    {/* Balance Display */}
                    <div className="px-3 py-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-foreground">
                          SEI Balance:
                        </span>
                        <div className="flex items-center gap-1">
                          {balancesLoading ? (
                            <div className="w-12 h-3 bg-muted animate-pulse rounded"></div>
                          ) : (
                            <span className="text-xs font-mono">
                              {ethBalance}
                            </span>
                          )}
                          <button
                            onClick={fetchBalances}
                            className="text-xs text-foreground hover:text-foreground"
                            title="Refresh balance"
                          >
                            ↻
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-foreground">
                          USDT Balance:
                        </span>
                        <div className="flex items-center gap-1">
                          {balancesLoading ? (
                            <div className="w-12 h-3 bg-muted animate-pulse rounded"></div>
                          ) : (
                            <span className="text-xs font-mono">
                              {usdtBalance}
                            </span>
                          )}
                          <button
                            onClick={fetchBalances}
                            className="text-xs text-foreground hover:text-foreground"
                            title="Refresh balance"
                          >
                            ↻
                          </button>
                        </div>
                      </div>

                      {/* Token Balances */}
                      {tokenBalances.length > 0 && (
                        <div className="space-y-1 pt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-foreground font-semibold">
                              Token Balances:
                            </span>
                            <button
                              onClick={fetchBalances}
                              className="text-xs text-muted-foreground hover:text-foreground"
                              title="Refresh balances"
                            >
                              ↻
                            </button>
                          </div>
                          {balancesLoading ? (
                            <div className="space-y-1">
                              {[
                                ...Array(Math.min(3, tokenBalances.length)),
                              ].map((_, i) => (
                                <div
                                  key={i}
                                  className="w-full h-3 bg-muted animate-pulse rounded"
                                ></div>
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {visibleTokenBalances.map((token) => (
                                <div
                                  key={token.tokenAddress}
                                  className="flex items-center justify-between"
                                >
                                  <span
                                    className="text-xs text-foreground truncate max-w-[60px]"
                                    title={token.name}
                                  >
                                    {token.symbol}:
                                  </span>
                                  <span className="text-xs font-mono">
                                    {formatTokenBalance(
                                      token.balance,
                                      token.decimals
                                    )}
                                  </span>
                                </div>
                              ))}
                              {hasMoreTokens && !showAllTokens && (
                                <button
                                  onClick={() => setShowAllTokens(true)}
                                  className="text-xs text-blue-500 hover:text-blue-400 w-full text-left"
                                >
                                  +{tokenBalances.length - maxTokensToShow} more
                                  tokens...
                                </button>
                              )}
                              {showAllTokens && hasMoreTokens && (
                                <button
                                  onClick={() => setShowAllTokens(false)}
                                  className="text-xs text-blue-500 hover:text-blue-400 w-full text-left"
                                >
                                  Show less
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <SidebarMenuButton
                      onClick={handleLogout}
                      className="hover:bg-zinc-900/50"
                    >
                      <LogOut className="size-4" />
                      <span>Sign out</span>
                    </SidebarMenuButton>
                  </div>
                ) : (
                  <Dialog
                    open={isDialogOpen}
                    onOpenChange={handleDialogOpenChange}
                  >
                    <DialogTrigger asChild>
                      <SidebarMenuButton className="bg-white text-black hover:bg-white/80 hover:text-black">
                        <User className="size-4" />
                        <span>Login</span>
                      </SidebarMenuButton>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Sign in to Sei AgentFi</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        {isVerifying ? (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                            <p className="text-foreground font-medium">
                              Verifying your magic link...
                            </p>
                            <p className="text-muted-foreground text-sm">
                              Please wait while we authenticate you.
                            </p>
                          </div>
                        ) : isMagicLinkSent ? (
                          <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-500">
                              <Check className="w-8 h-8 text-green-500" />
                            </div>
                            <p className="text-foreground font-medium mb-2">
                              Magic link sent!
                            </p>
                            <p className="text-muted-foreground text-sm">
                              Check your email to sign in.
                            </p>
                          </div>
                        ) : (
                          <form
                            onSubmit={handleSendMagicLink}
                            className="space-y-4"
                          >
                            <div>
                              <label
                                htmlFor="email"
                                className="block text-sm font-medium text-foreground mb-2"
                              >
                                Email address
                              </label>
                              <Input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="your@email.com"
                              />
                            </div>
                            <Button
                              type="submit"
                              disabled={isLoading}
                              className="w-full"
                            >
                              {isLoading ? (
                                <div className="flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                  Sending...
                                </div>
                              ) : (
                                "Send Magic Link"
                              )}
                            </Button>
                          </form>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
