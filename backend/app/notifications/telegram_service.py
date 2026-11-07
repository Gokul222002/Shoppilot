"""
ShopPilot Telegram Alert Service for Price-Drop Notifications (Phase F)
Allows shoppers to link their Telegram account with a 6-digit one-time code.
Sends instant Markdown price-drop alerts when a target price is reached.
Falls back gracefully to console/mock log if TELEGRAM_BOT_TOKEN is not configured.
Email remains the default notification channel.
"""

import os
import random
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
import httpx

logger = logging.getLogger("ShopPilot.TelegramService")

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
TELEGRAM_BOT_USERNAME = os.getenv("TELEGRAM_BOT_USERNAME", "ShopPilotAlertsBot").strip()


class TelegramAlertService:
    def __init__(self):
        # Maps one-time code -> {"email": email, "expires_at": datetime}
        self.pending_codes: Dict[str, Dict[str, Any]] = {}
        # Maps email -> chat_id
        self.user_telegram_map: Dict[str, str] = {
            # Seed default test link for Gokul
            "gokul@example.com": "987654321",
        }
        # In-memory history of dispatched alerts
        self.dispatched_alerts: List[Dict[str, Any]] = []

    def generate_linking_code(self, email: str) -> Dict[str, Any]:
        """
        Generates a 6-digit one-time linking code valid for 15 minutes.
        Provides a Telegram deep link: https://t.me/<bot_username>?start=<code>
        """
        code = f"{random.randint(100000, 999999)}"
        expires_at = datetime.utcnow() + timedelta(minutes=15)
        self.pending_codes[code] = {
            "email": email.lower().strip(),
            "expires_at": expires_at,
        }

        deep_link = f"https://t.me/{TELEGRAM_BOT_USERNAME}?start={code}"
        logger.info(f"[Telegram Linking Code] Generated code {code} for {email}. Deep link: {deep_link}")

        return {
            "code": code,
            "email": email,
            "deep_link": deep_link,
            "expires_at": expires_at.isoformat(),
            "bot_username": TELEGRAM_BOT_USERNAME,
            "is_live_bot_configured": bool(TELEGRAM_BOT_TOKEN),
        }

    def link_account_with_code(self, code: str, chat_id: str) -> Dict[str, Any]:
        """
        Verifies the one-time code and links the chat_id to the user's email.
        """
        record = self.pending_codes.get(code.strip())
        if not record:
            return {"success": False, "error": "Invalid or expired one-time linking code"}

        if datetime.utcnow() > record["expires_at"]:
            self.pending_codes.pop(code.strip(), None)
            return {"success": False, "error": "Linking code has expired. Please generate a new one."}

        email = record["email"]
        self.user_telegram_map[email] = str(chat_id)
        self.pending_codes.pop(code.strip(), None)

        logger.info(f"[Telegram Account Linked] Email {email} linked to Telegram Chat ID {chat_id}")
        return {
            "success": True,
            "email": email,
            "chat_id": str(chat_id),
            "linked_at": datetime.utcnow().isoformat(),
        }

    def get_chat_id_for_user(self, email: str) -> Optional[str]:
        return self.user_telegram_map.get(email.lower().strip())

    async def send_price_drop_alert(
        self,
        chat_id: str,
        product_name: str,
        current_price: int,
        target_price: int,
        store: str = "Online Store",
        product_url: str = "",
    ) -> bool:
        """
        Dispatches a formatted Markdown price-drop alert to Telegram.
        If TELEGRAM_BOT_TOKEN is not configured, logs cleanly with console fallback.
        """
        savings = max(0, target_price - current_price)
        savings_text = f" (Saved ₹{savings:,})" if savings > 0 else ""

        message_text = (
            f"🚨 *ShopPilot Price Drop Alert!*\n\n"
            f"*{product_name}* has dropped to *₹{current_price:,}* on *{store}*!\n\n"
            f"🎯 *Your Target:* ₹{target_price:,}{savings_text}\n"
            f"🏪 *Store:* {store}\n\n"
            f"🔗 [Compare & View Verified Offer]({product_url})\n\n"
            f"ℹ️ _ShopPilot compares prices only. Purchases happen on the retailer site._"
        )

        alert_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "chat_id": chat_id,
            "product_name": product_name,
            "current_price": current_price,
            "target_price": target_price,
            "store": store,
            "message": message_text,
            "channel": "TELEGRAM",
            "status": "DISPATCHED",
        }

        # Real Telegram Bot API dispatch if token is provided
        if TELEGRAM_BOT_TOKEN:
            try:
                url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
                payload = {
                    "chat_id": chat_id,
                    "text": message_text,
                    "parse_mode": "Markdown",
                    "disable_web_page_preview": False,
                }
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        logger.info(f"[Telegram Bot Dispatch SUCCESS] Alert sent to chat_id {chat_id}")
                        self.dispatched_alerts.append(alert_entry)
                        return True
                    else:
                        logger.warning(f"[Telegram Bot API Error {resp.status_code}]: {resp.text}")
            except Exception as e:
                logger.warning(f"[Telegram Dispatch Failed, falling back to console]: {e}")

        # Graceful fallback: Console dispatch
        alert_entry["status"] = "CONSOLE_LOGGED_FALLBACK"
        self.dispatched_alerts.append(alert_entry)
        logger.info(
            f"[TELEGRAM CONSOLE DISPATCH] Chat ID: {chat_id} | "
            f"Product: {product_name} | Price: ₹{current_price:,} | Target: ₹{target_price:,}"
        )
        return True


telegram_service = TelegramAlertService()
