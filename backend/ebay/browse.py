import logging
import httpx
from ebay.auth import ebay_auth
from ebay.models import SearchResponse, ItemDetail, ItemSummary
from config import config

logger = logging.getLogger(__name__)


class BrowseAPI:
    """Client for the eBay Browse API v1."""

    BASE_PATH = "/buy/browse/v1"

    def __init__(self):
        self._api_calls_today = 0

    async def _get_headers(self) -> dict:
        token = await ebay_auth.get_app_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        }

    async def search_items(
        self,
        query: str,
        *,
        limit: int = 50,
        offset: int = 0,
        sort: str = "newlyListed",
        price_min: float | None = None,
        price_max: float | None = None,
        condition: str | None = None,
        buying_options: str = "FIXED_PRICE",
        free_shipping: bool = False,
    ) -> SearchResponse:
        """Search eBay listings using the Browse API.

        Args:
            query: Search keywords
            limit: Results per page (max 200)
            offset: Pagination offset
            sort: Sort order - "newlyListed", "price", "-price", "distance"
            price_min: Minimum price filter
            price_max: Maximum price filter
            condition: "NEW", "USED", "UNSPECIFIED"
            buying_options: "FIXED_PRICE", "AUCTION", "BEST_OFFER"
            free_shipping: Filter for free shipping only
        """
        url = f"{config.ebay_api_base}{self.BASE_PATH}/item_summary/search"

        params = {
            "q": query,
            "limit": min(limit, 200),
            "offset": offset,
            "sort": sort,
        }

        # Build filter string
        filters = []
        if buying_options:
            filters.append(f"buyingOptions:{{{buying_options}}}")
        if price_min is not None or price_max is not None:
            price_range = f"price:[{price_min or ''}..{price_max or ''}]"
            filters.append(price_range)
        if condition:
            cond_map = {
                "NEW": "1000",
                "USED": "3000",
                "REFURBISHED": "2000",
                "PARTS": "7000",
            }
            cond_id = cond_map.get(condition.upper(), condition)
            filters.append(f"conditionIds:{{{cond_id}}}")
        if free_shipping:
            filters.append("maxDeliveryCost:0")

        if filters:
            params["filter"] = ",".join(filters)

        headers = await self._get_headers()

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, params=params)
            self._api_calls_today += 1
            response.raise_for_status()
            data = response.json()

        return SearchResponse(**data)

    async def get_item(self, item_id: str) -> ItemDetail:
        """Get full details for a specific item."""
        url = f"{config.ebay_api_base}{self.BASE_PATH}/item/{item_id}"
        headers = await self._get_headers()

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            self._api_calls_today += 1
            response.raise_for_status()
            data = response.json()

        return ItemDetail(**data)

    @property
    def api_calls_today(self) -> int:
        return self._api_calls_today

    def reset_daily_counter(self):
        self._api_calls_today = 0


# Singleton
browse_api = BrowseAPI()
