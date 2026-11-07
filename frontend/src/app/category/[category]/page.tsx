import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Tag,
  ArrowRight,
  TrendingDown,
  Sparkles,
  ShieldCheck,
  Filter,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { MockConnector, Product } from "@/lib/mock-connector";
import ProductCard from "@/components/ProductCard";

const connector = new MockConnector();

interface CategoryInfo {
  name: string;
  emoji: string;
  title: string;
  description: string;
  topBrands: string[];
  popularKeywords: string[];
}

const CATEGORY_MAP: Record<string, CategoryInfo> = {
  mobiles: {
    name: "mobiles",
    emoji: "📱",
    title: "Mobiles & Smartphones",
    description:
      "Compare real-time prices on 60+ smartphones across Realme, Samsung, Apple, Xiaomi, OnePlus, Vivo, Oppo, Poco, and iQOO.",
    topBrands: ["Realme", "Samsung", "Apple", "Xiaomi", "OnePlus", "Vivo", "Oppo", "Poco", "iQOO"],
    popularKeywords: ["5G phones under 20000", "Best camera phone", "iPhone 15", "Samsung S24 Ultra", "Realme 12 Pro"],
  },
  laptops: {
    name: "laptops",
    emoji: "💻",
    title: "Laptops & Ultrabooks",
    description:
      "Find the lowest prices on gaming laptops, MacBooks, business ultrabooks, and budget student laptops across top retailers.",
    topBrands: ["Apple", "Dell", "HP", "Lenovo", "Asus", "Acer"],
    popularKeywords: ["MacBook Air M2", "Gaming laptop RTX 4060", "Laptops under 50000", "OLED laptops"],
  },
  tvs: {
    name: "tvs",
    emoji: "📺",
    title: "Smart TVs & Displays",
    description:
      "Side-by-side price tracking on 4K, OLED, and QLED Smart TVs from Sony, Samsung, LG, TCL, and Xiaomi.",
    topBrands: ["Sony", "Samsung", "LG", "TCL", "Xiaomi", "OnePlus"],
    popularKeywords: ["55 inch 4K TV", "OLED TV", "Smart TV under 30000", "Sony Bravia 4K"],
  },
  headphones: {
    name: "headphones",
    emoji: "🎧",
    title: "Headphones & Earbuds",
    description:
      "Compare noise-canceling headphones, TWS wireless earbuds, and studio monitors across Sony, Bose, Apple, JBL, and boAt.",
    topBrands: ["Sony", "Bose", "Apple", "JBL", "Sennheiser", "boAt"],
    popularKeywords: ["Noise Cancelling Headphones", "AirPods Pro", "Sony WH-1000XM5", "TWS earbuds under 3000"],
  },
  appliances: {
    name: "appliances",
    emoji: "🔌",
    title: "Home & Kitchen Appliances",
    description:
      "Track prices on refrigerators, air conditioners, washing machines, and microwave ovens from LG, Samsung, Whirlpool, and IFB.",
    topBrands: ["LG", "Samsung", "Whirlpool", "IFB", "Daikin", "Voltas"],
    popularKeywords: ["1.5 Ton Inverter AC", "Front Load Washing Machine", "Double Door Refrigerator"],
  },
  fashion: {
    name: "fashion",
    emoji: "👕",
    title: "Fashion & Apparel",
    description:
      "Compare deals and verified discounts on clothing, footwear, and accessories across Myntra, Tata CLiQ, and Amazon.",
    topBrands: ["Nike", "Adidas", "Puma", "Levis", "Zara", "Tommy Hilfiger"],
    popularKeywords: ["Running shoes", "Denim jackets", "Casual sneakers", "Smart watches"],
  },
  grocery: {
    name: "grocery",
    emoji: "🛒",
    title: "Grocery & Gourmet Essentials",
    description:
      "Compare daily essentials, organic foods, dry fruits, and pantry staples across major online grocery platforms.",
    topBrands: ["Tata", "Fortune", "Aashirvaad", "Nestle", "Amul"],
    popularKeywords: ["Organic dry fruits", "Cold pressed oils", "Basmati rice", "Breakfast cereals"],
  },
  books: {
    name: "books",
    emoji: "📚",
    title: "Books & Educational",
    description:
      "Compare bestsellers, exam prep guides, fiction, and non-fiction books with verified price history.",
    topBrands: ["Penguin", "HarperCollins", "Rupa", "Arihant", "Oxford"],
    popularKeywords: ["Atomic Habits", "Psychology of Money", "UPSC Prep Books", "Fiction Bestsellers"],
  },
};

interface CategoryPageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ brand?: string; sort?: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const catKey = category.toLowerCase();
  const info = CATEGORY_MAP[catKey];

  if (!info) {
    return { title: "Category Not Found — ShopPilot" };
  }

  const ogUrl = `/api/og?title=${encodeURIComponent(info.title)}&subtitle=${encodeURIComponent(info.description)}&badge=${encodeURIComponent("SEO CATEGORY")}`;

  return {
    title: `${info.title} Price Comparison — Lowest Prices Across Top Stores | ShopPilot`,
    description: info.description,
    keywords: [
      info.name,
      `${info.name} price comparison`,
      `lowest ${info.name} price`,
      ...info.topBrands,
      ...info.popularKeywords,
    ],
    openGraph: {
      title: `${info.title} — Compare Prices Across India`,
      description: info.description,
      type: "website",
      images: [
        {
          url: ogUrl,
          width: 1200,
          height: 630,
          alt: info.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${info.title} — Price Comparison | ShopPilot`,
      description: info.description,
      images: [ogUrl],
    },
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { category } = await params;
  const { brand, sort } = await searchParams;

  const catKey = category.toLowerCase();
  const info = CATEGORY_MAP[catKey];

  if (!info) {
    notFound();
  }

  // Fetch category products from mock connector
  let products = connector.getByCategory(catKey, 100);

  // Apply brand filter if selected
  if (brand && brand !== "all") {
    products = products.filter((p) => p.brand.toLowerCase() === brand.toLowerCase());
  }

  // Apply sort
  if (sort === "price_asc") {
    products.sort((a, b) => {
      const minA = Math.min(...a.offers.map((o) => o.price));
      const minB = Math.min(...b.offers.map((o) => o.price));
      return minA - minB;
    });
  } else if (sort === "discount") {
    products.sort((a, b) => {
      const discA = Math.max(...a.offers.map((o) => o.discountPct));
      const discB = Math.max(...b.offers.map((o) => o.discountPct));
      return discB - discA;
    });
  } else if (sort === "rating") {
    products.sort((a, b) => b.rating - a.rating);
  }

  const lowestPrice = products.length
    ? Math.min(...products.flatMap((p) => p.offers.map((o) => o.price)))
    : 0;

  // Schema.org JSON-LD structured data for Google Search
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${info.title} Price Comparison`,
    description: info.description,
    numberOfItems: products.length,
    itemListElement: products.slice(0, 10).map((product, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
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
          lowPrice: Math.min(...product.offers.map((o) => o.price)),
          highPrice: Math.max(...product.offers.map((o) => o.price)),
          offerCount: product.offers.length,
        },
      },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://shoppilot.in",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: info.title,
        item: `https://shoppilot.in/category/${catKey}`,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pb-20">
      {/* Schema.org Rich Snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Hero Header */}
      <div className="border-b border-gray-800 bg-gradient-to-b from-gray-900 via-gray-900/60 to-gray-950 pt-8 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs text-gray-400 mb-6">
            <Link href="/" className="hover:text-orange-400 transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            <span className="text-gray-300">Categories</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            <span className="text-orange-400 font-semibold">{info.title}</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20 mb-3">
                <span>{info.emoji}</span>
                <span>Verified Price Index</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                {info.title}
              </h1>
              <p className="mt-3 text-base text-gray-400 max-w-2xl leading-relaxed">
                {info.description}
              </p>
            </div>

            <div className="flex items-center gap-4 bg-gray-900/90 border border-gray-800 rounded-2xl p-4 shrink-0">
              <div className="border-r border-gray-800 pr-4">
                <span className="text-xs uppercase tracking-wider text-gray-500 block">
                  Catalog
                </span>
                <span className="text-2xl font-black text-white">{products.length}</span>
                <span className="text-xs text-gray-400 ml-1">Models</span>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-gray-500 block">
                  Starting at
                </span>
                <span className="text-2xl font-black text-emerald-400">
                  ₹{lowestPrice.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Brand Filters */}
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" /> Popular Brands:
            </span>
            <Link
              href={`/category/${catKey}`}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                !brand || brand === "all"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "bg-gray-800/80 text-gray-300 hover:bg-gray-700"
              }`}
            >
              All Brands
            </Link>
            {info.topBrands.map((b) => (
              <Link
                key={b}
                href={`/category/${catKey}?brand=${encodeURIComponent(b)}`}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  brand?.toLowerCase() === b.toLowerCase()
                    ? "bg-orange-500 text-white shadow-sm"
                    : "bg-gray-800/80 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {b}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content & Product Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-800">
          <div className="text-sm text-gray-400">
            Showing <strong className="text-white">{products.length}</strong> products with live
            cross-store offers
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Sort by:</span>
            <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1 text-xs">
              <Link
                href={`/category/${catKey}${brand ? `?brand=${brand}&` : "?"}sort=relevance`}
                className={`px-2.5 py-1 rounded ${
                  !sort || sort === "relevance"
                    ? "bg-gray-800 text-orange-400 font-semibold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Popularity
              </Link>
              <Link
                href={`/category/${catKey}${brand ? `?brand=${brand}&` : "?"}sort=price_asc`}
                className={`px-2.5 py-1 rounded ${
                  sort === "price_asc"
                    ? "bg-gray-800 text-orange-400 font-semibold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Lowest Price
              </Link>
              <Link
                href={`/category/${catKey}${brand ? `?brand=${brand}&` : "?"}sort=discount`}
                className={`px-2.5 py-1 rounded ${
                  sort === "discount"
                    ? "bg-gray-800 text-orange-400 font-semibold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Biggest Discount
              </Link>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        {products.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-900/50 rounded-2xl border border-gray-800 mt-8">
            <p className="text-lg text-gray-300 font-semibold">No products found for this filter</p>
            <p className="text-sm text-gray-500 mt-1">Try clearing the brand filter</p>
            <Link
              href={`/category/${catKey}`}
              className="mt-4 inline-block px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-semibold hover:bg-orange-500"
            >
              Reset Filters
            </Link>
          </div>
        )}

        {/* SEO FAQ & Knowledge Block */}
        <div className="mt-20 pt-12 border-t border-gray-800">
          <div className="flex items-center gap-2 text-orange-400 text-sm font-semibold mb-3">
            <HelpCircle className="w-4 h-4" />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-6">
            Shopping for {info.title} with ShopPilot
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                How does ShopPilot find the lowest {info.name} price?
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                ShopPilot continuously synchronizes live pricing across verified retailers including
                Amazon India, Flipkart, Croma, and Tata CLiQ. We display the total cost including
                shipping and apply coupon discounts so you see the real checkout price side by side.
              </p>
            </div>

            <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Are discounts on {info.name} genuinely lower?
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Our Deal Intelligence algorithms inspect 12-month rolling medians and flag fake MRP
                inflations. When a retailer raises a price shortly before a festival sale, ShopPilot
                identifies the inflation and marks whether a deal is Genuine or Fake.
              </p>
            </div>

            <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Can I get notified when prices drop?
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Yes. Click the bell icon on any product or set an alert via Telegram or email. When
                the price drops to or below your target price, you get an immediate alert with a
                direct link to purchase at that retailer.
              </p>
            </div>

            <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Does ShopPilot sell products directly?
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                No. ShopPilot is strictly a price comparison engine. We have no cart, no checkout,
                and do not hold inventory. When you find the best deal, you click out directly to
                the merchant store to complete your purchase securely.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
