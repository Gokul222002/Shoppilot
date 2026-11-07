/**
 * MockConnector — ShopPilot Phase 1
 * 200 realistic Indian market products across 8 categories.
 * 5 stores · 12-month daily price history · real search URLs.
 *
 * NOTE: This file contains NO cart, checkout, or sell logic.
 * Every store link is an external search/product URL — users buy on the retailer's site.
 */

export interface PricePoint {
  date: string;   // YYYY-MM-DD
  price: number;
}

export interface Offer {
  store: string;         // "Amazon.in" | "Flipkart" | "Myntra" | "Croma" | "Tata CLiQ"
  price: number;         // Current price in INR
  mrp: number;           // Max Retail Price
  discountPct: number;   // Calculated from price/mrp
  inStock: boolean;
  deliveryDays: number;
  sellerRating: number;
  url: string;           // Real store search URL for this product
  lastUpdated: string;   // ISO timestamp
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
  offers: Offer[];
  priceHistory: PricePoint[];
  tags: string[];
}

export interface SearchFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  store?: string;
  inStock?: boolean;
  sortBy?: "price_asc" | "price_desc" | "rating" | "discount";
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function storeUrl(store: string, query: string): string {
  const q = encodeURIComponent(query);
  switch (store) {
    case "Amazon.in":    return `https://www.amazon.in/s?k=${q}`;
    case "Flipkart":     return `https://www.flipkart.com/search?q=${q}`;
    case "Myntra":       return `https://www.myntra.com/${q}`;
    case "Croma":        return `https://www.croma.com/searchB?q=${q}`;
    case "Tata CLiQ":    return `https://www.tatacliq.com/search/?searchCategory=all&text=${q}`;
    default:             return `https://www.amazon.in/s?k=${q}`;
  }
}

const STORES = ["Amazon.in", "Flipkart", "Myntra", "Croma", "Tata CLiQ"] as const;
const NOW_ISO = new Date().toISOString();

/** Generate 365 days of realistic price history (±15%, festival dips) */
function genHistory(basePrice: number, productIdx: number): PricePoint[] {
  const points: PricePoint[] = [];
  const today = new Date("2026-11-07");
  let price = basePrice;
  const seed = productIdx * 17 + 3;

  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const month = d.getMonth(); // 0-indexed
    // Diwali / festival dip in Oct (month 9) and Jan sale (month 0)
    const isFestival = month === 9 || month === 0 || month === 7;
    const dip = isFestival ? 0.85 : 1.0;
    // Pseudo-random walk
    const noise = ((((seed * (i + 1) * 31337) % 1000) / 1000) - 0.5) * 0.08;
    price = Math.max(basePrice * 0.72, basePrice * dip * (1 + noise));
    points.push({ date: dateStr, price: Math.round(price) });
  }
  return points;
}

/** Build 2-5 offers for a product */
function genOffers(name: string, baseMrp: number, basePrice: number, mainStore: string, extraStores: string[]): Offer[] {
  const offers: Offer[] = [];
  const allStores = [mainStore, ...extraStores].slice(0, 5);
  allStores.forEach((store, idx) => {
    const variation = 1 + (((idx * 7 + 3) % 10) - 4) * 0.03;
    const price = Math.round(basePrice * variation);
    const mrp = Math.round(baseMrp * (1 + (idx % 3) * 0.02));
    offers.push({
      store,
      price,
      mrp,
      discountPct: Math.round(((mrp - price) / mrp) * 100),
      inStock: idx !== 3,
      deliveryDays: idx === 0 ? 1 : idx === 1 ? 2 : 3 + (idx % 2),
      sellerRating: parseFloat((4.0 + (idx % 5) * 0.15).toFixed(1)),
      url: storeUrl(store, name),
      lastUpdated: NOW_ISO,
    });
  });
  return offers;
}

// ─── Image pools by category ────────────────────────────────────────────────

const IMG = {
  phones: [
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=60",
  ],
  laptops: [
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1587614382346-4ec70e388b28?w=500&auto=format&fit=crop&q=60",
  ],
  earphones: [
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=500&auto=format&fit=crop&q=60",
  ],
  fans: [
    "https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1507499739999-097706ad8914?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=500&auto=format&fit=crop&q=60",
  ],
  speakers: [
    "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500&auto=format&fit=crop&q=60",
  ],
  keyboards: [
    "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1541140532154-b024d705b909?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1593642634402-b0eb5e2eebc9?w=500&auto=format&fit=crop&q=60",
  ],
  mice: [
    "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1605773527852-c546a8584ea3?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=500&auto=format&fit=crop&q=60",
  ],
  kitchen: [
    "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1565538420870-da08ff96a207?w=500&auto=format&fit=crop&q=60",
  ],
};

// ─── Raw product data ────────────────────────────────────────────────────────
// Format: [name, brand, mrp, price, mainStore, rating, reviewCount, tags[], extraStores[]]

type RawProduct = [string, string, number, number, string, number, number, string[], string[]];

const RAW: Record<string, RawProduct[]> = {
  phones: [
    ["Apple iPhone 15 128GB Black", "Apple", 79900, 65999, "Amazon.in", 4.6, 28400, ["5G", "iOS", "USB-C"], ["Flipkart", "Croma", "Tata CLiQ"]],
    ["Apple iPhone 15 Pro 256GB Natural Titanium", "Apple", 134900, 119900, "Amazon.in", 4.7, 14200, ["5G", "iOS", "ProMotion"], ["Flipkart", "Croma"]],
    ["Apple iPhone 14 128GB Blue", "Apple", 69900, 55999, "Amazon.in", 4.6, 46000, ["5G", "iOS"], ["Flipkart", "Tata CLiQ", "Croma"]],
    ["Apple iPhone 13 128GB Midnight", "Apple", 59900, 44999, "Flipkart", 4.7, 115000, ["5G", "iOS", "OLED"], ["Amazon.in", "Croma"]],
    ["Samsung Galaxy S24 5G 128GB", "Samsung", 79999, 64999, "Flipkart", 4.6, 14200, ["5G", "AI", "Snapdragon"], ["Amazon.in", "Croma", "Tata CLiQ"]],
    ["Samsung Galaxy S23 FE 128GB Graphite", "Samsung", 54999, 39999, "Amazon.in", 4.5, 22000, ["5G", "AI"], ["Flipkart", "Croma"]],
    ["Samsung Galaxy A55 5G 128GB Navy", "Samsung", 45999, 37999, "Tata CLiQ", 4.4, 12600, ["5G", "Knox"], ["Amazon.in", "Flipkart"]],
    ["Samsung Galaxy M55 5G 128GB Blue", "Samsung", 29999, 24999, "Amazon.in", 4.4, 31000, ["5G", "120Hz"], ["Flipkart"]],
    ["OnePlus 12 256GB Silky Black", "OnePlus", 64999, 56999, "Amazon.in", 4.6, 19800, ["5G", "Hasselblad", "100W"], ["Flipkart", "Croma"]],
    ["OnePlus 12R 256GB Cool Blue", "OnePlus", 45999, 36999, "Amazon.in", 4.5, 32100, ["5G", "100W", "AMOLED"], ["Flipkart"]],
    ["OnePlus Nord CE4 128GB Dark Chrome", "OnePlus", 26999, 21999, "Croma", 4.4, 29000, ["5G", "100W"], ["Amazon.in", "Flipkart"]],
    ["Redmi Note 13 Pro+ 5G 256GB White", "Redmi", 33999, 27999, "Amazon.in", 4.3, 44000, ["5G", "200MP", "IP68"], ["Flipkart"]],
    ["Redmi Note 13 5G 128GB Prism Gold", "Redmi", 19999, 15999, "Amazon.in", 4.3, 68000, ["5G", "120Hz"], ["Flipkart"]],
    ["Redmi 13C 5G 128GB Stardust Black", "Redmi", 13999, 10999, "Flipkart", 4.2, 54000, ["5G", "50MP"], ["Amazon.in"]],
    ["Realme 12 Pro+ 5G 256GB Blue", "Realme", 34999, 27999, "Flipkart", 4.4, 24000, ["5G", "Periscope", "120Hz"], ["Amazon.in"]],
    ["Realme Narzo 70 Pro 5G 256GB Submarine Blue", "Realme", 24999, 19999, "Flipkart", 4.3, 18000, ["5G", "OLED"], ["Amazon.in"]],
    ["Vivo V30 Pro 5G 256GB ZEISS", "Vivo", 46999, 39999, "Tata CLiQ", 4.5, 11200, ["5G", "ZEISS", "Curved"], ["Amazon.in", "Flipkart"]],
    ["Vivo T3 5G 128GB Cosmic Blue", "Vivo", 22999, 18999, "Flipkart", 4.4, 27000, ["5G", "120Hz", "OIS"], ["Amazon.in"]],
    ["iQOO Neo 9 Pro 5G 256GB Black", "iQOO", 41999, 33999, "Amazon.in", 4.6, 21800, ["5G", "Gaming", "144Hz"], ["Flipkart"]],
    ["iQOO Z9 5G 128GB Green", "iQOO", 24999, 19999, "Amazon.in", 4.4, 31000, ["5G", "AMOLED", "44W"], ["Flipkart"]],
    ["Nothing Phone 2a 5G 128GB Black", "Nothing", 25999, 21999, "Flipkart", 4.4, 38000, ["5G", "Glyph", "OLED"], ["Amazon.in"]],
    ["Poco X6 Pro 5G 256GB Yellow", "Poco", 30999, 23999, "Flipkart", 4.5, 51000, ["5G", "Gaming", "AMOLED"], ["Amazon.in"]],
    ["Poco M6 Pro 5G 128GB Black", "Poco", 14999, 11999, "Amazon.in", 4.2, 42000, ["5G", "120Hz"], ["Flipkart"]],
    ["Motorola Edge 50 Pro 5G 256GB Blue", "Motorola", 36999, 29999, "Flipkart", 4.4, 19500, ["5G", "125W", "pOLED"], ["Amazon.in"]],
    ["Motorola G85 5G 256GB Cobalt Blue", "Motorola", 22999, 17999, "Flipkart", 4.4, 28000, ["5G", "pOLED", "50MP"], ["Amazon.in"]],
    ["Google Pixel 8a 128GB Obsidian", "Google", 52999, 44999, "Flipkart", 4.6, 9800, ["5G", "AI", "Tensor G3"], ["Amazon.in"]],
    ["Google Pixel 8 128GB Hazel", "Google", 75999, 59999, "Flipkart", 4.5, 16400, ["5G", "AI", "Tensor G3"], ["Amazon.in", "Croma"]],
    ["Tecno Spark 20 Pro 256GB White", "Tecno", 15999, 12499, "Amazon.in", 4.1, 22000, ["4G", "120Hz", "64MP"], ["Flipkart"]],
    ["Lava Blaze 2 5G 128GB Glass Black", "Lava", 10999, 8999, "Flipkart", 4.0, 18000, ["5G", "50MP"], ["Amazon.in"]],
    ["Itel S24 4G 128GB Twilight Blue", "itel", 9999, 7999, "Amazon.in", 3.9, 15000, ["4G", "90Hz"], ["Flipkart"]],
    ["Nokia G42 5G 128GB So Purple", "Nokia", 16999, 13499, "Amazon.in", 4.2, 11000, ["5G", "Android Pure"], ["Flipkart"]],
    ["Infinix Hot 40 Pro 5G 256GB Nebula Black", "Infinix", 15999, 12499, "Flipkart", 4.1, 19000, ["5G", "108MP"], ["Amazon.in"]],
    ["Xiaomi 14 512GB White Leica", "Xiaomi", 79999, 67999, "Croma", 4.5, 6800, ["5G", "Leica", "90W"], ["Amazon.in", "Flipkart"]],
    ["Xiaomi Redmi A3 64GB Midnight Black", "Xiaomi", 7999, 6499, "Flipkart", 4.0, 35000, ["4G", "90Hz"], ["Amazon.in"]],
    ["Oppo Reno 12 Pro 5G 256GB Space Brown", "Oppo", 44999, 36999, "Amazon.in", 4.4, 13200, ["5G", "50MP", "AMOLED"], ["Flipkart"]],
    ["Oppo A60 4G 128GB Ripple Blue", "Oppo", 17999, 14499, "Flipkart", 4.2, 24000, ["4G", "90Hz", "5000mAh"], ["Amazon.in"]],
    ["Asus Zenfone 11 Ultra 256GB Desert Sand", "Asus", 69999, 57999, "Amazon.in", 4.5, 7400, ["5G", "Snapdragon 8 Gen 3", "IP68"], ["Flipkart"]],
    ["Sony Xperia 10 VI 128GB Blue", "Sony", 49999, 42999, "Amazon.in", 4.3, 4500, ["5G", "Compact", "OLED"], ["Croma"]],
    ["Honor 90 5G 256GB Midnight Black", "Honor", 29999, 23999, "Amazon.in", 4.3, 14000, ["5G", "200MP", "OLED"], ["Flipkart"]],
    ["Nubia Red Magic 9 Pro 256GB Black", "Nubia", 54999, 44999, "Amazon.in", 4.4, 5600, ["5G", "Gaming", "165Hz"], ["Flipkart"]],
  ],
  laptops: [
    ["Apple MacBook Air M3 8GB 256GB Silver", "Apple", 114900, 104900, "Amazon.in", 4.8, 8900, ["M3", "macOS", "18h Battery"], ["Flipkart", "Croma"]],
    ["Apple MacBook Air M2 8GB 256GB Midnight", "Apple", 114900, 94900, "Amazon.in", 4.7, 22000, ["M2", "macOS", "OLED"], ["Croma", "Tata CLiQ"]],
    ["Apple MacBook Pro M3 Pro 18GB 512GB Silver", "Apple", 199900, 184900, "Croma", 4.9, 4200, ["M3 Pro", "16-inch", "Liquid Retina XDR"], ["Amazon.in"]],
    ["HP Victus 15 Intel i5 12th 8GB 512GB", "HP", 69999, 54999, "Amazon.in", 4.4, 18000, ["Gaming", "144Hz", "RTX 3050"], ["Flipkart"]],
    ["HP Pavilion 15 Intel i5 13th 16GB 512GB SSD", "HP", 72999, 59999, "Flipkart", 4.4, 14000, ["Thin", "Full HD", "FHD IPS"], ["Amazon.in"]],
    ["HP ENVY x360 13-inch Touch AMD Ryzen 5 7530U", "HP", 94999, 76999, "Amazon.in", 4.5, 6800, ["2-in-1", "OLED", "Touch"], ["Croma"]],
    ["Dell Inspiron 15 3520 Intel i5 12th 16GB 512GB", "Dell", 61999, 49999, "Amazon.in", 4.4, 21000, ["Thin", "FHD", "Office"], ["Flipkart"]],
    ["Dell XPS 15 9530 Intel i7 13th 16GB 512GB OLED", "Dell", 189990, 164990, "Croma", 4.7, 3200, ["OLED", "RTX 4060", "Creator"], ["Amazon.in"]],
    ["Lenovo IdeaPad Slim 3 Intel i5 12th 8GB 512GB", "Lenovo", 52999, 41999, "Flipkart", 4.3, 32000, ["Thin", "FHD", "Office"], ["Amazon.in"]],
    ["Lenovo LOQ 15 AMD Ryzen 5 7235H RTX 4050", "Lenovo", 74999, 58999, "Amazon.in", 4.5, 12000, ["Gaming", "144Hz", "RTX 4050"], ["Flipkart"]],
    ["Lenovo ThinkPad E14 Gen 5 Intel i5 13th 16GB", "Lenovo", 89999, 69999, "Amazon.in", 4.6, 7800, ["Business", "IPS", "Slim"], ["Croma"]],
    ["ASUS VivoBook 16X OLED Intel i5 13th 16GB", "Asus", 79999, 59999, "Flipkart", 4.5, 11000, ["OLED", "16-inch", "Office"], ["Amazon.in"]],
    ["ASUS ROG Strix G16 i9 13th RTX 4070 32GB", "Asus", 199999, 174999, "Amazon.in", 4.7, 4500, ["Gaming", "240Hz", "RTX 4070"], ["Flipkart", "Croma"]],
    ["ASUS ZenBook 14 OLED AMD Ryzen 7 7730U 16GB", "Asus", 94999, 74999, "Amazon.in", 4.6, 9200, ["OLED", "Thin", "Creator"], ["Flipkart"]],
    ["Acer Aspire Lite Intel i5 12th 8GB 512GB", "Acer", 49999, 38999, "Flipkart", 4.2, 24000, ["Slim", "FHD", "Value"], ["Amazon.in"]],
    ["Acer Nitro V15 Intel i5 13th RTX 4050 8GB", "Acer", 71999, 56999, "Amazon.in", 4.4, 15000, ["Gaming", "144Hz", "RTX 4050"], ["Flipkart"]],
    ["MSI Thin GF63 Intel i5 12th RTX 4050 8GB", "MSI", 68999, 54999, "Amazon.in", 4.4, 9800, ["Gaming", "144Hz", "Thin"], ["Flipkart"]],
    ["Samsung Galaxy Book4 Pro 360 Intel Ultra 7", "Samsung", 184999, 154999, "Samsung Store", 4.6, 3100, ["2-in-1", "AMOLED", "Touch"], ["Amazon.in"]],
    ["Realme Book Prime Intel i5 12th 16GB 512GB", "Realme", 59999, 46999, "Flipkart", 4.3, 8400, ["Slim", "2K IPS", "Office"], ["Amazon.in"]],
    ["Mi Notebook Pro 14 Intel i5 12th 16GB 512GB", "Xiaomi", 64999, 51999, "Amazon.in", 4.3, 11000, ["Thin", "OLED", "Office"], ["Flipkart"]],
    ["Infinix INBook X2 Plus Intel i5 12th 16GB", "Infinix", 44999, 34999, "Flipkart", 4.1, 12000, ["Slim", "FHD", "Value"], ["Amazon.in"]],
    ["Avita Pura Intel Celeron 8GB 256GB 14-inch", "Avita", 24999, 19999, "Amazon.in", 3.9, 7800, ["Budget", "Thin", "Office"], ["Flipkart"]],
    ["Thomson NEO 14 Intel Pentium Gold 8GB 256GB", "Thomson", 19999, 15999, "Flipkart", 3.8, 9200, ["Budget", "FHD"], ["Amazon.in"]],
    ["HP Stream 14 Intel Celeron 4GB 64GB eMMC", "HP", 24999, 18999, "Amazon.in", 3.7, 11000, ["Budget", "Light"], ["Flipkart"]],
    ["Dell Vostro 3520 Intel i3 12th 8GB 512GB", "Dell", 48999, 37999, "Amazon.in", 4.2, 16000, ["Office", "FHD", "Value"], ["Flipkart"]],
  ],
  earphones: [
    ["Sony WH-1000XM5 Wireless ANC Headphones Black", "Sony", 29990, 22990, "Amazon.in", 4.7, 18200, ["ANC", "30h Battery", "LDAC"], ["Flipkart", "Croma"]],
    ["Sony WF-1000XM5 TWS ANC Earbuds Black", "Sony", 24990, 18990, "Amazon.in", 4.6, 12400, ["ANC", "TWS", "LDAC"], ["Flipkart", "Croma"]],
    ["Apple AirPods Pro 2nd Gen USB-C", "Apple", 24900, 19900, "Amazon.in", 4.7, 34000, ["ANC", "TWS", "iOS"], ["Flipkart", "Croma", "Tata CLiQ"]],
    ["Apple AirPods 3rd Gen Lightning", "Apple", 14900, 11900, "Amazon.in", 4.5, 28000, ["TWS", "iOS", "Spatial Audio"], ["Flipkart", "Croma"]],
    ["boAt Airdopes 141 TWS Earbuds Active Black", "boAt", 2990, 999, "Amazon.in", 4.3, 182000, ["TWS", "42h Battery", "IPX4"], ["Flipkart", "Myntra"]],
    ["boAt Rockerz 550 Wireless Over-Ear Headphone", "boAt", 2990, 1299, "Amazon.in", 4.3, 94000, ["Wireless", "20h", "BT5.0"], ["Flipkart", "Myntra"]],
    ["boAt Airdopes 191G Gaming TWS Earbuds", "boAt", 3990, 1299, "Flipkart", 4.2, 76000, ["Gaming", "TWS", "Low Latency"], ["Amazon.in", "Myntra"]],
    ["JBL Tune 770NC Wireless ANC Headphones", "JBL", 9999, 6999, "Amazon.in", 4.5, 22000, ["ANC", "70h", "BT5.3"], ["Flipkart", "Croma"]],
    ["JBL Wave Beam TWS Earbuds IP54", "JBL", 4999, 2499, "Amazon.in", 4.3, 38000, ["TWS", "IP54", "32h"], ["Flipkart"]],
    ["Samsung Galaxy Buds3 Pro ANC TWS White", "Samsung", 19999, 14999, "Amazon.in", 4.5, 9800, ["ANC", "TWS", "Hi-Fi"], ["Flipkart", "Croma"]],
    ["Sennheiser Momentum True Wireless 4 Black", "Sennheiser", 29990, 23990, "Amazon.in", 4.7, 4500, ["ANC", "TWS", "Hi-Fi"], ["Croma"]],
    ["Noise Buds VS401 TWS Earbuds Black", "Noise", 2999, 999, "Amazon.in", 4.2, 112000, ["TWS", "50h", "IPX5"], ["Flipkart", "Myntra"]],
    ["Nothing Ear 2 TWS ANC Earbuds Transparent", "Nothing", 9999, 7499, "Flipkart", 4.5, 32000, ["ANC", "TWS", "LHDC"], ["Amazon.in"]],
    ["Nothing CMF Buds Pro TWS ANC Earbuds", "Nothing", 4999, 3499, "Amazon.in", 4.4, 44000, ["ANC", "TWS", "50h"], ["Flipkart"]],
    ["Realme Buds Air 6 Pro TWS ANC Earbuds", "Realme", 5999, 3499, "Flipkart", 4.3, 28000, ["ANC", "TWS", "LDAC"], ["Amazon.in"]],
    ["OnePlus Buds Pro 2 TWS ANC LHDC Earbuds", "OnePlus", 9999, 6999, "Amazon.in", 4.5, 19000, ["ANC", "TWS", "LHDC"], ["Flipkart"]],
    ["Bose QuietComfort Ultra Earbuds Black", "Bose", 31990, 24990, "Amazon.in", 4.7, 7600, ["ANC", "TWS", "Immersive Audio"], ["Croma"]],
    ["Mivi DuoPods M60 TWS Earbuds Black", "Mivi", 1999, 799, "Amazon.in", 4.1, 68000, ["TWS", "60h", "IPX4"], ["Flipkart"]],
    ["pTron Bassbuds Pro i30 TWS Earbuds", "pTron", 2499, 599, "Amazon.in", 4.0, 92000, ["TWS", "32h", "IPX4"], ["Flipkart"]],
    ["Skull Candy Indy Fuel TWS Earbuds Black", "Skullcandy", 7999, 4999, "Amazon.in", 4.3, 11000, ["TWS", "40h", "IPX5"], ["Flipkart"]],
    ["Oppo Enco Air 4 Pro TWS ANC Earbuds", "Oppo", 5999, 3999, "Flipkart", 4.3, 14000, ["ANC", "TWS", "IP55"], ["Amazon.in"]],
    ["Sony WH-CH720N Wireless ANC Headphone Blue", "Sony", 9990, 6990, "Amazon.in", 4.5, 28000, ["ANC", "35h", "DSEE"], ["Flipkart", "Croma"]],
    ["Beats Studio Pro Wireless ANC Black", "Beats", 29990, 22990, "Amazon.in", 4.5, 8200, ["ANC", "40h", "USB-C"], ["Croma"]],
    ["Jabra Evolve2 55 ANC Wireless Headset", "Jabra", 29999, 23999, "Amazon.in", 4.6, 3400, ["ANC", "Business", "UC"], ["Croma"]],
    ["Anker Soundcore Life Q35 ANC Headphones", "Anker", 7999, 4999, "Amazon.in", 4.4, 22000, ["ANC", "LDAC", "60h"], ["Flipkart"]],
  ],
  fans: [
    ["Atomberg Renesa+ 1200mm BLDC Smart Fan with Remote", "Atomberg", 5190, 3799, "Amazon.in", 4.6, 48000, ["BLDC", "28W", "Smart", "Remote"], ["Flipkart", "Croma"]],
    ["Atomberg Efficio+ 1200mm BLDC Ceiling Fan", "Atomberg", 4750, 3299, "Flipkart", 4.6, 38000, ["BLDC", "Inverter-Ready", "5-Star"], ["Amazon.in"]],
    ["Atomberg Studio+ 1200mm BLDC LED Display Fan", "Atomberg", 6990, 4799, "Amazon.in", 4.7, 11400, ["BLDC", "LED Display", "Timer"], ["Flipkart", "Croma"]],
    ["Crompton SilentPro Enso 1200mm BLDC Smart Fan", "Crompton", 6499, 4299, "Flipkart", 4.6, 18200, ["BLDC", "Silent", "315 CMM"], ["Amazon.in"]],
    ["Crompton Energion Groove 1200mm BLDC RF Remote Fan", "Crompton", 4990, 3499, "Amazon.in", 4.5, 14100, ["BLDC", "5-Star", "RF Remote"], ["Flipkart"]],
    ["Havells Glaze 1200mm Decorative Fan Espresso", "Havells", 4120, 2899, "Amazon.in", 4.4, 24000, ["Decorative", "Copper Motor", "390 RPM"], ["Flipkart"]],
    ["Havells Stealth Air 1200mm BLDC Ceiling Fan", "Havells", 7850, 5499, "Tata CLiQ", 4.7, 6200, ["BLDC", "Quiet", "280 CMM"], ["Amazon.in"]],
    ["Havells Pacer 1200mm 400 RPM High Speed Fan", "Havells", 3120, 2199, "Amazon.in", 4.4, 34000, ["High Speed", "400 RPM", "Copper"], ["Flipkart"]],
    ["Usha Striker Galaxy 1200mm High Speed Ceiling Fan", "Usha", 3690, 2599, "Tata CLiQ", 4.4, 14500, ["High Speed", "385 RPM"], ["Amazon.in", "Flipkart"]],
    ["Usha Mist Air Icy 400mm Pedestal Fan with Remote", "Usha", 4790, 3299, "Flipkart", 4.4, 15200, ["Pedestal", "Remote", "Oscillation"], ["Amazon.in"]],
    ["Orient Electric Wendy 1200mm Metallic Ceiling Fan", "Orient Electric", 4450, 3199, "Flipkart", 4.5, 12800, ["Metallic", "Copper Winding"], ["Amazon.in"]],
    ["Orient Electric Apex-FX 1200mm High Speed Fan", "Orient Electric", 2390, 1699, "Flipkart", 4.3, 52000, ["High Speed", "Ball Bearings"], ["Amazon.in"]],
    ["Bajaj Maxima 600mm Ultra High Speed Ceiling Fan", "Bajaj", 2290, 1599, "Amazon.in", 4.3, 31000, ["High Speed", "870 RPM", "Kitchen"], ["Flipkart"]],
    ["Bajaj Esteem 400mm Table Fan Silent", "Bajaj", 2850, 1999, "Amazon.in", 4.4, 19500, ["Table Fan", "Quiet", "Copper"], ["Flipkart"]],
    ["Luminous Dhoom 1200mm High Speed Decorative Fan", "Luminous", 2690, 1899, "Tata CLiQ", 4.3, 22000, ["Decorative", "Aluminium Blades"], ["Amazon.in"]],
    ["Polycab Superb 1200mm Energy Saver Fan Rose Gold", "Polycab", 3550, 2499, "Flipkart", 4.4, 7600, ["Energy Saver", "Rose Gold"], ["Amazon.in"]],
    ["Crompton HighFlo Wave Plus 400mm Wall Mount Fan", "Crompton", 3550, 2499, "Croma", 4.4, 11800, ["Wall Mount", "Oscillation"], ["Amazon.in"]],
    ["Anchor Penta 1200mm 5-Blade Ceiling Fan White", "Anchor", 2790, 1999, "Amazon.in", 4.2, 16000, ["5 Blade", "Copper Motor"], ["Flipkart"]],
    ["V-Guard Finesta 1200mm BLDC Ceiling Fan Black", "V-Guard", 5290, 3799, "Amazon.in", 4.5, 9800, ["BLDC", "5-Star", "Smart"], ["Flipkart"]],
    ["Superfan Super A1 1200mm BLDC Fan with Remote", "Superfan", 4699, 3299, "Amazon.in", 4.5, 12400, ["BLDC", "35W", "Remote"], ["Flipkart"]],
  ],
  speakers: [
    ["JBL Flip 6 Portable Bluetooth Speaker IP67", "JBL", 13999, 9999, "Amazon.in", 4.7, 34000, ["Portable", "IP67", "12h"], ["Flipkart", "Croma"]],
    ["JBL Charge 5 Portable Speaker with Powerbank", "JBL", 18999, 14999, "Amazon.in", 4.8, 19000, ["Powerbank", "IP67", "20h"], ["Flipkart", "Croma"]],
    ["JBL Go 3 Waterproof Ultra-Portable Speaker", "JBL", 3999, 2499, "Amazon.in", 4.6, 45000, ["Portable", "IP67", "5h"], ["Flipkart"]],
    ["boAt Stone 1200 14W RGB Bluetooth Speaker", "boAt", 6990, 2999, "Flipkart", 4.4, 41000, ["RGB", "14W", "IPX7"], ["Amazon.in", "Myntra"]],
    ["boAt Stone 650 10W Bluetooth Speaker IPX5", "boAt", 3990, 1499, "Flipkart", 4.5, 78000, ["10W", "IPX5", "7h"], ["Amazon.in", "Myntra"]],
    ["boAt PartyPal 50 20W Wireless Party Speaker", "boAt", 5990, 2499, "Amazon.in", 4.3, 14000, ["20W", "Karaoke", "LED"], ["Flipkart"]],
    ["Sony SRS-XB100 Wireless Portable Speaker IP67", "Sony", 4990, 3990, "Croma", 4.6, 14200, ["Extra Bass", "IP67", "16h"], ["Amazon.in", "Flipkart"]],
    ["Sony SRS-XE200 X-Series Wireless Speaker", "Sony", 12990, 8990, "Amazon.in", 4.5, 5800, ["X-Balanced", "IP67", "16h"], ["Flipkart", "Croma"]],
    ["Sony HT-S20R 5.1ch Dolby Soundbar System", "Sony", 23990, 17990, "Croma", 4.7, 26000, ["5.1ch", "400W", "Dolby"], ["Amazon.in", "Flipkart"]],
    ["Marshall Emberton II Portable Speaker Black", "Marshall", 17499, 14999, "Amazon.in", 4.8, 12400, ["IP67", "30h", "360°"], ["Croma", "Tata CLiQ"]],
    ["Marshall Stanmore III Bluetooth Home Speaker", "Marshall", 37999, 31999, "Tata CLiQ", 4.8, 3400, ["Home", "BT 5.2", "Analog Inputs"], ["Amazon.in"]],
    ["Bose SoundLink Micro Bluetooth Speaker", "Bose", 12900, 10900, "Amazon.in", 4.7, 9200, ["Portable", "IP67", "Silicone Strap"], ["Croma"]],
    ["Bose SoundLink Flex Portable Speaker Black", "Bose", 14900, 12490, "Amazon.in", 4.7, 14800, ["IP67", "12h", "Portable"], ["Croma", "Tata CLiQ"]],
    ["Tribit StormBox Micro 2 Outdoor Speaker", "Tribit", 5499, 3899, "Amazon.in", 4.7, 16800, ["Bike Mount", "XBASS", "12h"], ["Flipkart"]],
    ["Mivi Roam 2 Wireless 24H Playtime Speaker", "Mivi", 2999, 799, "Flipkart", 4.3, 64000, ["24h", "Studio Sound"], ["Amazon.in"]],
    ["Portronics SoundDrum 1 10W TWS Speaker", "Portronics", 2499, 799, "Flipkart", 4.3, 38000, ["10W", "FM Radio", "Type-C"], ["Amazon.in"]],
    ["Zebronics Zeb-Sound Feast 500 70W Party Speaker", "Zebronics", 8499, 3799, "Flipkart", 4.3, 19500, ["70W", "RGB", "Mic Input"], ["Amazon.in"]],
    ["Echo Dot 5th Gen Smart Speaker with Alexa", "Amazon", 5499, 4499, "Amazon.in", 4.5, 62000, ["Smart Home", "Alexa", "Motion Sensor"], ["Flipkart"]],
    ["Mi Portable Bluetooth Speaker 16W Dual EQ", "Xiaomi", 3499, 2499, "Flipkart", 4.4, 32000, ["16W", "IPX7", "13h"], ["Amazon.in"]],
    ["Realme Pocket 3W Compact BT Speaker", "Realme", 1499, 799, "Flipkart", 4.2, 28000, ["3W", "IPX5", "Bass Modes"], ["Amazon.in"]],
  ],
  keyboards: [
    ["Logitech MX Keys S Wireless Backlit Keyboard", "Logitech", 9995, 7495, "Amazon.in", 4.7, 14200, ["Wireless", "Backlit", "Multi-Device"], ["Flipkart", "Croma"]],
    ["Logitech G Pro X TKL Mechanical Gaming KB", "Logitech", 12995, 9995, "Amazon.in", 4.6, 9800, ["Mechanical", "TKL", "RGB"], ["Flipkart"]],
    ["Logitech K380 Multi-Device Bluetooth Keyboard", "Logitech", 3795, 2495, "Amazon.in", 4.5, 48000, ["Bluetooth", "Multi-Device", "Portable"], ["Flipkart", "Croma"]],
    ["Keychron K2 V2 Hot-Swap Wireless Mechanical KB", "Keychron", 7999, 6999, "Amazon.in", 4.7, 8400, ["Hot-Swap", "Wireless", "Compact"], ["Flipkart"]],
    ["Keychron Q1 Pro QMK Wireless Mechanical KB", "Keychron", 15999, 13999, "Amazon.in", 4.8, 4200, ["QMK", "Gasket Mount", "Wireless"], ["Flipkart"]],
    ["Razer BlackWidow V4 Pro Wireless Mech KB", "Razer", 24999, 18999, "Amazon.in", 4.6, 6200, ["Mechanical", "Wireless", "RGB"], ["Flipkart", "Croma"]],
    ["Razer Huntsman Mini 60% Optical Gaming KB", "Razer", 10999, 8499, "Amazon.in", 4.5, 11000, ["60%", "Optical", "RGB"], ["Flipkart"]],
    ["Corsair K70 RGB Pro Mechanical Gaming KB", "Corsair", 14999, 11999, "Amazon.in", 4.5, 8600, ["Cherry MX", "RGB", "Media Keys"], ["Flipkart"]],
    ["SteelSeries Apex Pro TKL Wireless Gaming KB", "SteelSeries", 24999, 19999, "Amazon.in", 4.6, 5400, ["OLED", "Wireless", "Adjustable"], ["Flipkart"]],
    ["HP 230 Wireless Keyboard Mouse Combo", "HP", 2999, 1999, "Amazon.in", 4.4, 32000, ["Wireless", "Combo", "2.4GHz"], ["Flipkart", "Croma"]],
    ["Dell KB216 USB Multimedia Keyboard Black", "Dell", 999, 599, "Amazon.in", 4.3, 54000, ["USB", "Multimedia", "Plug & Play"], ["Flipkart"]],
    ["Portronics Hydra 10 Mechanical TKL Keyboard", "Portronics", 4999, 2999, "Amazon.in", 4.4, 18000, ["Mechanical", "TKL", "RGB"], ["Flipkart"]],
    ["Cosmic Byte CB-GK-26 Neon Mechanical KB", "Cosmic Byte", 3999, 2499, "Amazon.in", 4.3, 26000, ["Mechanical", "RGB", "Gaming"], ["Flipkart"]],
    ["Zebronics Max Plus Wireless Keyboard Mouse Combo", "Zebronics", 1999, 1099, "Amazon.in", 4.2, 42000, ["Wireless", "Combo", "Value"], ["Flipkart"]],
    ["Ant Esports MK1300 Pro Mechanical KB Blue Switch", "Ant Esports", 3499, 1999, "Amazon.in", 4.3, 21000, ["Mechanical", "Blue Switch", "RGB"], ["Flipkart"]],
    ["Redragon K530 Draconic 60% Wireless Mech KB", "Redragon", 4999, 3499, "Amazon.in", 4.4, 14000, ["60%", "Wireless", "RGB"], ["Flipkart"]],
    ["TVS Gold Mechanical Keyboard USB Gold Switch", "TVS", 2999, 2499, "Amazon.in", 4.5, 18000, ["Mechanical", "Gold Switch", "Durable"], ["Flipkart"]],
    ["Ambrane Wireless Keyboard Lightweight Slim", "Ambrane", 1499, 849, "Amazon.in", 4.1, 22000, ["Wireless", "Slim", "Value"], ["Flipkart"]],
    ["boAt Deuce U 1300 Mechanical Keyboard", "boAt", 2999, 1799, "Amazon.in", 4.2, 16000, ["Mechanical", "RGB", "Value"], ["Flipkart"]],
    ["Rapoo V500 Pro Mechanical Backlit Keyboard", "Rapoo", 3499, 2299, "Amazon.in", 4.3, 11000, ["Mechanical", "Backlit", "Metal"], ["Flipkart"]],
  ],
  mice: [
    ["Logitech MX Master 3S Wireless Mouse", "Logitech", 9995, 7495, "Amazon.in", 4.8, 28400, ["Wireless", "8000 DPI", "Silent"], ["Flipkart", "Croma"]],
    ["Logitech G Pro X Superlight 2 Wireless Mouse", "Logitech", 14995, 12495, "Amazon.in", 4.8, 12200, ["Gaming", "32000 DPI", "Ultra-Light"], ["Flipkart"]],
    ["Logitech G502 X Plus Wireless Gaming Mouse", "Logitech", 12995, 9995, "Amazon.in", 4.7, 8600, ["Gaming", "LIGHTFORCE", "RGB"], ["Flipkart"]],
    ["Logitech M221 Silent Wireless Optical Mouse", "Logitech", 1195, 799, "Amazon.in", 4.7, 48000, ["Silent", "Wireless", "18 Months Battery"], ["Flipkart"]],
    ["Logitech B170 Wireless Mouse 2.4GHz", "Logitech", 895, 599, "Amazon.in", 4.6, 125000, ["Wireless", "12 Months Battery", "Value"], ["Flipkart"]],
    ["Logitech Pebble M350 Slim Silent Wireless Mouse", "Logitech", 2295, 1495, "Croma", 4.7, 26000, ["Silent", "BT+USB", "Slim"], ["Amazon.in", "Flipkart"]],
    ["Razer DeathAdder V3 HyperSpeed Wireless Mouse", "Razer", 9999, 6999, "Amazon.in", 4.6, 9800, ["Gaming", "Wireless", "30000 DPI"], ["Flipkart"]],
    ["Razer DeathAdder Essential Gaming Mouse", "Razer", 2499, 1199, "Amazon.in", 4.6, 54000, ["Gaming", "6400 DPI", "5 Buttons"], ["Flipkart"]],
    ["boAt Immortal 121 RGB Gaming Mouse 7200 DPI", "boAt", 1490, 699, "Flipkart", 4.4, 18900, ["Gaming", "RGB", "7200 DPI"], ["Amazon.in", "Myntra"]],
    ["HP X1500 Wired Optical Mouse", "HP", 599, 349, "Amazon.in", 4.3, 42000, ["Wired", "1000 DPI", "Plug & Play"], ["Flipkart"]],
    ["Dell WM118 Wireless Optical Mouse", "Dell", 999, 649, "Croma", 4.5, 38500, ["Wireless", "1000 DPI", "12 Months Battery"], ["Amazon.in", "Flipkart"]],
    ["Microsoft Bluetooth Ergonomic Mouse Matte Black", "Microsoft", 2399, 1499, "Tata CLiQ", 4.6, 18400, ["BT", "Ergonomic", "Swift Pair"], ["Amazon.in", "Flipkart"]],
    ["Portronics Toad 23 BT + 2.4GHz Dual Mode Mouse", "Portronics", 799, 449, "Amazon.in", 4.4, 11200, ["Dual Mode", "BT 5.1", "Type-C"], ["Flipkart", "Myntra"]],
    ["Zebronics ZEB-DASH Wireless Optical Mouse", "Zebronics", 499, 279, "Flipkart", 4.2, 21000, ["Wireless", "1600 DPI", "Value"], ["Amazon.in"]],
    ["Ant Esports GM320 RGB Gaming Mouse 12800 DPI", "Ant Esports", 1299, 549, "Flipkart", 4.4, 32000, ["Gaming", "12800 DPI", "RGB"], ["Amazon.in"]],
    ["Cosmic Byte CB-M212 RGB Gaming Mouse", "Cosmic Byte", 999, 499, "Amazon.in", 4.3, 28000, ["Gaming", "RGB", "3200 DPI"], ["Flipkart"]],
    ["HP 240 Ergonomic BT 5.0 Wireless Mouse", "HP", 1499, 899, "Tata CLiQ", 4.5, 14500, ["BT 5.0", "Ergonomic", "15 Months Battery"], ["Amazon.in", "Flipkart"]],
    ["Ambrane Smooth One Wireless Mouse Silent", "Ambrane", 799, 399, "Amazon.in", 4.2, 19000, ["Silent", "Wireless", "Value"], ["Flipkart"]],
    ["Redragon M711 Cobra Gaming Mouse RGB", "Redragon", 1999, 999, "Amazon.in", 4.4, 22000, ["Gaming", "RGB", "10000 DPI"], ["Flipkart"]],
    ["Lenovo 300 Compact Wireless Mouse", "Lenovo", 890, 549, "Amazon.in", 4.4, 31000, ["Wireless", "1000 DPI", "Compact"], ["Flipkart"]],
  ],
  kitchen: [
    ["Borosil Glass Mixing Serving Bowl Set 3Pcs", "Borosil", 1190, 799, "Amazon.in", 4.6, 28400, ["Borosilicate", "Microwave Safe", "Oven Safe"], ["Flipkart", "Myntra"]],
    ["Prestige Stainless Steel Pressure Cooker 3L", "Prestige", 2990, 1699, "Amazon.in", 4.5, 34000, ["Stainless Steel", "3L", "ISI Mark"], ["Flipkart"]],
    ["Butterfly Rapid Pressure Cooker 3L Stainless", "Butterfly", 2290, 1299, "Amazon.in", 4.4, 26000, ["Stainless Steel", "3L", "Safety Valve"], ["Flipkart"]],
    ["Havells Ghee Maker 1.5L Stainless Steel", "Havells", 3490, 2099, "Amazon.in", 4.4, 12000, ["Electric", "Auto Cut-off", "1.5L"], ["Flipkart", "Croma"]],
    ["Philips Daily Collection Mixer Grinder 500W", "Philips", 4999, 2999, "Amazon.in", 4.4, 42000, ["500W", "3 Jars", "Stainless Steel"], ["Flipkart", "Croma"]],
    ["Preethi Eco Plus Mixer Grinder 550W", "Preethi", 4999, 2799, "Amazon.in", 4.5, 38000, ["550W", "3 Jars", "5 Year Warranty"], ["Flipkart"]],
    ["Butterfly Matchless Mixer Grinder 750W", "Butterfly", 5999, 3499, "Flipkart", 4.5, 22000, ["750W", "4 Jars", "SS Blades"], ["Amazon.in"]],
    ["Milton Thermosteel Flip Lid Flask 1 Litre", "Milton", 1290, 699, "Amazon.in", 4.5, 54000, ["Hot & Cold", "18h", "SS 304"], ["Flipkart", "Myntra"]],
    ["Cello Opalware Dinner Set 27pcs White", "Cello", 3999, 1999, "Amazon.in", 4.4, 18000, ["Opalware", "27pcs", "Microwave Safe"], ["Flipkart"]],
    ["Borosil Klip N Store Glass Bowl 400ml", "Borosil", 595, 399, "Amazon.in", 4.6, 16800, ["Borosilicate", "Airtight", "Stackable"], ["Flipkart", "Myntra"]],
    ["TTK Prestige Induction Base Kadai 24cm", "Prestige", 1999, 1199, "Amazon.in", 4.4, 22000, ["Induction Compatible", "Non-Stick", "24cm"], ["Flipkart"]],
    ["Pigeon by Stovekraft Favourite Plus Cooker 3L", "Pigeon", 2490, 999, "Amazon.in", 4.3, 48000, ["3L", "Hard Anodized", "Value"], ["Flipkart"]],
    ["Wonderchef Granite Die-Cast Casserole 24cm", "Wonderchef", 4999, 2999, "Amazon.in", 4.5, 8400, ["PFOA-Free", "Granite", "Gas & Induction"], ["Flipkart"]],
    ["Borosil Microwave Safe Round Glass Dish 1.5L", "Borosil", 1190, 765, "Amazon.in", 4.7, 18100, ["Borosilicate", "Microwave Safe", "Lid Included"], ["Flipkart"]],
    ["Morphy Richards Icon 1200W Food Processor", "Morphy Richards", 7999, 4999, "Amazon.in", 4.4, 11200, ["1200W", "Food Processor", "5 Attachments"], ["Flipkart", "Croma"]],
    ["Inalsa Inox Blender 400W Stainless Steel", "Inalsa", 1999, 1099, "Amazon.in", 4.3, 16800, ["400W", "SS Jar", "5 Speed"], ["Flipkart"]],
    ["Tupperware 1.5L Fridge Mate Container", "Tupperware", 1199, 799, "Amazon.in", 4.5, 12000, ["BPA Free", "Airtight", "Stackable"], ["Flipkart", "Myntra"]],
    ["Lock & Lock Airtight Container Set 5pcs", "Lock & Lock", 1499, 999, "Amazon.in", 4.6, 24000, ["Airtight", "BPA Free", "Stackable"], ["Flipkart"]],
    ["Vinod Stainless Steel Kadai with Lid 24cm", "Vinod", 2499, 1499, "Amazon.in", 4.5, 14000, ["SS 304", "Induction Compatible", "Lid"], ["Flipkart"]],
    ["Sumeet Die Cast Aluminium Fry Pan 24cm", "Sumeet", 1799, 999, "Amazon.in", 4.3, 19000, ["PFOA-Free", "Non-Stick", "Gas & Induction"], ["Flipkart"]],
    ["Roti Maker Electric 900W Automatic Chapati", "Prestige", 3999, 2499, "Amazon.in", 4.2, 22000, ["900W", "Auto", "Non-Stick Plate"], ["Flipkart"]],
    ["Bajaj Majesty 1200DX Induction Cooktop 1200W", "Bajaj", 2990, 1799, "Amazon.in", 4.4, 32000, ["1200W", "Indian Menu", "Auto-off"], ["Flipkart", "Croma"]],
    ["Philips Viva Collection Air Fryer 4.1L", "Philips", 11999, 7499, "Amazon.in", 4.5, 18000, ["4.1L", "1400W", "Rapid Air Tech"], ["Flipkart", "Croma"]],
    ["Havells Toastino 2 Slice Pop-up Toaster", "Havells", 1990, 1099, "Amazon.in", 4.4, 28000, ["2 Slice", "7 Browning", "SS"], ["Flipkart"]],
    ["Morphy Richards OTG 18L Besta 1200W", "Morphy Richards", 5999, 3499, "Amazon.in", 4.4, 14000, ["18L", "1200W", "5 Accessories"], ["Flipkart", "Croma"]],
    ["Prestige Electric Kettle PKGSS 1.8L SS", "Prestige", 1999, 1099, "Amazon.in", 4.4, 36000, ["1.8L", "1500W", "SS 304"], ["Flipkart"]],
    ["Borosil Water Jug with Lid 1.5L Glass", "Borosil", 999, 599, "Amazon.in", 4.6, 22000, ["Borosilicate", "BPA Free", "Fridge Safe"], ["Flipkart", "Myntra"]],
    ["Cello Spin N Store 3-Rack Plate Rack", "Cello", 1299, 699, "Amazon.in", 4.3, 11000, ["Stainless Steel", "3 Racks", "Drainer"], ["Flipkart"]],
    ["TTK Prestige Popular Plus Aluminium Cooker 5L", "Prestige", 2290, 1399, "Amazon.in", 4.4, 44000, ["5L", "Aluminium", "ISI Mark"], ["Flipkart"]],
    ["Corelle Livingware Winter Frost Dinner Set 21pcs", "Corelle", 7999, 4999, "Amazon.in", 4.8, 8200, ["Vitrelle Glass", "Lightweight", "Chip Resistant"], ["Flipkart", "Tata CLiQ"]],
  ],
};

// ─── Build the full 200-product catalog ─────────────────────────────────────

function buildCatalog(): Product[] {
  const products: Product[] = [];
  let globalIdx = 0;

  for (const [category, rawList] of Object.entries(RAW)) {
    const imgPool = IMG[category as keyof typeof IMG] ?? IMG.phones;

    rawList.forEach((raw, localIdx) => {
      const [name, brand, mrp, price, mainStore, rating, reviewCount, tags, extraStores] = raw;
      const id = `${category}-${String(localIdx + 1).padStart(3, "0")}`;
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      products.push({
        id,
        name,
        brand,
        category,
        slug,
        imageUrl: imgPool[localIdx % imgPool.length],
        rating,
        reviewCount,
        offers: genOffers(name, mrp, price, mainStore, extraStores),
        priceHistory: genHistory(price, globalIdx),
        tags,
      });

      globalIdx++;
    });
  }

  return products;
}

const CATALOG: Product[] = buildCatalog();

// ─── Connector class ─────────────────────────────────────────────────────────

export class MockConnector {
  private products: Product[] = CATALOG;

  /** Search by name/brand, with optional filters */
  search(query: string, filters?: SearchFilters): Product[] {
    const q = query.toLowerCase().trim();
    let results = this.products.filter((p) => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });

    if (filters?.category) {
      results = results.filter((p) => p.category === filters.category);
    }
    if (filters?.store) {
      results = results.filter((p) =>
        p.offers.some((o) => o.store === filters.store)
      );
    }
    if (filters?.inStock !== undefined) {
      results = results.filter((p) =>
        p.offers.some((o) => o.inStock === filters.inStock)
      );
    }

    const minP = filters?.minPrice;
    const maxP = filters?.maxPrice;
    if (minP !== undefined || maxP !== undefined) {
      results = results.filter((p) => {
        const best = this.bestPrice(p);
        if (minP !== undefined && best < minP) return false;
        if (maxP !== undefined && best > maxP) return false;
        return true;
      });
    }

    // Sort
    switch (filters?.sortBy) {
      case "price_asc":
        results.sort((a, b) => this.bestPrice(a) - this.bestPrice(b));
        break;
      case "price_desc":
        results.sort((a, b) => this.bestPrice(b) - this.bestPrice(a));
        break;
      case "rating":
        results.sort((a, b) => b.rating - a.rating);
        break;
      case "discount":
        results.sort((a, b) => this.bestDiscount(b) - this.bestDiscount(a));
        break;
    }

    return results;
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

  getTrending(limit = 20): Product[] {
    // Sort by review count descending (proxy for popularity)
    return [...this.products]
      .sort((a, b) => b.reviewCount - a.reviewCount)
      .slice(0, limit);
  }

  getByCategory(category: string, limit = 20): Product[] {
    return this.products
      .filter((p) => p.category === category)
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
