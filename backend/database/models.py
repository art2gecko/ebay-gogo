import json
from database.db import get_db


async def create_saved_search(
    keywords: str,
    filters: dict | None = None,
    poll_interval_sec: int = 30,
) -> int:
    db = await get_db()
    cursor = await db.execute(
        "INSERT INTO saved_searches (keywords, filters, poll_interval_sec) VALUES (?, ?, ?)",
        (keywords, json.dumps(filters or {}), poll_interval_sec),
    )
    await db.commit()
    return cursor.lastrowid


async def get_saved_searches(active_only: bool = True) -> list[dict]:
    db = await get_db()
    query = "SELECT * FROM saved_searches"
    if active_only:
        query += " WHERE active = 1"
    query += " ORDER BY created_at DESC"
    cursor = await db.execute(query)
    rows = await cursor.fetchall()
    results = []
    for row in rows:
        d = dict(row)
        d["filters"] = json.loads(d["filters"]) if d["filters"] else {}
        results.append(d)
    return results


async def get_saved_search(search_id: int) -> dict | None:
    db = await get_db()
    cursor = await db.execute("SELECT * FROM saved_searches WHERE id = ?", (search_id,))
    row = await cursor.fetchone()
    if row:
        d = dict(row)
        d["filters"] = json.loads(d["filters"]) if d["filters"] else {}
        return d
    return None


async def update_saved_search(search_id: int, **kwargs) -> bool:
    db = await get_db()
    fields = []
    values = []
    for key, val in kwargs.items():
        if key == "filters":
            val = json.dumps(val)
        fields.append(f"{key} = ?")
        values.append(val)
    values.append(search_id)
    await db.execute(
        f"UPDATE saved_searches SET {', '.join(fields)} WHERE id = ?",
        values,
    )
    await db.commit()
    return True


async def delete_saved_search(search_id: int) -> bool:
    db = await get_db()
    await db.execute("DELETE FROM saved_searches WHERE id = ?", (search_id,))
    await db.commit()
    return True


async def is_listing_seen(ebay_item_id: str) -> bool:
    db = await get_db()
    cursor = await db.execute(
        "SELECT 1 FROM seen_listings WHERE ebay_item_id = ?", (ebay_item_id,)
    )
    return await cursor.fetchone() is not None


async def mark_listing_seen(
    ebay_item_id: str,
    title: str,
    price: float,
    currency: str,
    shipping_cost: float,
    seller_name: str,
    seller_feedback: str,
    image_url: str,
    item_url: str,
    condition: str,
    search_id: int | None = None,
) -> bool:
    db = await get_db()
    try:
        await db.execute(
            """INSERT OR IGNORE INTO seen_listings
            (ebay_item_id, title, price, currency, shipping_cost, seller_name,
             seller_feedback, image_url, item_url, condition, search_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                ebay_item_id, title, price, currency, shipping_cost,
                seller_name, seller_feedback, image_url, item_url,
                condition, search_id,
            ),
        )
        await db.commit()
        return True
    except Exception:
        return False


async def get_recent_listings(
    search_id: int | None = None, limit: int = 100
) -> list[dict]:
    db = await get_db()
    query = "SELECT * FROM seen_listings"
    params: list = []
    if search_id is not None:
        query += " WHERE search_id = ?"
        params.append(search_id)
    query += " ORDER BY first_seen_at DESC LIMIT ?"
    params.append(limit)
    cursor = await db.execute(query, params)
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]


async def get_setting(key: str) -> str | None:
    db = await get_db()
    cursor = await db.execute("SELECT value FROM settings WHERE key = ?", (key,))
    row = await cursor.fetchone()
    return row["value"] if row else None


async def set_setting(key: str, value: str):
    db = await get_db()
    await db.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        (key, value),
    )
    await db.commit()


async def get_all_settings() -> dict:
    db = await get_db()
    cursor = await db.execute("SELECT key, value FROM settings")
    rows = await cursor.fetchall()
    return {row["key"]: row["value"] for row in rows}


async def log_purchase(
    ebay_item_id: str, title: str, price: float, currency: str, item_url: str
):
    db = await get_db()
    await db.execute(
        """INSERT INTO purchase_log (ebay_item_id, title, price, currency, item_url)
        VALUES (?, ?, ?, ?, ?)""",
        (ebay_item_id, title, price, currency, item_url),
    )
    await db.commit()


async def get_purchase_history(limit: int = 50) -> list[dict]:
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM purchase_log ORDER BY clicked_at DESC LIMIT ?", (limit,)
    )
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]
