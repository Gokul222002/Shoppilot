"""
Generic Merchant CSV / XML Feed Importer Connector (ShopPilot Phase C)
Imports official product feeds from merchant CSV/XML feeds or affiliate networks (Cuelinks, Admitad).
Merges new store offers into existing catalog products.
Falls back safely to MockStoreConnector if feed is offline or invalid.
"""

import os
import csv
import io
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
import xml.etree.ElementTree as ET

from app.connectors.base import StoreConnector
from app.connectors.mock import MockStoreConnector
from app.connectors.utils import execute_with_retry_and_backoff
from app.validation.price_validator import sanitize_or_reject_offer

logger = logging.getLogger("ShopPilot.Connectors.FeedImporter")

DEFAULT_SAMPLE_FEED = os.path.join(os.path.dirname(__file__), "..", "data", "sample_merchant_feed.csv")


class MerchantFeedConnector(StoreConnector):
    name: str = "MerchantFeedConnector"

    def __init__(self, fallback_connector: Optional[StoreConnector] = None):
        self.fallback: MockStoreConnector = fallback_connector or MockStoreConnector()
        self.feed_url = os.getenv("MERCHANT_FEED_URL", "").strip()
        self.feed_path = os.getenv("MERCHANT_FEED_PATH", DEFAULT_SAMPLE_FEED).strip()
        self.is_configured = bool(self.feed_url or (self.feed_path and os.path.exists(self.feed_path)))
        self.last_sync: Optional[str] = None
        self.sync_errors: List[str] = []
        self.imported_offers_count: int = 0

        if not self.is_configured:
            logger.info(
                "[Merchant Feed Importer] No feed URL/path configured. "
                "Operating in safe fallback mode using MockConnector."
            )
        else:
            self._load_initial_feed()

    def _load_initial_feed(self):
        try:
            if self.feed_path and os.path.exists(self.feed_path):
                with open(self.feed_path, "r", encoding="utf-8") as f:
                    content = f.read()
                    self.parse_and_merge_csv(content)
        except Exception as e:
            msg = f"Error loading initial feed from {self.feed_path}: {e}"
            logger.error(msg)
            self.sync_errors.append(msg)

    def parse_and_merge_csv(self, csv_text: str) -> Dict[str, Any]:
        """
        Parses merchant feed CSV and merges offers into catalog products.
        Expected columns: product_name/title, barcode, store, price, mrp, etc.
        """
        reader = csv.DictReader(io.StringIO(csv_text.strip()))
        imported = 0
        merged = 0

        for row in reader:
            imported += 1
            ident = (row.get("product_name") or row.get("title") or row.get("product_id") or row.get("barcode") or "").strip()
            store = row.get("store") or row.get("merchant", "Merchant Store")
            try:
                price = int(float(row.get("price", 0)))
                mrp = int(float(row.get("mrp", price)))

                # Enforce price sanity validation
                sanitized, reason = sanitize_or_reject_offer(
                    {"price": price, "mrp": mrp, "store": store, "in_stock": True},
                    category="mobiles",
                )
                if not sanitized:
                    logger.warning(f"[Merchant Feed] Skipping invalid/insane price offer: {ident} price={price} mrp={mrp} ({reason})")
                    continue

                delivery_days = int(row.get("delivery_days", 2))
                seller_rating = float(row.get("seller_rating", 4.5))
                in_stock = str(row.get("in_stock", "true")).lower() in ("true", "1", "yes")
                url = row.get("url", "")
                shipping_fee = int(float(row.get("shipping_fee", 0)))
                region = row.get("region", "IN")
                currency = row.get("currency", "INR")

                success = self.fallback.merge_external_offer(
                    product_identifier=ident,
                    store=store,
                    price=price,
                    mrp=mrp,
                    delivery_days=delivery_days,
                    seller_rating=seller_rating,
                    in_stock=in_stock,
                    url=url,
                    shipping_fee=shipping_fee,
                    region=region,
                    currency=currency,
                    product_id=row.get("product_id"),
                    barcode=row.get("barcode"),
                    data_source="feed",
                )
                if success:
                    merged += 1
            except Exception as row_err:
                logger.warning(f"[Merchant Feed] Skipping invalid row: {row_err}")

        self.last_sync = datetime.utcnow().isoformat()
        self.imported_offers_count += merged
        logger.info(f"[Merchant Feed Importer] Imported {imported} rows, merged {merged} offers successfully.")
        return {
            "status": "SUCCESS",
            "rows_read": imported,
            "offers_merged": merged,
            "last_sync": self.last_sync,
        }

    def parse_and_merge_xml(self, xml_text: str) -> Dict[str, Any]:
        """
        Parses merchant XML feed (RSS 2.0, Atom, or affiliate feed nodes).
        Supports <item>, <product>, or <offer> tags.
        """
        imported = 0
        merged = 0
        try:
            root = ET.fromstring(xml_text.strip())
            nodes = root.findall(".//item") or root.findall(".//product") or root.findall(".//offer")
            for node in nodes:
                imported += 1
                def _text(tag: str, default: str = "") -> str:
                    el = node.find(tag)
                    return el.text.strip() if el is not None and el.text else default

                ident = _text("title") or _text("name") or _text("product_name") or _text("id")
                store = _text("store") or _text("merchant") or "Partner Store"
                try:
                    price = int(float(_text("price", "0")))
                    mrp = int(float(_text("mrp", str(price))))
                    url = _text("url") or _text("link")

                    sanitized, reason = sanitize_or_reject_offer(
                        {"price": price, "mrp": mrp, "store": store, "in_stock": True},
                        category="mobiles",
                    )
                    if not sanitized:
                        logger.warning(f"[Merchant XML Feed] Skipping price-insane offer: {ident} ({reason})")
                        continue

                    success = self.fallback.merge_external_offer(
                        product_identifier=ident,
                        store=store,
                        price=price,
                        mrp=mrp,
                        url=url,
                        data_source="feed",
                    )
                    if success:
                        merged += 1
                except Exception as node_err:
                    logger.warning(f"[Merchant XML Feed] Skipping invalid node: {node_err}")

        except Exception as xml_err:
            msg = f"Failed to parse merchant XML feed: {xml_err}"
            logger.error(msg)
            self.sync_errors.append(msg)
            return {"status": "ERROR", "message": msg}

        self.last_sync = datetime.utcnow().isoformat()
        self.imported_offers_count += merged
        return {
            "status": "SUCCESS",
            "rows_read": imported,
            "offers_merged": merged,
            "last_sync": self.last_sync,
        }

    def parse_and_merge(self, content: str) -> Dict[str, Any]:
        """Auto-detects CSV or XML format and merges offers."""
        stripped = content.strip()
        if stripped.startswith("<"):
            return self.parse_and_merge_xml(stripped)
        return self.parse_and_merge_csv(stripped)

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

    def get_product(self, id_or_url: str) -> Optional[Dict[str, Any]]:
        return self.fallback.get_product(id_or_url)

    def get_by_url(self, url: str) -> Optional[Dict[str, Any]]:
        return self.fallback.get_by_url(url)

    def get_offers(self, product_id: str) -> List[Dict[str, Any]]:
        return self.fallback.get_offers(product_id)

    def refresh(self, product_id: Optional[str] = None) -> Dict[str, Any]:
        """Refreshes feed data with retry and backoff protection."""
        def _sync_task():
            if self.feed_path and os.path.exists(self.feed_path):
                with open(self.feed_path, "r", encoding="utf-8") as f:
                    return self.parse_and_merge_csv(f.read())
            return {"status": "SUCCESS", "message": "No feed file updated"}

        result = execute_with_retry_and_backoff(_sync_task, max_retries=2, connector_name=self.name)
        if result:
            return result
        return {
            "status": "ERROR",
            "message": "Feed sync failed after retries. Safe fallback active.",
            "last_sync": self.last_sync,
        }
