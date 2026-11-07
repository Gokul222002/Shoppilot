"""
Base Store Connector Interface (ShopPilot Phase C)
Defines the standard abstract contract for multi-store price connectors.
All connectors (Mock, Amazon PA-API, Flipkart, Feed Importer) implement this interface.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional


class StoreConnector(ABC):
    """Abstract Base Class for multi-store e-commerce price connectors."""

    name: str = "BaseConnector"

    @abstractmethod
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
        """Search products across connected stores."""
        pass

    @abstractmethod
    def get_product(self, id_or_url: str) -> Optional[Dict[str, Any]]:
        """Get product details by ID, slug, or barcode."""
        pass

    @abstractmethod
    def get_by_url(self, url: str) -> Optional[Dict[str, Any]]:
        """Look up canonical product by store URL."""
        pass

    @abstractmethod
    def get_offers(self, product_id: str) -> List[Dict[str, Any]]:
        """Get all active store offers for a product."""
        pass

    @abstractmethod
    def refresh(self, product_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Refresh price and stock data from store API/feed.
        If product_id is None, performs a sync cycle for active products.
        """
        pass
