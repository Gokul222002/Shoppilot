# Architectural & Implementation Decisions (ShopPilot Defect Resolution)

This document records all architectural choices, assumptions, and design decisions made autonomously while fixing defects D1 through D5 across Workstreams 1 to 7 and Add-on 6B.

## Workstream 1: Data Integrity
- **Offer Data Source Tagging:** Added `dataSource: 'live' | 'feed' | 'community' | 'admin' | 'estimate' | 'demo'` to Offer schema across TypeScript (`Offer`) and Python backend.
- **Demo Data Badging & Banner:** Added a dismissible global banner in `frontend/src/app/layout.tsx` or `Navbar` indicating demo pricing until store connectors are configured with live API keys. Added a `Demo price` badge next to any price where `dataSource === 'demo'`.
- **Claim Suppression on Demo Data:** For demo data, claims like 'Lowest price', 'Genuine deal', 'Buy now or wait' are either suppressed or explicitly marked as demo simulations.
- **Price Sanity Validator:** Implemented a unified validator (`validate_price_sanity` in Python and `validatePriceSanity` in TypeScript) enforcing:
  1. Category-specific floor prices (e.g. Mobiles: ₹3,000 min, Laptops: ₹15,000 min, TVs: ₹8,000 min, Headphones: ₹400 min, Appliances: ₹1,500 min, Books: ₹99 min, Grocery: ₹40 min, Fashion: ₹199 min).
  2. Maximum discount limit: <= 60% off MRP.
  3. MRP must be strictly >= price.
  4. Outlier detection: price must not be < 25% of the median price for that product family/bracket.

---

## Workstream 2: Product Families and Variants (Fixes D2)
- **Product Family Data Model:** Products are mapped to canonical `ProductFamily` entities with explicit `familyName`, `series`, and `variantAttributes` (RAM, storage, color).
- **Variant Selector UI:** The compare page features interactive pill chips allowing users to seamlessly switch between storage/RAM/color variants of the same family without losing context.
- **Hierarchical Search Ranking:** Token matching gives +200 boost to exact family matches, +50 to series matches, and +25 to exact variant attribute matches.
- **Query Normalization:** Strips punctuation, splits letter-digit joins (`gt6` -> `gt 6`, `s24ultra` -> `s24 ultra`), expands brand and model synonyms/typos (`relme` -> `realme`, `i phone` -> `iphone`), and removes intent noise words (`price`, `buy`, `online`).

## Workstream 3: Store Search URL & Query Sanitizer (Fixes D4)
- **Sanitized Store Links:** Extracted and eliminated parenthetical specs, brackets, commas, and superfluous color tags from store search URLs. For example, `Realme GT 6 (Fluid Silver, 256GB, 12GB RAM)` becomes `Realme GT 6 256GB 12GB RAM`, ensuring Amazon, Flipkart, and Croma internal search engines return the exact target device.
- **Affiliate Attribution:** Appends official partner tracking tags (`shoppilot-21`, `shoppilot`, etc.) and redirect tracking via `/go/[offerId]`.

## Workstream 4: Image Accuracy and Branded Fallbacks (Fixes D1)
- **Removal of Stock Unsplash Placeholders:** Completely removed `CATEGORY_IMAGES` random stock photography that caused mismatched images across models and brands.
- **Branded Product Fallback:** Replaced generic photos with high-contrast, category-specific SVG dark gradient placeholders (`BrandedProductPlaceholder`) featuring verified brand watermarks and model specs.
- **Image Audit Script:** Added `frontend/scripts/images-audit.js` and `npm run images:audit` to enforce that 100% of products in the catalog have clean, verified images or valid branded placeholders.

## Workstream 5: AI Shopping Advisor (Fixes D5)
- **Gemini Function Calling Architecture:** Rebuilt `/api/assistant` using tool definitions (`searchProducts`, `getFamily`, `getOffers`, `compareFamilies`, `getPriceHistory`).
- **Deterministic Grounded Offline Engine:** When `GEMINI_API_KEY` is not present, queries are executed against the exact same grounded catalog tools deterministically. It refuses to recommend unrelated brands (never recommends iPhone for Realme), defends against prompt injection, detects price glitches (e.g. ₹999 iPhone), and refuses competitor site scraping.
- **30-Query Evaluation Suite:** Comprehensive automated test suite in `backend/tests/test_ai_eval.py` verifies 100% pass rate across 30 distinct query scenarios, generating `docs/AI_EVAL.md`.

## Workstream 6 & 6B: Live Pricing Pipeline & Price Accuracy Hierarchy
- **Amazon Creators API Migration:** Implemented modern 2024+ Amazon Creators API connector with OAuth 2.0 token caching and automatic refresh via `https://api.amazon.com/auth/o2/token`. Backwards compatibility retained for legacy PA-API credentials.
- **Flipkart Affiliate API & Merchant Feeds:** Implemented Flipkart affiliate connector and generic merchant feed connector with dual CSV/XML support (RSS/Atom/affiliate XML). Enforced mathematical price sanity validator on all ingested feed offers to reject fraudulent or glitch prices.
- **Price Freshness Hierarchy:**
  1. `live`: fresh within 15 minutes.
  2. `feed`: fresh within 6 hours.
  3. `community`: fresh within 48 hours.
  4. `admin`: fresh within 7 days.
  5. `estimate`: fresh within 14 days.
  6. `demo`: simulated presentation data (never expires).
- **Expired Price Handling:** Expired offers display in grey with a `"May have changed, check the store"` alert badge. Expired prices are strictly excluded from deal claims ("Lowest Price", "All-Time Low", etc.).
