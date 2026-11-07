import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Star, ExternalLink, ShieldCheck, Check, Sparkles, Scale, X } from "lucide-react";
import { MockConnector, type Product } from "@/lib/mock-connector";
import { analyzeDiscount } from "@/lib/discount-detector";
import SearchBar from "@/components/SearchBar";

const connector = new MockConnector();

interface CompareSpecsPageProps {
  searchParams: Promise<{ ids?: string }>;
}

export default async function CompareSpecsPage({ searchParams }: CompareSpecsPageProps) {
  const params = await searchParams;
  const rawIds = params.ids ? params.ids.split(",").map((s) => s.trim()).filter(Boolean) : [];

  // Default to 3 contrasting popular phones if no IDs provided
  const targetIds = rawIds.length > 0 ? rawIds.slice(0, 4) : ["mob-001", "mob-024", "mob-020"];
  
  const products: Product[] = targetIds
    .map((id) => connector.getProduct(id) || connector.getProductBySlug(id))
    .filter((p): p is Product => p !== null);

  // All products catalog for adding extra products up to 4
  const allProducts = connector.getTrending(20);

  function getTrackingUrl(p: Product, storeName: string, url: string, price: number) {
    const payload = {
      store: storeName,
      product: p.name,
      url: url,
      price: price,
      time: Date.now(),
    };
    const b64 = Buffer.from(JSON.stringify(payload)).toString("base64");
    return `/go/${encodeURIComponent(b64)}`;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pb-24">
      {/* Top Header */}
      <div className="bg-gray-900 border-b border-gray-800 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-orange-400 font-bold uppercase tracking-wider mb-1">
                <Scale className="w-4 h-4 text-orange-400" />
                Side-by-Side Product Comparison
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                Compare Specs &amp; Prices (Up to 4 Products)
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                Direct spec breakdown, real discounts, and multi-store prices side by side.
              </p>
            </div>

            <div className="w-full sm:w-72">
              <SearchBar size="sm" placeholder="Search product to add…" />
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {products.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-12 text-center max-w-lg mx-auto">
            <Scale className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-white">No products selected</h2>
            <p className="text-xs text-gray-400 mt-1 mb-6">
              Pick up to 4 items from the search catalog to compare specs and prices side-by-side.
            </p>
            <Link
              href="/search"
              className="bg-orange-500 hover:bg-orange-400 text-stone-950 font-bold text-xs px-5 py-2.5 rounded-xl transition-colors"
            >
              Browse Catalog
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <table className="w-full border-collapse border border-gray-800 rounded-3xl overflow-hidden bg-gray-900/60 shadow-2xl">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900">
                  <th className="p-4 text-left text-xs font-bold uppercase tracking-wider text-gray-400 w-48 min-w-[160px] sticky left-0 bg-gray-900 z-10 border-r border-gray-800">
                    Product
                  </th>
                  {products.map((p) => {
                    const bestOffer = [...p.offers].sort((a, b) => a.price - b.price)[0];
                    const removeLink = `/compare-specs?ids=${products
                      .filter((item) => item.id !== p.id)
                      .map((item) => item.id)
                      .join(",")}`;

                    return (
                      <th
                        key={p.id}
                        className="p-5 text-left font-normal min-w-[260px] max-w-[300px] border-r border-gray-800 relative align-top"
                      >
                        {products.length > 1 && (
                          <Link
                            href={removeLink}
                            className="absolute top-3 right-3 p-1 rounded-full text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors"
                            title="Remove from comparison"
                          >
                            <X className="w-4 h-4" />
                          </Link>
                        )}
                        <div className="relative aspect-square w-24 h-24 mb-3 rounded-xl overflow-hidden bg-gray-950 border border-gray-800 mx-auto">
                          <Image
                            src={p.imageUrl}
                            alt={p.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <span className="text-[10px] uppercase font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md">
                          {p.brand}
                        </span>
                        <h3 className="text-sm font-bold text-white mt-1.5 line-clamp-2 leading-snug">
                          {p.name}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="font-bold text-white">{p.rating}</span>
                          <span>({p.reviewCount.toLocaleString("en-IN")})</span>
                        </div>
                      </th>
                    );
                  })}
                  {products.length < 4 && (
                    <th className="p-6 text-center min-w-[200px] border-dashed border-gray-800 align-middle">
                      <div className="border-2 border-dashed border-gray-800 hover:border-orange-500/50 rounded-2xl p-6 transition-colors">
                        <Scale className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                        <p className="text-xs font-bold text-gray-300">Add 4th Item</p>
                        <p className="text-[10px] text-gray-500 mt-1">Compare another model</p>
                        <Link
                          href="/search"
                          className="inline-block mt-3 text-xs bg-gray-800 hover:bg-orange-500 hover:text-white px-3 py-1.5 rounded-lg font-semibold transition-colors"
                        >
                          Find Product
                        </Link>
                      </div>
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-800 text-xs">
                {/* ROW: Lowest Verified Price */}
                <tr>
                  <td className="p-4 font-bold text-emerald-400 uppercase tracking-wider sticky left-0 bg-gray-900 border-r border-gray-800">
                    Best Price Across Stores
                  </td>
                  {products.map((p) => {
                    const bestOffer = [...p.offers].sort((a, b) => a.price - b.price)[0];
                    return (
                      <td key={p.id} className="p-4 border-r border-gray-800">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-black text-white">
                            ₹{bestOffer.price.toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs text-gray-500 line-through">
                            ₹{bestOffer.mrp.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <span className="inline-block text-[10px] text-emerald-300 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md mt-1">
                          Lowest on {bestOffer.store} (-{bestOffer.discountPct}%)
                        </span>
                      </td>
                    );
                  })}
                  {products.length < 4 && <td className="p-4 bg-gray-950/20"></td>}
                </tr>

                {/* ROW: Real-Discount Analysis */}
                <tr>
                  <td className="p-4 font-bold text-gray-300 sticky left-0 bg-gray-900 border-r border-gray-800">
                    Real-Discount Verdict
                  </td>
                  {products.map((p) => {
                    const bestOffer = [...p.offers].sort((a, b) => a.price - b.price)[0];
                    const analysis = analyzeDiscount(bestOffer.price, bestOffer.mrp, p.priceHistory);
                    return (
                      <td key={p.id} className="p-4 border-r border-gray-800">
                        <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-lg ${analysis.badgeColor}`}>
                          {analysis.badgeLabel}
                        </span>
                        <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">
                          {analysis.explanation}
                        </p>
                      </td>
                    );
                  })}
                  {products.length < 4 && <td className="p-4 bg-gray-950/20"></td>}
                </tr>

                {/* ROW: Key Specs / Tags */}
                <tr>
                  <td className="p-4 font-bold text-gray-300 sticky left-0 bg-gray-900 border-r border-gray-800">
                    Key Specifications &amp; Features
                  </td>
                  {products.map((p) => (
                    <td key={p.id} className="p-4 border-r border-gray-800">
                      <div className="flex flex-col gap-1.5">
                        {p.tags.map((tag) => (
                          <div key={tag} className="flex items-center gap-1.5 text-gray-200">
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>{tag}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  ))}
                  {products.length < 4 && <td className="p-4 bg-gray-950/20"></td>}
                </tr>

                {/* ROW: Available Store Offers */}
                <tr>
                  <td className="p-4 font-bold text-gray-300 sticky left-0 bg-gray-900 border-r border-gray-800">
                    Stores Offering Stock
                  </td>
                  {products.map((p) => (
                    <td key={p.id} className="p-4 border-r border-gray-800">
                      <div className="space-y-1.5">
                        {p.offers.map((o) => (
                          <div
                            key={o.store}
                            className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-gray-950 border border-gray-800"
                          >
                            <span className="font-semibold text-gray-300">{o.store}</span>
                            <span className="font-bold text-white">₹{o.price.toLocaleString("en-IN")}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  ))}
                  {products.length < 4 && <td className="p-4 bg-gray-950/20"></td>}
                </tr>

                {/* ROW: Outbound Store Buy Link */}
                <tr>
                  <td className="p-4 font-bold text-gray-300 sticky left-0 bg-gray-900 border-r border-gray-800">
                    Direct Outbound Link
                  </td>
                  {products.map((p) => {
                    const bestOffer = [...p.offers].sort((a, b) => a.price - b.price)[0];
                    const trackingUrl = getTrackingUrl(p, bestOffer.store, bestOffer.url, bestOffer.price);
                    return (
                      <td key={p.id} className="p-4 border-r border-gray-800">
                        <a
                          href={trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 w-full bg-orange-500 hover:bg-orange-400 text-stone-950 font-bold py-2.5 px-3 rounded-xl transition-all shadow-md"
                        >
                          <span>Buy on {bestOffer.store}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <p className="text-[10px] text-gray-500 text-center mt-1">
                          Direct to merchant • Zero cart
                        </p>
                      </td>
                    );
                  })}
                  {products.length < 4 && <td className="p-4 bg-gray-950/20"></td>}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
