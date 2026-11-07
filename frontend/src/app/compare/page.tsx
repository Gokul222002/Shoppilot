import React from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Star,
  ShieldCheck,
  ArrowLeft,
  Tag,
  Share2,
  Sparkles,
  ExternalLink,
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { MockConnector } from "@/lib/mock-connector";
import OfferRow from "@/components/OfferRow";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import ProductCard from "@/components/ProductCard";
import SearchBar from "@/components/SearchBar";
import CompareAlertButton from "@/components/CompareAlertButton";

const connector = new MockConnector();

interface ComparePageProps {
  searchParams: Promise<{ q?: string; id?: string }>;
}

export async function generateMetadata({ searchParams }: ComparePageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = params.q || params.id || "";
  let product = connector.getProductBySlug(query);
  if (!product && query) {
    const searchMatches = connector.search(query);
    if (searchMatches.length > 0) product = searchMatches[0];
  }
  if (!product) {
    product = connector.getTrending(1)[0];
  }

  if (!product) {
    return { title: "Compare Prices Across Stores — ShopPilot" };
  }

  const bestPrice = product.offers?.length
    ? Math.min(...product.offers.map((o) => o.price))
    : 0;
  const bestStore = product.offers?.length
    ? product.offers.reduce((min, o) => (o.price < min.price ? o : min)).store
    : "Multiple Stores";

  const ogUrl = `/api/og?title=${encodeURIComponent(product.name)}&price=${encodeURIComponent(
    `₹${bestPrice.toLocaleString("en-IN")}`
  )}&store=${encodeURIComponent(bestStore)}&subtitle=${encodeURIComponent(
    `${product.brand} · ${product.category} · Compare ${product.offers?.length || 3} Stores`
  )}&badge=BEST%20PRICE`;

  return {
    title: `${product.name} Best Price: ₹${bestPrice.toLocaleString(
      "en-IN"
    )} — Compare Stores | ShopPilot`,
    description: `Compare ${product.name} prices across Amazon, Flipkart, Croma and more. Best price ₹${bestPrice.toLocaleString(
      "en-IN"
    )} at ${bestStore}. 12-month price history and real-time drop alerts.`,
    openGraph: {
      title: `${product.name} — Best Price ₹${bestPrice.toLocaleString("en-IN")}`,
      description: `Find the lowest price on ${product.name}. Compare across all top stores with verified price history.`,
      images: [
        {
          url: ogUrl,
          width: 1200,
          height: 630,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} — Best Price ₹${bestPrice.toLocaleString("en-IN")}`,
      description: `Compare prices for ${product.name} across India's top retailers.`,
      images: [ogUrl],
    },
  };
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = await searchParams;
  const query = params.q || params.id || "";

  // Look up product by slug, ID, or fallback search
  let product = connector.getProductBySlug(query);
  if (!product && query) {
    const searchMatches = connector.search(query);
    if (searchMatches.length > 0) {
      product = searchMatches[0];
    }
  }

  // Fallback to first trending product if no query given
  if (!product) {
    product = connector.getTrending(1)[0];
  }

  // Sort offers by price ascending (lowest price first)
  const sortedOffers = [...product.offers].sort((a, b) => a.price - b.price);
  const bestOffer = sortedOffers[0];
  const highestOffer = sortedOffers[sortedOffers.length - 1];
  const maxSavings = highestOffer.price - bestOffer.price;
  const savingsVsMrp = bestOffer.mrp - bestOffer.price;

  // ML Recommendations & Price Forecast Intelligence
  let similarProducts = connector.getSimilar(product, 4);
  let peopleAlsoCompared: any[] = [];
  let forecastData: any = null;
  let dealIntel: any = null;

  try {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    const [simRes, compRes, foreRes, intRes] = await Promise.all([
      fetch(`${API_BASE}/api/products/${product.id}/similar?limit=4`, { next: { revalidate: 60 } }).then((r) => (r.ok ? r.json() : null)),
      fetch(`${API_BASE}/api/products/${product.id}/also-compared?limit=4`, { next: { revalidate: 60 } }).then((r) => (r.ok ? r.json() : null)),
      fetch(`${API_BASE}/api/products/${product.id}/forecast`, { next: { revalidate: 60 } }).then((r) => (r.ok ? r.json() : null)),
      fetch(`${API_BASE}/api/products/${product.id}/intelligence`, { next: { revalidate: 60 } }).then((r) => (r.ok ? r.json() : null)),
    ]);
    if (simRes?.similar_products && simRes.similar_products.length > 0) {
      similarProducts = simRes.similar_products;
    }
    if (compRes?.people_also_compared && compRes.people_also_compared.length > 0) {
      peopleAlsoCompared = compRes.people_also_compared;
    }
    if (foreRes && foreRes.status === "SUCCESS") {
      forecastData = foreRes;
    }
    if (intRes) {
      dealIntel = intRes;
    }
  } catch (err) {
    // Graceful offline fallback
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pb-20">
      {/* Top Breadcrumb & Search Bar */}
      <div className="border-b border-gray-800/80 bg-gray-950/80 sticky top-16 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Link href="/" className="hover:text-orange-400 flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Home
            </Link>
            <span>/</span>
            <Link
              href={`/search?category=${encodeURIComponent(product.category)}`}
              className="hover:text-orange-400 capitalize transition-colors"
            >
              {product.category}
            </Link>
            <span>/</span>
            <span className="text-gray-200 truncate max-w-[200px] sm:max-w-xs">{product.name}</span>
          </div>

          <div className="w-full sm:w-80">
            <SearchBar size="sm" placeholder="Compare another item…" />
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10">
        {/* SECTION 1: PRODUCT HERO */}
        <section className="bg-gray-900 border border-gray-800 rounded-3xl p-6 lg:p-8 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Product Image */}
            <div className="lg:col-span-5 relative aspect-square max-w-md mx-auto w-full bg-gray-950 rounded-2xl overflow-hidden border border-gray-800">
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
                priority
                unoptimized
              />
              <div className="absolute top-3 left-3 bg-gray-950/80 backdrop-blur-md border border-gray-700/60 text-orange-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                {product.brand}
              </div>
            </div>

            {/* Product Details & Best Price Highlight */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 rounded-full">
                    {product.category}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-gray-200">{product.rating}</span>
                    <span>({product.reviewCount.toLocaleString("en-IN")} reviews)</span>
                  </div>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                  {product.name}
                </h1>
              </div>

              {/* Tags / Specs */}
              {product.tags && product.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {product.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs text-gray-300 bg-gray-800/80 border border-gray-700/60 px-2.5 py-1 rounded-lg"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Best Price Card */}
              <div className="bg-gradient-to-br from-emerald-950/40 via-gray-950 to-gray-950 border border-emerald-500/30 rounded-2xl p-5 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-2">
                  <div>
                    <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-400">
                      Lowest Verified Price
                    </span>
                    <div className="flex items-baseline gap-3 mt-1">
                      <span className="text-3xl sm:text-4xl font-black text-white">
                        ₹{bestOffer.price.toLocaleString("en-IN")}
                      </span>
                      <span className="text-sm text-gray-400 line-through">
                        MRP: ₹{bestOffer.mrp.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-full font-bold">
                      Save ₹{savingsVsMrp.toLocaleString("en-IN")} ({bestOffer.discountPct}% OFF)
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-800/80 text-xs text-gray-400">
                  <span className="flex items-center gap-1.5 text-gray-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Best deal currently on{" "}
                    <strong className="text-white font-bold">{bestOffer.store}</strong>
                  </span>
                  {maxSavings > 0 && (
                    <span className="text-orange-400 font-medium">
                      Up to ₹{maxSavings.toLocaleString("en-IN")} cheaper than highest store
                    </span>
                  )}
                </div>

                {/* Deal Intelligence Real-Discount & Inflation Evidence */}
                {dealIntel && (
                  <div className="mt-3 pt-3 border-t border-gray-800/60">
                    {dealIntel.is_inflated ? (
                      <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Pre-Sale Inflation Warning: </span>
                          {dealIntel.inflation_evidence} Store claims {dealIntel.claimed_discount_pct}% off MRP, but real discount is only {dealIntel.real_discount_pct}% against the 60-day median (₹{dealIntel.rolling_median.toLocaleString("en-IN")}).
                        </div>
                      </div>
                    ) : dealIntel.assessment === "GENUINE" ? (
                      <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-xs text-emerald-300 flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 font-medium">
                          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                          Genuine Deal: Selling {dealIntel.real_discount_pct}% below 60-day median (₹{dealIntel.rolling_median.toLocaleString("en-IN")})
                        </span>
                        <span className="font-bold uppercase tracking-wider text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">
                          Verified Baseline
                        </span>
                      </div>
                    ) : dealIntel.assessment === "FAKE_INFLATED_MRP" ? (
                      <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/50 text-xs text-amber-300 flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Tag className="w-4 h-4 text-amber-400 shrink-0" />
                          Inflated MRP: Store claims {dealIntel.claimed_discount_pct}% off MRP, but price is near the ₹{dealIntel.rolling_median.toLocaleString("en-IN")} typical market median.
                        </span>
                        <span className="font-bold uppercase tracking-wider text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 font-mono">
                          Marketing Illusion
                        </span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Set Price Drop Alert Action */}
              <div className="flex items-center gap-3">
                <CompareAlertButton product={product} currentPrice={bestOffer.price} />
              </div>

              {/* Affiliate Disclosure */}
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Prices and stock are verified across multiple retailers. ShopPilot earns an affiliate
                commission on qualifying purchases made through our store links at zero additional cost to
                you. Always confirm final order details at the seller&apos;s checkout page.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 2: ALL STORE OFFERS */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Compare All Sellers ({sortedOffers.length})</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Sorted from lowest to highest total price including standard delivery
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {sortedOffers.map((offer, idx) => (
              <OfferRow
                key={offer.store}
                offer={offer}
                isBest={idx === 0}
                productName={product.name}
              />
            ))}
          </div>
        </section>

        {/* SECTION 3: 12-MONTH PRICE HISTORY TRACKER */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-sm font-bold text-gray-300">12-Month Price History</span>
            <Link
              href={`/price-history/${product.slug || product.id}`}
              className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 font-medium transition-colors"
            >
              <span>Dedicated Price History Page</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          <PriceHistoryChart history={product.priceHistory} currentPrice={bestOffer.price} />
        </section>

        {/* SECTION 3.5: AI PRICE FORECAST & BUY/WAIT ADVISORY (PHASE E) */}
        <section className="bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl" id="price-forecast-section">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5 border-b border-slate-800/80 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-400" />
                <h2 className="text-xl font-bold text-white">
                  Price Forecast & Purchase Advisory
                </h2>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                  Phase E: ML Intelligence
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                7-day and 30-day statistical price projection using rolling median, day-of-week modulation, and festive calendar dips.
              </p>
            </div>

            {forecastData ? (
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold tracking-wide uppercase border ${
                    forecastData.recommendation === "BUY_NOW"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : forecastData.recommendation === "WAIT"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : "bg-slate-700 text-slate-300 border-slate-600"
                  }`}
                >
                  {forecastData.recommendation === "BUY_NOW" && <Zap className="w-4 h-4 text-emerald-400" />}
                  {forecastData.recommendation === "WAIT" && <Clock className="w-4 h-4 text-amber-400" />}
                  {forecastData.recommendation === "BUY_NOW"
                    ? `RECOMMENDATION: BUY NOW (${forecastData.confidence}% Confidence)`
                    : forecastData.recommendation === "WAIT"
                    ? `RECOMMENDATION: WAIT (${forecastData.confidence}% Confidence)`
                    : "Not enough data yet"}
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-400 px-3 py-1 rounded bg-slate-800 border border-slate-700">
                Not enough data yet
              </span>
            )}
          </div>

          {forecastData ? (
            <div className="space-y-5">
              {/* One-Line Recommendation Reason */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                    Model Reasoning & Market Assessment
                  </div>
                  <p className="text-sm font-medium text-slate-200">
                    {forecastData.reason}
                  </p>
                </div>
              </div>

              {/* Price Targets Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase">Current Best Price</div>
                  <div className="text-xl font-bold text-white mt-1">
                    ₹{forecastData.current_price?.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-1 font-mono">Verified Active Seller</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase">Next 7-Day Target</div>
                  <div className="text-xl font-bold text-indigo-300 mt-1">
                    ₹{forecastData.forecast_7d?.target_price?.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">
                    {forecastData.forecast_7d?.change_pct > 0 ? `+${forecastData.forecast_7d.change_pct}%` : `${forecastData.forecast_7d?.change_pct}%`} expected change
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase">30-Day Median Price</div>
                  <div className="text-xl font-bold text-slate-300 mt-1">
                    ₹{forecastData.rolling_median_30d?.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-mono">Fair Market Baseline</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase">12-Month Lowest</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1">
                    ₹{forecastData.all_time_low?.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] text-emerald-500/80 mt-1 font-mono">Historical Floor</div>
                </div>
              </div>

              {/* Day-by-Day 7-Day Trajectory Pills */}
              {forecastData.forecast_7d?.trajectory?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center justify-between">
                    <span>Day-by-Day 7-Day Price Trajectory</span>
                    <span className="text-[11px] text-slate-500 font-mono">Confidence bounds: ±4%</span>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {forecastData.forecast_7d.trajectory.map((pt: any) => (
                      <div
                        key={pt.day}
                        className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-center"
                      >
                        <div className="text-[10px] uppercase font-bold text-slate-400">Day +{pt.day}</div>
                        <div className="text-xs font-bold text-white mt-1">
                          ₹{pt.predicted_price?.toLocaleString("en-IN")}
                        </div>
                        <div className="text-[9px] text-slate-500 mt-0.5 font-mono">
                          ₹{pt.lower_bound?.toLocaleString("en-IN")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Festival Sale Notice */}
              {forecastData.upcoming_sale && (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/50 text-xs text-amber-300 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                    <strong>Upcoming Festive Event:</strong> {forecastData.upcoming_sale.name} starts in{" "}
                    <strong>{forecastData.upcoming_sale.days_away} days</strong>. Expected festival category discount: ~{forecastData.upcoming_sale.avg_discount_pct}%.
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase">
                    Sale Calendar
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs font-mono">
              Not enough data yet. Requires at least 30 days of historical price tracking.
            </div>
          )}
        </section>

        {/* SECTION 4: SIMILAR PRODUCTS (AI VECTOR MATCHED) */}
        {similarProducts.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-400" /> Similar Products
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Vector-matched alternatives with comparable specifications and price bracket
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                AI Vector Matched
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {similarProducts.map((p: any) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* SECTION 5: PEOPLE ALSO COMPARED (CROSS-BRAND SEGMENT MATCH) */}
        {peopleAlsoCompared.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" /> People Also Compared
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Competing brands in {product.category} frequently cross-shopped in this segment
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Cross-Brand Competitors
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {peopleAlsoCompared.map((p: any) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
