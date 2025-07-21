"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
} from "lightweight-charts";
import { useApi } from "@/hooks/useApi";
import { Card } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { chatEventEmitter, CHAT_EVENTS } from "@/lib/eventEmitter";

interface TokenChartProps {
  tokenAddress: string;
  className?: string;
}

interface ChartDataPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface ChartApiResponse {
  success: boolean;
  data: {
    tokenAddress: string;
    candlestickData: ChartDataPoint[];
    interval: string;
  };
  message: string;
}

export function TokenChart({ tokenAddress, className }: TokenChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { get } = useApi();

  // Fetch chart data
  useEffect(() => {
    fetchChartData();
  }, [tokenAddress, get]);

  // Listen for chat refresh events
  useEffect(() => {
    const handleRefreshTokenData = (data: { tokenAddress?: string }) => {
      console.log(
        `[TOKEN CHART] Received refresh token data event from chat:`,
        data
      );
      // Refresh if no specific token address provided, or if it matches our current token
      if (!data.tokenAddress || data.tokenAddress === tokenAddress) {
        console.log(`[TOKEN CHART] Refreshing chart data for: ${tokenAddress}`);
        fetchChartData(true); // Silent refresh to avoid blinking
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

  const fetchChartData = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      const response = await get<ChartApiResponse>(
        `/tokens/chart/${tokenAddress}?days=7`
      );

      if (response.data.success) {
        setChartData(response.data.data.candlestickData);
      } else {
        setError("Failed to fetch chart data");
      }
    } catch (err: any) {
      console.error("Error fetching chart data:", err);
      setError("Failed to fetch chart data");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Create chart (only once)
  useEffect(() => {
    if (!chartContainerRef.current || loading) return;

    // Only create chart if it doesn't exist
    if (chartRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        textColor: "rgba(255, 255, 255, 0.9)",
        background: { type: ColorType.Solid, color: "rgba(0, 0, 0, 0)" },
        fontSize: 12,
        fontFamily: "Inter, sans-serif",
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      rightPriceScale: {
        mode: 0, // Normal mode
        autoScale: true,
        invertScale: false,
        alignLabels: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        // Configure precision for 6 decimal places
        entireTextOnly: false,
        ticksVisible: true,
        borderVisible: true,
      },
      localization: {
        // Configure price formatting to show 6 decimal places
        priceFormatter: (price: number) => {
          return price.toFixed(6);
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        horzLine: {
          visible: false,
          labelVisible: false,
        },
        vertLine: {
          visible: true,
          style: 0,
          width: 2,
          color: "rgba(32, 38, 46, 0.1)",
          labelVisible: false,
        },
      },
      grid: {
        horzLines: {
          color: "rgba(197, 203, 206, 0.1)",
        },
        vertLines: {
          color: "rgba(197, 203, 206, 0.1)",
        },
      },
    });

    // Add candlestick series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
      priceFormat: {
        type: "price",
        precision: 6,
        minMove: 0.000001,
      },
    });

    // Store refs
    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candlestickSeriesRef.current = null;
      }
    };
  }, [loading]); // Only depend on loading, not chartData

  // Update chart data silently (without recreating chart)
  useEffect(() => {
    if (!candlestickSeriesRef.current || !chartData.length || loading || error)
      return;

    // Convert timestamps to the format expected by lightweight-charts
    const formattedData = chartData.map((point) => ({
      time: point.time as any, // Cast to any to satisfy the Time type
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
    }));

    // Silently update the series data without recreating the chart
    candlestickSeriesRef.current.setData(formattedData);

    // Fit content to show all data
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [chartData, loading, error]);

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="mb-4">
          <h2 className="text-2xl font-bold">Price Chart</h2>
          <p className="text-muted-foreground">
            Token: {tokenAddress.slice(0, 8)}...{tokenAddress.slice(-6)}
          </p>
        </div>
        <div className="w-full h-[400px] rounded-lg border flex items-center justify-center">
          <div className="text-center">
            <Skeleton className="w-full h-full" />
            <p className="text-sm text-muted-foreground mt-2">
              Loading chart data...
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="mb-4">
          <h2 className="text-2xl font-bold">Price Chart</h2>
          <p className="text-muted-foreground">
            Token: {tokenAddress.slice(0, 8)}...{tokenAddress.slice(-6)}
          </p>
        </div>
        <div className="w-full h-[400px] rounded-lg border flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Chart data will appear here once trading activity begins
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="mb-4">
        <h2 className="text-2xl font-bold">Price Chart</h2>
        <p className="text-muted-foreground">
          Token: {tokenAddress.slice(0, 8)}...{tokenAddress.slice(-6)}
        </p>
        <p className="text-xs text-muted-foreground">
          30-minute intervals • {chartData.length} data points
        </p>
      </div>
      <div
        ref={chartContainerRef}
        className="w-full h-[400px] rounded-lg border"
        style={{ minHeight: "400px" }}
      />
    </Card>
  );
}
