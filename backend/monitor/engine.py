import asyncio
import json
import logging
import time
from ebay.browse import browse_api
from ebay.models import ItemSummary
from database.models import (
    get_saved_searches,
    is_listing_seen,
    mark_listing_seen,
)
from monitor.alerts import send_telegram_notification
from config import config

logger = logging.getLogger(__name__)


class MonitorEngine:
    """Background engine that polls eBay for new listings matching saved searches."""

    def __init__(self):
        self._running = False
        self._tasks: dict[int, asyncio.Task] = {}
        self._ws_clients: list = []  # WebSocket connections to push updates to
        self._poll_task: asyncio.Task | None = None

    def register_ws(self, ws):
        self._ws_clients.append(ws)

    def unregister_ws(self, ws):
        if ws in self._ws_clients:
            self._ws_clients.remove(ws)

    async def _broadcast(self, message: dict):
        """Send a message to all connected WebSocket clients."""
        dead = []
        for ws in self._ws_clients:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._ws_clients.remove(ws)

    async def start(self):
        """Start the monitoring engine."""
        self._running = True
        self._poll_task = asyncio.create_task(self._main_loop())
        logger.info("Monitor engine started")

    async def stop(self):
        """Stop the monitoring engine and all active monitor tasks."""
        self._running = False
        for task in self._tasks.values():
            task.cancel()
        self._tasks.clear()
        if self._poll_task:
            self._poll_task.cancel()
        logger.info("Monitor engine stopped")

    async def _main_loop(self):
        """Main loop that checks for active monitors and manages poll tasks."""
        while self._running:
            try:
                searches = await get_saved_searches(active_only=True)
                active_ids = {s["id"] for s in searches}

                # Stop tasks for deactivated/deleted searches
                for sid in list(self._tasks.keys()):
                    if sid not in active_ids:
                        self._tasks[sid].cancel()
                        del self._tasks[sid]
                        logger.info(f"Stopped monitor for search #{sid}")

                # Start tasks for new active searches
                for search in searches:
                    sid = search["id"]
                    if sid not in self._tasks or self._tasks[sid].done():
                        self._tasks[sid] = asyncio.create_task(
                            self._poll_search(search)
                        )
                        logger.info(
                            f"Started monitor for search #{sid}: {search['keywords']}"
                        )
            except Exception as e:
                logger.error(f"Monitor main loop error: {e}")

            await asyncio.sleep(5)  # Check for new/removed monitors every 5s

    async def _poll_search(self, search: dict):
        """Poll eBay for a specific saved search and emit new listings."""
        search_id = search["id"]
        keywords = search["keywords"]
        filters = search.get("filters", {})
        interval = max(search.get("poll_interval_sec", 30), config.MIN_POLL_INTERVAL)

        logger.info(
            f"Polling search #{search_id} ({keywords}) every {interval}s"
        )

        while self._running:
            try:
                # Check rate limit
                if browse_api.api_calls_today >= config.MAX_DAILY_API_CALLS:
                    logger.warning("Daily API call limit reached, pausing monitors")
                    await self._broadcast({
                        "type": "rate_limit",
                        "message": "Daily eBay API call limit reached",
                    })
                    await asyncio.sleep(60)
                    continue

                result = await browse_api.search_items(
                    query=keywords,
                    limit=50,
                    sort="newlyListed",
                    price_min=filters.get("price_min"),
                    price_max=filters.get("price_max"),
                    condition=filters.get("condition"),
                    buying_options=filters.get("buying_options", "FIXED_PRICE"),
                    free_shipping=filters.get("free_shipping", False),
                )

                new_count = 0
                for item in result.itemSummaries:
                    if not await is_listing_seen(item.itemId):
                        # New listing found!
                        await mark_listing_seen(
                            ebay_item_id=item.itemId,
                            title=item.title,
                            price=item.price_value,
                            currency=item.price.currency if item.price else "USD",
                            shipping_cost=item.shipping_cost_value,
                            seller_name=item.seller_name,
                            seller_feedback=item.seller_feedback,
                            image_url=item.image_url,
                            item_url=item.itemWebUrl,
                            condition=item.condition,
                            search_id=search_id,
                        )

                        item_data = item.to_dict()
                        item_data["searchId"] = search_id
                        item_data["searchKeywords"] = keywords

                        # Push to WebSocket clients
                        await self._broadcast({
                            "type": "new_listing",
                            "data": item_data,
                        })

                        # Send Telegram notification
                        await send_telegram_notification(
                            title=item.title,
                            price=item.total_cost,
                            item_url=item.itemWebUrl,
                        )

                        new_count += 1

                if new_count > 0:
                    logger.info(
                        f"Search #{search_id}: Found {new_count} new listing(s)"
                    )

                # Send monitor status update
                await self._broadcast({
                    "type": "monitor_status",
                    "data": {
                        "searchId": search_id,
                        "keywords": keywords,
                        "totalResults": result.total,
                        "newListings": new_count,
                        "apiCallsToday": browse_api.api_calls_today,
                    },
                })

            except Exception as e:
                logger.error(f"Error polling search #{search_id}: {e}")
                await self._broadcast({
                    "type": "monitor_error",
                    "data": {
                        "searchId": search_id,
                        "error": str(e),
                    },
                })

            await asyncio.sleep(interval)

    async def add_monitor(self, search_id: int, search: dict):
        """Manually trigger adding a monitor (called when a new search is saved)."""
        if search_id not in self._tasks or self._tasks[search_id].done():
            self._tasks[search_id] = asyncio.create_task(self._poll_search(search))

    async def remove_monitor(self, search_id: int):
        """Stop a specific monitor."""
        if search_id in self._tasks:
            self._tasks[search_id].cancel()
            del self._tasks[search_id]
