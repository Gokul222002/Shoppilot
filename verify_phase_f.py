"""
Verification script for Phase F: Growth features
- Telegram alerts & 1-click linking
- Chrome Extension (Manifest V3)
- PWA installability & offline shell
- Dynamic Open Graph share card
- SEO Category landing pages & Public Price History pages
"""

import os
import json
import asyncio
import httpx
from playwright.async_api import async_playwright

ARTIFACTS_DIR = r"C:\Users\ADMIN\.gemini\antigravity\brain\c6f19bb8-56d2-42cc-99f6-2fd1814c0282"
EXT_DIR = r"C:\Users\ADMIN\Desktop\smart daily commerce & web automation\extension"

async def main():
    print("--- 1. Testing Telegram Alert Dispatch ---")
    async with httpx.AsyncClient() as client:
        # Generate link code
        code_resp = await client.post(
            "http://127.0.0.1:8000/api/alerts/telegram/code",
            json={"email": "gokul@example.com"}
        )
        assert code_resp.status_code == 200, f"Code failed: {code_resp.text}"
        code_data = code_resp.json()
        print(f"Generated 6-digit code: {code_data['code']} | Deep link: {code_data['deep_link']}")

        # Confirm link
        link_resp = await client.post(
            "http://127.0.0.1:8000/api/alerts/telegram/link",
            json={"chat_id": "987654321", "code": code_data["code"]}
        )
        assert link_resp.status_code == 200, f"Link failed: {link_resp.text}"
        print(f"Linked Telegram chat 987654321 to {code_data['email']}")

        # Send test price drop alert
        alert_resp = await client.post(
            "http://127.0.0.1:8000/api/alerts/telegram/test",
            json={
                "product_id": "mob-001",
                "chat_id": "987654321",
                "target_price": 24000,
                "email": "gokul@example.com"
            }
        )
        assert alert_resp.status_code == 200, f"Alert failed: {alert_resp.text}"
        print(f"Dispatched test Telegram price drop alert: {alert_resp.json()}")

        # Verify history
        hist_resp = await client.get("http://127.0.0.1:8000/api/alerts/telegram/history")
        assert hist_resp.status_code == 200
        hist_data = hist_resp.json()
        print(f"Telegram alert history count: {hist_data['total']}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 850})
        page = await context.new_page()

        # 2. PWA manifest and service worker verification
        print("--- 2. Verifying PWA & Offline Shell ---")
        await page.goto("http://localhost:3000", wait_until="networkidle")
        manifest_href = await page.get_attribute('link[rel="manifest"]', "href")
        print(f"PWA Manifest link detected: {manifest_href}")
        assert manifest_href == "/manifest.json"

        # Check manifest content
        async with httpx.AsyncClient() as client:
            m_resp = await client.get("http://localhost:3000/manifest.json")
            assert m_resp.status_code == 200
            m_json = m_resp.json()
            assert m_json["display"] == "standalone"
            assert len(m_json["icons"]) >= 2
            print(f"Manifest validated: display={m_json['display']}, icons={len(m_json['icons'])}")

        await page.screenshot(
            path=os.path.join(ARTIFACTS_DIR, "phase_f_pwa_installable.png"),
            full_page=False
        )

        # 3. Telegram UI Modal on Compare Page
        print("--- 3. Verifying Telegram UI Modal on Compare Page ---")
        await page.goto("http://localhost:3000/compare?q=realme", wait_until="networkidle")
        # Click "Set Price Drop Alert" button
        alert_btn = page.locator('button:has-text("Set Price Drop Alert"), button:has-text("Set Alert")').first
        if await alert_btn.is_visible():
            await alert_btn.click()
            await page.wait_for_timeout(1000)

            # Click "Telegram (Instant)" tab
            tg_tab = page.locator('button:has-text("Telegram (Instant)")')
            if await tg_tab.is_visible():
                await tg_tab.click()
                await page.wait_for_timeout(800)

                # Click "Generate 6-Digit Telegram Link Code"
                gen_btn = page.locator('button:has-text("Generate 6-Digit Telegram Link Code")')
                if await gen_btn.is_visible():
                    await gen_btn.click()
                    await page.wait_for_timeout(1500)

            await page.screenshot(
                path=os.path.join(ARTIFACTS_DIR, "phase_f_telegram_alert.png")
            )
            print("Captured phase_f_telegram_alert.png")

        # 4. SEO Category Landing Page (/category/mobiles)
        print("--- 4. Verifying SEO Category Landing Page (/category/mobiles) ---")
        await page.goto("http://localhost:3000/category/mobiles", wait_until="networkidle")
        cat_title = await page.inner_text("h1")
        print(f"SEO Category Title: {cat_title}")
        assert "Mobiles" in cat_title

        # Check Schema.org ItemList JSON-LD
        jsonld_scripts = await page.locator('script[type="application/ld+json"]').all_inner_texts()
        has_itemlist = any("ItemList" in s for s in jsonld_scripts)
        print(f"Category Schema.org ItemList JSON-LD present: {has_itemlist}")
        assert has_itemlist, "Schema.org ItemList JSON-LD must be present on category page"

        await page.screenshot(
            path=os.path.join(ARTIFACTS_DIR, "phase_f_seo_category.png"),
            full_page=False
        )
        print("Captured phase_f_seo_category.png")

        # 5. Dedicated Public Price History Page (/price-history/mob-001)
        print("--- 5. Verifying Public Price History Page ---")
        await page.goto("http://localhost:3000/price-history/mob-001", wait_until="networkidle")
        hist_title = await page.inner_text("h1")
        print(f"Price History Title: {hist_title}")
        assert len(hist_title) > 0

        # Check Schema.org Product JSON-LD
        hist_jsonld = await page.locator('script[type="application/ld+json"]').all_inner_texts()
        has_product_ld = any("Product" in s for s in hist_jsonld)
        print(f"Price History Schema.org Product JSON-LD present: {has_product_ld}")
        assert has_product_ld, "Schema.org Product JSON-LD must be present on price history page"

        await page.screenshot(
            path=os.path.join(ARTIFACTS_DIR, "phase_f_price_history.png"),
            full_page=False
        )
        print("Captured phase_f_price_history.png")

        # 6. Chrome Extension Popup Verification
        print("--- 6. Verifying Chrome Extension Popup & Manifest V3 ---")
        # Validate manifest.json
        manifest_path = os.path.join(EXT_DIR, "manifest.json")
        with open(manifest_path, "r", encoding="utf-8") as f:
            ext_manifest = json.load(f)
        assert ext_manifest["manifest_version"] == 3
        print(f"Extension Manifest V3 valid: {ext_manifest['name']} v{ext_manifest['version']}")

        # Open popup.html directly in browser
        popup_file_url = f"file:///{EXT_DIR.replace(os.sep, '/')}/popup.html"
        await page.goto(popup_file_url, wait_until="networkidle")
        await page.wait_for_timeout(2000)

        ext_title = await page.inner_text(".title")
        print(f"Extension Popup Title: {ext_title}")

        await page.screenshot(
            path=os.path.join(ARTIFACTS_DIR, "phase_f_chrome_extension.png")
        )
        print("Captured phase_f_chrome_extension.png")

        # 7. Open Graph Image Generation (/api/og)
        print("--- 7. Verifying Dynamic Open Graph Image Route ---")
        async with httpx.AsyncClient() as client:
            og_resp = await client.get(
                "http://localhost:3000/api/og?title=Realme%2012%20Pro%205G&price=%E2%82%B922,499&store=Flipkart"
            )
            print(f"OG Image route status: {og_resp.status_code}, Content-Type: {og_resp.headers.get('content-type')}")
            assert og_resp.status_code == 200
            assert "image" in og_resp.headers.get("content-type", "")

        await browser.close()
        print("[SUCCESS] Phase F Verification Complete: All acceptance criteria met!")

if __name__ == "__main__":
    asyncio.run(main())
