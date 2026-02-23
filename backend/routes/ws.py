import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])


def _get_monitor_engine():
    """Lazy import to avoid circular dependency."""
    from main import monitor_engine
    return monitor_engine


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time listing updates.

    Clients connect here to receive:
    - new_listing: A new listing was found by a monitor
    - monitor_status: Status update from a monitor poll cycle
    - monitor_error: Error from a monitor
    - rate_limit: Daily API call limit reached
    """
    await websocket.accept()
    engine = _get_monitor_engine()
    engine.register_ws(websocket)
    logger.info("WebSocket client connected")

    try:
        # Keep the connection alive and handle incoming messages
        while True:
            data = await websocket.receive_text()
            # Clients can send ping/pong or commands
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        engine.unregister_ws(websocket)
        logger.info("WebSocket client disconnected")
    except Exception as e:
        engine.unregister_ws(websocket)
        logger.error(f"WebSocket error: {e}")
