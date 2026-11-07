"use client";

import React from "react";
import {
  Smartphone,
  Laptop,
  Tv,
  Headphones,
  Cpu,
  Shirt,
  ShoppingBag,
  BookOpen,
  Package,
} from "lucide-react";

interface BrandedProductPlaceholderProps {
  brand: string;
  name: string;
  category: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  mobiles: Smartphone,
  laptops: Laptop,
  tvs: Tv,
  headphones: Headphones,
  appliances: Cpu,
  fashion: Shirt,
  grocery: ShoppingBag,
  books: BookOpen,
};

const BRAND_GRADIENTS: Record<string, string> = {
  realme: "from-amber-600/20 via-orange-950/40 to-gray-950",
  samsung: "from-blue-600/20 via-indigo-950/40 to-gray-950",
  apple: "from-stone-500/20 via-stone-900/40 to-gray-950",
  oneplus: "from-red-600/20 via-red-950/40 to-gray-950",
  xiaomi: "from-orange-600/20 via-stone-900/40 to-gray-950",
  redmi: "from-rose-600/20 via-stone-900/40 to-gray-950",
  boat: "from-red-700/20 via-stone-950 to-gray-950",
  sony: "from-stone-600/20 via-gray-900/40 to-gray-950",
  dell: "from-blue-700/20 via-gray-950 to-gray-950",
  hp: "from-cyan-700/20 via-gray-950 to-gray-950",
  lg: "from-rose-700/20 via-gray-950 to-gray-950",
  default: "from-orange-600/15 via-gray-900/50 to-gray-950",
};

export default function BrandedProductPlaceholder({
  brand,
  name,
  category,
  className = "",
  size = "md",
}: BrandedProductPlaceholderProps) {
  const brandKey = (brand || "").toLowerCase().trim();
  const catKey = (category || "").toLowerCase().trim();
  const Icon = CATEGORY_ICONS[catKey] || Package;
  const gradient = BRAND_GRADIENTS[brandKey] || BRAND_GRADIENTS.default;

  const iconSizes = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16",
  };

  return (
    <div
      aria-label={`${brand} ${name} product placeholder`}
      className={`relative w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-b ${gradient} border border-gray-800/80 rounded-xl select-none overflow-hidden ${className}`}
    >
      {/* Background ambient pattern */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#f97316_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      {/* Brand Watermark in background */}
      <div className="absolute top-2 left-3 text-[10px] uppercase font-mono font-black tracking-widest text-gray-400">
        {brand || "ShopPilot"}
      </div>

      {/* Category Icon */}
      <div className="relative z-10 w-16 h-16 rounded-2xl bg-gray-900/90 border border-gray-700/60 flex items-center justify-center text-orange-400 shadow-lg shadow-black/40 mb-2">
        <Icon className={iconSizes[size]} />
      </div>

      {/* Name and brand details */}
      <div className="relative z-10 text-center max-w-[90%] px-2">
        <div className="text-xs font-bold text-gray-200 line-clamp-2 leading-tight">
          {name}
        </div>
        <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-mono">
          {category} • Official Catalog Item
        </div>
      </div>
    </div>
  );
}
