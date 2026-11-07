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

        print("Navigating to home page...")
        page.goto("http://localhost:3000/")
        page.wait_for_load_state("networkidle")
        time.sleep(1)

        # 1. Search 'realme'
        print("Searching 'realme'...")
        page.goto("http://localhost:3000/search?q=realme")
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        screenshot_1 = os.path.join(ARTIFACT_DIR, "phase_a_search_realme.png")
        page.screenshot(path=screenshot_1, full_page=True)
        print(f"Captured: {screenshot_1}")

        # 2. Search typo 'relme'
        print("Searching typo 'relme'...")
        page.goto("http://localhost:3000/search?q=relme")
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        screenshot_2 = os.path.join(ARTIFACT_DIR, "phase_a_search_relme_typo.png")
        page.screenshot(path=screenshot_2, full_page=True)
        print(f"Captured: {screenshot_2}")

        # 3. Open Compare Page for Realme 12 Pro+ 5G
        print("Navigating to compare page for Realme 12 Pro+ 5G...")
        page.goto("http://localhost:3000/compare?q=Realme+12+Pro%2B+5G+%28Submarine+Blue%2C+256GB%2C+12GB+RAM%29")
        page.wait_for_load_state("networkidle")
        time.sleep(1.5)
        screenshot_3 = os.path.join(ARTIFACT_DIR, "phase_a_compare_realme_12_pro.png")
        page.screenshot(path=screenshot_3, full_page=True)
        print(f"Captured: {screenshot_3}")

        browser.close()
        print("All Phase A acceptance screenshots captured successfully!")

if __name__ == "__main__":
    main()
