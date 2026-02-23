import asyncio
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import config
from database.db import init_db, close_db
from monitor.engine import MonitorEngine
from routes.search import router as search_router
from routes.monitor import router as monitor_router
from routes.settings import router as settings_router
from routes.purchase import router as purchase_router
from routes.ws import router as ws_router

# Shared monitor engine instance
monitor_engine = MonitorEngine()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    await monitor_engine.start()
    yield
    # Shutdown
    await monitor_engine.stop()
    await close_db()


app = FastAPI(
    title="eBay-GoGo Backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(search_router, prefix="/api")
app.include_router(monitor_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(purchase_router, prefix="/api")
app.include_router(ws_router, prefix="/api")


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}


def main():
    uvicorn.run(
        "main:app",
        host=config.BACKEND_HOST,
        port=config.BACKEND_PORT,
        reload=False,
        log_level="info",
    )


if __name__ == "__main__":
    main()
