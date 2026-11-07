"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Heart,
  Bell,
  Trash2,
  ExternalLink,
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import type { WishlistItem } from "@/components/PriceAlertModal";

// Seeded defaults if the user opens wishlist for the first time
const DEMO_ITEMS: WishlistItem[] = [
  {
    productId: "ph-001",
    name: "Apple iPhone 15 128GB",
    category: "phones",
    imageUrl:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&auto=format&fit=crop&q=60",
    currentPrice: 65999,
    targetPrice: 61999,
    email: "shopper@example.com",
    createdAt: new Date().toISOString(),
    slug: "apple-iphone-15-128gb",
    cheapestStore: "Amazon.in",
    cheapestUrl: "https://www.amazon.in/s?k=Apple+iPhone+15+128GB",
  },
  {
    productId: "fn-001",
    name: "Atomberg Renesa 1200mm BLDC Smart Fan",
    category: "fans",
    imageUrl:
      "https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=500&auto=format&fit=crop&q=60",
    currentPrice: 3699,
    targetPrice: 3299,
    email: "shopper@example.com",
    createdAt: new Date().toISOString(),
    slug: "atomberg-renesa-1200mm-bldc-smart-fan",
    cheapestStore: "Amazon.in",
    cheapestUrl: "https://www.amazon.in/s?k=Atomberg+Renesa+1200mm+BLDC",
  },
];

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("shoppilot_wishlist");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
          setLoaded(true);
          return;
        }
      }
      // Use demo items if empty
      setItems(DEMO_ITEMS);
    } catch {
      setItems(DEMO_ITEMS);
    }
    setLoaded(true);
  }, []);

  function handleRemove(productId: string) {
    const updated = items.filter((i) => i.productId !== productId);
    setItems(updated);
    try {
      localStorage.setItem("shoppilot_wishlist", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  }

  const totalTrackedSavings = items.reduce(
    (acc, item) => acc + Math.max(0, item.currentPrice - item.targetPrice),
    0
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pb-24">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-orange-400 font-bold uppercase tracking-wider mb-2">
                <Heart className="w-4 h-4 fill-orange-400 text-orange-400" />
                Price Watchlist &amp; Alerts
              </div>
              <h1 className="text-3xl font-extrabold text-white">Your Tracked Products</h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                We monitor 5 stores every day. You receive an instant alert when prices drop to your
                target.
              </p>
            </div>

            {items.length > 0 && (
              <div className="bg-gray-950 border border-gray-800 p-4 rounded-2xl flex items-center gap-4">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">
                    Potential Savings
                  </span>
                  <span className="text-xl font-black text-emerald-400">
                    ₹{totalTrackedSavings.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="h-8 w-px bg-gray-800" />
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">
                    Items Tracked
                  </span>
                  <span className="text-xl font-black text-white">{items.length}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main List */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {items.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {items.map((item) => {
              const diff = item.currentPrice - item.targetPrice;
              const isMet = diff <= 0;
              const progressPct = isMet
                ? 100
                : Math.min(100, Math.round((1 - diff / item.currentPrice) * 100));

              return (
                <div
                  key={item.productId}
                  className={`relative bg-gray-900 border rounded-2xl p-5 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-5 ${
                    isMet
                      ? "border-emerald-500/60 bg-gradient-to-r from-emerald-950/20 via-gray-900 to-gray-900"
                      : "border-gray-800 hover:border-gray-700"
                  }`}
                >
                  {/* Left: Product Info */}
                  <div className="flex items-center gap-4 min-w-[300px]">
                    <div className="relative w-20 h-20 bg-gray-950 rounded-xl overflow-hidden shrink-0 border border-gray-800">
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wide">
                        {item.category}
                      </span>
                      <h3 className="text-sm font-bold text-white line-clamp-1 mt-0.5">
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                        <Link
                          href={`/compare?q=${encodeURIComponent(item.slug)}`}
                          className="text-orange-400 hover:underline flex items-center gap-0.5 font-medium"
                        >
                          Compare all stores <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Center: Target Progress */}
                  <div className="flex-1 max-w-sm space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">
                        Current:{" "}
                        <strong className="text-white">
                          ₹{item.currentPrice.toLocaleString("en-IN")}
                        </strong>
                      </span>
                      <span className="text-emerald-400 font-bold">
                        Target: ₹{item.targetPrice.toLocaleString("en-IN")}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-950 rounded-full h-2 overflow-hidden border border-gray-800">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isMet ? "bg-emerald-500" : "bg-orange-500"
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    <div className="text-[11px] text-gray-400 flex items-center justify-between">
                      {isMet ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Price Target Hit! Buy now
                        </span>
                      ) : (
                        <span>₹{diff.toLocaleString("en-IN")} away from alert threshold</span>
                      )}
                      <span className="font-mono text-gray-400">{progressPct}%</span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    <a
                      href={item.cheapestUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-orange-500 hover:bg-orange-400 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-md shadow-orange-500/20"
                    >
                      <span>Buy on {item.cheapestStore}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() => handleRemove(item.productId)}
                      className="p-2.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-xl transition-colors border border-gray-800"
                      title="Stop Tracking"
                      aria-label="Remove item from watchlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto text-gray-400">
              <Bell className="w-8 h-8 text-orange-400" />
            </div>
            <h3 className="text-xl font-bold text-white">No products being tracked yet</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Find any product you want to buy, click &quot;Compare Prices&quot;, and set a target
              price alert. We will monitor the price daily for you.
            </p>
            <div className="pt-2">
              <Link
                href="/search"
                className="bg-orange-500 hover:bg-orange-400 text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition-colors inline-block"
              >
                Browse Products
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
