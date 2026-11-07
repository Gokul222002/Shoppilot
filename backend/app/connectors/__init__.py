"""
ShopPilot Connectors Module (Phase C)
Exports pluggable store connectors, registry, scheduler, affiliate builder, and utility helpers.
"""

from app.connectors.base import StoreConnector
from app.connectors.mock import MockStoreConnector
from app.connectors.amazon import AmazonPAAPIConnector
from app.connectors.flipkart import FlipkartAffiliateConnector
from app.connectors.feed_importer import MerchantFeedConnector
from app.connectors.registry import connector_registry
from app.connectors.scheduler import price_scheduler
from app.connectors.affiliate import affiliate_builder
from app.connectors.utils import convert_price, execute_with_retry_and_backoff

__all__ = [
    "StoreConnector",
    "MockStoreConnector",
    "AmazonPAAPIConnector",
    "FlipkartAffiliateConnector",
    "MerchantFeedConnector",
    "connector_registry",
    "price_scheduler",
    "affiliate_builder",
    "convert_price",
    "execute_with_retry_and_backoff",
]
