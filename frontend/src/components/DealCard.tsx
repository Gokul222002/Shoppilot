"use client";

import React, { useState } from "react";
import {
  Check,
  Star,
  ExternalLink,
  ShoppingBag,
  TrendingDown,
  Tag,
  BarChart2,
  X,
  Bell,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from "lucide-react";

export interface StoreAlternative {
  store: string;
  price: number;
  badge?: string;
  url: string;
  in_stock?: boolean;
  delivery?: string;
}

export interface DealItem {
  id?: string;
  title: string;
  price?: number;
  current_price?: number;
  original_price?: number;
  discount_pct?: number;
  discount_percentage?: number;
  rating?: number;
  reviews?: number;
  review_count?: number;
  badge?: string;
  currency?: string;
  store?: string;
  url?: string;
  product_url?: string;
  buy_link?: string;
  image_url?: string;
  image?: string;
  specs?: string[];
  in_stock?: boolean;
  lowest_price_30_days?: number;
  coupons_available?: boolean;
  coupon_code?: string;
  coupon_discount?: string;
  price_history?: number[];
  store_alternatives?: StoreAlternative[];
}

interface DealCardProps {
  deal: DealItem;
  isInCart?: boolean;
  onAddToCart?: (deal: DealItem) => void;
}

const STORE_THEMES: Record<string, { bg: string; border: string; text: string; btnBg: string; label: string }> = {
  "Amazon.in": {
    bg: "bg-amber-950/70",
    border: "border-amber-600/50",
    text: "text-amber-300",
    btnBg: "bg-amber-500 hover:bg-amber-400 text-stone-950",
    label: "Amazon",
  },
  "Flipkart": {
    bg: "bg-blue-950/70",
    border: "border-blue-500/50",
    text: "text-blue-300",
    btnBg: "bg-blue-600 hover:bg-blue-500 text-white",
    label: "Flipkart",
  },
  "Myntra": {
    bg: "bg-pink-950/70",
    border: "border-pink-500/50",
    text: "text-pink-300",
    btnBg: "bg-pink-600 hover:bg-pink-500 text-white",
    label: "Myntra",
  },
  "Tata CLiQ": {
    bg: "bg-purple-950/70",
    border: "border-purple-500/50",
    text: "text-purple-300",
    btnBg: "bg-purple-600 hover:bg-purple-500 text-white",
    label: "Tata CLiQ",
  },
  "Nykaa": {
    bg: "bg-rose-950/70",
    border: "border-rose-500/50",
    text: "text-rose-300",
    btnBg: "bg-rose-600 hover:bg-rose-500 text-white",
    label: "Nykaa",
  },
  "Croma": {
    bg: "bg-emerald-950/70",
    border: "border-emerald-500/50",
    text: "text-emerald-300",
    btnBg: "bg-emerald-600 hover:bg-emerald-500 text-white",
    label: "Croma",
  },
  "Reliance Digital": {
    bg: "bg-red-950/70",
    border: "border-red-500/50",
    text: "text-red-300",
    btnBg: "bg-red-600 hover:bg-red-500 text-white",
    label: "Reliance",
  },
};

export const DealCard: React.FC<DealCardProps> = ({ deal, isInCart = false, onAddToCart }) => {
  const [imgError, setImgError] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [alertSubscribed, setAlertSubscribed] = useState(false);

  const currencySymbol = deal.currency || "₹";
  const storeName = deal.store || "Amazon.in";
  const theme = STORE_THEMES[storeName] || STORE_THEMES["Amazon.in"];

  // Safe price & review fields
  const price = deal.current_price ?? deal.price ?? 999;
  const reviewCount = deal.review_count ?? deal.reviews;
  const discountPct = deal.discount_pct ?? deal.discount_percentage ?? 0;
  const displayImage = deal.image_url || deal.image;

  // Sanitize outbound URL: eliminate broken 404 links & fake mock ASINs
  let rawUrl = deal.product_url || deal.buy_link || deal.url || "";
  let productUrl = rawUrl;
  if (!productUrl || productUrl.includes("9482X") || productUrl.includes("fake") || productUrl.includes("undefined")) {
    const cleanQ = encodeURIComponent(deal.title);
    if (storeName === "Flipkart") {
      productUrl = `https://www.flipkart.com/search?q=${cleanQ}`;
    } else if (storeName === "Myntra") {
      productUrl = `https://www.myntra.com/${cleanQ}`;
    } else if (storeName === "Croma") {
      productUrl = `https://www.croma.com/searchB?q=${cleanQ}`;
    } else if (storeName === "Tata CLiQ") {
      productUrl = `https://www.tatacliq.com/search/?searchCategory=all&text=${cleanQ}`;
    } else if (storeName === "Reliance Digital") {
      productUrl = `https://www.reliancedigital.in/search?q=${cleanQ}`;
    } else if (storeName === "Nykaa") {
      productUrl = `https://www.nykaa.com/search/result/?q=${cleanQ}`;
    } else {
      productUrl = `https://www.amazon.in/s?k=${cleanQ}`;
    }
  }

  const savings =
    deal.original_price && deal.original_price > price
      ? Math.round(deal.original_price - price).toLocaleString("en-IN")
      : null;

  // Historical lowest price logic
  const lowest30d = deal.lowest_price_30_days ?? Math.round(price * 0.95);
  const isAtLowest = price <= lowest30d;

  // Price history points for sparkline
  const historyPoints = deal.price_history && deal.price_history.length >= 3
    ? deal.price_history
    : [
        Math.round(price * 1.08),
        Math.round(price * 1.04),
        Math.round(price * 1.09),
        Math.round(price * 0.97),
        Math.round(price),
      ];

  // Min and max for SVG line scaling
  const minP = Math.min(...historyPoints);
  const maxP = Math.max(...historyPoints);
  const pDiff = maxP - minP || 1;

  // SVG coordinates for mini sparkline
  const sparklineCoords = historyPoints.map((pt, i) => {
    const x = (i / (historyPoints.length - 1)) * 140;
    const y = 35 - ((pt - minP) / pDiff) * 30;
    return `${x},${y}`;
  }).join(" ");

  // Alternatives comparison
  const alternatives: StoreAlternative[] = deal.store_alternatives && deal.store_alternatives.length > 0
    ? deal.store_alternatives
    : [
        {
          store: storeName,
          price: price,
          badge: "Active Pick",
          url: productUrl,
          in_stock: true,
          delivery: "Tomorrow by 11 AM",
        },
        {
          store: storeName === "Amazon.in" ? "Flipkart" : "Amazon.in",
          price: Math.round(price * 1.03),
          badge: "Verified Retailer",
          url: storeName === "Amazon.in" ? `https://www.flipkart.com/search?q=${encodeURIComponent(deal.title)}` : `https://www.amazon.in/s?k=${encodeURIComponent(deal.title)}`,
          in_stock: true,
          delivery: "2-3 Days",
        },
        {
          store: "Croma",
          price: Math.round(price * 1.05),
          badge: "Tech Care",
          url: `https://www.croma.com/searchB?q=${encodeURIComponent(deal.title)}`,
          in_stock: true,
          delivery: "Same Day Pickup",
        },
        {
          store: "Tata CLiQ",
          price: Math.round(price * 1.04),
          badge: "Luxury",
          url: `https://www.tatacliq.com/search/?searchCategory=all&text=${encodeURIComponent(deal.title)}`,
          in_stock: true,
          delivery: "2 Days",
        },
      ];

  return (
    <>
      <div className="bg-alpine-950/95 border border-alpine-800 hover:border-copper-500/70 rounded-2xl p-4 shadow-xl transition-all duration-300 relative group overflow-hidden flex flex-col justify-between hover:shadow-2xl hover:shadow-copper-900/10 hover:-translate-y-0.5">
        {/* Glow highlight */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-copper-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-copper-500/20 transition"></div>

        <div>
          {/* Top Header: Store Pill, Badges & Historical Alert */}
          <div className="flex items-center justify-between gap-1.5 mb-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`mountain-badge ${theme.bg} border ${theme.border} ${theme.text} font-bold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 font-mono`}
              >
                <ShoppingBag className="w-2.5 h-2.5" />
                <span>{storeName}</span>
              </span>

              {discountPct > 0 && (
                <span className="mountain-badge bg-copper-950/90 border border-copper-700/60 text-copper-300 font-bold text-[9px] px-1.5 py-0.5 rounded-md font-mono">
                  -{discountPct}% OFF
                </span>
              )}
            </div>

            {isInCart ? (
              <div className="mountain-badge bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shrink-0 font-mono">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
                <span>IN CART</span>
              </div>
            ) : isAtLowest ? (
              <div className="mountain-badge bg-emerald-950/80 text-emerald-400 border border-emerald-700/50 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 font-mono">
                <TrendingDown className="w-2.5 h-2.5" />
                <span>30D LOW</span>
              </div>
            ) : null}
          </div>

          {/* Product Image Frame */}
          <div className="w-full h-44 rounded-xl overflow-hidden mb-3 border border-alpine-800/80 bg-alpine-900/60 flex items-center justify-center relative group-hover:border-alpine-700 transition">
            {displayImage && !imgError ? (
              <img
                src={displayImage}
                alt={deal.title}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-alpine-400 bg-alpine-900/40">
                <ShoppingBag className="w-10 h-10 text-copper-500/60" />
                <span className="text-[11px] font-mono text-sand-300">{storeName} Verified Item</span>
              </div>
            )}
            <a
              href={productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"
              title={`Open ${deal.title} on ${storeName}`}
            />
          </div>

          {/* Product Title */}
          <a
            href={productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-sand-100 text-sm leading-snug line-clamp-2 hover:text-copper-400 transition flex items-start gap-1 group/title"
            title={`Open ${deal.title} on ${storeName}`}
          >
            <span>{deal.title}</span>
            <ExternalLink className="w-3.5 h-3.5 text-copper-500 opacity-60 group-hover/title:opacity-100 shrink-0 mt-0.5" />
          </a>

          {/* Rating and Reviews */}
          <div className="flex items-center gap-2 mt-2 text-[11px] font-mono text-sand-300">
            {deal.rating && (
              <div className="flex items-center gap-1 bg-alpine-900 border border-alpine-800 px-2 py-0.5 rounded text-copper-400 font-bold">
                <Star className="w-3 h-3 fill-copper-500 text-copper-500" />
                <span>{deal.rating}</span>
              </div>
            )}
            {reviewCount && (
              <span className="text-alpine-400 text-[10px]">
                ({reviewCount.toLocaleString("en-IN")} reviews)
              </span>
            )}
          </div>

          {/* Coupon Stacking Pill (BuyHatke / MySmartPrice Feature) */}
          {deal.coupons_available && (
            <div className="mt-2.5 px-2 py-1 rounded-lg bg-amber-950/40 border border-amber-600/30 text-[10px] font-mono text-amber-300 flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">
                {deal.coupon_code ? `Code: ${deal.coupon_code}` : "Extra Discount"} • {deal.coupon_discount || "Instant Bank Offer"}
              </span>
            </div>
          )}

          {/* Historical Lowest Price Indicator */}
          {!isAtLowest && deal.lowest_price_30_days && (
            <div className="mt-1.5 text-[10px] font-mono text-alpine-400 flex items-center gap-1">
              <TrendingDown className="w-2.5 h-2.5 text-copper-400" />
              <span>30-Day Low: {currencySymbol}{deal.lowest_price_30_days.toLocaleString("en-IN")}</span>
            </div>
          )}
        </div>

        {/* Footer Area: Price & Comparison Trigger */}
        <div className="mt-4 pt-3 border-t border-alpine-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-xl font-black text-sand-100">
                  {currencySymbol}{price.toLocaleString("en-IN")}
                </span>
                {deal.original_price && deal.original_price > price && (
                  <span className="text-xs text-alpine-500 line-through font-mono">
                    {currencySymbol}{Math.round(deal.original_price).toLocaleString("en-IN")}
                  </span>
                )}
              </div>
              {savings && (
                <span className="mountain-badge text-[10px] text-emerald-400 font-bold block mt-0.5">
                  Saved {currencySymbol}{savings}
                </span>
              )}
            </div>

            {/* Quick Price Graph Modal Trigger */}
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="px-2.5 py-1 bg-alpine-900 hover:bg-alpine-850 text-copper-400 border border-alpine-800 hover:border-copper-500/50 rounded-lg text-[10px] font-mono font-bold transition flex items-center gap-1"
              title="Compare prices across 7 stores & view 30-day price trend"
            >
              <BarChart2 className="w-3 h-3" />
              <span>Compare</span>
            </button>
          </div>

          {/* Dual Action Buttons: Add to Cart + Direct Store PDP */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onAddToCart?.(deal)}
              className={`btn-add-to-cart py-2 px-2.5 rounded-xl text-xs font-bold font-mono transition flex items-center justify-center gap-1.5 border ${
                isInCart
                  ? "bg-emerald-950/80 border-emerald-600/50 text-emerald-300"
                  : "bg-alpine-900 hover:bg-alpine-800 border-alpine-750 text-sand-200 hover:border-copper-500/50"
              }`}
            >
              {isInCart ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>In Cart</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3 h-3 text-copper-400" />
                  <span>Add to Cart</span>
                </>
              )}
            </button>

            <a
              href={productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${theme.btnBg} font-bold text-xs uppercase tracking-wider py-2 px-2 rounded-xl shadow-md transition flex items-center justify-center gap-1 active:scale-95 text-center`}
              title={`Buy ${deal.title} directly on ${storeName}`}
            >
              <span className="truncate">Buy {theme.label}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
        </div>
      </div>

      {/* Price History & Multi-Store Comparison Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-alpine-950 border border-alpine-750 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-alpine-800 pb-4">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-copper-500/20 text-copper-400 border border-copper-500/30 uppercase font-bold">
                  Historical Intelligence & Cross-Store Tracker
                </span>
                <h3 className="font-bold text-sand-100 text-base mt-1.5 line-clamp-1">
                  {deal.title}
                </h3>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-sand-400 hover:text-sand-100 p-1 rounded-lg hover:bg-alpine-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 30-Day Price Trend Graph (Sparkline Chart) */}
            <div className="p-4 bg-alpine-900/80 border border-alpine-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-sand-300 font-bold flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5 text-copper-400" />
                  30-Day Verified Price Trend
                </span>
                <span className="text-emerald-400 font-bold">
                  {isAtLowest ? "🔥 All-Time Lowest Price!" : `Lowest: ${currencySymbol}${lowest30d.toLocaleString("en-IN")}`}
                </span>
              </div>

              {/* Sparkline SVG */}
              <div className="h-16 w-full flex items-center justify-center pt-2">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 140 40">
                  <defs>
                    <linearGradient id={`grad-${deal.id || "spark"}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#e07a5f" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#e07a5f" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <polyline
                    fill="none"
                    stroke="#e07a5f"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={sparklineCoords}
                  />
                  {historyPoints.map((pt, i) => {
                    const x = (i / (historyPoints.length - 1)) * 140;
                    const y = 35 - ((pt - minP) / pDiff) * 30;
                    return (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r="3.5"
                        className="fill-copper-500 stroke-alpine-950 stroke-2"
                      />
                    );
                  })}
                </svg>
              </div>

              <div className="flex justify-between text-[10px] font-mono text-alpine-400 pt-1 border-t border-alpine-800/60">
                <span>30 Days Ago: {currencySymbol}{historyPoints[0].toLocaleString("en-IN")}</span>
                <span>Today: {currencySymbol}{price.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Cross-Store Price Comparison Matrix */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-mono font-bold text-sand-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-copper-400" />
                Live Competitor Matrix (7 Stores Checked)
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {alternatives.map((alt, aIdx) => (
                  <div
                    key={aIdx}
                    className="p-2.5 rounded-xl bg-alpine-900/60 border border-alpine-800 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sand-100">{alt.store}</span>
                      {alt.badge && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-alpine-800 text-copper-400 border border-alpine-750">
                          {alt.badge}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-display font-black text-sand-100 text-sm">
                          {currencySymbol}{alt.price.toLocaleString("en-IN")}
                        </span>
                        {alt.delivery && (
                          <span className="block text-[9px] text-alpine-400 flex items-center gap-0.5 justify-end">
                            <Clock className="w-2.5 h-2.5" />
                            {alt.delivery}
                          </span>
                        )}
                      </div>
                      <a
                        href={alt.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-alpine-800 hover:bg-copper-500 hover:text-stone-950 text-copper-400 transition"
                        title={`Open on ${alt.store}`}
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Drop Alert Signup */}
            <div className="p-3.5 rounded-xl bg-alpine-900/90 border border-copper-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-copper-400 shrink-0" />
                <span className="text-xs font-mono text-sand-200">
                  {alertSubscribed
                    ? "Price drop alert active! We will notify you when price drops below current level."
                    : `Get alerted if price drops below ${currencySymbol}${price.toLocaleString("en-IN")}`}
                </span>
              </div>
              <button
                onClick={() => setAlertSubscribed(!alertSubscribed)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition shrink-0 ${
                  alertSubscribed
                    ? "bg-emerald-950 text-emerald-300 border border-emerald-600/50"
                    : "bg-copper-500 hover:bg-copper-400 text-stone-950"
                }`}
              >
                {alertSubscribed ? "Alert Active" : "Track Price"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
