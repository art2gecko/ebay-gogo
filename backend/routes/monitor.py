from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database.models import (
    create_saved_search,
    get_saved_searches,
    get_saved_search,
    update_saved_search,
    delete_saved_search,
    get_recent_listings,
)

router = APIRouter(tags=["monitor"])


class CreateMonitorRequest(BaseModel):
    keywords: str
    filters: dict | None = None
    poll_interval_sec: int = 30


class UpdateMonitorRequest(BaseModel):
    keywords: str | None = None
    filters: dict | None = None
    poll_interval_sec: int | None = None
    active: int | None = None


@router.post("/monitors")
async def create_monitor(req: CreateMonitorRequest):
    """Create a new listing monitor (saved search)."""
    search_id = await create_saved_search(
        keywords=req.keywords,
        filters=req.filters,
        poll_interval_sec=req.poll_interval_sec,
    )

    # The monitor engine's main loop will pick this up automatically
    search = await get_saved_search(search_id)
    return {"id": search_id, "monitor": search}


@router.get("/monitors")
async def list_monitors(active_only: bool = True):
    """List all monitors (saved searches)."""
    searches = await get_saved_searches(active_only=active_only)
    return {"monitors": searches}


@router.get("/monitors/{monitor_id}")
async def get_monitor(monitor_id: int):
    """Get a specific monitor."""
    search = await get_saved_search(monitor_id)
    if not search:
        raise HTTPException(status_code=404, detail="Monitor not found")
    return search


@router.patch("/monitors/{monitor_id}")
async def update_monitor(monitor_id: int, req: UpdateMonitorRequest):
    """Update a monitor's settings."""
    search = await get_saved_search(monitor_id)
    if not search:
        raise HTTPException(status_code=404, detail="Monitor not found")

    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if updates:
        await update_saved_search(monitor_id, **updates)

    return await get_saved_search(monitor_id)


@router.delete("/monitors/{monitor_id}")
async def remove_monitor(monitor_id: int):
    """Delete a monitor."""
    search = await get_saved_search(monitor_id)
    if not search:
        raise HTTPException(status_code=404, detail="Monitor not found")

    await delete_saved_search(monitor_id)
    return {"deleted": True, "id": monitor_id}


@router.get("/monitors/{monitor_id}/listings")
async def get_monitor_listings(monitor_id: int, limit: int = 100):
    """Get recent listings found by a specific monitor."""
    listings = await get_recent_listings(search_id=monitor_id, limit=limit)
    return {"listings": listings}
