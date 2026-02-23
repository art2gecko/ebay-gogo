from fastapi import APIRouter
from pydantic import BaseModel
from database.models import log_purchase, get_purchase_history

router = APIRouter(tags=["purchase"])


class PurchaseLogRequest(BaseModel):
    ebay_item_id: str
    title: str
    price: float
    currency: str = "USD"
    item_url: str


@router.post("/purchase/prepare")
async def prepare_purchase(ebay_item_id: str, item_url: str):
    """Prepare a purchase by returning the eBay Buy-It-Now URL.

    The frontend will open this URL in a webview or system browser
    so the user can complete the purchase on eBay.
    """
    # The item URL from Browse API already points to the eBay listing.
    # For Buy-It-Now items, we can construct a direct checkout URL.
    # eBay's direct buy URL format: itemUrl + "?nordt=true&orig_cvip=true&rt=nc"
    buy_url = item_url
    if "?" in buy_url:
        buy_url += "&nordt=true&orig_cvip=true&rt=nc"
    else:
        buy_url += "?nordt=true&orig_cvip=true&rt=nc"

    return {
        "buyUrl": buy_url,
        "itemId": ebay_item_id,
        "itemUrl": item_url,
    }


@router.post("/purchase/log")
async def record_purchase(req: PurchaseLogRequest):
    """Log a purchase click for history tracking."""
    await log_purchase(
        ebay_item_id=req.ebay_item_id,
        title=req.title,
        price=req.price,
        currency=req.currency,
        item_url=req.item_url,
    )
    return {"logged": True}


@router.get("/purchase/history")
async def purchase_history_list(limit: int = 50):
    """Get purchase click history."""
    history = await get_purchase_history(limit=limit)
    return {"history": history}
