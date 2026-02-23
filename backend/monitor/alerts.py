import logging
import httpx
from config import config

logger = logging.getLogger(__name__)


async def send_telegram_notification(title: str, price: float, item_url: str):
    """Send a Telegram notification about a new listing."""
    if not config.TELEGRAM_BOT_TOKEN or not config.TELEGRAM_CHAT_ID:
        return

    message = (
        f"🔔 *New eBay Listing!*\n\n"
        f"*{title}*\n"
        f"💰 ${price:.2f}\n"
        f"[View on eBay]({item_url})"
    )

    url = f"https://api.telegram.org/bot{config.TELEGRAM_BOT_TOKEN}/sendMessage"

    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                url,
                json={
                    "chat_id": config.TELEGRAM_CHAT_ID,
                    "text": message,
                    "parse_mode": "Markdown",
                    "disable_web_page_preview": False,
                },
            )
        logger.info(f"Telegram notification sent for: {title}")
    except Exception as e:
        logger.error(f"Failed to send Telegram notification: {e}")
