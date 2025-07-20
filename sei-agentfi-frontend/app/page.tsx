"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, Check } from "lucide-react";

export default function Home() {
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
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

    if (savedToken && savedEmail) {
      verifyCurrentToken(savedToken);
    }
  }, [searchParams]);

  const verifyMagicLinkToken = async (token: string) => {
    setIsVerifying(true);
    setMessage("");

    try {
      const response = await fetch("http://localhost:42069/auth/verify-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store the token for future API calls
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("userEmail", data.email);

        setIsAuthenticated(true);
        setUserEmail(data.email);
        setMessage("Authentication successful! Welcome to Sei AgentFi.");

        // Clean URL by removing token parameter
        window.history.replaceState({}, document.title, "/");
      } else {
        setMessage(data.error || "Authentication failed");
      }
    } catch (error) {
      console.error("Error verifying magic link:", error);
      setMessage("Network error occurred during verification");
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyCurrentToken = async (token: string) => {
    try {
      const response = await fetch("http://localhost:42069/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(true);
        setUserEmail(data.email);
      } else {
        // Token is invalid, clear storage
        localStorage.removeItem("authToken");
        localStorage.removeItem("userEmail");
      }
    } catch (error) {
      console.error("Error verifying token:", error);
      localStorage.removeItem("authToken");
      localStorage.removeItem("userEmail");
    }
  };

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "http://localhost:42069/auth/send-magic-link",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage("Magic link sent! Check your email to sign in.");
        setEmail("");
        setIsMagicLinkSent(true);
      } else {
        setMessage(data.error || "Failed to send magic link");
      }
    } catch (error) {
      console.error("Error sending magic link:", error);
      setMessage("Network error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userEmail");
    setIsAuthenticated(false);
    setUserEmail("");
    setMessage("You have been logged out");
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      // Reset states when dialog closes
      setIsMagicLinkSent(false);
      setMessage("");
      setEmail("");
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 p-4">
        <div className="flex justify-end">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="text-foreground">{userEmail}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-muted-foreground">
                  {userEmail}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  variant="destructive"
                  className="cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button variant="outline">Login</Button>
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
                    <>
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
                      {message && !isMagicLinkSent && (
                        <div className="text-center p-3 border rounded-lg">
                          <p className="text-foreground text-sm">{message}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="text-4xl font-bold text-foreground">Sei AgentFi</h1>
      </div>
    </div>
  );
}
