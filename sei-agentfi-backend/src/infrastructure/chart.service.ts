import { TokenPurchase, TokenSale } from "../models/token.model";

// Constants
const FIVE_MINUTES_IN_MS = 5 * 60 * 1000; // 5 minutes in milliseconds
const FIVE_MINUTES_IN_SECONDS = 5 * 60; // 5 minutes in seconds

/**
 * Floors a timestamp to the nearest 5-minute interval
 * @param timestamp Timestamp in seconds
 * @returns Floored timestamp in seconds
 */
function floorTimestampToInterval(timestamp: number): number {
  return (
    Math.floor(timestamp / FIVE_MINUTES_IN_SECONDS) * FIVE_MINUTES_IN_SECONDS
  );
}

/**
 * Gets the current timestamp floored to a 5-minute interval
 * @returns Current time floored to the 5-minute interval, in seconds
 */
function getCurrentIntervalTimestamp(): number {
  const currentTime = Math.floor(Date.now() / 1000);
  return floorTimestampToInterval(currentTime);
}

export interface ChartDataPoint {
  time: number; // timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface ChartDataResponse {
  tokenAddress: string;
  candlestickData: ChartDataPoint[];
  interval: string; // "5m"
}

export class ChartService {
  /**
   * Get OHLC chart data for a token with 5-minute intervals
   * @param tokenAddress The token address to get chart data for
   * @param days Number of days of historical data to fetch (0 = all data, default: 0)
   * @returns Chart data with 5-minute OHLC candlesticks
   */
  static async getTokenChartData(
    tokenAddress: string,
    days: number = 0
  ): Promise<ChartDataResponse> {
    try {
      console.log(
        `🔄 Getting chart data for token: ${tokenAddress}, ${
          days === 0 ? "all historical" : days + " days"
        }`
      );

      // Calculate timestamp for the specified time range
      const nowTimestamp = Math.floor(Date.now() / 1000);
      const startTimestamp =
        days === 0 ? 0 : nowTimestamp - days * 24 * 60 * 60;

      // Get all purchases and sales for the token in the time range
      const timestampQuery =
        days === 0
          ? { tokenAddress: tokenAddress } // No timestamp filter for all historical data
          : {
              tokenAddress: tokenAddress,
              timestamp: {
                $gte: startTimestamp.toString(),
                $lte: nowTimestamp.toString(),
              },
            };

      const [purchases, sales] = await Promise.all([
        TokenPurchase.find(timestampQuery).sort({ timestamp: 1 }).lean(),

        TokenSale.find(timestampQuery).sort({ timestamp: 1 }).lean(),
      ]);

      console.log(
        `📊 Found ${purchases.length} purchases and ${sales.length} sales`
      );

      // Combine and sort all price events
      const allPriceEvents = [
        ...purchases.map((p) => ({
          timestamp: parseInt(p.timestamp),
          price: parseFloat(p.priceAfter) / 1e18, // Convert from wei to token units
          type: "purchase" as const,
        })),
        ...sales.map((s) => ({
          timestamp: parseInt(s.timestamp),
          price: parseFloat(s.priceAfter) / 1e18, // Convert from wei to token units
          type: "sale" as const,
        })),
      ].sort((a, b) => a.timestamp - b.timestamp);

      if (allPriceEvents.length === 0) {
        console.log(`⚠️ No price events found for token ${tokenAddress}`);
        return {
          tokenAddress,
          candlestickData: [],
          interval: "5m",
        };
      }

      // Generate OHLC candlestick data with gap filling
      const candlestickData = this.generateCandlestickData(allPriceEvents);

      console.log(
        `✅ Generated ${candlestickData.length} candlestick data points`
      );

      return {
        tokenAddress,
        candlestickData,
        interval: "5m",
      };
    } catch (error) {
      console.error(
        `Error getting chart data for token ${tokenAddress}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Generate candlestick OHLC data from price events with gap filling
   */
  private static generateCandlestickData(
    priceEvents: Array<{
      timestamp: number;
      price: number;
      type: "purchase" | "sale";
    }>
  ): ChartDataPoint[] {
    if (!priceEvents || priceEvents.length === 0) return [];

    console.log(
      `🔄 Generating candlestick data from ${priceEvents.length} price events`
    );

    // Determine time range: first timestamp from data to current time
    const firstEvent = priceEvents[0];
    if (!firstEvent) return [];
    const firstTimestamp = firstEvent.timestamp;
    const lastInterval = getCurrentIntervalTimestamp();

    // Round first timestamp down to nearest 5-minute interval
    const firstInterval = floorTimestampToInterval(firstTimestamp);

    // Create map for all 5-minute intervals in the time range
    const allIntervals = new Map<number, typeof priceEvents>();
    for (
      let t = firstInterval;
      t <= lastInterval;
      t += FIVE_MINUTES_IN_SECONDS
    ) {
      allIntervals.set(t, []);
    }

    // Populate intervals with actual price events
    priceEvents.forEach((event) => {
      const roundedTimestamp = floorTimestampToInterval(event.timestamp);
      const intervalEvents = allIntervals.get(roundedTimestamp);
      if (intervalEvents) {
        intervalEvents.push(event);
        allIntervals.set(roundedTimestamp, intervalEvents);
      }
    });

    // Convert to candlestick format with gap filling
    const result: ChartDataPoint[] = [];
    let previousClose: number | null = null;

    // Process intervals in chronological order
    const sortedIntervals = Array.from(allIntervals.entries()).sort(
      (a, b) => a[0] - b[0]
    );

    for (const [timestamp, events] of sortedIntervals) {
      if (events.length > 0) {
        // We have actual data for this interval
        const prices = events.map((e) => e.price);

        // Sort events by timestamp within the interval
        const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);

        // Safety checks for array access
        const firstPrice = prices[0];
        const lastEvent = sortedEvents[sortedEvents.length - 1];

        if (firstPrice !== undefined && lastEvent !== undefined) {
          const candlestick: ChartDataPoint = {
            time: timestamp,
            // Open: use previous close if available, otherwise first price in interval
            open: previousClose !== null ? previousClose : firstPrice,
            high: Math.max(...prices),
            low: Math.min(...prices),
            // Close: last price in the interval chronologically
            close: lastEvent.price,
          };

          // Update previous close for the next candle
          previousClose = candlestick.close;
          result.push(candlestick);
        }
      } else if (previousClose !== null) {
        // No data for this interval - create a flat candle that connects to previous
        const flatPrice = previousClose;

        result.push({
          time: timestamp,
          open: flatPrice,
          high: flatPrice,
          low: flatPrice,
          close: flatPrice, // Keep the same price
        });
        // Note: previousClose doesn't change since close = previousClose for a flat candle
      }
      // Skip intervals before we have any price data
    }

    console.log(
      `✅ Generated ${result.length} candlestick intervals with gap filling`
    );
    return result;
  }
}
