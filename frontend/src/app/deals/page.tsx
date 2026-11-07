import React from "react";
import Link from "next/link";
import {
  TrendingDown,
  Tag,
  Zap,
  Percent,
  Check,
  ShieldCheck,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { MockConnector } from "@/lib/mock-connector";
import ProductCard from "@/components/ProductCard";

const connector = new MockConnector();

const CATEGORIES = [
  { key: "all", label: "All Categories" },
  { key: "mobiles", label: "📱 Mobiles" },
  { key: "laptops", label: "💻 Laptops" },
  { key: "tvs", label: "📺 Smart TVs" },
  { key: "headphones", label: "🎧 Headphones" },
  { key: "appliances", label: "🔌 Appliances" },
  { key: "fashion", label: "👕 Fashion" },
  { key: "grocery", label: "🛒 Grocery" },
  { key: "books", label: "📚 Books" },
];

const BANK_COUPONS = [
  {
    code: "HDFC500",
    discount: "Flat ₹500 Instant Discount",
    store: "Amazon.in",
    minSpend: "Min. spend ₹4,999 on HDFC Bank Credit Cards",
  },
  {
    code: "AXIS250",
    discount: "Extra ₹250 Off on EMI",
    store: "Flipkart",
    minSpend: "On Axis Bank Credit & Debit Card EMIs",
  },
  {
    code: "FESTIVAL15",
    discount: "15% Off Up to ₹1,500",
    store: "Tata CLiQ",
    minSpend: "Applicable on Electronics & Audio gear",
  },
  {
    code: "CROMA10",
    discount: "Flat 10% Cashback",
    store: "Croma",
    minSpend: "Tata Neu HDFC Card transactions",
  },
];

interface DealsPageProps {
  searchParams: Promise<{
    category?: string;
    min_discount?: string;
  }>;
}

export default async function DealsPage({ searchParams }: DealsPageProps) {
  const params = await searchParams;
  const category = params.category && params.category !== "all" ? params.category : undefined;
  const minDiscount = params.min_discount ? parseInt(params.min_discount, 10) : 20;

  // Search by discount
  let deals = connector.search("", {
    category,
    sortBy: "discount",
  });

  // Filter by min discount
  deals = deals.filter((p) => {
    const bestDisc = Math.max(...p.offers.map((o) => o.discountPct));
    return bestDisc >= minDiscount;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pb-24 space-y-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-b from-gray-900 via-gray-950 to-gray-950 border-b border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold px-3 py-1.5 rounded-full mb-3 uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" />
              Verified Deal Hunter
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
              Today&apos;s Biggest Verified Price Drops
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-2">
              Every deal below has been verified against 12 months of price history to guarantee
              authentic savings, not inflated MRPs.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Active Bank Coupons Section */}
        <section className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-orange-400" />
              Active Bank &amp; Store Promo Codes
            </h2>
            <span className="text-xs text-gray-400">Stack these with lowest store prices</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BANK_COUPONS.map((coupon) => (
              <div
                key={coupon.code}
                className="bg-gray-950 border border-gray-800 rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-gray-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md">
                      {coupon.store}
                    </span>
                    <span className="text-xs font-mono font-bold text-white bg-gray-800 px-2 py-0.5 rounded-md border border-gray-700">
                      {coupon.code}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-gray-100">{coupon.discount}</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">{coupon.minSpend}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Filter Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Category Pills */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const isSelected = (!category && cat.key === "all") || category === cat.key;
              const href =
                cat.key === "all"
                  ? `/deals?min_discount=${minDiscount}`
                  : `/deals?category=${cat.key}&min_discount=${minDiscount}`;
              return (
                <Link
                  key={cat.key}
                  href={href}
                  className={`text-xs px-3.5 py-1.5 rounded-full transition-colors font-semibold ${
                    isSelected
                      ? "bg-orange-500 text-white"
                      : "bg-gray-900 border border-gray-800 text-gray-300 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  {cat.label}
                </Link>
              );
            })}
          </div>

          {/* Min Discount Dropdown/Pills */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
            <span>Min Discount:</span>
            {[20, 30, 40, 50].map((d) => (
              <Link
                key={d}
                href={`/deals?${category ? `category=${category}&` : ""}min_discount=${d}`}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  minDiscount === d
                    ? "bg-orange-500 text-white"
                    : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-gray-200"
                }`}
              >
                {d}%+
              </Link>
            ))}
          </div>
        </div>

        {/* Deals Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>
              Showing <strong className="text-white">{deals.length}</strong> deals with at least{" "}
              {minDiscount}% discount
            </span>
          </div>

          {deals.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {deals.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-12 text-center text-gray-400">
              <p className="text-base font-semibold text-white">No deals found for this filter</p>
              <p className="text-xs text-gray-400 mt-1">
                Try selecting a lower minimum discount percentage or choosing &quot;All
                Categories&quot;.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
