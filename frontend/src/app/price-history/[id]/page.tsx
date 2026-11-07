import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  TrendingDown,
  TrendingUp,
  History,
  ShieldCheck,
  ChevronRight,
  Calendar,
  Zap,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Award,
} from "lucide-react";
import { MockConnector } from "@/lib/mock-connector";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import CompareAlertButton from "@/components/CompareAlertButton";

const connector = new MockConnector();

interface PriceHistoryPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PriceHistoryPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = connector.getProductBySlug(id) || connector.getProduct(id);

  if (!product) {
    return { title: "Price History Not Found — ShopPilot" };
  }

  const bestPrice = Math.min(...product.offers.map((o) => o.price));
  const prices = product.priceHistory.map((p) => p.price);
  const lowestEver = Math.min(...prices, bestPrice);
  const highestEver = Math.max(...prices, bestPrice);

  const ogUrl = `/api/og?title=${encodeURIComponent(`${product.name} Price History`)}&price=${encodeURIComponent(`₹${bestPrice.toLocaleString("en-IN")}`)}&subtitle=${encodeURIComponent(`All-time low: ₹${lowestEver.toLocaleString("en-IN")} · 12-month trend chart`)}&badge=PRICE%20HISTORY`;

  return {
    title: `${product.name} Price History & Tracker (12-Month Trends) | ShopPilot`,
    description: `Track ${product.name} historical price movements across Amazon, Flipkart and Croma. All-time low ₹${lowestEver.toLocaleString("en-IN")}, peak ₹${highestEver.toLocaleString("en-IN")}. See whether to buy now or wait.`,
    keywords: [
      `${product.name} price history`,
      `${product.name} lowest price`,
      `${product.name} price tracker`,
      `${product.brand} price trends`,
      "historical price chart",
    ],
    openGraph: {
      title: `${product.name} Price History — 12-Month Trends`,
      description: `Historical price chart, lowest ever price ₹${lowestEver.toLocaleString("en-IN")}, and live store comparison.`,
      images: [
        {
          url: ogUrl,
          width: 1200,
          height: 630,
          alt: `${product.name} Price History`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} Historical Price Trends | ShopPilot`,
      description: `Track 12-month price dips, festival sales, and all-time low prices for ${product.name}.`,
      images: [ogUrl],
    },
  };
}

export default async function PriceHistoryPage({ params }: PriceHistoryPageProps) {
  const { id } = await params;
  const product = connector.getProductBySlug(id) || connector.getProduct(id);

  if (!product) {
    notFound();
  }

  // Calculate pricing statistics
  const currentBestOffer = product.offers.reduce((min, o) => (o.price < min.price ? o : min));
  const currentBestPrice = currentBestOffer.price;

  const historyPoints = product.priceHistory || [];
  const historyPrices = historyPoints.map((p) => p.price);
  const lowestEver = historyPrices.length > 0 ? Math.min(...historyPrices, currentBestPrice) : currentBestPrice;
  const highestEver = historyPrices.length > 0 ? Math.max(...historyPrices, currentBestPrice) : currentBestPrice;

  // 60-day rolling median
  const recent60 = historyPoints.slice(-60).map((p) => p.price);
  const sortedRecent = [...recent60].sort((a, b) => a - b);
  const median60 = sortedRecent.length > 0 ? sortedRecent[Math.floor(sortedRecent.length / 2)] : currentBestPrice;

  // Potential savings vs peak
  const maxSavings = highestEver - currentBestPrice;
  const savingsPct = highestEver > 0 ? Math.round((maxSavings / highestEver) * 100) : 0;

  // Schema.org JSON-LD structured data for Price History
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.imageUrl,
    brand: {
      "@type": "Brand",
      name: product.brand,
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      lowPrice: lowestEver,
      highPrice: highestEver,
      offerCount: product.offers.length,
      offers: product.offers.map((offer) => ({
        "@type": "Offer",
        price: offer.price,
        priceCurrency: "INR",
        seller: {
          "@type": "Organization",
          name: offer.store,
        },
        availability: offer.inStock
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      })),
    },
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pb-20">
      {/* Schema.org Rich Snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

      {/* Top Header */}
      <div className="border-b border-gray-800 bg-gradient-to-b from-gray-900 via-gray-900/60 to-gray-950 pt-8 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs text-gray-400 mb-6">
            <Link href="/" className="hover:text-orange-400 transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            <Link
              href={`/category/${product.category.toLowerCase()}`}
              className="hover:text-orange-400 transition-colors capitalize"
            >
              {product.category}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            <span className="text-gray-300">Price History</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            <span className="text-orange-400 font-semibold truncate max-w-[200px]">
              {product.name}
            </span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gray-900 border border-gray-800 p-2 shrink-0 overflow-hidden flex items-center justify-center">
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  width={112}
                  height={112}
                  className="object-contain max-h-full"
                />
              </div>

              <div>
                <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2">
                  <History className="w-3.5 h-3.5" />
                  <span>12-Month Price Audit</span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                  {product.name}
                </h1>
                <p className="mt-1 text-sm text-gray-400">
                  Brand: <strong className="text-gray-200">{product.brand}</strong> · Category:{" "}
                  <span className="text-orange-400 capitalize">{product.category}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <CompareAlertButton
                product={product}
                currentPrice={currentBestPrice}
              />
              <Link
                href={`/compare?id=${product.id}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-orange-950/40"
              >
                <span>Compare Store Offers</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4">
            <span className="text-xs uppercase tracking-wider text-gray-500 font-medium block">
              Current Lowest
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                ₹{currentBestPrice.toLocaleString("en-IN")}
              </span>
            </div>
            <span className="text-xs text-gray-400 mt-1 block">at {currentBestOffer.store}</span>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4">
            <span className="text-xs uppercase tracking-wider text-gray-500 font-medium block">
              All-Time Lowest
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-blue-400">
                ₹{lowestEver.toLocaleString("en-IN")}
              </span>
            </div>
            <span className="text-xs text-gray-400 mt-1 block">
              {currentBestPrice <= lowestEver ? "⚡ Happening Right Now!" : "Recorded during sale"}
            </span>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4">
            <span className="text-xs uppercase tracking-wider text-gray-500 font-medium block">
              60-Day Median
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-gray-200">
                ₹{median60.toLocaleString("en-IN")}
              </span>
            </div>
            <span className="text-xs text-gray-400 mt-1 block">
              {currentBestPrice < median60 ? (
                <span className="text-emerald-400">
                  ₹{(median60 - currentBestPrice).toLocaleString("en-IN")} below median
                </span>
              ) : (
                <span className="text-gray-400">Normal retail level</span>
              )}
            </span>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4">
            <span className="text-xs uppercase tracking-wider text-gray-500 font-medium block">
              Historical Peak
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-rose-400">
                ₹{highestEver.toLocaleString("en-IN")}
              </span>
            </div>
            <span className="text-xs text-rose-400/80 mt-1 block">
              Save {savingsPct}% vs peak price
            </span>
          </div>
        </div>

        {/* Interactive Chart Container */}
        <div className="mt-8 bg-gray-900/60 border border-gray-800 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-orange-400" />
                Historical Price Chart & Fluctuations
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Hover or tap data points to view recorded date and lowest merchant offer
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              <ShieldCheck className="w-4 h-4" />
              <span>Independent & Untampered History</span>
            </div>
          </div>

          <PriceHistoryChart history={historyPoints} currentPrice={currentBestPrice} />
        </div>

        {/* Current Merchant Offers Breakdown */}
        <div className="mt-8 bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Live Store Prices for {product.name}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs uppercase text-gray-500">
                  <th className="py-3 px-4">Store</th>
                  <th className="py-3 px-4">Offer Price</th>
                  <th className="py-3 px-4">Shipping</th>
                  <th className="py-3 px-4">Delivery</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {product.offers.map((offer, idx) => (
                  <tr key={idx} className="hover:bg-gray-800/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">{offer.store}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-emerald-400">
                        ₹{offer.price.toLocaleString("en-IN")}
                      </span>
                      {offer.mrp > offer.price && (
                        <span className="text-xs text-gray-500 line-through ml-2">
                          ₹{offer.mrp.toLocaleString("en-IN")}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-400">
                      {offer.shipping === 0 ? "Free Shipping" : `₹${offer.shipping}`}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-400">
                      {offer.deliveryDays} Days
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {offer.inStock ? (
                        <span className="text-emerald-400 font-medium">In Stock</span>
                      ) : (
                        <span className="text-rose-400 font-medium">Out of Stock</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <a
                        href={offer.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-orange-400 transition-colors"
                      >
                        <span>Visit Store</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
