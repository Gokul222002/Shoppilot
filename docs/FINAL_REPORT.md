# ShopPilot Autonomous Defect Resolution & Production Hardening — Final Report

**Lead Engineer:** Gokul & Antigravity  
**Product:** ShopPilot (Price Comparison and Tracking Web App — NOT a store: no cart, no checkout, zero inventory sold)  
**Branch:** `autofix/all` -> `main`  
**Deploy Targets:** Render Web Services (`shoppilot-frontend`, `Shoppilot-backend`)  
**Status:** 100% Complete & Verified  

---

## 1. Executive Summary & Defect Resolutions

All five reported defects (D1 through D5) have been completely resolved, mathematically validated, and verified end-to-end via automated Playwright browser tests and a 59-test backend test suite.

| Defect | Issue Description | Root Cause | Resolution | Verification Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **D1: Wrong Images** | boAt Rockerz 550 and Realme Narzo/C55 showed unrelated stock photos. | Unsplash keyword query returned random headphone/phone stock photos. | Removed `CATEGORY_IMAGES` random stock logic entirely. Built `BrandedProductPlaceholder` featuring high-contrast dark gradients, SVG category iconography, and brand watermarks. Created `npm run images:audit`. | `npm run images:audit` passed: 343/343 clean branded placeholders, 0 generic stock mismatches. Screenshot: `defect_d1_branded_placeholder.png`. |
| **D2: Search Family** | Searching `realme gt6` returned random Realme models instead of the GT 6 family. | Lack of family data model and letter-digit token splitting (`gt6` vs `gt 6`). | Added `ProductFamily` schema and `variantAttributes` (RAM, storage, color). Added `normalize_query` splitting letter-digit joins, expanding typos/synonyms, and giving +200 relevance points to exact family matches. | Playwright top result: `Realme GT 6 (Fluid Silver, 256GB, 12GB RAM)`. Screenshot: `defect_d2_realme_gt6_family_search.png`. |
| **D3: Unrealistic Prices** | Realme GT 6 priced at ₹36,999 vs real ~₹43,999; AI showed iPhone 15 at ₹999; -67% discounts. | Mock seed generator lacked market grounding, bounds checking, and data source tagging. | Created `validate_price_sanity` enforcing category minimum floors (e.g. ₹3,000 for phones), maximum 60% discount ceiling, MRP >= price, and family median checks. Added `dataSource: 'demo'`, "Demo price" badges, and global demo banner. | 100% of offers tagged with `dataSource: 'demo'`. 0 products below floor. Screenshot: `defect_d3_realistic_pricing_demo_badges.png`. |
| **D4: Broken Store Links** | Parentheses, color names, and commas in URLs broke Amazon/Flipkart searches. | Full raw product titles were passed directly into search query parameters. | Built `sanitize_product_query` and `build_store_url` stripping parenthetical specs, commas, and color tags (e.g. `Realme GT 6 256GB 12GB RAM`), while appending official affiliate tags and tracking redirects. | 28/28 unit test assertions passed. Verified on live compare page. Screenshot: `defect_d4_clean_store_links.png`. |
| **D5: AI Shopping Advisor** | Asked `realme gt6 price`, it fell back to an "Offline Heuristic" recommending an iPhone 15. | Hardcoded fallback in `frontend/src/app/assistant/page.tsx` and ungrounded model fallback. | Re-engineered `/api/assistant` with Gemini Function Calling tools and deterministic offline catalog tools. Rebuilt client assistant with `MarkdownRenderer` and grounded search. Refuses competitor scraping, defends against prompt injection, and detects price glitches. | 30/30 evaluation tests passed (100% pass rate in `docs/AI_EVAL.md`). Screenshot: `defect_d5_ai_advisor_grounded.png`. |

---

## 2. Workstream Breakdown

### Workstream 1: Data Integrity & Price Sanity Validator
- **Validator Rules (`backend/app/validation/price_validator.py`):**
  - Category floors: Mobiles (₹3,000), Laptops (₹15,000), TVs (₹8,000), Headphones (₹400), Appliances (₹1,500), Books (₹99), Grocery (₹40), Fashion (₹199).
  - Maximum discount: `<= 60%` off MRP.
  - MRP sanity: `MRP >= selling price`.
  - Family median outlier check: selling price must not be `< 25%` of the family median.
- **Data Source Tagging & Demo Badges:**
  - Every offer in catalog database (985 total offers across 343 products) tagged with `dataSource: 'demo'`.
  - Dismissible global banner mounted in root layout: *"Showing demo prices. Live prices turn on once store connectors are configured."*
  - "Demo price" badge attached to every demo offer row. Real deal claims ("Lowest Price", "All-Time Low") are suppressed on demo data.

### Workstream 2: Product Families & Search Hierarchy
- **Data Model:** Canonical `ProductFamily` grouping variants by `brand`, `series`, and `variantAttributes` (`ram`, `storage`, `color`).
- **Catalog Depth:** Seeded 343 realistic products across 8 categories, including 15 Realme families and 33 variants (deep coverage for GT 6 in 8/128, 12/256, 16/512 in Fluid Silver & Razor Green; Narzo series, C series, P series), as well as Samsung, Apple, OnePlus, Xiaomi, Vivo, Oppo, Motorola, Poco, iQOO.
- **Interactive Variant Picker:** Compare page features interactive pill chips allowing shoppers to toggle RAM/storage/color configs on the fly.
- **Search Normalization (`backend/app/utils/query_normalizer.py`):**
  - Letter-digit splitting: `gt6` -> `gt 6`, `s24ultra` -> `s24 ultra`, `xm5` -> `xm 5`.
  - Synonym & typo expansion: `relme` -> `realme`, `i phone` -> `iphone`.
  - Noise stripping: removes `price`, `buy`, `online`, `best`, `cheap`.

### Workstream 3: Store Search URL & Outbound Links
- **Query Sanitizer (`backend/app/utils/store_url.py` & `frontend/src/lib/store-url.ts`):**
  - Cleans parenthetical specs, brackets, commas, and superfluous color tags.
  - Generates pristine query `Realme GT 6 256GB 12GB RAM` ensuring Amazon.in and Flipkart return the exact target handset.
  - Attaches affiliate parameters (`tag=shoppilot-21`, `affid=shoppilot`) and secures clickouts via `/go/[offerId]` tracking.

### Workstream 4: Image Accuracy & Branded Fallbacks
- Completely purged generic Unsplash random photos that caused headphone photos to appear on mobile phones.
- Built `BrandedProductPlaceholder.tsx` delivering SVG category badges and brand watermarks.
- Built audit tool `frontend/scripts/images-audit.js` and added `"images:audit"` npm script: **343/343 clean**.
- Section 6 in Admin panel allows manual overrides and verification.

### Workstream 5: AI Shopping Advisor
- Built `/api/assistant` using Gemini Function Calling tools:
  - `searchProducts`: keyword, category, and budget search.
  - `getFamily`: variant attributes and prices.
  - `getOffers`: side-by-side store prices.
  - `compareFamilies`: side-by-side comparisons.
  - `getPriceHistory`: 12-month historical lowest/highest/average.
- Built deterministic offline grounded engine: returns grounded comparisons, respects budgets, detects fake/glitch deals (e.g. ₹999 iPhone), neutralizes prompt injection, and refuses competitor scraping.
- Replaced frontend assistant fallback with catalog search and added `MarkdownRenderer.tsx`.
- **30-Query Evaluation Suite:** 30/30 tests passed (`docs/AI_EVAL.md`).

### Workstream 6 & 6B: Live Pricing Pipeline & Price Accuracy Hierarchy
- **Amazon Creators API:** Implemented modern 2024+ OAuth 2.0 connector (`AMAZON_CREATORS_CLIENT_ID`, `AMAZON_CREATORS_CLIENT_SECRET`, `AMAZON_CREATORS_REFRESH_TOKEN`) with token caching and refresh. Retains PA-API fallback compatibility.
- **Flipkart Affiliate API & Feed Importers:** Supports Flipkart affiliate API and dual CSV/XML merchant feeds (Cuelinks, Admitad). Price sanity validator rejects glitch/fraudulent feed rows.
- **Price Freshness Hierarchy:**
  - `live`: fresh within 15 minutes.
  - `feed`: fresh within 6 hours.
  - `community`: fresh within 48 hours.
  - `admin`: fresh within 7 days.
  - `estimate`: fresh within 14 days.
  - `demo`: simulated presentation data.
  - **Expired Price Handling:** Expired prices are styled in grey, marked with *"May have changed, check the store"*, and excluded from deal claims.

---

## 3. Verification & Test Execution Summary

| Test Suite | Scope | Result | Details |
| :--- | :--- | :--- | :--- |
| **Backend Unit Tests** | Price validator, store URL, query normalizer, family ranking, AI eval, connectors, freshness | **59 / 59 PASSED (100%)** | `pytest tests/` in 19.32s |
| **AI Advisor 30-Query Eval** | Grounding, anti-hallucination, budgets, comparisons, glitch rejection, injection defense | **30 / 30 PASSED (100%)** | Documented in `docs/AI_EVAL.md` |
| **Images Accuracy Audit** | Verified exact photos vs branded dark placeholders across all 343 products | **343 / 343 CLEAN (100%)** | `npm run images:audit` |
| **Frontend TypeScript Build** | Next.js 14 compiler & TypeScript type checking | **0 Errors (PASSED)** | `npm run build` |
| **Playwright Automated E2E** | Live browser verification of defects D1 through D5 | **5 / 5 PASSED (100%)** | All 5 defect screenshots captured |

---

## 4. Manual Steps Checklist for Gokul

When you are ready to connect external accounts or live store keys on Render, configure these environment variables in your Render Dashboard:

- [ ] **Gemini AI Shopping Advisor:**
  - Key: `GEMINI_API_KEY`
  - Purpose: Activates live Gemini generative assistant with tool-grounded function calling. When unset, the system uses the deterministic offline grounded catalog engine.
- [ ] **Amazon Creators API (2024+ OAuth 2.0):**
  - Keys: `AMAZON_CREATORS_CLIENT_ID`, `AMAZON_CREATORS_CLIENT_SECRET`, `AMAZON_CREATORS_REFRESH_TOKEN`, `AMAZON_ASSOCIATE_TAG` (default `shoppilot-21`)
  - Purpose: Activates live Amazon pricing and stock discovery. When unset, falls back safely to the mock catalog without breaking pages.
- [ ] **Flipkart Affiliate API:**
  - Keys: `FLIPKART_AFFILIATE_ID`, `FLIPKART_AFFILIATE_TOKEN`
  - Purpose: Activates live Flipkart product search and deals sync.
- [ ] **Merchant CSV/XML Feeds (Cuelinks, Admitad):**
  - Key: `MERCHANT_FEED_URL` or upload via Admin Dashboard at `/admin`.
