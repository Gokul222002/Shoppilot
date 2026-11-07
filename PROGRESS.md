# ShopPilot — Build Progress

## Phase 1 — Foundation ✅ COMPLETE
- [x] GEMINI.md saved
- [x] PROGRESS.md created
- [x] MockConnector with 200 products, 5 stores, 8 categories, 12 months history
- [x] Home page with trending products, navbar, footer with affiliate disclosure
- [x] Live stream viewport removed (`LiveBrowserFeed.tsx` stubbed out)
- [x] Cart/checkout features removed (`UniversalCartDrawer.tsx` stubbed out)
- [x] TypeScript strict mode enabled — build passes ✓

## Phase 2 — Search + Compare ✅ COMPLETE
- [x] `SearchBar.tsx` reusable search component with size variants and instant clear
- [x] `/search` route with sidebar filters: Categories, Price Range, Stores, In-stock, and Sort Options
- [x] `/compare` route with side-by-side store offers, Lowest Price highlight, and affiliate disclaimer
- [x] `OfferRow.tsx` store rows with delivery estimate, seller rating, and direct retailer external links (Amazon, Flipkart, Myntra, Croma, Tata CLiQ)
- [x] `PriceHistoryChart.tsx` interactive SVG 12-month tracker (7d/30d/90d/1y) with Genuine Deal / Fake Discount assessment
- [x] Backend `/api/search`, `/api/products/trending`, and `/api/products/{id}` endpoints verified with automated pytest tests
- [x] Next.js 14 production build passes with 0 errors

## Phase 3 & 4 — Real-Discount Engine, Wishlist, Alerts & Deals Feed ✅ COMPLETE
- [x] `discount-detector.ts` mathematical engine detecting All-Time Lows, Fake MRP Markups, Good Value, and Typical Prices
- [x] `PriceAlertModal.tsx` modal enabling instant target price tracking and email subscription
- [x] `/wishlist` route displaying tracked products, target price progress bars, and one-click store click-outs
- [x] `/deals` feed route showcasing verified price drops, minimum discount filters, and active bank coupon codes (`HDFC500`, `AXIS250`, etc.)
- [x] Backend alert registry (`POST /api/alerts`, `GET /api/alerts`, `POST /api/alerts/check`) with automated pytest tests passing
- [x] Zero cart/checkout violation maintained — strictly 100% price comparison and outbound affiliate links

## Phase 5 & 6 — Product Matcher & AI Shopping Advisor ✅ COMPLETE
- [x] `product-matcher.ts` and `matching.py`: Multi-store listing deduplication engine with token Jaccard similarity and spec normalization (5/5 unit tests pass)
- [x] `POST /api/assistant`: Gemini-powered natural language shopping advisor with automatic catalog intelligence fallback
- [x] `/assistant`: Interactive chat UI with query presets, expert advice cards, and embedded product comparison links
- [x] 26/26 backend unit tests passing
- [x] 9/9 Next.js static & dynamic routes compiled with 0 TypeScript errors

## Phase A — Realistic Seed Data & Typo-Tolerant Search Engine ✅ COMPLETE
- [x] **Catalog Generation (`build_seed.py` & `generate_catalog.py`)**:
  - Rebuilt seed data to **315 products** across 8 required categories (`mobiles`, `laptops`, `tvs`, `headphones`, `appliances`, `fashion`, `grocery`, `books`) with realistic INR pricing and specifications.
  - Mobiles category contains **70 phones** across Realme, Samsung, Redmi, Xiaomi, Apple, OnePlus, Vivo, Oppo, Motorola, Poco, and iQOO.
  - Included **21 Realme models/variants** across Narzo (N53, 60 5G, 60x 5G, 70 Pro 5G), Realme 12 Pro / 12 Pro+, GT series (GT Neo 3, GT 6T), C series (C53, C55, C67), and P series (P1 5G, P1 Pro 5G) with varied storage and color configurations.
  - Seeded **917 multi-store offers** across Amazon.in, Flipkart, Croma, Tata CLiQ, and Myntra, each with unique prices, shipping, delivery estimates, seller ratings, and stock status.
  - Generated **114,975 daily price history points** (365 days / 12 months per product) modeling seasonal festival dips (Diwali, Great Republic Day sale, Independence Day sale).
  - Seeded database SQLite (`backend/shoppilot.db`) and synchronized `catalog.json` across backend and frontend.
- [x] **Typo-Tolerant Search Engine (`search_engine.py`)**:
  - Built Levenshtein distance and synonym normalization engine handling brand and spec typos (`relme` -> Realme, `iphon 15` -> Apple iPhone 15, `samsng` -> Samsung, `oneplu` -> OnePlus, etc.).
  - Integrated into backend `GET /api/search` and frontend `mock-connector.ts`.
  - Added dedicated test suite `backend/tests/test_typo_search.py` (6 tests).
- [x] **Verification & Acceptance**:
  - All 18 automated backend tests passing (`pytest backend/tests/test_api.py backend/tests/test_typo_search.py`).
  - Next.js production build succeeded with 0 TypeScript/lint errors.
  - Playwright browser acceptance test completed:
    - Searching `realme` returns 24 Realme products.
    - Searching `relme` typo returns the same ranked Realme phone models.
    - Clicking Realme 12 Pro+ 5G navigates to the compare page displaying 3 store offers (Amazon.in, Flipkart, Croma), "Lowest Price" badge on Amazon.in (₹27,749 vs MRP ₹36,719), real-discount status ("Regular Market Price"), 12-month interactive SVG price tracker, and alternative models.
  - Acceptance screenshots captured and saved to artifacts.

## Phase B — Audit & Gap Fixes ✅ COMPLETE

### Feature Audit Table
| Feature | Status Before | Evidence / File Path | Fix Implemented | Status After |
| :--- | :--- | :--- | :--- | :--- |
| **Universal search (name, model, barcode, pasted URL)** | Partial | `search_engine.py`, `mock-connector.ts` | Added regex e-commerce URL parser (Amazon, Flipkart, etc.) and GS1 EAN-13 13-digit barcode direct lookup | **Done** ✅ |
| **Filters & sorting (category, brand, price, store, in-stock; low-high, relevance, discount)** | Partial | `search/page.tsx`, `mock-connector.ts` | Configured all 8 canonical categories, brand sidebar pill filters, in-stock toggle, and price low-high / high-low / discount / rating sorts | **Done** ✅ |
| **Product page: offers, total cost, best-price, last updated, /go/[offerId] clickout** | Partial | `compare/page.tsx`, `OfferRow.tsx`, `app/go/[offerId]/route.ts` | Created `/go/[offerId]` affiliate click tracking 307 redirect route; added total cost breakdown (`price + shipping`) and bank coupon badges | **Done** ✅ |
| **Price history chart (7d, 30d, 90d, 1y) with lowest, highest, average** | Done | `PriceHistoryChart.tsx` | Verified interactive SVG chart with dynamic slicing across all 4 timeframes and statistical aggregation | **Done** ✅ |
| **Real-discount badge (Genuine, Average, Fake)** | Done | `discount-detector.ts`, `PriceHistoryChart.tsx` | Mathematical baseline verification distinguishing genuine all-time lows, inflated MRPs, and typical prices | **Done** ✅ |
| **Accounts (Google & magic link), wishlist, target alerts, alert job, email fallback** | Partial | `AuthModal.tsx`, `UserNav.tsx`, `email_service.py` | Built Google One-Click and Magic Link auth modal, persistent user session, and SMTP service with console fallback | **Done** ✅ |
| **Deals feed, categories, coupons** | Partial | `deals/page.tsx`, `DealCard.tsx` | Updated deals feed to 8 canonical categories with active bank coupons (HDFC500, AXIS250, etc.) | **Done** ✅ |
| **Side-by-side comparison of up to 4 products** | Missing | `compare-specs/page.tsx` | Built `/compare-specs` route rendering full side-by-side spec comparison matrix for up to 4 products | **Done** ✅ |
| **AI shopping assistant using only database products** | Done | `assistant/page.tsx`, `assistant.py` | Strict catalog grounding; only recommends verified database products with direct compare links | **Done** ✅ |
| **/health endpoint, CORS** | Done | `main.py` | Tested healthy status, product counts, and configured origins | **Done** ✅ |

### Verification & Testing
- **37/37 Backend Pytest Tests Passing** (Unit tests covering agent, API, matching, safety, typo search, barcode lookup, pasted URLs, brand and stock filters).
- **10/10 Next.js 14 Routes Successfully Compiled** (including new `/compare-specs` and `/go/[offerId]` redirect).
- **End-to-End Playwright Acceptance Test**:
  1. Universal search with pasted Amazon URL correctly extracts model name and finds Realme 12 Pro+ 5G.
  2. Filters and sorting correctly filters to Samsung phones sorted Price Low to High.
  3. Compare page displays total cost breakdown (`₹27,749 (Free shipping)`), bank offers (`Extra ₹500 off via HDFC Bank Cards`), and routes buy links via `/go/[offerId]`.
  4. `/compare-specs` displays 4 products side-by-side with full specifications and store prices.
  5. UserNav displays Gokul profile with active wishlist and sign-out capabilities.
- Acceptance screenshots attached to artifact directory.

## Phase C — Real Data Pipeline & Store Connectors ✅ COMPLETE
- [x] **StoreConnector Interface & Connector Skeletons**:
  - Standard `StoreConnector` interface in Python (`backend/app/connectors/base.py`) and TypeScript (`frontend/src/lib/connectors/base.ts`) with `search()`, `get_product()`, `get_by_url()`, `get_offers()`, and `refresh()`.
  - `MockStoreConnector` serves as default offline provider with 315 products, 917 store offers, and 12-month history.
  - Real connector skeletons for Amazon Product Advertising API (PA-API v5), Flipkart Affiliate API, and Generic Merchant CSV/XML Feeds (Cuelinks, Admitad, vCommission).
  - Robust transient error handling: `execute_with_retry_and_backoff` with exponential backoff on HTTP 429 rate limits, network timeouts, and 5xx responses.
  - Zero-credentials safe fallback: When external keys are missing or invalid, connectors automatically and safely fall back to `MockStoreConnector` without crashing user-facing search or compare pages.
- [x] **Merchant Feed Ingestion Engine (`feed_importer.py` & `sample_merchant_feed.csv`)**:
  - Parses merchant CSV/XML feeds and matches products by GS1 barcode (`8901001...`), product ID, or product name.
  - Merges new external store offers (e.g. Tata CLiQ and Croma) into existing products and recalculates real-time lowest price and discount percentages.
- [x] **Store Enablement / Disablement (`mock.py` & `/api/admin/stores`)**:
  - Real-time store toggling: Disabling a store (e.g. "Tata CLiQ") dynamically removes all its offers from search and compare pages.
  - Re-enabling a store instantly restores its offers.
- [x] **Price Pipeline Scheduler (`scheduler.py`)**:
  - Tiered scheduling: Priority Tier 1 (tracked by alerts or popular products with >=5,000 reviews) refreshed frequently; Tier 2 (long tail) on scheduled cadence.
  - Price change detection: Records a new `PricePoint` only when the store price changes; skips recording redundant PricePoints when prices are unchanged.
- [x] **Affiliate Link Builder & Outbound Click Tracking (`affiliate.py`)**:
  - Dedicated `AffiliateLinkBuilder` appending official associate tags (Amazon `tag=shoppilot-21`, Flipkart `affid=shoppilot`, Cuelinks redirect wrapper).
  - Outbound click logging on `/api/affiliate/click` and `/go/[offerId]`.
- [x] **Multi-Currency & Regional Ready (`utils.py`)**:
  - Default: INR (₹). USD ($) and EUR (€) exchange rates and conversion functions ready with per-store region tags (`IN`).
- [x] **Admin Control Center (`/admin` & `/api/admin/*`)**:
  - Admin role dashboard (`/admin`) with store enablement switches, connector telemetry & health indicators (`HEALTHY`, `FALLBACK_ACTIVE`, `ERROR`), "Trigger Sync" and "Simulate 429 Error" actions, merchant CSV feed upload form with sample feed loader, and scheduler metrics.
  - Fault tolerance: Connector failures display cleanly in Admin telemetry without crashing user-facing search, deals, or compare pages.
- [x] **Verification & Acceptance**:
  - **49/49 Pytest backend tests passing** (`pytest backend/tests -v`).
  - **11/11 Next.js 14 routes compiled with 0 TypeScript/lint errors**.
  - **End-to-End Playwright Acceptance Test (`verify_phase_c.py`) completed**:
    1. Sample merchant CSV feed loaded and merged into `mob-001` (Tata CLiQ offer at ₹22,499).
    2. Disabling Tata CLiQ removes the offer from `/compare?id=mob-001`.
    3. Simulating 429 error on Amazon PA-API displays the error badge in Admin while `/search?q=realme` continues working with 0 crash.
    4. Price pipeline scheduler records initial PricePoints and skips unchanged prices.
  - Acceptance screenshots captured and saved to artifacts:
    - `phase_c_admin_dashboard.png`: Admin Control Center with store toggles, connector telemetry, and feed ingestion.
    - `phase_c_merged_offers_compare.png`: Compare page displaying merged Tata CLiQ offer alongside Amazon and Flipkart.
    - `phase_c_store_disabled_compare.png`: Compare page verifying Tata CLiQ offer is removed when disabled.
    - `phase_c_admin_error_tolerance.png`: Admin dashboard showing simulated 429 error without page crash.
    - `phase_c_search_via_connector.png`: User search functioning seamlessly via connector pipeline.

