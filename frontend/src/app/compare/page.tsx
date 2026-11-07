import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, ShieldCheck, ArrowLeft, Tag, Share2, Sparkles, ExternalLink } from "lucide-react";
import { MockConnector } from "@/lib/mock-connector";
import OfferRow from "@/components/OfferRow";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import ProductCard from "@/components/ProductCard";
import SearchBar from "@/components/SearchBar";

const connector = new MockConnector();

interface ComparePageProps {
  searchParams: Promise<{ q?: string; id?: string }>;
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
  const similarProducts = connector.getSimilar(product, 4);

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
          <PriceHistoryChart history={product.priceHistory} currentPrice={bestOffer.price} />
        </section>

        {/* SECTION 4: SIMILAR PRODUCTS */}
        {similarProducts.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-gray-800">
            <div>
              <h2 className="text-xl font-bold text-white">Compare Alternative Models</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Other popular options in {product.category}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {similarProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
