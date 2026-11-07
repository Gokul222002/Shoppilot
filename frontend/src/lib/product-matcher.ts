/**
 * Product Matching & Deduplication Engine — ShopPilot
 * Normalizes multi-store retailer listings, extracts core specs, and calculates
 * match confidence to merge different retailer listings into one canonical product.
 */

export interface NormalizedAttributes {
  brand: string;
  model: string;
  storage?: string;
  ram?: string;
  size?: string;
  color?: string;
  cleanedTokens: string[];
}

const COMMON_STOP_WORDS = new Set([
  "with", "for", "and", "the", "in", "of", "pack", "set", "new", "latest",
  "smart", "ultra", "super", "high", "speed", "fast", "original", "genuine"
]);

export function cleanText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractAttributes(title: string, brandHint?: string): NormalizedAttributes {
  const clean = cleanText(title);
  const words = clean.split(" ");

  // Storage extraction (e.g. 128gb, 256 gb, 1tb)
  const storageMatch = clean.match(/(\d+)\s*(gb|tb)\b/);
  const storage = storageMatch ? `${storageMatch[1]}${storageMatch[2]}` : undefined;

  // RAM extraction (e.g. 8gb ram, 16 gb ram)
  const ramMatch = clean.match(/(\d+)\s*gb\s*ram\b/);
  const ram = ramMatch ? `${ramMatch[1]}gb` : undefined;

  // Physical Size extraction (e.g. 1200mm, 400mm, 27-inch, 27")
  const sizeMatch = clean.match(/(\d+(?:\.\d+)?)\s*(mm|cm|inch|in)\b/);
  const size = sizeMatch ? `${sizeMatch[1]}${sizeMatch[2]}` : undefined;

  // Color extraction
  const colors = ["black", "blue", "white", "silver", "gold", "midnight", "green", "grey", "red", "purple"];
  const color = colors.find((c) => words.includes(c));

  // Determine brand
  const knownBrands = [
    "apple", "samsung", "oneplus", "xiaomi", "redmi", "realme", "poco", "iqoo",
    "motorola", "google", "dell", "hp", "lenovo", "asus", "acer", "sony", "jbl",
    "boat", "bose", "marshall", "atomberg", "crompton", "havells", "usha", "orient",
    "logitech", "razer", "portronics", "borosil", "milton", "cello"
  ];

  let brand = brandHint ? brandHint.toLowerCase() : "";
  if (!brand) {
    brand = knownBrands.find((b) => words.includes(b)) || words[0] || "unknown";
  }

  // Filter out brand, stop words, and spec values from tokens
  const cleanedTokens = words.filter(
    (w) =>
      w.length > 1 &&
      !COMMON_STOP_WORDS.has(w) &&
      w !== brand &&
      (!storage || !w.includes(storage)) &&
      (!size || !w.includes(size))
  );

  return {
    brand,
    model: cleanedTokens.slice(0, 3).join(" "),
    storage,
    ram,
    size,
    color,
    cleanedTokens,
  };
}

/**
 * Calculates match similarity between two raw product listings.
 * Returns score between 0.0 (completely different) and 1.0 (identical product SKU).
 */
export function calculateMatchScore(titleA: string, titleB: string): number {
  const attrA = extractAttributes(titleA);
  const attrB = extractAttributes(titleB);

  // If brands are explicitly known and conflict, they are definitely different items
  if (attrA.brand !== "unknown" && attrB.brand !== "unknown" && attrA.brand !== attrB.brand) {
    return 0.0;
  }

  // If both have different storage or size, they are different variants
  if (attrA.storage && attrB.storage && attrA.storage !== attrB.storage) {
    return 0.2;
  }
  if (attrA.size && attrB.size && attrA.size !== attrB.size) {
    return 0.2;
  }

  // Token Jaccard Similarity
  const setA = new Set(attrA.cleanedTokens);
  const setB = new Set(attrB.cleanedTokens);

  if (setA.size === 0 || setB.size === 0) return 0.0;

  const arrA = Array.from(setA);
  const arrB = Array.from(setB);
  const intersection = new Set(arrA.filter((x) => setB.has(x)));
  const union = new Set(arrA.concat(arrB));
  const jaccard = intersection.size / union.size;

  let score = jaccard;

  // Brand match bonus
  if (attrA.brand === attrB.brand && attrA.brand !== "unknown") {
    score += 0.25;
  }

  // Exact spec match bonus
  if (attrA.storage && attrA.storage === attrB.storage) {
    score += 0.15;
  }
  if (attrA.size && attrA.size === attrB.size) {
    score += 0.15;
  }

  return Math.min(1.0, Math.round(score * 100) / 100);
}
