"use client";

import React, { useState, useMemo } from "react";
import { TrendingDown, TrendingUp, AlertCircle, Sparkles, Calendar } from "lucide-react";
import type { PricePoint } from "@/lib/mock-connector";

interface PriceHistoryChartProps {
  history: PricePoint[];
  currentPrice: number;
}

type Timeframe = "7d" | "30d" | "90d" | "1y";

export default function PriceHistoryChart({ history, currentPrice }: PriceHistoryChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("90d");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Filter points based on timeframe
  const filteredData = useMemo(() => {
    if (!history || history.length === 0) return [];
    const countMap: Record<Timeframe, number> = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
      "1y": 365,
    };
    const count = countMap[timeframe];
    return history.slice(-count);
  }, [history, timeframe]);

  // Calculate stats
  const { minPrice, maxPrice, avgPrice, lowestEver, highestEver } = useMemo(() => {
    if (filteredData.length === 0) {
      return { minPrice: 0, maxPrice: 0, avgPrice: 0, lowestEver: 0, highestEver: 0 };
    }
    const prices = filteredData.map((d) => d.price);
    const allPrices = history.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    const lowAll = Math.min(...allPrices);
    const highAll = Math.max(...allPrices);
    return {
      minPrice: min,
      maxPrice: max,
      avgPrice: avg,
      lowestEver: lowAll,
      highestEver: highAll,
    };
  }, [filteredData, history]);

  // Real-Discount Detector Assessment
  const discountAssessment = useMemo(() => {
    if (currentPrice <= lowestEver) {
      return {
        type: "GENUINE_STEAL",
        badge: "🔥 ALL-TIME LOW: GENUINE DEAL",
        color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        desc: "Current price is at or below the lowest recorded price in 12 months. Excellent time to buy.",
      };
    }
    if (currentPrice < avgPrice) {
      const pct = Math.round(((avgPrice - currentPrice) / avgPrice) * 100);
      return {
        type: "GOOD_DEAL",
        badge: `✅ REAL DISCOUNT: ${pct}% BELOW TYPICAL`,
        color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
        desc: `This item is ₹${(avgPrice - currentPrice).toLocaleString("en-IN")} cheaper than its regular 90-day average.`,
      };
    }
    return {
      type: "NORMAL_PRICE",
      badge: "ℹ️ REGULAR MARKET PRICE",
      color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      desc: "Currently selling near its average price. Set a price drop alert if you're not in a hurry.",
    };
  }, [currentPrice, lowestEver, avgPrice]);

  // SVG Chart Dimensions & Path Generation
  const svgWidth = 800;
  const svgHeight = 240;
  const paddingX = 40;
  const paddingY = 30;

  const chartPoints = useMemo(() => {
    if (filteredData.length < 2) return [];
    const width = svgWidth - paddingX * 2;
    const height = svgHeight - paddingY * 2;
    const priceRange = maxPrice === minPrice ? 1 : maxPrice - minPrice;

    return filteredData.map((d, i) => {
      const x = paddingX + (i / (filteredData.length - 1)) * width;
      const y = paddingY + height - ((d.price - minPrice) / priceRange) * height;
      return { x, y, price: d.price, date: d.date };
    });
  }, [filteredData, minPrice, maxPrice]);

  // Construct SVG paths
  const linePath = useMemo(() => {
    if (chartPoints.length < 2) return "";
    return chartPoints.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, "");
  }, [chartPoints]);

  const areaPath = useMemo(() => {
    if (chartPoints.length < 2) return "";
    const first = chartPoints[0];
    const last = chartPoints[chartPoints.length - 1];
    const bottom = svgHeight - paddingY;
    return `${linePath} L ${last.x} ${bottom} L ${first.x} ${bottom} Z`;
  }, [linePath, chartPoints]);

  const activePoint = hoverIndex !== null && chartPoints[hoverIndex] ? chartPoints[hoverIndex] : null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-6">
      {/* Top Header & Range Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white">Historical Price Tracker</h3>
            <span className="text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-medium">
              12 Months Recorded
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Track daily market price movements to identify fake sales vs real discounts.
          </p>
        </div>

        {/* Timeframe switcher */}
        <div className="flex items-center bg-gray-950 p-1 rounded-xl border border-gray-800 self-start sm:self-auto">
          {(["7d", "30d", "90d", "1y"] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => {
                setTimeframe(tf);
                setHoverIndex(null);
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg uppercase transition-all duration-150 ${
                timeframe === tf
                  ? "bg-orange-500 text-white shadow"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Real-Discount Detection Banner */}
      <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${discountAssessment.color}`}>
        <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="text-xs">
          <div className="font-bold tracking-wide uppercase">{discountAssessment.badge}</div>
          <p className="text-gray-300 mt-0.5">{discountAssessment.desc}</p>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-950/70 p-3.5 rounded-xl border border-gray-800/80">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Current Best</span>
          <div className="text-base sm:text-lg font-extrabold text-white mt-0.5">
            ₹{currentPrice.toLocaleString("en-IN")}
          </div>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">Lowest in Period</span>
          <div className="text-base sm:text-lg font-extrabold text-emerald-400 mt-0.5">
            ₹{minPrice.toLocaleString("en-IN")}
          </div>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Average Price</span>
          <div className="text-base sm:text-lg font-bold text-gray-200 mt-0.5">
            ₹{avgPrice.toLocaleString("en-IN")}
          </div>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-red-400">Highest in Period</span>
          <div className="text-base sm:text-lg font-bold text-red-400 mt-0.5">
            ₹{maxPrice.toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      {/* SVG Interactive Chart */}
      <div className="relative w-full overflow-hidden bg-gray-950/90 rounded-xl border border-gray-800/80 p-2">
        {/* Tooltip */}
        {activePoint && (
          <div
            className="absolute top-4 left-6 bg-gray-900 border border-orange-500/40 px-3 py-1.5 rounded-lg shadow-xl pointer-events-none text-xs z-10"
          >
            <div className="text-gray-400 font-mono text-[11px] flex items-center gap-1">
              <Calendar className="w-3 h-3 text-orange-400" />
              {activePoint.date}
            </div>
            <div className="font-extrabold text-orange-400 text-sm">
              ₹{activePoint.price.toLocaleString("en-IN")}
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-48 sm:h-60 overflow-visible"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = paddingY + (svgHeight - paddingY * 2) * pct;
            const pVal = Math.round(maxPrice - (maxPrice - minPrice) * pct);
            return (
              <g key={pct}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  stroke="#374151"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 8}
                  y={y + 4}
                  fill="#9ca3af"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="sans-serif"
                >
                  ₹{pVal.toLocaleString("en-IN")}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={areaPath} fill="url(#chartGradient)" />

          {/* Main Price Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#f97316"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Active Hover Point */}
          {activePoint && (
            <g>
              <line
                x1={activePoint.x}
                y1={paddingY}
                x2={activePoint.x}
                y2={svgHeight - paddingY}
                stroke="#f97316"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="6"
                fill="#f97316"
                stroke="#111827"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Invisible interactive vertical hover slices */}
          {chartPoints.map((pt, i) => {
            const sliceWidth = (svgWidth - paddingX * 2) / chartPoints.length;
            return (
              <rect
                key={i}
                x={pt.x - sliceWidth / 2}
                y={paddingY}
                width={sliceWidth}
                height={svgHeight - paddingY * 2}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(i)}
              />
            );
          })}
        </svg>

        {/* Date Labels at Bottom */}
        <div className="flex justify-between px-10 text-[10px] text-gray-400 font-mono mt-1">
          <span>{filteredData[0]?.date}</span>
          <span>{filteredData[Math.floor(filteredData.length / 2)]?.date}</span>
          <span>{filteredData[filteredData.length - 1]?.date}</span>
        </div>
      </div>
    </div>
  );
}
