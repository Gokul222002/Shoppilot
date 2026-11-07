"""
Affiliate Link Builder (ShopPilot Phase C)
Constructs compliant, official retailer affiliate links with tracking IDs.
Supports Amazon Associates, Flipkart Affiliate, Cuelinks, Admitad, and vCommission.
"""

import os
from urllib.parse import urlencode, parse_qs, urlsplit, urlunsplit


class AffiliateLinkBuilder:
    """Builds tracked outbound merchant affiliate URLs."""

    def __init__(self):
        self.amazon_tag = os.getenv("AMAZON_ASSOCIATE_TAG", "shoppilot-21").strip()
        self.flipkart_affid = os.getenv("FLIPKART_AFFILIATE_ID", "shoppilot").strip()
        self.cuelinks_pubid = os.getenv("CUELINKS_PUB_ID", "shoppilot").strip()
        self.admitad_subid = os.getenv("ADMITAD_SUB_ID", "shoppilot").strip()

    def build_affiliate_url(self, raw_url: str, store_name: str, subid: str = "sp_organic") -> str:
        """
        Appends or injects merchant affiliate query parameters into the destination store URL.
        """
        store_lower = store_name.lower()

        try:
            parts = urlsplit(raw_url)
            query_params = parse_qs(parts.query)

            if "amazon" in store_lower:
                query_params["tag"] = [self.amazon_tag]
                query_params["ascsubtag"] = [subid]
                new_query = urlencode(query_params, doseq=True)
                return urlunsplit((parts.scheme, parts.netloc, parts.path, new_query, parts.fragment))

            elif "flipkart" in store_lower:
                query_params["affid"] = [self.flipkart_affid]
                query_params["affExtParam1"] = [subid]
                new_query = urlencode(query_params, doseq=True)
                return urlunsplit((parts.scheme, parts.netloc, parts.path, new_query, parts.fragment))

            elif any(s in store_lower for s in ("croma", "reliance", "tatacliq", "vijay")):
                # Wrap with affiliate network redirect if configured
                if os.getenv("ENABLE_CUELINKS_REDIRECT", "false").lower() == "true":
                    return f"https://linksredirect.com/?cid={self.cuelinks_pubid}&subid={subid}&url={raw_url}"
                return raw_url

            return raw_url

        except Exception:
            return raw_url


affiliate_builder = AffiliateLinkBuilder()
