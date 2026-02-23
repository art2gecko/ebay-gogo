from fastapi import APIRouter, Query
from ebay.browse import browse_api

router = APIRouter(tags=["search"])


@router.get("/search")
async def search_listings(
    q: str = Query(..., description="Search keywords"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    sort: str = Query("newlyListed"),
    price_min: float | None = Query(None),
    price_max: float | None = Query(None),
    condition: str | None = Query(None),
    buying_options: str = Query("FIXED_PRICE"),
    free_shipping: bool = Query(False),
):
    """Search eBay listings with filters."""
    result = await browse_api.search_items(
        query=q,
        limit=limit,
        offset=offset,
        sort=sort,
        price_min=price_min,
        price_max=price_max,
        condition=condition,
        buying_options=buying_options,
        free_shipping=free_shipping,
    )

    return {
        "total": result.total,
        "offset": result.offset,
        "limit": result.limit,
        "items": [item.to_dict() for item in result.itemSummaries],
    }


@router.get("/search/item/{item_id}")
async def get_item_details(item_id: str):
    """Get full details for a specific eBay item."""
    item = await browse_api.get_item(item_id)
    return item.model_dump()
