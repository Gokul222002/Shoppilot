"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, ExternalLink, Bell, Sparkles, Layers } from "lucide-react";
import type { Product } from "@/lib/mock-connector";
import { analyzeDiscount } from "@/lib/discount-detector";
import { isPriceExpired } from "@/lib/price-freshness";
import PriceAlertModal from "./PriceAlertModal";
import BrandedProductPlaceholder from "./BrandedProductPlaceholder";

interface ProductCardProps {
  product: Product;
}

const STORE_COLORS: Record<string, string> = {
  "Amazon.in": "bg-orange-500",
  Flipkart: "bg-blue-600",
  Myntra: "bg-pink-600",
  Croma: "bg-green-600",
  "Tata CLiQ": "bg-purple-600",
};

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3 h-3 ${
            s <= Math.round(rating)
              ? "fill-orange-400 text-orange-400"
              : "fill-gray-700 text-gray-700"
          }`}
        />
      ))}
    </span>
  );
}

export default function ProductCard({ product }: ProductCardProps) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const bestOffer = product.offers.reduce((a, b) => (a.price < b.price ? a : b));
  const bestDiscount = Math.max(...product.offers.map((o) => o.discountPct));
  const isDemo = bestOffer.dataSource === "demo" || bestOffer.isDemo !== false;
  const isExpired = isPriceExpired(bestOffer);

  // Family price range calculation
  const hasMultipleVariants = Boolean(product.variants && product.variants.length > 1);
  const variantPrices = hasMultipleVariants
    ? product.variants!.map((v) => v.bestPrice || 0).filter((p) => p > 0)
    : [bestOffer.price];
  const minFamilyPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : bestOffer.price;
  const maxFamilyPrice = variantPrices.length > 0 ? Math.max(...variantPrices) : bestOffer.price;

  // Run real discount analysis only if non-demo and not expired
  const discountAnalysis = (!isDemo && !isExpired)
    ? analyzeDiscount(bestOffer.price, bestOffer.mrp, product.priceHistory)
    : { verdict: "UNKNOWN", fakeDiscountConfidence: 0, reason: "" };

  return (
    <>
      <article className={`group relative flex flex-col bg-gray-900 border rounded-2xl overflow-hidden transition-all duration-300 ${
        isExpired
          ? "border-gray-800/80 opacity-85 hover:border-gray-700"
          : "border-gray-800 hover:border-orange-500/50 hover:shadow-xl hover:shadow-orange-500/10"
      }`}>
        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
          {isDemo ? (
            <span className="bg-amber-500/90 text-stone-950 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
              Demo Price
            </span>
          ) : isExpired ? (
            <span className="bg-gray-800 text-gray-400 text-[10px] font-semibold border border-gray-700 px-2 py-0.5 rounded-full flex items-center gap-1">
              Price may have changed
            </span>
          ) : discountAnalysis.verdict === "GENUINE_DEAL" ? (
            <span className="bg-emerald-500 text-stone-950 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
              <Sparkles className="w-3 h-3" />
              All-Time Low
            </span>
          ) : bestDiscount >= 10 ? (
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              -{bestDiscount}%
            </span>
          ) : (
            <span />
          )}

          {/* Quick Alert Bell Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsAlertOpen(true);
            }}
            className="pointer-events-auto p-1.5 rounded-xl bg-gray-950/80 backdrop-blur-md border border-gray-700 text-gray-400 hover:text-orange-400 hover:border-orange-500/50 transition-colors shadow-sm"
            title="Set Price Drop Alert"
            aria-label="Set Price Drop Alert"
          >
            <Bell className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Product Image / Branded Placeholder (Fixes Defect D1) */}
        <div className="relative aspect-square w-full bg-gray-950 overflow-hidden">
          {imgError || !product.imageUrl || product.imageSource === "placeholder" || !product.imageVerified ? (
            <BrandedProductPlaceholder
              brand={product.brand}
              name={product.name}
              category={product.category}
            />
          ) : (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              onError={() => setImgError(true)}
              unoptimized
            />
          )}
        </div>

        {/* Card Content */}
        <div className="flex flex-col flex-1 p-4 gap-2.5">
          {/* Brand & Family Series */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-orange-400 uppercase tracking-wide">
              {product.brand}
            </span>
            {hasMultipleVariants && (
              <span className="text-[10px] font-medium text-gray-400 flex items-center gap-1 bg-gray-800/80 px-1.5 py-0.5 rounded">
                <Layers className="w-2.5 h-2.5" />
                {product.variants!.length} variants
              </span>
            )}
          </div>

          {/* Product Name */}
          <h3 className="text-sm font-medium text-gray-100 leading-snug line-clamp-2 min-h-[2.5rem]">
            {product.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <RatingStars rating={product.rating} />
            <span className="text-xs text-gray-400">
              {product.rating} ({product.reviewCount.toLocaleString("en-IN")})
            </span>
          </div>

          {/* Price Range for Families (Workstream 2) */}
          <div className="flex flex-col">
            {hasMultipleVariants && minFamilyPrice < maxFamilyPrice ? (
              <div className="flex flex-col">
                <span className="text-[11px] text-gray-400">From</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-white">
                    ₹{minFamilyPrice.toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs text-gray-400">
                    to ₹{maxFamilyPrice.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xl font-bold text-white">
                  ₹{bestOffer.price.toLocaleString("en-IN")}
                </span>
                <span className="text-sm text-gray-400 line-through">
                  ₹{bestOffer.mrp.toLocaleString("en-IN")}
                </span>
              </div>
            )}
          </div>

          {/* Variant Chips (Storage, RAM, Colors) */}
          {hasMultipleVariants && (
            <div className="flex flex-wrap gap-1 mt-1">
              {product.variants!.slice(0, 3).map((v) => (
                <Link
                  key={v.id}
                  href={`/compare?q=${encodeURIComponent(v.slug)}`}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                    v.id === product.id
                      ? "bg-orange-500/20 text-orange-300 border-orange-500/40 font-semibold"
                      : "bg-gray-800 text-gray-400 border-gray-700 hover:text-gray-200"
                  }`}
                >
                  {[v.storage, v.ram].filter(Boolean).join(" / ") || v.name}
                </Link>
              ))}
              {product.variants!.length > 3 && (
                <span className="text-[10px] text-gray-400 px-1 py-0.5">
                  +{product.variants!.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Store Pills */}
          <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
            {product.offers.slice(0, 3).map((offer) => (
              <span
                key={offer.store}
                className={`text-[10px] font-semibold text-white px-2 py-0.5 rounded-full ${
                  STORE_COLORS[offer.store] ?? "bg-gray-700"
                }`}
              >
                {offer.store}
              </span>
            ))}
            {product.offers.length > 3 && (
              <span className="text-[10px] text-gray-400 px-2 py-0.5 rounded-full border border-gray-700">
                +{product.offers.length - 3} more
              </span>
            )}
          </div>

          {/* CTA: Strictly Compare Prices, NEVER Add to Cart */}
          <Link
            href={`/compare?q=${encodeURIComponent(product.slug)}`}
            className="flex items-center justify-center gap-2 w-full bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors duration-200 mt-2"
          >
            Compare Prices
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </article>

      {/* Price Alert Modal */}
      <PriceAlertModal
        product={product}
        currentPrice={bestOffer.price}
        isOpen={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
      />
    </>
  );
}
