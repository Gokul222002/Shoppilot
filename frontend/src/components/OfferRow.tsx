"use client";

import React from "react";
import { ExternalLink, CheckCircle, Truck, Star, AlertCircle, ShieldCheck } from "lucide-react";
import type { Offer } from "@/lib/mock-connector";

interface OfferRowProps {
  offer: Offer;
  isBest?: boolean;
  productName: string;
}

const STORE_CONFIG: Record<
  string,
  {
    badgeClass: string;
    btnClass: string;
    borderClass: string;
    shortName: string;
  }
> = {
  "Amazon.in": {
    badgeClass: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
    btnClass: "bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-bold",
    borderClass: "hover:border-amber-500/40",
    shortName: "Amazon",
  },
  Flipkart: {
    badgeClass: "bg-blue-500/10 text-blue-400 border border-blue-500/30",
    btnClass: "bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold",
    borderClass: "hover:border-blue-500/40",
    shortName: "Flipkart",
  },
  Myntra: {
    badgeClass: "bg-pink-500/10 text-pink-400 border border-pink-500/30",
    btnClass: "bg-pink-600 hover:bg-pink-500 active:bg-pink-700 text-white font-semibold",
    borderClass: "hover:border-pink-500/40",
    shortName: "Myntra",
  },
  Croma: {
    badgeClass: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
    btnClass: "bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold",
    borderClass: "hover:border-emerald-500/40",
    shortName: "Croma",
  },
  "Tata CLiQ": {
    badgeClass: "bg-purple-500/10 text-purple-400 border border-purple-500/30",
    btnClass: "bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-semibold",
    borderClass: "hover:border-purple-500/40",
    shortName: "Tata CLiQ",
  },
};

export default function OfferRow({ offer, isBest = false, productName }: OfferRowProps) {
  const conf = STORE_CONFIG[offer.store] || {
    badgeClass: "bg-gray-800 text-gray-300 border border-gray-700",
    btnClass: "bg-orange-500 hover:bg-orange-400 text-white font-semibold",
    borderClass: "hover:border-orange-500/40",
    shortName: offer.store,
  };

  const deliveryText =
    offer.deliveryDays === 1
      ? "Tomorrow by 11 AM"
      : offer.deliveryDays === 2
      ? "2 business days"
      : `${offer.deliveryDays} days`;

  return (
    <div
      className={`relative flex flex-col md:flex-row md:items-center justify-between p-4 md:p-5 rounded-2xl bg-gray-900 border transition-all duration-200 gap-4 ${
        isBest
          ? "border-emerald-500/60 shadow-lg shadow-emerald-500/5 bg-gradient-to-r from-emerald-950/20 via-gray-900 to-gray-900"
          : "border-gray-800 hover:border-gray-700"
      } ${conf.borderClass}`}
    >
      {/* Best Price Tag */}
      {isBest && (
        <div className="absolute -top-3 left-4 bg-emerald-500 text-stone-950 text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md shadow-emerald-500/20">
          <ShieldCheck className="w-3 h-3" />
          Lowest Price
        </div>
      )}

      {/* Store Identity & Stock */}
      <div className="flex items-center gap-3 min-w-[180px]">
        <div className={`px-3 py-1.5 rounded-xl font-bold text-sm tracking-wide ${conf.badgeClass}`}>
          {offer.store}
        </div>
        <div className="flex flex-col text-xs text-gray-400">
          {offer.inStock ? (
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              In Stock
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-400 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              Out of stock
            </span>
          )}
          <span className="flex items-center gap-1 text-gray-400">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {offer.sellerRating} / 5 seller rating
          </span>
        </div>
      </div>

      {/* Delivery Estimate */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 md:min-w-[140px]">
        <Truck className="w-4 h-4 text-gray-400 shrink-0" />
        <div>
          <span className="text-gray-200 font-medium">{deliveryText}</span>
          <p className="text-[10px] text-gray-400">Free Standard Shipping</p>
        </div>
      </div>

      {/* Price & Discount */}
      <div className="flex items-baseline md:items-end flex-col md:text-right min-w-[140px]">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-white">
            ₹{offer.price.toLocaleString("en-IN")}
          </span>
          <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
            -{offer.discountPct}%
          </span>
        </div>
        <span className="text-xs text-gray-400 line-through">
          MRP: ₹{offer.mrp.toLocaleString("en-IN")}
        </span>
      </div>

      {/* Outbound Link Button — NEVER an internal cart, strictly external store link */}
      <div className="shrink-0 flex flex-col items-stretch md:items-end">
        <a
          href={offer.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-sm transition-all duration-200 shadow-md ${conf.btnClass}`}
        >
          <span>Buy on {conf.shortName}</span>
          <ExternalLink className="w-4 h-4" />
        </a>
        <span className="text-[10px] text-gray-400 mt-1 text-center md:text-right">
          Direct to retailer • Verified link
        </span>
      </div>
    </div>
  );
}
