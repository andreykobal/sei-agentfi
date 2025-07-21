"use client";

import React, { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
} from "lightweight-charts";
import { Card } from "../ui/card";

interface TokenChartProps {
  tokenAddress: string;
  className?: string;
}

export function TokenChart({ tokenAddress, className }: TokenChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

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
        borderColor: "rgba(197, 203, 206, 0.8)",
      },
      timeScale: {
        borderColor: "rgba(197, 203, 206, 0.8)",
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
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    // Generate dummy data
    const generateDummyData = () => {
      const data = [];
      let basePrice = 100;
      const now = new Date();

      for (let i = 30; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const timeString = date.toISOString().split("T")[0]; // YYYY-MM-DD format

        // Generate realistic OHLC data
        const volatility = 0.05; // 5% volatility
        const trend = Math.random() - 0.5;

        const open = basePrice;
        const change = (Math.random() - 0.5) * basePrice * volatility;
        const high = open + Math.abs(change) + Math.random() * basePrice * 0.02;
        const low = open - Math.abs(change) - Math.random() * basePrice * 0.02;
        const close = open + change + trend * basePrice * 0.01;

        basePrice = close;

        data.push({
          time: timeString,
          open: Number(open.toFixed(4)),
          high: Number(high.toFixed(4)),
          low: Number(low.toFixed(4)),
          close: Number(close.toFixed(4)),
        });
      }

      return data;
    };

    const dummyData = generateDummyData();
    candlestickSeries.setData(dummyData);

    // Fit content to show all data
    chart.timeScale().fitContent();

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
  }, [tokenAddress]);

  return (
    <Card className={`p-6 ${className}`}>
      <div className="mb-4">
        <h2 className="text-2xl font-bold">Price Chart</h2>
        <p className="text-muted-foreground">
          Token: {tokenAddress.slice(0, 8)}...{tokenAddress.slice(-6)}
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
