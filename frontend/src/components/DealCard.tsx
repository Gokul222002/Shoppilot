"use client";

import React from "react";
import { Tag, Check, Star } from "lucide-react";

export interface DealItem {
  title: string;
  price: number;
  original_price?: number;
  discount_percentage?: number;
  rating?: number;
  currency?: string;
  url?: string;
  image_url?: string;
}

interface DealCardProps {
  deal: DealItem;
  isInCart?: boolean;
}

export const DealCard: React.FC<DealCardProps> = ({ deal, isInCart = true }) => {
  const currencySymbol = deal.currency || "₹";
  const savings = deal.original_price && deal.original_price > deal.price
    ? (deal.original_price - deal.price).toLocaleString("en-IN")
    : null;

  return (
    <div className="bg-alpine-950/90 border border-alpine-800 hover:border-copper-500/60 rounded-xl p-4 shadow-xl transition-all duration-300 relative group overflow-hidden">
      {/* Subtle warm glow highlight */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-copper-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-copper-500/20 transition"></div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="mountain-badge bg-alpine-850 border border-alpine-750 text-copper-400 font-bold text-[9px] px-2 py-0.5 rounded flex items-center gap-1">
              <Tag className="w-2.5 h-2.5 text-copper-500" /> MATCHED SPEC
            </span>
            {deal.discount_percentage && (
              <span className="mountain-badge bg-copper-950/80 border border-copper-700/60 text-copper-300 font-bold text-[9px] px-2 py-0.5 rounded">
                -{deal.discount_percentage}% OFF
              </span>
            )}
          </div>
          <h4 className="font-bold text-sand-100 text-sm leading-snug line-clamp-2">
            {deal.title}
          </h4>
        </div>

        {isInCart && (
          <div className="mountain-badge bg-alpine-800 text-sand-100 border border-copper-500/40 text-[9px] font-bold px-2.5 py-1 rounded flex items-center gap-1 shrink-0">
            <Check className="w-3 h-3 text-copper-500 stroke-[3]" />
            <span>IN CART</span>
          </div>
        )}
      </div>

      {/* Price & Savings */}
      <div className="mt-3.5 pt-3 border-t border-alpine-800 flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-black text-sand-100">
              {currencySymbol}{deal.price.toLocaleString("en-IN")}
            </span>
            {deal.original_price && (
              <span className="text-xs text-alpine-500 line-through font-mono">
                {currencySymbol}{deal.original_price.toLocaleString("en-IN")}
              </span>
            )}
          </div>
          {savings && (
            <span className="mountain-badge text-[10px] text-copper-400 font-bold block mt-0.5">
              Saved {currencySymbol}{savings} vs standard retail
            </span>
          )}
        </div>

        {deal.rating && (
          <div className="flex items-center gap-1 bg-alpine-850 text-sand-200 border border-alpine-750 px-2 py-1 rounded text-xs font-mono">
            <Star className="w-3.5 h-3.5 fill-copper-500 text-copper-500" />
            <span>{deal.rating}</span>
          </div>
        )}
      </div>
    </div>
  );
};
