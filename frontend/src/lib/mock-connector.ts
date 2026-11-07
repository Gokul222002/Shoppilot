/**
 * MockConnector — ShopPilot
 * Seeded with 315+ authentic Indian market products across 8 categories:
 * mobiles (67+ models), laptops, TVs, headphones, appliances, fashion, grocery, books.
 * Includes typo-tolerant fuzzy search ('relme', 'iphon 15', 'samsung s24 ultra').
 *
 * NOTE: Strictly price comparison. Zero cart, checkout, or selling logic.
 */

import catalogData from "../data/catalog.json";

export interface PricePoint {
  date: string; // YYYY-MM-DD
  price: number;
}

export interface Offer {
  store: string; // "Amazon.in" | "Flipkart" | "Myntra" | "Croma" | "Tata CLiQ"
  price: number; // Current price in INR
  mrp: number; // Max Retail Price
  discountPct: number; // Calculated from price/mrp
  shipping: number; // Free (0) or nominal shipping
  totalPrice: number; // price + shipping
  inStock: boolean;
  deliveryDays: number;
  sellerRating: number;
  coupon?: string; // e.g. "Extra ₹500 off via HDFC Bank"
  url: string; // Real store search URL for this product
  lastUpdated: string; // ISO timestamp
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  slug: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  barcode?: string;
  offers: Offer[];
  priceHistory: PricePoint[];
  tags: string[];
}

export interface SearchFilters {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  store?: string;
  inStock?: boolean;
  sortBy?: "price_asc" | "price_desc" | "rating" | "discount";
}

// ─── Typo & Fuzzy Matching Helpers ──────────────────────────────────────────

const TYPO_SYNONYMS: Record<string, string> = {
  relme: "realme",
  realmi: "realme",
  relm: "realme",
  iphon: "iphone",
  iphne: "iphone",
  ifone: "iphone",
  samsng: "samsung",
  samung: "samsung",
  galxy: "galaxy",
  glaxy: "galaxy",
  oneplu: "oneplus",
  "one pluse": "oneplus",
  "1plus": "oneplus",
  xomi: "xiaomi",
  redmi: "redmi",
  radmi: "redmi",
  motrola: "motorola",
  moto: "motorola",
  mackbook: "macbook",
  mcbook: "macbook",
  earphone: "headphones",
  headphone: "headphones",
  bravia: "sony bravia",
  laptop: "laptops",
  tv: "tvs",
  mobile: "mobiles",
  phone: "mobiles",
  book: "books",
  appliance: "appliances",
};

function levenshteinDistance(s1: string, s2: string): number {
  if (s1.length < s2.length) return levenshteinDistance(s2, s1);
  if (s2.length === 0) return s1.length;

  let prevRow = Array.from({ length: s2.length + 1 }, (_, i) => i);
  for (let i = 0; i < s1.length; i++) {
    const currRow = [i + 1];
    for (let j = 0; j < s2.length; j++) {
      const cost = s1[i] === s2[j] ? 0 : 1;
      currRow.push(
        Math.min(
          prevRow[j + 1] + 1, // deletion
          currRow[j] + 1, // insertion
          prevRow[j] + cost // substitution
        )
      );
    }
    prevRow = currRow;
  }
  return prevRow[s2.length];
}

function extractQueryFromInput(raw: string): string {
  const s = raw.trim();
  if (s.startsWith("http://") || s.startsWith("https://") || /amazon\.|flipkart\.|croma\.|tatacliq\.|myntra\./i.test(s)) {
    try {
      const url = new URL(s.startsWith("http") ? s : `https://${s}`);
      const segments = url.pathname.split("/").filter((seg) => seg && !["dp", "p", "gp", "product", "buy", "item", "search"].includes(seg));
      if (segments.length > 0) {
        let extracted = decodeURIComponent(segments[0]).replace(/[-_+.]+/g, " ");
        extracted = extracted.replace(/\b(dp|ref|qid|sr|itm\w+|asin)\b/gi, "").trim();
        if (extracted.length > 2) return extracted;
      }
    } catch {}
  }
  return s;
}

function normalizeTokens(query: string): string[] {
  const parsed = extractQueryFromInput(query);
  const clean = parsed.toLowerCase().replace(/[^\w\s]/g, " ");
  return clean
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((t) => TYPO_SYNONYMS[t] || t);
}

function scoreProductMatch(queryTokens: string[], product: Product): number {
  const nameClean = product.name.toLowerCase().replace(/[^\w\s]/g, " ");
  const brandClean = product.brand.toLowerCase();
  const catClean = product.category.toLowerCase();
  const tagsClean = product.tags.map((t) => t.toLowerCase());
  const nameTokens = nameClean.split(/\s+/);

  let score = 0.0;

  for (const qTok of queryTokens) {
    let matched = false;

    // 1. Exact token in brand, category, or name
    if (qTok === brandClean) {
      score += 10.0;
      matched = true;
    } else if (qTok === catClean) {
      score += 5.0;
      matched = true;
    } else if (nameTokens.includes(qTok)) {
      score += 4.0;
      matched = true;
    } else if (tagsClean.some((tag) => tag.includes(qTok))) {
      score += 3.0;
      matched = true;
    } else if (nameClean.includes(qTok)) {
      score += 2.5;
      matched = true;
    }

    // 2. Typo tolerance with Levenshtein distance
    if (!matched && qTok.length >= 3) {
      // Check brand
      const distBrand = levenshteinDistance(qTok, brandClean);
      if (distBrand <= 1) {
        score += 8.0;
        matched = true;
      } else if (distBrand <= 2 && qTok.length >= 5) {
        score += 5.0;
        matched = true;
      }

      // Check name tokens
      if (!matched) {
        for (const nTok of nameTokens) {
          if (nTok.length >= 3) {
            const dist = levenshteinDistance(qTok, nTok);
            const maxAllowed = qTok.length <= 5 ? 1 : 2;
            if (dist <= maxAllowed) {
              score += 3.0;
              matched = true;
              break;
            }
          }
        }
      }
    }
  }

  return score;
}

// Transform raw json offers into Offer[]
const CATALOG: Product[] = (catalogData as any[]).map((item) => ({
  id: item.id,
  name: item.name,
  brand: item.brand,
  category: item.category,
  slug: item.slug,
  imageUrl: item.imageUrl,
  rating: item.rating,
  reviewCount: item.reviewCount,
  barcode: item.barcode || `890100${item.id}`,
  tags: item.tags,
  offers: item.offers.map((o: any) => ({
    store: o.store,
    price: o.price,
    mrp: o.mrp,
    discountPct: o.discount_pct ?? o.discountPct,
    shipping: o.shipping ?? (o.price > 499 ? 0 : 40),
    totalPrice: o.total_price ?? (o.price + (o.price > 499 ? 0 : 40)),
    inStock: o.in_stock ?? o.inStock ?? true,
    deliveryDays: o.delivery_days ?? o.deliveryDays ?? 2,
    sellerRating: o.seller_rating ?? o.sellerRating ?? 4.5,
    coupon: o.coupon,
    url: o.url,
    lastUpdated: o.last_updated ?? o.lastUpdated ?? new Date().toISOString(),
  })),
  priceHistory: item.priceHistory,
}));

// ─── Connector Class ────────────────────────────────────────────────────────

export class MockConnector {
  private products: Product[] = CATALOG;

  /**
   * Universal search across 315+ catalog products:
   * Handles name, model, barcode ('890100...'), pasted product URLs (Amazon, Flipkart),
   * and typos ('relme', 'iphon 15', 'samsung s24 ultra').
   */
  search(query: string, filters?: SearchFilters): Product[] {
    const rawQ = (query || "").trim();
    const isBarcode = /^\d{8,14}$/.test(rawQ);
    const qTokens = normalizeTokens(query || "");

    const scoredItems: { product: Product; score: number }[] = [];

    for (const p of this.products) {
      // Category filter
      if (filters?.category && filters.category !== "all" && p.category.toLowerCase() !== filters.category.toLowerCase()) {
        continue;
      }

      // Brand filter
      if (filters?.brand && filters.brand !== "all" && p.brand.toLowerCase() !== filters.brand.toLowerCase()) {
        continue;
      }

      // Store filter
      if (filters?.store && !p.offers.some((o) => o.store === filters.store)) {
        continue;
      }

      // In-stock filter
      if (filters?.inStock && !p.offers.some((o) => o.inStock)) {
        continue;
      }

      const bestPrice = this.bestPrice(p);

      // Price range
      if (filters?.minPrice !== undefined && bestPrice < filters.minPrice) continue;
      if (filters?.maxPrice !== undefined && bestPrice > filters.maxPrice) continue;

      // 1. Direct barcode match
      if (isBarcode) {
        if (p.barcode === rawQ || p.barcode?.startsWith(rawQ)) {
          scoredItems.push({ product: p, score: 100.0 });
          continue;
        }
      }

      // If query is empty, match all
      if (qTokens.length === 0) {
        scoredItems.push({ product: p, score: 1.0 });
        continue;
      }

      const score = scoreProductMatch(qTokens, p);
      if (score > 0.0) {
        scoredItems.push({ product: p, score });
      }
    }

    // Sort results
    switch (filters?.sortBy) {
      case "price_asc":
        scoredItems.sort((a, b) => this.bestPrice(a.product) - this.bestPrice(b.product));
        break;
      case "price_desc":
        scoredItems.sort((a, b) => this.bestPrice(b.product) - this.bestPrice(a.product));
        break;
      case "rating":
        scoredItems.sort((a, b) => b.product.rating - a.product.rating);
        break;
      case "discount":
        scoredItems.sort(
          (a, b) => this.bestDiscount(b.product) - this.bestDiscount(a.product)
        );
        break;
      default:
        // Score descending, then popularity
        scoredItems.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return b.product.reviewCount - a.product.reviewCount;
        });
        break;
    }

    return scoredItems.map((item) => item.product);
  }

  getAllProducts(): Product[] {
    return [...this.products];
  }

  getProduct(id: string): Product | null {
    return this.products.find((p) => p.id === id) ?? null;
  }

  getProductBySlug(slug: string): Product | null {
    const s = slug.toLowerCase().trim();
    if (!s) return null;
    return (
      this.products.find((p) => p.slug.toLowerCase() === s) ??
      this.products.find((p) => p.id.toLowerCase() === s) ??
      this.products.find((p) => p.name.toLowerCase().includes(s)) ??
      this.products.find((p) => s.includes(p.slug.toLowerCase())) ??
      null
    );
  }

  getTrending(limit = 20): Product[] {
    return [...this.products]
      .sort((a, b) => b.reviewCount - a.reviewCount)
      .slice(0, limit);
  }

  getByCategory(category: string, limit = 20): Product[] {
    return this.products.filter((p) => p.category === category).slice(0, limit);
  }

  getSimilar(product: Product, limit = 4): Product[] {
    return this.products
      .filter((p) => p.id !== product.id && p.category === product.category)
      .slice(0, limit);
  }

  getTopDeals(limit = 8): Product[] {
    return [...this.products]
      .sort((a, b) => this.bestDiscount(b) - this.bestDiscount(a))
      .slice(0, limit);
  }

  getPriceHistory(productId: string): PricePoint[] {
    return this.getProduct(productId)?.priceHistory ?? [];
  }

  private bestPrice(p: Product): number {
    return Math.min(...p.offers.map((o) => o.price));
  }

  private bestDiscount(p: Product): number {
    return Math.max(...p.offers.map((o) => o.discountPct));
  }
}
