from fastapi import APIRouter
from pydantic import BaseModel
from database.models import get_all_settings, set_setting

router = APIRouter(tags=["settings"])


class UpdateSettingsRequest(BaseModel):
    settings: dict[str, str]


@router.get("/settings")
async def get_settings():
    """Get all app settings."""
    settings = await get_all_settings()
    # Mask sensitive values
    masked = {}
    sensitive_keys = {"ebay_client_secret", "telegram_bot_token"}
    for k, v in settings.items():
        if k in sensitive_keys and v:
            masked[k] = v[:4] + "****" + v[-4:] if len(v) > 8 else "****"
        else:
            masked[k] = v
    return {"settings": masked}


@router.put("/settings")
async def update_settings(req: UpdateSettingsRequest):
    """Update app settings."""
    for key, value in req.settings.items():
        await set_setting(key, value)
    return {"updated": True, "keys": list(req.settings.keys())}
