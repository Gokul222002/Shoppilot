import React from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, ArrowUpDown, AlertCircle, RotateCcw } from "lucide-react";
import { MockConnector, type SearchFilters } from "@/lib/mock-connector";
import ProductCard from "@/components/ProductCard";
import SearchBar from "@/components/SearchBar";

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

const POPULAR_BRANDS = [
  "Realme",
  "Samsung",
  "Apple",
  "OnePlus",
  "Xiaomi",
  "Redmi",
  "Vivo",
  "Oppo",
  "Motorola",
  "Poco",
  "iQOO",
  "Sony",
  "Dell",
  "HP",
  "Lenovo",
  "LG",
  "boAt",
  "Philips",
];

const STORES = ["Amazon.in", "Flipkart", "Myntra", "Croma", "Tata CLiQ"];

const SORT_OPTIONS = [
  { key: "default", label: "Best Match" },
  { key: "price_asc", label: "Price: Low to High" },
  { key: "price_desc", label: "Price: High to Low" },
  { key: "discount", label: "Biggest Discount" },
  { key: "rating", label: "Customer Rating" },
];

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    brand?: string;
    min_price?: string;
    max_price?: string;
    store?: string;
    sort_by?: string;
    in_stock?: string;
    page?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const q = params.q || "";
  const category = params.category && params.category !== "all" ? params.category : undefined;
  const brand = params.brand && params.brand !== "all" ? params.brand : undefined;
  const minPrice = params.min_price ? parseInt(params.min_price, 10) : undefined;
  const maxPrice = params.max_price ? parseInt(params.max_price, 10) : undefined;
  const store = params.store || undefined;
  const sortBy = (params.sort_by as SearchFilters["sortBy"]) || undefined;
  const inStock = params.in_stock === "true" ? true : undefined;
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const pageSize = 18;

  const filters: SearchFilters = {
    category,
    brand,
    minPrice: isNaN(minPrice as number) ? undefined : minPrice,
    maxPrice: isNaN(maxPrice as number) ? undefined : maxPrice,
    store,
    sortBy,
    inStock,
  };

  // Execute Search via MockConnector
  const allResults = connector.search(q, filters);
  const totalResults = allResults.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const paginatedResults = allResults.slice((page - 1) * pageSize, page * pageSize);

  // Helper to construct query string keeping other params
  const makeFilterUrl = (overrides: Record<string, string | undefined>) => {
    const current: Record<string, string> = {};
    if (q) current.q = q;
    if (category) current.category = category;
    if (brand) current.brand = brand;
    if (minPrice) current.min_price = minPrice.toString();
    if (maxPrice) current.max_price = maxPrice.toString();
    if (store) current.store = store;
    if (params.sort_by) current.sort_by = params.sort_by;
    if (params.in_stock) current.in_stock = params.in_stock;

    const merged = { ...current, ...overrides };
    const queryParts = Object.entries(merged)
      .filter(([_, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`);
    return `/search${queryParts.length > 0 ? `?${queryParts.join("&")}` : ""}`;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pb-24">
      {/* Header Search Band */}
      <div className="bg-gray-900 border-b border-gray-800 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-extrabold text-white mb-3">
              {q ? `Price Comparison for "${q}"` : "Search Multi-Store Deals"}
            </h1>
            <SearchBar initialQuery={q} size="md" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* SIDEBAR FILTERS (4 cols on desktop) */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sticky top-20">
              <div className="flex items-center justify-between pb-4 border-b border-gray-800">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-orange-400" />
                  Filters
                </span>
                <Link
                  href={q ? `/search?q=${encodeURIComponent(q)}` : "/search"}
                  className="text-xs text-gray-400 hover:text-orange-400 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </Link>
              </div>

              {/* Category Filter */}
              <div className="pt-4 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Category</label>
                <div className="flex flex-col gap-1 max-h-56 overflow-y-auto pr-1">
                  {CATEGORIES.map((cat) => {
                    const isSelected = (!category && cat.key === "all") || category === cat.key;
                    return (
                      <Link
                        key={cat.key}
                        href={makeFilterUrl({ category: cat.key === "all" ? undefined : cat.key, page: "1" })}
                        className={`text-xs px-3 py-2 rounded-xl transition-colors flex items-center justify-between ${
                          isSelected
                            ? "bg-orange-500 text-white font-bold"
                            : "text-gray-300 hover:bg-gray-800/80"
                        }`}
                      >
                        <span>{cat.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Price Range Filter Form */}
              <form action="/search" method="GET" className="pt-5 border-t border-gray-800 space-y-3">
                {q && <input type="hidden" name="q" value={q} />}
                {category && <input type="hidden" name="category" value={category} />}
                {store && <input type="hidden" name="store" value={store} />}
                {params.sort_by && <input type="hidden" name="sort_by" value={params.sort_by} />}

                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Price Range (₹)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    name="min_price"
                    placeholder="Min ₹"
                    defaultValue={minPrice || ""}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-100 placeholder:text-gray-500 focus:border-orange-500 outline-none"
                  />
                  <input
                    type="number"
                    name="max_price"
                    placeholder="Max ₹"
                    defaultValue={maxPrice || ""}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-100 placeholder:text-gray-500 focus:border-orange-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gray-800 hover:bg-orange-500 text-gray-200 hover:text-white font-semibold text-xs py-2 rounded-xl transition-colors duration-200"
                >
                  Apply Price
                </button>
              </form>

              {/* Brands Filter */}
              <div className="pt-5 border-t border-gray-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Brand</label>
                  {brand && (
                    <Link href={makeFilterUrl({ brand: undefined, page: "1" })} className="text-[10px] text-orange-400 hover:underline">
                      Clear
                    </Link>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto pr-1">
                  {POPULAR_BRANDS.map((b) => {
                    const isSelected = brand?.toLowerCase() === b.toLowerCase();
                    return (
                      <Link
                        key={b}
                        href={makeFilterUrl({ brand: isSelected ? undefined : b, page: "1" })}
                        className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors ${
                          isSelected
                            ? "bg-orange-500 text-white font-bold"
                            : "bg-gray-800/80 text-gray-300 hover:bg-gray-800"
                        }`}
                      >
                        {b}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* In-Stock Only Toggle */}
              <div className="pt-4 border-t border-gray-800">
                <Link
                  href={makeFilterUrl({ in_stock: inStock ? undefined : "true", page: "1" })}
                  className={`flex items-center justify-between text-xs px-3 py-2 rounded-xl transition-colors ${
                    inStock ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold" : "text-gray-400 hover:bg-gray-800/80"
                  }`}
                >
                  <span>In Stock Only</span>
                  <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${inStock ? "bg-emerald-500 text-stone-950 font-bold" : "border border-gray-700"}`}>
                    {inStock ? "✓" : ""}
                  </span>
                </Link>
              </div>

              {/* Stores Filter */}
              <div className="pt-5 border-t border-gray-800 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Stores</label>
                <div className="flex flex-col gap-1">
                  <Link
                    href={makeFilterUrl({ store: undefined, page: "1" })}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                      !store ? "bg-gray-800 text-orange-400 font-bold" : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    All Stores
                  </Link>
                  {STORES.map((s) => (
                    <Link
                      key={s}
                      href={makeFilterUrl({ store: store === s ? undefined : s, page: "1" })}
                      className={`text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center justify-between ${
                        store === s ? "bg-gray-800 text-orange-400 font-bold" : "text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      <span>{s}</span>
                      {store === s && <span className="text-orange-400 text-[10px]">✓</span>}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* MAIN RESULTS AREA (9 cols on desktop) */}
          <main className="lg:col-span-9 space-y-6">
            {/* Sort & Count Bar */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-sm text-gray-400">
                Showing <strong className="text-white">{paginatedResults.length}</strong> of{" "}
                <strong className="text-white">{totalResults}</strong> products across stores
              </div>

              {/* Sort pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-gray-400 mr-1 flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  Sort:
                </span>
                {SORT_OPTIONS.map((opt) => {
                  const isCurrent = (params.sort_by || "default") === opt.key;
                  return (
                    <Link
                      key={opt.key}
                      href={makeFilterUrl({
                        sort_by: opt.key === "default" ? undefined : opt.key,
                        page: "1",
                      })}
                      className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                        isCurrent
                          ? "bg-orange-500 text-white font-bold"
                          : "bg-gray-800/80 text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                      }`}
                    >
                      {opt.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Results Grid */}
            {paginatedResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {paginatedResults.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              /* Empty State */
              <div className="bg-gray-900 border border-gray-800 rounded-3xl p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto text-gray-400">
                  <AlertCircle className="w-8 h-8 text-orange-400" />
                </div>
                <h3 className="text-xl font-bold text-white">No products found for this search</h3>
                <p className="text-sm text-gray-400 max-w-md mx-auto">
                  Try checking your spelling, using more general keywords (like &quot;phone&quot;, &quot;fan&quot;,
                  or &quot;speaker&quot;), or clearing filters.
                </p>
                <div className="pt-2">
                  <Link
                    href="/search"
                    className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-colors"
                  >
                    View All Products
                  </Link>
                </div>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-6">
                {page > 1 ? (
                  <Link
                    href={makeFilterUrl({ page: (page - 1).toString() })}
                    className="bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-200 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                  >
                    ← Previous
                  </Link>
                ) : (
                  <span className="bg-gray-900/50 border border-gray-800/50 text-gray-600 px-4 py-2 rounded-xl text-xs font-semibold cursor-not-allowed">
                    ← Previous
                  </span>
                )}

                <span className="text-xs text-gray-400">
                  Page <strong className="text-white">{page}</strong> of{" "}
                  <strong className="text-white">{totalPages}</strong>
                </span>

                {page < totalPages ? (
                  <Link
                    href={makeFilterUrl({ page: (page + 1).toString() })}
                    className="bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-200 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Next →
                  </Link>
                ) : (
                  <span className="bg-gray-900/50 border border-gray-800/50 text-gray-600 px-4 py-2 rounded-xl text-xs font-semibold cursor-not-allowed">
                    Next →
                  </span>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
