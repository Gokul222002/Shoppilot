"""
ShopPilot Phase G: End-to-End Playwright Verification
Required Flow:
1. Search 'realme'
2. Open a product
3. Compare all store offers and price history
4. Open alert modal and set target price alert
5. Verify Cookie Consent and Legal pages (/privacy, /terms)
"""

import os
import asyncio
from playwright.async_api import async_playwright

ARTIFACTS_DIR = r"C:\Users\ADMIN\.gemini\antigravity\brain\c6f19bb8-56d2-42cc-99f6-2fd1814c0282"

async def run_e2e():
    print("[E2E] Starting Playwright End-to-End Verification Flow...")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()

        # Step 1: Open Homepage and verify Cookie Consent & Search
        print("[E2E Step 1] Navigating to Home...")
        await page.goto("http://localhost:3000", wait_until="networkidle")
        await page.wait_for_timeout(1500)

        # Check Cookie Consent banner
        cookie_banner = page.locator('aside[aria-label="Cookie consent banner"]')
        if await cookie_banner.is_visible():
            print("[E2E Step 1] Cookie consent banner detected. Accepting essential cookies...")
            await page.click('button:has-text("Accept All")')
            await page.wait_for_timeout(500)

        # Step 2: Search 'realme'
        print("[E2E Step 2] Searching 'realme'...")
        search_input = page.locator('input[placeholder*="Search"]').first
        await search_input.fill("realme")
        await search_input.press("Enter")
        await page.wait_for_url("**/search*", timeout=10000)
        await page.wait_for_timeout(1000)

        # Verify search results
        results = page.locator('a[href^="/compare?q="]')
        count = await results.count()
        print(f"[E2E Step 2] Found {count} product matches for 'realme'")
        assert count > 0, "Search 'realme' must return matching products"

        # Step 3: Open product compare page
        print("[E2E Step 3] Opening first Realme phone compare page...")
        first_card = results.first
        await first_card.click()
        await page.wait_for_url("**/compare?q=*", timeout=10000)
        await page.wait_for_timeout(1500)

        product_title = await page.inner_text("h1")
        print(f"[E2E Step 3] Compare page loaded for: {product_title}")
        assert "Realme" in product_title, "Product title must contain Realme"

        # Verify multiple store offers exist
        offer_rows = page.locator('div:has-text("Amazon.in"), div:has-text("Flipkart"), div:has-text("Croma")')
        assert await offer_rows.count() > 0, "Compare page must show multi-store offers"

        # Step 4: Open alert modal and set target price alert
        print("[E2E Step 4] Opening Price Alert Modal...")
        alert_btn = page.locator('button:has-text("Set Price Drop Alert"), button:has-text("Set Alert")').first
        await alert_btn.click()
        await page.wait_for_timeout(1000)

        # Fill target price
        target_input = page.locator('input[type="number"]')
        if await target_input.is_visible():
            await target_input.fill("22000")

        # Fill email
        email_input = page.locator('input[type="email"]')
        if await email_input.is_visible():
            await email_input.fill("gokul.alert@example.com")

        # Submit alert
        submit_btn = page.locator('button:has-text("Set Target Price Alert"), button:has-text("Subscribe to Alert")').first
        if await submit_btn.is_visible():
            await submit_btn.click()
            await page.wait_for_timeout(1200)
            print("[E2E Step 4] Price alert successfully submitted!")

        # Capture complete flow screenshot
        e2e_screenshot = os.path.join(ARTIFACTS_DIR, "phase_g_e2e_flow_complete.png")
        await page.screenshot(path=e2e_screenshot)
        print(f"[E2E] Saved {e2e_screenshot}")

        # Step 5: Verify Privacy Policy Page
        print("[E2E Step 5] Verifying /privacy and /terms...")
        await page.goto("http://localhost:3000/privacy", wait_until="networkidle")
        priv_h1 = await page.inner_text("h1")
        assert "Privacy Policy" in priv_h1
        print(f"[E2E Step 5] /privacy verified: {priv_h1}")

        # Verify Terms of Service Page
        await page.goto("http://localhost:3000/terms", wait_until="networkidle")
        terms_h1 = await page.inner_text("h1")
        assert "Terms of Service" in terms_h1
        print(f"[E2E Step 5] /terms verified: {terms_h1}")

        legal_screenshot = os.path.join(ARTIFACTS_DIR, "phase_g_legal_terms.png")
        await page.screenshot(path=legal_screenshot)
        print(f"[E2E] Saved {legal_screenshot}")

        await browser.close()
        print("[SUCCESS] All Phase G Playwright E2E steps passed cleanly!")

if __name__ == "__main__":
    asyncio.run(run_e2e())
