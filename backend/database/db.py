import aiosqlite
import logging
from config import config

logger = logging.getLogger(__name__)

_db: aiosqlite.Connection | None = None

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS saved_searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keywords TEXT NOT NULL,
    filters TEXT DEFAULT '{}',
    poll_interval_sec INTEGER DEFAULT 30,
    active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seen_listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ebay_item_id TEXT NOT NULL,
    title TEXT NOT NULL,
    price REAL,
    currency TEXT DEFAULT 'USD',
    shipping_cost REAL DEFAULT 0,
    seller_name TEXT,
    seller_feedback TEXT,
    image_url TEXT,
    item_url TEXT,
    condition TEXT,
    search_id INTEGER,
    first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ebay_item_id),
    FOREIGN KEY (search_id) REFERENCES saved_searches(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE IF NOT EXISTS purchase_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ebay_item_id TEXT NOT NULL,
    title TEXT,
    price REAL,
    currency TEXT DEFAULT 'USD',
    item_url TEXT,
    clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_seen_ebay_item ON seen_listings(ebay_item_id);
CREATE INDEX IF NOT EXISTS idx_seen_search ON seen_listings(search_id);
CREATE INDEX IF NOT EXISTS idx_seen_first_seen ON seen_listings(first_seen_at);
"""


async def get_db() -> aiosqlite.Connection:
    global _db
    if _db is None:
        _db = await aiosqlite.connect(config.DB_PATH)
        _db.row_factory = aiosqlite.Row
    return _db


async def init_db():
    db = await get_db()
    await db.executescript(SCHEMA_SQL)
    await db.commit()
    logger.info(f"Database initialized at {config.DB_PATH}")


async def close_db():
    global _db
    if _db is not None:
        await _db.close()
        _db = None
        logger.info("Database connection closed")
