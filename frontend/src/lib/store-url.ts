/**
 * Store URL & Affiliate Redirect Builder (Workstream 3 & Defect D4 Fix)
 * Generates high-accuracy outbound search links by sanitizing brackets, commas,
 * and noisy spec words so Amazon/Flipkart/Croma return the exact target product.
 */

export interface StoreOfferInput {
  store: string;
  url?: string;
  productName: string;
}

const NOISE_WORDS = new Set([
  "edition",
  "with",
  "and",
  "for",
  "the",
  "men's",
  "women's",
  "road",
  "running",
]);

export function sanitizeProductQuery(title: string): string {
  if (!title) return "";

  // 1. Remove bracketed specs and parenthetical text (e.g. "(Fluid Silver, 256GB, 12GB RAM)")
  // But extract RAM and Storage first
  const ramMatch = title.match(/\b(\d+)\s*GB\s+RAM\b/i);
  const ram = ramMatch ? `${ramMatch[1]}GB RAM` : "";

  const storageMatch = title.match(/\b(\d+)\s*(GB|TB)\b(?!\s*RAM)/i);
  const storage = storageMatch ? `${storageMatch[1]}${storageMatch[2].toUpperCase()}` : "";

  // Strip anything in parentheses or brackets
  let cleaned = title.replace(/\([^)]*\)/g, " ").replace(/\[[^\]]*\]/g, " ");

  // Strip special symbols like commas, slashes, pipes, plus
  cleaned = cleaned.replace(/[,|/\\+~`!@#$%^&*?;:]/g, " ");

  // Remove edition suffixes or filler
  const words = cleaned
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && !NOISE_WORDS.has(w.toLowerCase()));

  // Re-append storage & RAM if they were stripped inside parentheses
  let result = words.join(" ");
  if (storage && !result.toLowerCase().includes(storage.toLowerCase())) {
    result += ` ${storage}`;
  }
  if (ram && !result.toLowerCase().includes(ram.toLowerCase())) {
    result += ` ${ram}`;
  }

  // Deduplicate extra whitespace
  return result.replace(/\s+/g, " ").trim();
}

export function buildStoreUrl(
  store: string,
  productName: string,
  directUrl?: string
): string {
  // If a verified direct product URL already exists, preserve it
  if (directUrl && (directUrl.includes("/dp/") || directUrl.includes("/p/"))) {
    return directUrl;
  }

  const cleanQuery = sanitizeProductQuery(productName);
  const encoded = encodeURIComponent(cleanQuery);

  switch (store) {
    case "Amazon.in":
      return `https://www.amazon.in/s?k=${encoded}`;
    case "Flipkart":
      return `https://www.flipkart.com/search?q=${encoded}`;
    case "Croma":
      return `https://www.croma.com/searchB?q=${encoded}`;
    case "Tata CLiQ":
      return `https://www.tatacliq.com/search/?searchCategory=all&text=${encoded}`;
    case "Myntra":
      return `https://www.myntra.com/${encoded}`;
    default:
      return `https://www.amazon.in/s?k=${encoded}`;
  }
}
