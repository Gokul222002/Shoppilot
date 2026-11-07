"""
ShopPilot Email Service for Price-Drop Notifications
Supports real SMTP dispatch when configured via .env (e.g. Resend, SendGrid, Gmail SMTP),
with a graceful, reliable console logger fallback.
"""

import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger("ShopPilot.EmailService")

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
ALERT_FROM_EMAIL = os.getenv("ALERT_FROM_EMAIL", "alerts@shoppilot.com")


def send_price_drop_email(
    to_email: str,
    product_name: str,
    current_price: int,
    target_price: int,
    store: str = "Online Store",
    product_url: str = "",
) -> bool:
    """
    Dispatch a price-drop email notification.
    If SMTP credentials are not configured, gracefully logs the email to console.
    """
    subject = f"🔥 Price Drop Alert: {product_name} is now ₹{current_price:,}!"
    body = (
        f"Hello,\n\n"
        f"Great news! The product you've been watching has dropped to or below your target price:\n\n"
        f"• Product: {product_name}\n"
        f"• Current Lowest Price: ₹{current_price:,}\n"
        f"• Your Target Price: ₹{target_price:,}\n"
        f"• Lowest Store: {store}\n\n"
        f"Buy direct from the merchant here:\n{product_url}\n\n"
        f"— ShopPilot Autonomous Price Comparison Engine\n"
        f"(ShopPilot never sells products directly; all purchases happen on the verified retailer site.)"
    )

    if SMTP_HOST and SMTP_USER and SMTP_PASSWORD:
        try:
            msg = MIMEMultipart()
            msg["From"] = ALERT_FROM_EMAIL
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain"))

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=5.0) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)

            logger.info(f"[SMTP DISPATCH SUCCESS] Sent price drop alert to {to_email} for '{product_name}'")
            return True
        except Exception as e:
            logger.warning(f"[SMTP DISPATCH FAILED] Falling back to console logging: {e}")

    # Graceful fallback: Console dispatch
    logger.info(
        f"[EMAIL CONSOLE DISPATCH] "
        f"To: {to_email} | Subject: {subject} | "
        f"Product: {product_name} | Price: ₹{current_price} | Target: ₹{target_price}"
    )
    return True
