import type { DatabaseWrapper } from './database'

const MIGRATIONS: { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS monitors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        enabled INTEGER NOT NULL DEFAULT 1,
        "group" TEXT NOT NULL DEFAULT 'Default',
        keywords_json TEXT NOT NULL DEFAULT '[]',
        searchInDesc INTEGER NOT NULL DEFAULT 0,
        priceMin REAL,
        priceMax REAL,
        condition TEXT NOT NULL DEFAULT 'Any',
        format TEXT NOT NULL DEFAULT 'BuyItNow',
        freeShippingOnly INTEGER NOT NULL DEFAULT 0,
        excludeKeywords_json TEXT NOT NULL DEFAULT '[]',
        sellerMinFeedback INTEGER NOT NULL DEFAULT 0,
        usOnly INTEGER NOT NULL DEFAULT 1,
        totalPriceMode INTEGER NOT NULL DEFAULT 0,
        allowSellers_json TEXT NOT NULL DEFAULT '[]',
        denySellers_json TEXT NOT NULL DEFAULT '[]',
        intervalSec INTEGER NOT NULL DEFAULT 60,
        viewType TEXT NOT NULL DEFAULT 'Results',
        site TEXT NOT NULL DEFAULT 'EBAY-US',
        locatedIn TEXT NOT NULL DEFAULT '',
        shipsTo TEXT NOT NULL DEFAULT '',
        categoryId TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'Idle',
        lastCheckAt TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS listings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        itemId TEXT NOT NULL UNIQUE,
        monitorId INTEGER,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        price REAL NOT NULL DEFAULT 0,
        shipping REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL DEFAULT 0,
        condition TEXT NOT NULL DEFAULT '',
        sellerName TEXT NOT NULL DEFAULT '',
        sellerFeedback INTEGER NOT NULL DEFAULT 0,
        returnsAccepted INTEGER NOT NULL DEFAULT 0,
        bestOffer INTEGER NOT NULL DEFAULT 0,
        postedAt TEXT NOT NULL DEFAULT '',
        foundAt TEXT NOT NULL DEFAULT (datetime('now')),
        images_json TEXT NOT NULL DEFAULT '[]',
        itemSpecifics_json TEXT NOT NULL DEFAULT '{}',
        raw_json TEXT NOT NULL DEFAULT '{}',
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (monitorId) REFERENCES monitors(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_listings_itemId ON listings(itemId);
      CREATE INDEX IF NOT EXISTS idx_listings_monitorId ON listings(monitorId);
      CREATE INDEX IF NOT EXISTS idx_listings_foundAt ON listings(foundAt);

      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TEXT NOT NULL DEFAULT (datetime('now')),
        level TEXT NOT NULL DEFAULT 'info',
        monitorId INTEGER,
        message TEXT NOT NULL,
        details_json TEXT NOT NULL DEFAULT '{}'
      );

      CREATE INDEX IF NOT EXISTS idx_logs_ts ON logs(ts);
      CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);

      CREATE TABLE IF NOT EXISTS app_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL DEFAULT ''
      );

      -- Schema version tracker
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
      );
    `
  }
  ,{
    version: 2,
    sql: `
      ALTER TABLE monitors ADD COLUMN categoryPath TEXT NOT NULL DEFAULT '';
      ALTER TABLE monitors ADD COLUMN includeSubcategories INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE monitors ADD COLUMN viewId TEXT NOT NULL DEFAULT '';

      ALTER TABLE listings ADD COLUMN dismissedAt TEXT;
      CREATE INDEX IF NOT EXISTS idx_listings_dismissedAt ON listings(dismissedAt);

      CREATE TABLE IF NOT EXISTS category_trees (
        treeId TEXT NOT NULL,
        marketplace TEXT NOT NULL,
        fetchedAt INTEGER NOT NULL,
        version TEXT NOT NULL DEFAULT '',
        rawJson TEXT NOT NULL DEFAULT '',
        PRIMARY KEY (treeId, marketplace)
      );

      CREATE TABLE IF NOT EXISTS categories (
        categoryId TEXT PRIMARY KEY,
        parentId TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL,
        path TEXT NOT NULL DEFAULT '',
        isLeaf INTEGER NOT NULL DEFAULT 0,
        marketplace TEXT NOT NULL DEFAULT 'EBAY_US'
      );

      CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
      CREATE INDEX IF NOT EXISTS idx_categories_path ON categories(path);

      CREATE TABLE IF NOT EXISTS recent_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        categoryId TEXT NOT NULL,
        usedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS views (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        isDefault INTEGER NOT NULL DEFAULT 0,
        scope TEXT NOT NULL DEFAULT 'global',
        filtersJson TEXT NOT NULL DEFAULT '{}',
        sortJson TEXT,
        columnsJson TEXT,
        groupFilterJson TEXT,
        monitorIdsJson TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );
    `
  }
  ,{
    version: 3,
    sql: `
      CREATE TABLE IF NOT EXISTS favorite_categories (
        categoryId TEXT PRIMARY KEY,
        starredAt INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_categories_parentId ON categories(parentId);
    `
  }
]

export function runMigrations(db: DatabaseWrapper): void {
  db.pragma('foreign_keys = ON')

  // Ensure schema_version table exists
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)`)

  const currentVersion = db.prepare('SELECT MAX(version) as v FROM schema_version').get() as { v: number | null }
  const version = currentVersion?.v ?? 0

  for (const migration of MIGRATIONS) {
    if (migration.version > version) {
      db.transaction(() => {
        db.exec(migration.sql)
        db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(migration.version)
      })()
      console.log(`[DB] Applied migration v${migration.version}`)
    }
  }
}
