# ShopPilot — Project Rules (GEMINI.md)

ShopPilot is a **price comparison and deal-tracking site**.
It is NOT an online store. It does NOT sell anything.
It has NO cart and NO checkout.

If you are about to build a shop, cart, checkout, or product-selling flow — STOP. That is the wrong product.

## Stack
- Frontend: Next.js (App Router), TypeScript strict, Tailwind CSS, shadcn/ui, Lucide icons, Recharts
- Backend: FastAPI (Python), PostgreSQL (via Prisma when added), REST API under /api
- Auth: Auth.js (NextAuth) — Google + magic link (Phase 4)
- Email: Resend with console-log fallback
- AI: Gemini API via server route
- Validation: Zod on every API input

## Rules
1. No cart, no checkout, no Add-to-Cart button, no product selling
2. Plan before coding — present plan and wait for approval after each phase
3. No competitor scraping — data only through connectors
4. No hardcoded secrets — .env and .env.example only
5. No fake prices — always show source + "last updated"
6. Affiliate disclosure in footer and on compare pages
7. After every phase: run lint, type-check, tests, dev server; fix failures before reporting
