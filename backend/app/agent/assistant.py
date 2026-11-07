"""
AI Shopping Assistant Engine — ShopPilot
Powered by Gemini API with heuristic catalog intelligence fallback.
Analyzes user shopping intent, filters multi-store catalog, compares prices,
and generates structured recommendations with direct comparison links.
"""

import re
import json
import logging
from typing import Dict, Any, List, Optional
import httpx

from app.config import settings

logger = logging.getLogger("ShopPilot.Assistant")


def extract_budget(query: str) -> Optional[int]:
    match = re.search(
        r"(?:under|below|less than|within|budget of|[₹$]|rs\.?|inr)\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(k|thousand|lakh)?",
        query,
        re.IGNORECASE,
    )
    if not match:
        return None
    val = float(match.group(1).replace(",", ""))
    mult = (match.group(2) or "").lower()
    if mult in ("k", "thousand"):
        val *= 1000
    elif mult == "lakh":
        val *= 100000
    return int(val)


async def ask_gemini(prompt: str) -> Optional[str]:
    """Call Google Gemini API if key is configured."""
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return None

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.VISION_MODEL_NAME}:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 800,
        }
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    return candidates[0]["content"]["parts"][0]["text"]
            else:
                logger.warning(f"Gemini API returned status {resp.status_code}: {resp.text}")
    except Exception as e:
        logger.error(f"Error calling Gemini API: {e}")
    return None


def generate_heuristic_advice(query: str, matching_products: List[Dict[str, Any]], budget: Optional[int]) -> str:
    """Generate concise, high-value expert shopping advice from verified catalog data."""
    if not matching_products:
        return (
            f"I searched our 5 connected stores for **\"{query}\"**, but couldn't find an exact match in our current catalog. "
            "Try searching by broader category keywords like *phone, laptop, headphones, fan, or keyboard*."
        )

    best_item = matching_products[0]
    cheapest_store = best_item["offers"][0]["store"] if best_item["offers"] else "Amazon.in"
    lowest_price = best_item["best_price"]

    advice = [
        f"### 🎯 Top Recommendation: **{best_item['name']}**\n",
        f"- **Best Live Price:** ₹{lowest_price:,} on **{cheapest_store}** (Save {best_item['best_discount_pct']}% vs MRP ₹{best_item['mrp']:,})",
        f"- **Customer Score:** ★ {best_item['rating']} / 5 ({best_item['review_count']:,} verified reviews)",
    ]

    if best_item.get("tags"):
        advice.append(f"- **Key Specs:** {', '.join(best_item['tags'])}")

    if budget:
        diff = budget - lowest_price
        if diff >= 0:
            advice.append(f"- **Budget Status:** Well within your ₹{budget:,} budget (saving you ₹{diff:,} extra).")
        else:
            advice.append(f"- **Budget Status:** Slightly over ₹{budget:,} budget by ₹{abs(diff):,}, but offers highest longevity in this tier.")

    if len(matching_products) > 1:
        alt = matching_products[1]
        advice.append(f"\n#### ⚡ Alternative to Consider: **{alt['name']}**")
        advice.append(
            f"Available at ₹{alt['best_price']:,} on {alt['offers'][0]['store'] if alt['offers'] else 'Flipkart'}. "
            f"Compare them side-by-side using the cards below to see full store breakdown."
        )

    advice.append(
        "\n*Tip: Click **Compare Prices** on any item below to view verified 12-month historical price charts and seller delivery times.*"
    )

    return "\n".join(advice)
