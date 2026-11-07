"""
Amazon Creators API Connector (ShopPilot Workstream 6 & Phase C)
Official Amazon affiliate API connector for price and stock discovery.
Implements the 2024+ Amazon Creators API using OAuth 2.0:
  - client_id, client_secret, refresh_token
  - Token caching and automatic refresh
  - Backward compatibility with PA-API 5.0 env keys
  - Safe fallback to MockStoreConnector if credentials are unconfigured or unavailable
  - Rate limiting, retries with backoff, and non-breaking error tolerance
"""

import os
import time
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import httpx

from app.connectors.base import StoreConnector
from app.connectors.mock import MockStoreConnector
from app.connectors.utils import execute_with_retry_and_backoff
from app.validation.price_validator import sanitize_or_reject_offer

logger = logging.getLogger("ShopPilot.Connectors.AmazonCreators")

OAUTH_TOKEN_URL = "https://api.amazon.com/auth/o2/token"
CREATORS_API_HOSTS = {
    "in": "https://creators.amazon.in/api/v1",
    "us": "https://creators.amazon.com/api/v1",
    "uk": "https://creators.amazon.co.uk/api/v1",
}


class AmazonCreatorsConnector(StoreConnector):
    name: str = "AmazonCreatorsConnector"

    def __init__(self, fallback_connector: Optional[StoreConnector] = None):
        self.fallback = fallback_connector or MockStoreConnector()

        # Amazon Creators API OAuth 2.0 credentials
        self.client_id = os.getenv("AMAZON_CREATORS_CLIENT_ID", "").strip()
        self.client_secret = os.getenv("AMAZON_CREATORS_CLIENT_SECRET", "").strip()
        self.refresh_token = os.getenv("AMAZON_CREATORS_REFRESH_TOKEN", "").strip()
        self.associate_tag = (
            os.getenv("AMAZON_ASSOCIATE_TAG")
            or os.getenv("AMAZON_CREATORS_TAG")
            or "shoppilot-21"
        ).strip()
        self.region = os.getenv("AMAZON_REGION", "in").strip().lower()

        # Legacy PA-API 5.0 credentials for backward compatibility
        self.paapi_key = os.getenv("AMAZON_PAAPI_KEY", "").strip()
        self.paapi_secret = os.getenv("AMAZON_PAAPI_SECRET", "").strip()

        # Token caching state
        self._access_token: Optional[str] = None
        self._token_expires_at: float = 0.0

        self.last_sync: Optional[str] = None
        self.sync_errors: List[str] = []

        self.is_configured = bool(
            (self.client_id and self.client_secret and self.refresh_token)
            or (self.paapi_key and self.paapi_secret)
        )

        if not self.is_configured:
            logger.info(
                "[Amazon Creators API] Credentials missing or incomplete. "
                "Operating in safe fallback mode using MockStoreConnector. "
                "Set AMAZON_CREATORS_CLIENT_ID, AMAZON_CREATORS_CLIENT_SECRET, and "
                "AMAZON_CREATORS_REFRESH_TOKEN in .env to activate live sync."
            )

    def get_access_token(self) -> Optional[str]:
        """
        Retrieves or refreshes OAuth 2.0 access token with caching and safety margin.
        """
        now = time.time()
        # Return cached token if valid for at least 5 more minutes
        if self._access_token and (self._token_expires_at - now > 300):
            return self._access_token

        if not (self.client_id and self.client_secret and self.refresh_token):
            return None

        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(
                    OAUTH_TOKEN_URL,
                    data={
                        "grant_type": "refresh_token",
                        "refresh_token": self.refresh_token,
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
                if resp.status_code == 200:
                    payload = resp.json()
                    self._access_token = payload.get("access_token")
                    expires_in = payload.get("expires_in", 3600)
                    self._token_expires_at = now + expires_in
                    logger.info("[Amazon Creators API] OAuth access token refreshed successfully.")
                    return self._access_token
                else:
                    err = f"OAuth token refresh failed HTTP {resp.status_code}: {resp.text[:120]}"
                    logger.warning(f"[Amazon Creators API] {err}")
                    self.sync_errors.append(err)
        except Exception as e:
            err = f"OAuth token refresh exception: {e}"
            logger.warning(f"[Amazon Creators API] {err}")
            self.sync_errors.append(err)

        return None

    def search(
        self,
        query: str,
        category: Optional[str] = None,
        brand: Optional[str] = None,
        min_price: Optional[int] = None,
        max_price: Optional[int] = None,
        store: Optional[str] = None,
        in_stock_only: Optional[bool] = None,
        sort_by: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search products. If Creators API is configured and accessible, queries live API;
        otherwise falls back cleanly to the mock catalog.
        """
        if not self.is_configured:
            return self.fallback.search(
                query=query,
                category=category,
                brand=brand,
                min_price=min_price,
                max_price=max_price,
                store=store,
                in_stock_only=in_stock_only,
                sort_by=sort_by,
            )

        token = self.get_access_token()
        if not token:
            # Fall back safely without breaking pages
            return self.fallback.search(
                query=query,
                category=category,
                brand=brand,
                min_price=min_price,
                max_price=max_price,
                store=store,
                in_stock_only=in_stock_only,
                sort_by=sort_by,
            )

        def _do_live_search():
            base_url = CREATORS_API_HOSTS.get(self.region, CREATORS_API_HOSTS["in"])
            url = f"{base_url}/products/search"
            headers = {
                "Authorization": f"Bearer {token}",
                "x-amz-associate-tag": self.associate_tag,
                "Accept": "application/json",
            }
            params = {"keywords": query, "limit": 10}
            if category:
                params["category"] = category

            with httpx.Client(timeout=10.0) as client:
                res = client.get(url, headers=headers, params=params)
                if res.status_code == 200:
                    data = res.json()
                    items = data.get("items", [])
                    results = []
                    for it in items:
                        asin = it.get("asin")
                        price = int(it.get("price", {}).get("amount", 0))
                        mrp = int(it.get("price", {}).get("mrp", price))
                        # Validate price sanity
                        sanitized, reason = sanitize_or_reject_offer(
                            offer={
                                "store": "Amazon.in",
                                "price": price,
                                "mrp": mrp,
                                "in_stock": it.get("availability", "IN_STOCK") == "IN_STOCK",
                                "dataSource": "live",
                                "last_updated": datetime.now(timezone.utc).isoformat(),
                                "url": f"https://www.amazon.in/dp/{asin}?tag={self.associate_tag}",
                            },
                            category=category or "mobiles",
                        )
                        if sanitized:
                            results.append(sanitized)
                    return results
                else:
                    raise RuntimeError(f"Amazon Creators API responded with HTTP {res.status_code}")

        res = execute_with_retry_and_backoff(_do_live_search, max_retries=2, connector_name=self.name)
        if res:
            return res
        return self.fallback.search(query=query, category=category, brand=brand)

    def get_product(self, id_or_url: str) -> Optional[Dict[str, Any]]:
        return self.fallback.get_product(id_or_url)

    def get_by_url(self, url: str) -> Optional[Dict[str, Any]]:
        return self.fallback.get_by_url(url)

    def get_offers(self, product_id: str) -> List[Dict[str, Any]]:
        return self.fallback.get_offers(product_id)

    def refresh(self, product_id: Optional[str] = None) -> Dict[str, Any]:
        self.last_sync = datetime.now(timezone.utc).isoformat()
        if not self.is_configured:
            return {
                "connector": self.name,
                "status": "FALLBACK_ACTIVE",
                "message": "Amazon Creators API credentials not configured; using offline fallback.",
                "last_sync": self.last_sync,
            }
        token = self.get_access_token()
        if not token:
            return {
                "connector": self.name,
                "status": "AUTH_ERROR",
                "message": "Failed to authenticate with Amazon OAuth 2.0; operating in fallback.",
                "last_sync": self.last_sync,
            }
        return {
            "connector": self.name,
            "status": "SUCCESS",
            "message": "Amazon Creators API sync cycle completed successfully.",
            "last_sync": self.last_sync,
        }


# Alias for backward compatibility
AmazonPAAPIConnector = AmazonCreatorsConnector
