"use client";

import React, { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ArrowUpDown } from "lucide-react";

interface TokenSwapProps {
  tokenAddress: string;
  className?: string;
}

export function TokenSwap({ tokenAddress, className }: TokenSwapProps) {
  const [fromAmount, setFromAmount] = useState("1.5");
  const [toAmount, setToAmount] = useState("1,963.73");
  const [isTokenToUsdt, setIsTokenToUsdt] = useState(true); // true = token to USDT, false = USDT to token

  // Token details (could be fetched based on tokenAddress in real implementation)
  const tokenSymbol = "TOKEN";
  const tokenBalance = "12.340";
  const usdtBalance = "1,250.50";

  const exchangeRate = isTokenToUsdt
    ? `1 ${tokenSymbol} = 1,309.15 USDT`
    : `1 USDT = 0.00076 ${tokenSymbol}`;
  const usdValue = "$1,967.29";
  const priceImpact = "(-0.186%)";

  const handleSwapDirection = () => {
    setIsTokenToUsdt(!isTokenToUsdt);
    // Swap the amounts
    const tempAmount = fromAmount;
    setFromAmount(toAmount);
    setToAmount(tempAmount);
  };

  const handleMaxClick = () => {
    setFromAmount(isTokenToUsdt ? tokenBalance : usdtBalance);
  };

  const fromTokenSymbol = isTokenToUsdt ? tokenSymbol : "USDT";
  const toTokenSymbol = isTokenToUsdt ? "USDT" : tokenSymbol;
  const fromTokenIcon = isTokenToUsdt ? "🟡" : "💚";
  const toTokenIcon = isTokenToUsdt ? "💚" : "🟡";
  const fromBalance = isTokenToUsdt ? tokenBalance : usdtBalance;
  const toBalance = isTokenToUsdt ? usdtBalance : tokenBalance;

  const TokenDisplay = ({ symbol, icon }: { symbol: string; icon: string }) => (
    <div className="flex items-center gap-2 h-16 px-4 py-3 bg-muted rounded-lg min-w-[120px]">
      <span className="text-lg">{icon}</span>
      <span className="font-semibold">{symbol}</span>
    </div>
  );

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
            <TokenDisplay symbol={fromTokenSymbol} icon={fromTokenIcon} />
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
                className="h-6 px-2 text-xs text-purple-400 hover:text-purple-300"
              >
                Max
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
              <Input
                type="text"
                value={toAmount}
                onChange={(e) => setToAmount(e.target.value)}
                className="text-3xl font-bold h-16 border-none text-right pr-2"
                placeholder="0.0"
              />
            </div>
            <TokenDisplay symbol={toTokenSymbol} icon={toTokenIcon} />
          </div>

          <div className="flex justify-between items-center text-sm">
            <div className="text-muted-foreground">
              {usdValue} <span className="text-red-400">{priceImpact}</span>
            </div>
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
          className="w-full h-14 text-lg font-semibold bg-red-500 text-white hover:bg-red-600"
        >
          Swap
        </Button>
      </div>
    </Card>
  );
}
