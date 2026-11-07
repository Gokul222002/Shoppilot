"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, TrendingDown, Scale, ShieldCheck, Heart, Bot, Columns } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import UserNav from "@/components/UserNav";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full bg-gray-950/95 backdrop-blur-md border-b border-gray-800/80 shadow-md">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 shrink-0 group select-none"
          aria-label="ShopPilot home"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-lg text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform duration-200">
            ✈️
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tight text-white leading-none">
              Shop<span className="text-orange-500">Pilot</span>
            </span>
            <span className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">
              Price Comparison
            </span>
          </div>
        </Link>

        {/* Central Search Bar */}
        <div className="hidden sm:block flex-1 max-w-lg mx-auto">
          <SearchBar size="sm" placeholder="Search 200+ products across 5 stores…" />
        </div>

        {/* Action Links */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/deals"
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-300 hover:text-orange-400 px-2.5 py-2 rounded-xl hover:bg-gray-900 border border-transparent hover:border-gray-800 transition-all duration-200"
          >
            <TrendingDown className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden sm:inline">Top Deals</span>
          </Link>

          <Link
            href="/search"
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-300 hover:text-orange-400 px-2.5 py-2 rounded-xl hover:bg-gray-900 border border-transparent hover:border-gray-800 transition-all duration-200"
          >
            <Scale className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Browse</span>
          </Link>

          <Link
            href="/compare-specs"
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-300 hover:text-orange-400 px-2.5 py-2 rounded-xl hover:bg-gray-900 border border-transparent hover:border-gray-800 transition-all duration-200"
          >
            <Columns className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Compare Specs</span>
          </Link>

          <Link
            href="/wishlist"
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-300 hover:text-orange-400 px-2.5 py-2 rounded-xl hover:bg-gray-900 border border-transparent hover:border-gray-800 transition-all duration-200"
          >
            <Heart className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden sm:inline">Watchlist</span>
          </Link>

          <Link
            href="/assistant"
            className="flex items-center gap-1.5 text-xs font-semibold bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white px-2.5 py-2 rounded-xl border border-orange-500/30 transition-all duration-200"
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden md:inline">AI Advisor</span>
          </Link>

          {/* User Account Nav Pill */}
          <UserNav />
        </div>
      </nav>

      {/* Mobile Search Bar Row */}
      <div className="sm:hidden px-4 pb-3 pt-1 border-t border-gray-900">
        <SearchBar size="sm" placeholder="Search products & stores…" />
      </div>
    </header>
  );
}
