"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  MessageSquare,
  TrendingUp,
  BarChart3,
  User,
  LogOut,
  Check,
  Wallet,
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

// Navigation items
const items = [
  {
    title: "Chat",
    url: "/chat",
    icon: MessageSquare,
  },
  {
    title: "Trade",
    url: "/trade",
    icon: TrendingUp,
  },
  {
    title: "Insights",
    url: "/insights",
    icon: BarChart3,
  },
];

export function AppSidebar() {
  const searchParams = useSearchParams();
  const api = useApi();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMagicLinkSent, setIsMagicLinkSent] = useState(false);

  useEffect(() => {
    // Check for magic link token in URL
    const token = searchParams.get("token");
    if (token) {
      verifyMagicLinkToken(token);
      return;
    }

    // Check if user is already authenticated
    const savedToken = localStorage.getItem("authToken");
    const savedEmail = localStorage.getItem("userEmail");
    const savedWalletAddress = localStorage.getItem("walletAddress");

    if (savedToken && savedEmail) {
      if (savedWalletAddress) {
        setWalletAddress(savedWalletAddress);
      }
      verifyCurrentToken(savedToken);
    }
  }, [searchParams]);

  const verifyMagicLinkToken = async (token: string) => {
    setIsVerifying(true);

    try {
      const response = await api.post("/auth/verify-token", { token });
      const data = response.data;

      if (response.status === 200 && data.success) {
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("userEmail", data.email);
        localStorage.setItem("walletAddress", data.walletAddress);

        setIsAuthenticated(true);
        setUserEmail(data.email);
        setWalletAddress(data.walletAddress);
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
      setIsVerifying(false);
    }
  };

  const verifyCurrentToken = async (token: string) => {
    try {
      const response = await api.get("/auth/me");

      if (response.status === 200) {
        const data = response.data;
        setIsAuthenticated(true);
        setUserEmail(data.email);
        setWalletAddress(data.walletAddress);
        localStorage.setItem("walletAddress", data.walletAddress);
      } else {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("walletAddress");
      }
    } catch (error) {
      console.error("Error verifying token:", error);
      localStorage.removeItem("authToken");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("walletAddress");
    }
  };

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

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
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("walletAddress");
    setIsAuthenticated(false);
    setUserEmail("");
    setWalletAddress("");
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

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
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
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                {isAuthenticated ? (
                  <div className="flex flex-col gap-2">
                    <SidebarMenuButton>
                      <User className="size-4" />
                      <span className="truncate">{userEmail}</span>
                    </SidebarMenuButton>
                    {walletAddress && (
                      <SidebarMenuButton
                        onClick={handleCopyWallet}
                        className="cursor-pointer hover:bg-sidebar-accent"
                      >
                        <Wallet className="size-4" />
                        <span className="text-xs font-mono">
                          {truncateWallet(walletAddress)}
                        </span>
                      </SidebarMenuButton>
                    )}
                    <SidebarMenuButton onClick={handleLogout}>
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
                      <SidebarMenuButton>
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
