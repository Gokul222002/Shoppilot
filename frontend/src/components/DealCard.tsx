"use client";

import React, { useState } from "react";
import { Tag, Check, Star, ExternalLink, ShoppingBag } from "lucide-react";

export interface DealItem {
  id?: string;
  title: string;
  price: number;
  original_price?: number;
  discount_percentage?: number;
  rating?: number;
  reviews?: number;
  badge?: string;
  currency?: string;
  store?: string;
  url?: string;
  image_url?: string;
  specs?: string[];
}

interface DealCardProps {
  deal: DealItem;
  isInCart?: boolean;
}

const STORE_THEMES: Record<string, { bg: string; border: string; text: string; btnBg: string; label: string }> = {
  "Amazon.in": {
    bg: "bg-amber-950/70",
    border: "border-amber-600/50",
    text: "text-amber-300",
    btnBg: "bg-amber-500 hover:bg-amber-400 text-stone-950",
    label: "Amazon.in",
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

export const DealCard: React.FC<DealCardProps> = ({ deal, isInCart = false }) => {
  const [imgError, setImgError] = useState(false);
  const currencySymbol = deal.currency || "₹";
  const storeName = deal.store || "Amazon.in";
  const theme = STORE_THEMES[storeName] || STORE_THEMES["Amazon.in"];
  const productUrl = deal.url || `https://www.amazon.in/s?k=${encodeURIComponent(deal.title)}`;

  const savings = deal.original_price && deal.original_price > deal.price
    ? (deal.original_price - deal.price).toLocaleString("en-IN")
    : null;

  return (
    <div className="bg-alpine-950/95 border border-alpine-800 hover:border-copper-500/70 rounded-xl p-4 shadow-xl transition-all duration-300 relative group overflow-hidden flex flex-col justify-between hover:shadow-2xl hover:shadow-copper-900/10">
      {/* Subtle warm glow highlight */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-copper-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-copper-500/20 transition"></div>

      <div>
        {/* Top Badges & Store Identity */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Store Identification Pill */}
            <span className={`mountain-badge ${theme.bg} border ${theme.border} ${theme.text} font-bold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1`}>
              <ShoppingBag className="w-2.5 h-2.5" />
              <span>{storeName}</span>
            </span>

            {/* Custom Deal Badge */}
            {deal.badge && (
              <span className="mountain-badge bg-alpine-850 border border-alpine-750 text-copper-400 font-bold text-[9px] px-2 py-0.5 rounded-md">
                {deal.badge}
              </span>
            )}

            {/* Discount Percentage Pill */}
            {deal.discount_percentage && deal.discount_percentage > 0 && (
              <span className="mountain-badge bg-copper-950/90 border border-copper-700/60 text-copper-300 font-bold text-[9px] px-2 py-0.5 rounded-md font-mono">
                -{deal.discount_percentage}% OFF
              </span>
            )}
          </div>

          {isInCart && (
            <div className="mountain-badge bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shrink-0 font-mono">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
              <span>IN CART</span>
            </div>
          )}
        </div>

        {/* Thumbnail + Title Row */}
        <div className="flex items-start gap-3">
          {deal.image_url && !imgError && (
            <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-alpine-800 bg-alpine-900 flex items-center justify-center">
              <img
                src={deal.image_url}
                alt={deal.title}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* Product Title (Clickable link to external store) */}
            <a
              href={productUrl}
              target="_blank"
              rel="noreferrer"
              className="font-bold text-sand-100 text-sm leading-snug line-clamp-2 hover:text-copper-400 transition flex items-start gap-1 group/title"
              title={`Open ${deal.title} on ${storeName}`}
            >
              <span>{deal.title}</span>
              <ExternalLink className="w-3 h-3 text-copper-500 opacity-60 group-hover/title:opacity-100 shrink-0 mt-0.5" />
            </a>

            {/* Rating and Reviews */}
            {deal.rating && (
              <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono text-sand-300">
                <div className="flex items-center gap-0.5 bg-alpine-900 border border-alpine-800 px-1.5 py-0.5 rounded text-copper-400">
                  <Star className="w-3 h-3 fill-copper-500 text-copper-500" />
                  <span className="font-bold">{deal.rating}</span>
                </div>
                {deal.reviews && (
                  <span className="text-alpine-400 text-[10px]">
                    ({deal.reviews.toLocaleString("en-IN")} reviews)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Specs Pill List */}
        {deal.specs && deal.specs.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2.5">
            {deal.specs.slice(0, 3).map((spec, sIdx) => (
              <span key={sIdx} className="text-[10px] font-mono bg-alpine-900/90 border border-alpine-800 text-alpine-300 px-2 py-0.5 rounded">
                {spec}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Price, Savings & Buy Button */}
      <div className="mt-3 pt-3 border-t border-alpine-800/80 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-xl sm:text-2xl font-black text-sand-100">
              {currencySymbol}{deal.price.toLocaleString("en-IN")}
            </span>
            {deal.original_price && deal.original_price > deal.price && (
              <span className="text-xs text-alpine-500 line-through font-mono">
                {currencySymbol}{deal.original_price.toLocaleString("en-IN")}
              </span>
            )}
          </div>
          {savings && (
            <span className="mountain-badge text-[10px] text-emerald-400 font-bold block mt-0.5">
              Saved {currencySymbol}{savings} vs standard retail
            </span>
          )}
        </div>

        {/* Direct Action: Open Real Store Button */}
        <a
          href={productUrl}
          target="_blank"
          rel="noreferrer"
          className={`${theme.btnBg} font-bold text-xs uppercase tracking-wider px-3.5 py-2 rounded-lg shadow-md transition flex items-center gap-1.5 active:scale-95 shrink-0`}
          title={`Buy ${deal.title} on ${storeName}`}
        >
          <span>Buy on {theme.label}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
