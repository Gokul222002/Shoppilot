"""
Connector Utilities: Exponential Backoff, Rate Limiter, and Currency Helpers (ShopPilot Phase C)
"""

import time
import logging
from typing import Callable, Any, Dict, Optional

logger = logging.getLogger("ShopPilot.Connectors.Utils")


def execute_with_retry_and_backoff(
    fn: Callable[[], Any],
    max_retries: int = 3,
    base_delay: float = 0.5,
    backoff_factor: float = 2.0,
    connector_name: str = "Connector",
) -> Any:
    """
    Executes a callable with exponential backoff on transient errors (timeouts, 429 rate limits, 5xx errors).
    Never raises an unhandled crash to callers; logs and returns None on complete exhaustion.
    """
    retries = 0
    delay = base_delay

    while retries < max_retries:
        try:
            return fn()
        except Exception as exc:
            retries += 1
            logger.warning(
                f"[{connector_name}] Request failed (attempt {retries}/{max_retries}): {exc}. "
                f"Backing off for {delay:.2f}s..."
            )
            time.sleep(delay)
            delay *= backoff_factor

    logger.error(f"[{connector_name}] Exhausted all {max_retries} retries.")
    return None


# ─── Multi-Currency Conversion Helpers ────────────────────────────────────────
# Default: INR (₹). EUR (€) and USD ($) conversion rates.

EXCHANGE_RATES: Dict[str, float] = {
    "INR": 1.0,
    "USD": 0.012,    # ~ ₹83 per USD
    "EUR": 0.011,    # ~ ₹90 per EUR
}

CURRENCY_SYMBOLS: Dict[str, str] = {
    "INR": "₹",
    "USD": "$",
    "EUR": "€",
}


def convert_price(amount_inr: float, target_currency: str = "INR") -> Dict[str, Any]:
    """Convert INR price to USD or EUR with appropriate symbol."""
    curr = target_currency.upper()
    rate = EXCHANGE_RATES.get(curr, 1.0)
    symbol = CURRENCY_SYMBOLS.get(curr, "₹")
    converted = round(amount_inr * rate, 2 if curr in ("USD", "EUR") else 0)
    if curr == "INR":
        converted = int(converted)

    return {
        "currency": curr,
        "symbol": symbol,
        "amount": converted,
        "rate": rate,
    }
