/**
 * Real-Discount Detector Engine — ShopPilot
 * Analyzes advertised prices against 12 months of price history to identify:
 * - Genuine Deals (price at or near all-time low)
 * - Good Value (price noticeably below historical average)
 * - Fake Discounts (MRP was artificially inflated to exaggerate % off)
 * - Typical / Average Market Price
 */

import type { PricePoint, Offer } from "./mock-connector";

export type DiscountVerdict =
  | "GENUINE_DEAL"
  | "FAKE_DISCOUNT"
  | "GOOD_VALUE"
  | "TYPICAL_PRICE";

export interface DiscountAnalysis {
  verdict: DiscountVerdict;
  badgeLabel: string;
  badgeColor: string;
  borderColor: string;
  headline: string;
  explanation: string;
  currentPrice: number;
  lowestEver: number;
  highestEver: number;
  average90d: number;
  savingsVsAverage: number;
  isFakeDiscount: boolean;
}

export function analyzeDiscount(
  currentPrice: number,
  mrp: number,
  history: PricePoint[]
): DiscountAnalysis {
  if (!history || history.length === 0) {
    return {
      verdict: "TYPICAL_PRICE",
      badgeLabel: "Standard Price",
      badgeColor: "bg-gray-800 text-gray-300",
      borderColor: "border-gray-700",
      headline: "Regular Retail Price",
      explanation: "No historical price records available yet to verify discount authenticity.",
      currentPrice,
      lowestEver: currentPrice,
      highestEver: currentPrice,
      average90d: currentPrice,
      savingsVsAverage: 0,
      isFakeDiscount: false,
    };
  }

  const allPrices = history.map((p) => p.price);
  const lowestEver = Math.min(...allPrices);
  const highestEver = Math.max(...allPrices);

  // 90-day window
  const last90 = history.slice(-90);
  const average90d = Math.round(
    last90.reduce((acc, p) => acc + p.price, 0) / (last90.length || 1)
  );

  // 30-day window to check if baseline price recently surged
  const last30 = history.slice(-30);
  const prior60to30 = history.slice(-90, -30);
  const avgPrior = prior60to30.length
    ? prior60to30.reduce((acc, p) => acc + p.price, 0) / prior60to30.length
    : average90d;

  // Fake discount detection:
  // If the advertised MRP is significantly higher (>25%) than highest ever actual selling price,
  // or if the current price is actually higher than the recent 30-day baseline despite a "discount".
  const isInflatedMrp = mrp > highestEver * 1.35;
  const isPriceHigherThanAverageDespiteSale = currentPrice > average90d * 1.05;

  const savingsVsAverage = Math.max(0, average90d - currentPrice);

  // 1. GENUINE DEAL: Within 3% of all-time low
  if (currentPrice <= lowestEver * 1.03) {
    return {
      verdict: "GENUINE_DEAL",
      badgeLabel: "🔥 All-Time Low: Genuine Deal",
      badgeColor: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
      borderColor: "border-emerald-500/50",
      headline: "Authentic Historic Low",
      explanation: `Current price (₹${currentPrice.toLocaleString("en-IN")}) is within 3% of the lowest price recorded in the past 12 months. This is a genuine discount, not a marketing gimmick.`,
      currentPrice,
      lowestEver,
      highestEver,
      average90d,
      savingsVsAverage,
      isFakeDiscount: false,
    };
  }

  // 2. FAKE DISCOUNT: Artificial inflation
  if (isInflatedMrp && isPriceHigherThanAverageDespiteSale) {
    return {
      verdict: "FAKE_DISCOUNT",
      badgeLabel: "⚠️ Suspicious / Inflated MRP",
      badgeColor: "bg-red-500/15 text-red-400 border border-red-500/30",
      borderColor: "border-red-500/50",
      headline: "Artificially Exaggerated Discount",
      explanation: `The store claims a large discount against MRP ₹${mrp.toLocaleString("en-IN")}, but this product regularly sells for ~₹${average90d.toLocaleString("en-IN")}. Current price is actually slightly higher than average.`,
      currentPrice,
      lowestEver,
      highestEver,
      average90d,
      savingsVsAverage: 0,
      isFakeDiscount: true,
    };
  }

  // 3. GOOD VALUE: 8% or more below 90-day average
  if (currentPrice <= average90d * 0.92) {
    const pctBelow = Math.round(((average90d - currentPrice) / average90d) * 100);
    return {
      verdict: "GOOD_VALUE",
      badgeLabel: `✅ Good Value: ${pctBelow}% Below Average`,
      badgeColor: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
      borderColor: "border-blue-500/50",
      headline: "Noticeably Below Typical Market Rate",
      explanation: `Selling ₹${savingsVsAverage.toLocaleString("en-IN")} cheaper than the 90-day moving average (₹${average90d.toLocaleString("en-IN")}). A solid, verified saving.`,
      currentPrice,
      lowestEver,
      highestEver,
      average90d,
      savingsVsAverage,
      isFakeDiscount: false,
    };
  }

  // 4. TYPICAL PRICE
  return {
    verdict: "TYPICAL_PRICE",
    badgeLabel: "ℹ️ Average Market Price",
    badgeColor: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    borderColor: "border-amber-500/50",
    headline: "Fair Market Price",
    explanation: `This product is selling within normal price range (average: ₹${average90d.toLocaleString("en-IN")}). You can set a price-drop alert to get notified when a real sale begins.`,
    currentPrice,
    lowestEver,
    highestEver,
    average90d,
    savingsVsAverage: 0,
    isFakeDiscount: false,
  };
}
