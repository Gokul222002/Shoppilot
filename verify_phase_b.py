import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\ADMIN\.gemini\antigravity\brain\c6f19bb8-56d2-42cc-99f6-2fd1814c0282"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # 1. Universal Search (Pasted Amazon URL)
        print("Testing pasted Amazon URL in universal search...")
        page.goto("http://localhost:3000/search?q=https%3A%2F%2Fwww.amazon.in%2FRealme-12-Pro-Plus-5G-Submarine-Blue%2Fdp%2FB0CX21M98F")
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        p1 = os.path.join(ARTIFACT_DIR, "phase_b_universal_search.png")
        page.screenshot(path=p1, full_page=True)
        print(f"Captured: {p1}")

        # 2. Filters & Sorting (Brand = Samsung, Category = Mobiles, Sort = Price Low to High)
        print("Testing filters and sorting...")
        page.goto("http://localhost:3000/search?category=mobiles&brand=Samsung&sort_by=price_asc")
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        p2 = os.path.join(ARTIFACT_DIR, "phase_b_filters_sorting.png")
        page.screenshot(path=p2, full_page=True)
        print(f"Captured: {p2}")

        # 3. Product Compare Page with /go clickout & total cost breakdown
        print("Testing product compare page with /go/[offerId] clickout & total cost...")
        page.goto("http://localhost:3000/compare?q=Realme+12+Pro%2B+5G+%28Submarine+Blue%2C+256GB%2C+12GB+RAM%29")
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        p3 = os.path.join(ARTIFACT_DIR, "phase_b_product_offers_clickout.png")
        page.screenshot(path=p3, full_page=True)
        print(f"Captured: {p3}")

        # 4. Side-by-Side Comparison of up to 4 products (/compare-specs)
        print("Testing side-by-side spec comparison (/compare-specs)...")
        page.goto("http://localhost:3000/compare-specs?ids=mob-001,mob-024,mob-020,mob-011")
        page.wait_for_load_state("networkidle")
        time.sleep(1.5)
        p4 = os.path.join(ARTIFACT_DIR, "phase_b_compare_specs_4_products.png")
        page.screenshot(path=p4, full_page=True)
        print(f"Captured: {p4}")

        # 5. Accounts & User profile in Navbar
        print("Testing account profile dropdown in navbar...")
        page.goto("http://localhost:3000/")
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        # Click user profile button to open dropdown
        try:
            user_btn = page.locator("header button:has-text('Gokul')")
            if user_btn.count() > 0:
                user_btn.first.click()
                time.sleep(0.5)
        except Exception as e:
            print(f"User button click note: {e}")
        p5 = os.path.join(ARTIFACT_DIR, "phase_b_account_user_nav.png")
        page.screenshot(path=p5)
        print(f"Captured: {p5}")

        browser.close()
        print("All Phase B verification screenshots successfully captured!")

if __name__ == "__main__":
    main()
