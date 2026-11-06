"""
Playwright Async Browser Manager with Streaming Screenshot Emitting & Visual Markers.
"""

import asyncio
import base64
import logging
from typing import Optional, Callable, Dict, Any, List
from playwright.async_api import async_playwright, Browser, BrowserContext, Page, Playwright
from bs4 import BeautifulSoup

from app.config import settings

logger = logging.getLogger("ShopPilot.Browser")

class BrowserController:
    def __init__(self, event_emitter: Optional[Callable[[Dict[str, Any]], Any]] = None):
        self.playwright: Optional[Playwright] = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.event_emitter = event_emitter
        self._lock = asyncio.Lock()

    async def initialize(self, headless: Optional[bool] = None):
        """Start Playwright and launch Chromium"""
        async with self._lock:
            if self.browser is None:
                self.playwright = await async_playwright().start()
                is_headless = settings.HEADLESS if headless is None else headless
                self.browser = await self.playwright.chromium.launch(
                    headless=is_headless,
                    args=[
                        "--disable-blink-features=AutomationControlled",
                        "--no-sandbox",
                        "--disable-setuid-sandbox",
                        "--disable-dev-shm-usage"
                    ]
                )
                self.context = await self.browser.new_context(
                    viewport={"width": settings.VIEWPORT_WIDTH, "height": settings.VIEWPORT_HEIGHT},
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                    device_scale_factor=1
                )
                self.page = await self.context.new_page()
                logger.info(f"Browser launched (headless={is_headless})")

    async def navigate_to(self, url: str) -> bool:
        if not self.page:
            await self.initialize()
        try:
            logger.info(f"Navigating to {url}")
            await self.page.goto(url, wait_until="networkidle", timeout=settings.BROWSER_TIMEOUT_MS)
            await asyncio.sleep(0.5)
            return True
        except Exception as e:
            logger.error(f"Navigation error to {url}: {e}")
            # Try with domcontentloaded
            try:
                await self.page.goto(url, wait_until="domcontentloaded", timeout=15000)
                return True
            except Exception as e2:
                logger.error(f"Secondary navigation failure: {e2}")
                return False

    async def capture_screenshot_base64(self) -> str:
        """Capture screenshot and encode in Base64 JPEG for ultra-fast streaming"""
        if not self.page:
            return ""
        try:
            screenshot_bytes = await self.page.screenshot(type="jpeg", quality=80)
            return base64.b64encode(screenshot_bytes).decode("utf-8")
        except Exception as e:
            logger.error(f"Screenshot capture error: {e}")
            return ""

    async def get_simplified_dom(self) -> str:
        """
        Extract simplified representation of clickable, fillable, and semantic store items.
        Keeps token count compact for Vision/LLM analysis.
        """
        if not self.page:
            return ""
        try:
            html = await self.page.content()
            soup = BeautifulSoup(html, "html.parser")

            # Remove scripts, styles, svg paths, and hidden elements
            for tag in soup(["script", "style", "meta", "noscript", "svg", "link"]):
                tag.decompose()

            # Skip hidden elements with display: none or hidden attribute
            for tag in soup.find_all(lambda t: t.has_attr('hidden') or ('display: none' in str(t.get('style', ''))) or ('display:none' in str(t.get('style', '')))):
                tag.decompose()

            interactive_elements = []
            for el in soup.find_all(["button", "input", "a", "select", "div", "span", "h1", "h2", "h3", "p"]):
                attrs = dict(el.attrs)
                has_interactive = (
                    el.name in ["button", "input", "a", "select"] or
                    "btn" in str(attrs.get("class", "")) or
                    "price" in str(attrs.get("class", "")) or
                    "product" in str(attrs.get("class", "")) or
                    "modal" in str(attrs.get("class", "")) or
                    "cart" in str(attrs.get("class", "")) or
                    attrs.get("id") or
                    attrs.get("data-price")
                )
                if has_interactive:
                    text = el.get_text(strip=True)[:100]
                    attr_summary = " ".join([f'{k}="{v}"' for k, v in attrs.items() if k in ["id", "class", "name", "type", "data-price", "data-title", "href", "placeholder"]])
                    interactive_elements.append(f"<{el.name} {attr_summary}>{text}</{el.name}>")

            return "\n".join(interactive_elements[:150])
        except Exception as e:
            logger.error(f"DOM extraction error: {e}")
            return ""

    async def execute_action(self, action_type: str, selector: Optional[str] = None, value: Optional[str] = "") -> Dict[str, Any]:
        """
        Execute an action and draw visual highlight around the target element.
        """
        if not self.page:
            return {"success": False, "error": "Browser not initialized"}

        result = {"success": True, "action": action_type, "selector": selector, "value": value}

        try:
            if action_type == "navigate":
                target_url = value or selector
                await self.navigate_to(target_url)

            elif action_type == "click":
                if not selector:
                    return {"success": False, "error": "No selector provided for click action"}

                # Highlight visually for the screenshot stream
                try:
                    await self.page.eval_on_selector(
                        selector,
                        """el => {
                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            el.style.outline = '4px solid #ef4444';
                            el.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.8)';
                            el.style.transition = 'all 0.2s ease-in-out';
                        }"""
                    )
                    await asyncio.sleep(0.3)
                except Exception:
                    pass

                # Perform actual click
                await self.page.click(selector, timeout=7000)
                await asyncio.sleep(settings.ACTION_DELAY_MS / 1000.0)

            elif action_type == "type":
                if not selector:
                    return {"success": False, "error": "No selector provided for type action"}
                
                await self.page.fill(selector, "")
                await self.page.type(selector, value, delay=40)
                await asyncio.sleep(0.3)

            elif action_type == "press":
                key = value or "Enter"
                await self.page.keyboard.press(key)
                await asyncio.sleep(settings.ACTION_DELAY_MS / 1000.0)

            elif action_type == "scroll":
                delta = int(value) if value and value.isdigit() else 400
                await self.page.mouse.wheel(0, delta)
                await asyncio.sleep(0.4)

            elif action_type == "wait":
                wait_time = int(value) / 1000.0 if value and value.isdigit() else 1.0
                await asyncio.sleep(wait_time)

            elif action_type == "finish":
                logger.info("Agent goal reached or finished.")

            else:
                return {"success": False, "error": f"Unknown action: {action_type}"}

            return result

        except Exception as e:
            logger.error(f"Error executing action '{action_type}' on '{selector}': {e}")
            result["success"] = False
            result["error"] = str(e)
            return result

    async def close(self):
        """Cleanup browser resources safely"""
        async with self._lock:
            try:
                if self.context:
                    await self.context.close()
                if self.browser:
                    await self.browser.close()
                if self.playwright:
                    await self.playwright.stop()
            except Exception as e:
                logger.error(f"Error during browser cleanup: {e}")
            finally:
                self.browser = None
                self.context = None
                self.page = None
                self.playwright = None
