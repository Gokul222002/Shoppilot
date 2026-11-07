"use client";

import React from "react";
import { ExternalLink, CheckCircle, Truck, Star, AlertCircle, ShieldCheck, Tag, Clock, AlertTriangle } from "lucide-react";
import type { Offer } from "@/lib/mock-connector";
import { evaluatePriceFreshness } from "@/lib/price-freshness";

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

  const freshness = evaluatePriceFreshness(offer);

  // Construct secure click-out redirect token for affiliate tracking
  const trackingPayload = {
    store: offer.store,
    product: productName,
    url: offer.url,
    price: offer.price,
    time: Date.now(),
  };
  const tokenString = typeof window !== "undefined"
    ? window.btoa(unescape(encodeURIComponent(JSON.stringify(trackingPayload))))
    : Buffer.from(JSON.stringify(trackingPayload)).toString("base64");
  const clickOutUrl = `/go/${encodeURIComponent(tokenString)}`;

  return (
    <div
      className={`relative flex flex-col md:flex-row md:items-center justify-between p-4 md:p-5 rounded-2xl border transition-all duration-200 gap-4 ${
        freshness.isExpired
          ? "bg-gray-950/80 border-gray-800 text-gray-400 opacity-85"
          : isBest
          ? "border-emerald-500/60 shadow-lg shadow-emerald-500/5 bg-gradient-to-r from-emerald-950/20 via-gray-900 to-gray-900"
          : "bg-gray-900 border-gray-800 hover:border-gray-700"
      } ${conf.borderClass}`}
    >
      {/* Best Price / Demo Tag — Only displayed if eligible (not expired) */}
      {isBest && !freshness.isExpired && (
        <div
          className={`absolute -top-3 left-4 text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md ${
            freshness.eligibleForDealClaim
              ? "bg-emerald-500 text-stone-950 shadow-emerald-500/20"
              : "bg-amber-500/90 text-stone-950 shadow-amber-500/20"
          }`}
        >
          <ShieldCheck className="w-3 h-3" />
          {freshness.eligibleForDealClaim ? "Lowest Price" : "Demo Best Price"}
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

      {/* Delivery & Total Cost Breakdown */}
      <div className="flex flex-col gap-1 text-xs text-gray-400 md:min-w-[160px]">
        <div className="flex items-center gap-1.5">
          <Truck className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-gray-200 font-medium">{deliveryText}</span>
        </div>
        <div className="text-[11px]">
          {offer.shipping === 0 ? (
            <span className="text-emerald-400 font-medium">Total: ₹{offer.price.toLocaleString("en-IN")} (Free shipping)</span>
          ) : (
            <span>Total: ₹{(offer.price + offer.shipping).toLocaleString("en-IN")} (₹{offer.price.toLocaleString("en-IN")} + ₹{offer.shipping} delivery)</span>
          )}
        </div>
        {offer.coupon && (
          <div className="flex items-center gap-1 text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md w-fit">
            <Tag className="w-2.5 h-2.5 text-amber-400 shrink-0" />
            <span>{offer.coupon}</span>
          </div>
        )}
      </div>

      {/* Price & Discount */}
      <div className="flex items-baseline md:items-end flex-col md:text-right min-w-[140px]">
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-extrabold ${freshness.isExpired ? "text-gray-400" : "text-white"}`}>
            ₹{offer.price.toLocaleString("en-IN")}
          </span>
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md border ${
            freshness.isExpired
              ? "text-gray-400 bg-gray-800 border-gray-700"
              : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
          }`}>
            -{offer.discountPct}%
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-gray-500 line-through">
            MRP: ₹{offer.mrp.toLocaleString("en-IN")}
          </span>
          {(offer.dataSource === "demo" || !offer.dataSource) && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Demo price
            </span>
          )}
          {offer.dataSource === "live" && !freshness.isExpired && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Live price
            </span>
          )}
          {freshness.isExpired && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-gray-800 text-gray-400 border border-gray-700">
              Expired
            </span>
          )}
        </div>
        {freshness.warning && (
          <div className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md mt-1">
            <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
            <span>{freshness.warning}</span>
          </div>
        )}
        <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
          <Clock className="w-2.5 h-2.5" />
          Updated: {offer.lastUpdated}
        </span>
      </div>

      {/* Outbound Link Button — Routes through /go/[offerId] click-out tracking */}
      <div className="shrink-0 flex flex-col items-stretch md:items-end">
        <a
          href={clickOutUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
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
