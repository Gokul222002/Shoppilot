import React, { Suspense } from "react";
import Link from "next/link";
import { Zap, ShieldCheck, TrendingDown, Store, ArrowRight, CheckCircle2 } from "lucide-react";
import { MockConnector } from "@/lib/mock-connector";
import ProductCard from "@/components/ProductCard";
import SearchBar from "@/components/SearchBar";

const connector = new MockConnector();

const CATEGORIES = [
  { key: "phones", label: "📱 Phones" },
  { key: "laptops", label: "💻 Laptops" },
  { key: "earphones", label: "🎧 Earphones" },
  { key: "fans", label: "🌀 Fans" },
  { key: "speakers", label: "🔊 Speakers" },
  { key: "keyboards", label: "⌨️ Keyboards" },
  { key: "mice", label: "🖱️ Mice" },
  { key: "kitchen", label: "🍳 Kitchen" },
];

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-gray-900 via-gray-950 to-gray-950 border-b border-gray-800">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-orange-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <Zap className="w-3.5 h-3.5" />
          Multi-Store Price Comparison Engine
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-5 leading-tight tracking-tight">
          Find the{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500">
            Lowest Real Price
          </span>
          <br />
          Across Every Indian Retailer
        </h1>

        <p className="text-gray-400 text-base sm:text-lg mb-8 max-w-2xl mx-auto">
          Instantly compare live prices across Amazon.in, Flipkart, Croma, Myntra &amp; Tata CLiQ.
          12-month historical price tracking prevents fake sales.
        </p>

        {/* Central Search Bar */}
        <div className="max-w-2xl mx-auto">
          <SearchBar
            size="lg"
            placeholder="Search for iPhone 15, Atomberg BLDC fan, boAt earbuds, Borosil bowl…"
          />
        </div>

        {/* Popular Category Chips */}
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          <span className="text-xs text-gray-500 self-center mr-1">Popular:</span>
          {CATEGORIES.slice(0, 6).map((cat) => (
            <Link
              key={cat.key}
              href={`/search?category=${cat.key}`}
              className="text-xs bg-gray-900/80 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-orange-400 px-3 py-1 rounded-full transition-colors"
            >
              {cat.label}
            </Link>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center gap-6 mt-10 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            100% Free • No Sign-Up Needed
          </span>
          <span className="flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4 text-blue-400" />
            Real 12-Month Price History
          </span>
          <span className="flex items-center gap-1.5">
            <Store className="w-4 h-4 text-orange-400" />
            5 Connected Indian Retailers
          </span>
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const topDeals = connector.getTopDeals(8);
  const trending = connector.getTrending(12);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pb-20 space-y-14">
      <HeroSection />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
        {/* SECTION 1: TODAY'S BIGGEST PRICE DROPS */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">
                <TrendingDown className="w-4 h-4" />
                Verified Maximum Savings
              </div>
              <h2 className="text-2xl font-black text-white">🔥 Today&apos;s Biggest Price Drops</h2>
            </div>
            <Link
              href="/search?sort_by=discount"
              className="text-xs sm:text-sm font-semibold text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors"
            >
              View all deals <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {topDeals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        {/* SECTION 2: HOW SHOPPILOT WORKS */}
        <section className="bg-gradient-to-r from-gray-900 via-gray-900 to-gray-950 border border-gray-800 rounded-3xl p-8 sm:p-10">
          <div className="text-center max-w-xl mx-auto mb-8">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Why 200,000+ Shoppers Check ShopPilot First
            </h3>
            <p className="text-xs sm:text-sm text-gray-400">
              Never pay inflated prices again. We aggregate all major retailers in real-time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-gray-950/60 border border-gray-800 p-5 rounded-2xl space-y-2">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-400 font-black text-sm flex items-center justify-center">
                1
              </div>
              <h4 className="text-base font-bold text-white">Universal Store Comparison</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                One query searches Amazon.in, Flipkart, Croma, Myntra, and Tata CLiQ simultaneously so
                you never have to open 10 tabs.
              </p>
            </div>

            <div className="bg-gray-950/60 border border-gray-800 p-5 rounded-2xl space-y-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 font-black text-sm flex items-center justify-center">
                2
              </div>
              <h4 className="text-base font-bold text-white">Fake Discount Detector</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Stores artificially raise MRP before festive sales. Our 12-month price chart reveals
                genuine all-time lows from marketing tricks.
              </p>
            </div>

            <div className="bg-gray-950/60 border border-gray-800 p-5 rounded-2xl space-y-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 font-black text-sm flex items-center justify-center">
                3
              </div>
              <h4 className="text-base font-bold text-white">Zero Cart • Direct Retailer Links</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                We are 100% neutral and never sell products. Click straight to the seller’s verified
                store page to complete your order safely.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 3: TRENDING PRODUCTS ACROSS INDIA */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">
                Most Popular
              </div>
              <h2 className="text-2xl font-black text-white">📈 Trending Across All Stores</h2>
            </div>
            <Link
              href="/search?sort_by=rating"
              className="text-xs sm:text-sm font-semibold text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors"
            >
              Browse all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {trending.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
