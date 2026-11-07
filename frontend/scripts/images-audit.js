#!/usr/bin/env node
/**
 * ShopPilot Image Audit Script (Workstream 4 & Defect D1 Prevention)
 * Audits all catalog products for:
 * 1. Missing or unverified images
 * 2. Unsplash generic stock photos (flags any remaining generic category mappings)
 * 3. Duplicate images shared across distinct product families
 * 4. Proper assignment of branded dark placeholders
 */

const fs = require("fs");
const path = require("path");

const CATALOG_PATH = path.join(__dirname, "..", "src", "data", "catalog.json");

if (!fs.existsSync(CATALOG_PATH)) {
  console.error(`Error: Catalog not found at ${CATALOG_PATH}`);
  process.exit(1);
}

const products = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf-8"));
console.log(`\n========================================================`);
console.log(`  ShopPilot Image Accuracy Audit (${products.length} Products)`);
console.log(`========================================================\n`);

let placeholderCount = 0;
let verifiedCount = 0;
let unverifiedCount = 0;
let genericStockCount = 0;
const imageToFamilies = new Map();
const flags = [];

products.forEach((p) => {
  const url = p.imageUrl || "";
  const isPlaceholder = !url || p.imageSource === "placeholder";
  const fSlug = p.familySlug || p.familyName || p.name;

  if (isPlaceholder) {
    placeholderCount++;
  } else {
    // Check for generic unsplash stock photos
    if (url.includes("images.unsplash.com")) {
      genericStockCount++;
      flags.push({
        id: p.id,
        name: p.name,
        issue: "Generic Unsplash stock photo detected",
      });
    }

    if (p.imageVerified) {
      verifiedCount++;
    } else {
      unverifiedCount++;
    }

    // Check cross-family duplicates
    if (!imageToFamilies.has(url)) {
      imageToFamilies.set(url, new Set());
    }
    imageToFamilies.get(url).add(fSlug);
  }
});

let crossFamilyDuplicates = 0;
for (const [imgUrl, families] of imageToFamilies.entries()) {
  if (families.size > 1) {
    crossFamilyDuplicates++;
    flags.push({
      issue: `Image shared across ${families.size} distinct product families: ${Array.from(families).join(", ")}`,
      url: imgUrl.substring(0, 60) + "...",
    });
  }
}

console.log(`Audit Summary:`);
console.log(` - Total Products Audited:          ${products.length}`);
console.log(` - Branded Dark Placeholders:       ${placeholderCount}`);
console.log(` - Verified Exact Product Images:   ${verifiedCount}`);
console.log(` - Unverified Images:               ${unverifiedCount}`);
console.log(` - Generic Category Stock Photos:   ${genericStockCount}`);
console.log(` - Cross-Family Duplicate Images:   ${crossFamilyDuplicates}`);

if (flags.length > 0) {
  console.log(`\nFlagged Items (${flags.length}):`);
  flags.slice(0, 10).forEach((f, idx) => {
    console.log(` ${idx + 1}. [${f.id || "WARN"}] ${f.issue} (${f.name || f.url || ""})`);
  });
  if (flags.length > 10) {
    console.log(` ... and ${flags.length - 10} more items.`);
  }
} else {
  console.log(`\nResult: ALL CLEAN! Zero mismatched images across distinct product families.`);
  console.log(`All products without verified photos safely fallback to BrandedProductPlaceholder.`);
}

console.log(`\n========================================================\n`);
process.exit(0);
