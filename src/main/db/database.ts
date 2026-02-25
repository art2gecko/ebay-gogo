import initSqlJs from 'sql.js'
import type { Database as SqlJsDatabase } from 'sql.js'
import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { runMigrations } from './migrations'
import type {
  Monitor, MonitorCreateInput, MonitorUpdateInput,
  Listing, LogEntry, EbayCategory, CategorySearchResult, RecentCategory,
  View, ViewCreateInput, ViewUpdateInput
} from '@shared/types'

// ============================================================
// SQL.js Wrapper (provides better-sqlite3-compatible API)
// ============================================================

interface RunResult {
  changes: number
  lastInsertRowid: number
}

interface PreparedStatement {
  run(...params: unknown[]): RunResult
  get(...params: unknown[]): unknown
  all(...params: unknown[]): unknown[]
}

export class DatabaseWrapper {
  private sqlDb: SqlJsDatabase
  private dbPath: string
  private saveTimer: ReturnType<typeof setTimeout> | null = null

  constructor(sqlDb: SqlJsDatabase, dbPath: string) {
    this.sqlDb = sqlDb
    this.dbPath = dbPath
  }

  prepare(sql: string): PreparedStatement {
    const self = this
    return {
      run(...params: unknown[]): RunResult {
        if (params.length > 0) {
          self.sqlDb.run(sql, params as any[])
        } else {
          self.sqlDb.run(sql)
        }
        const changes = self.sqlDb.getRowsModified()
        const result = self.sqlDb.exec('SELECT last_insert_rowid() as id')
        const lastInsertRowid = result.length > 0 ? Number(result[0].values[0][0]) : 0
        self.scheduleSave()
        return { changes, lastInsertRowid }
      },
      get(...params: unknown[]): unknown {
        const stmt = self.sqlDb.prepare(sql)
        try {
          if (params.length > 0) stmt.bind(params as any[])
          if (stmt.step()) {
            return stmt.getAsObject()
          }
          return undefined
        } finally {
          stmt.free()
        }
      },
      all(...params: unknown[]): unknown[] {
        const stmt = self.sqlDb.prepare(sql)
        try {
          if (params.length > 0) stmt.bind(params as any[])
          const rows: unknown[] = []
          while (stmt.step()) {
            rows.push(stmt.getAsObject())
          }
          return rows
        } finally {
          stmt.free()
        }
      }
    }
  }

  exec(sql: string): this {
    this.sqlDb.exec(sql)
    this.scheduleSave()
    return this
  }

  pragma(pragma: string): unknown {
    const results = this.sqlDb.exec(`PRAGMA ${pragma}`)
    if (results.length > 0 && results[0].values.length > 0) {
      return results[0].values[0][0]
    }
    return undefined
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transaction<F extends (...args: any[]) => any>(fn: F): (...args: Parameters<F>) => ReturnType<F> {
    return ((...args: Parameters<F>) => {
      this.sqlDb.run('BEGIN TRANSACTION')
      try {
        const result = fn(...args)
        this.sqlDb.run('COMMIT')
        this.scheduleSave()
        return result
      } catch (e) {
        this.sqlDb.run('ROLLBACK')
        throw e
      }
    }) as (...args: Parameters<F>) => ReturnType<F>
  }

  close(): void {
    this.saveNow()
    this.sqlDb.close()
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => this.saveNow(), 100)
  }

  saveNow(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    try {
      const data = this.sqlDb.export()
      fs.writeFileSync(this.dbPath, Buffer.from(data))
    } catch (e) {
      console.error('[DB] Failed to save database:', e)
    }
  }
}

// ============================================================
// Database initialization
// ============================================================

let db: DatabaseWrapper

export async function initDatabase(): Promise<DatabaseWrapper> {
  // Load the WASM binary ourselves to avoid path resolution issues in packaged apps
  const sqlJsMain = require.resolve('sql.js')
  const wasmPath = path.join(path.dirname(sqlJsMain), 'sql-wasm.wasm')
  const wasmBinary = fs.readFileSync(wasmPath)

  const SQL = await initSqlJs({ wasmBinary })
  const dbPath = path.join(app.getPath('userData'), 'ebay-gogo.db')

  let sqlDb: SqlJsDatabase
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath)
    sqlDb = new SQL.Database(buffer)
  } else {
    sqlDb = new SQL.Database()
  }

  db = new DatabaseWrapper(sqlDb, dbPath)
  runMigrations(db)
  console.log(`[DB] Initialized at ${dbPath}`)
  return db
}

export function getDb(): DatabaseWrapper {
  if (!db) throw new Error('Database not initialized')
  return db
}

// ============================================================
// Monitor CRUD
// ============================================================

function rowToMonitor(row: Record<string, unknown>): Monitor {
  return {
    id: row.id as number,
    enabled: !!(row.enabled as number),
    group: row.group as string,
    keywords: JSON.parse(row.keywords_json as string),
    searchInDesc: !!(row.searchInDesc as number),
    priceMin: row.priceMin as number | null,
    priceMax: row.priceMax as number | null,
    condition: row.condition as string,
    format: row.format as Monitor['format'],
    freeShippingOnly: !!(row.freeShippingOnly as number),
    excludeKeywords: JSON.parse(row.excludeKeywords_json as string),
    sellerMinFeedback: row.sellerMinFeedback as number,
    usOnly: !!(row.usOnly as number),
    totalPriceMode: !!(row.totalPriceMode as number),
    allowSellers: JSON.parse(row.allowSellers_json as string),
    denySellers: JSON.parse(row.denySellers_json as string),
    intervalSec: row.intervalSec as number,
    viewType: row.viewType as Monitor['viewType'],
    site: row.site as string,
    locatedIn: row.locatedIn as string,
    shipsTo: row.shipsTo as string,
    categoryId: row.categoryId as string,
    categoryPath: (row.categoryPath as string) || '',
    includeSubcategories: !!(row.includeSubcategories as number),
    viewId: (row.viewId as string) || '',
    status: row.status as Monitor['status'],
    lastCheckAt: row.lastCheckAt as string | null,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string
  }
}

export function listMonitors(): Monitor[] {
  const rows = getDb().prepare('SELECT * FROM monitors ORDER BY id').all() as Record<string, unknown>[]
  return rows.map(rowToMonitor)
}

export function getMonitor(id: number): Monitor | null {
  const row = getDb().prepare('SELECT * FROM monitors WHERE id = ?').get(id) as Record<string, unknown> | undefined
  return row ? rowToMonitor(row) : null
}

export function createMonitor(input: MonitorCreateInput): Monitor {
  const now = new Date().toISOString()
  const stmt = getDb().prepare(`
    INSERT INTO monitors (
      enabled, "group", keywords_json, searchInDesc, priceMin, priceMax,
      condition, format, freeShippingOnly, excludeKeywords_json,
      sellerMinFeedback, usOnly, totalPriceMode, allowSellers_json,
      denySellers_json, intervalSec, viewType, site, locatedIn, shipsTo,
      categoryId, categoryPath, includeSubcategories, viewId, status, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Idle', ?, ?)
  `)
  const result = stmt.run(
    input.enabled ? 1 : 0,
    input.group,
    JSON.stringify(input.keywords),
    input.searchInDesc ? 1 : 0,
    input.priceMin,
    input.priceMax,
    input.condition,
    input.format,
    input.freeShippingOnly ? 1 : 0,
    JSON.stringify(input.excludeKeywords),
    input.sellerMinFeedback,
    input.usOnly ? 1 : 0,
    input.totalPriceMode ? 1 : 0,
    JSON.stringify(input.allowSellers),
    JSON.stringify(input.denySellers),
    input.intervalSec,
    input.viewType,
    input.site,
    input.locatedIn,
    input.shipsTo,
    input.categoryId,
    input.categoryPath || '',
    input.includeSubcategories ? 1 : 0,
    input.viewId || '',
    now,
    now
  )
  return getMonitor(result.lastInsertRowid as number)!
}

export function updateMonitor(input: MonitorUpdateInput): Monitor {
  const existing = getMonitor(input.id)
  if (!existing) throw new Error(`Monitor ${input.id} not found`)

  const merged = { ...existing, ...input }
  const now = new Date().toISOString()

  getDb().prepare(`
    UPDATE monitors SET
      enabled = ?, "group" = ?, keywords_json = ?, searchInDesc = ?,
      priceMin = ?, priceMax = ?, condition = ?, format = ?,
      freeShippingOnly = ?, excludeKeywords_json = ?, sellerMinFeedback = ?,
      usOnly = ?, totalPriceMode = ?, allowSellers_json = ?,
      denySellers_json = ?, intervalSec = ?, viewType = ?, site = ?,
      locatedIn = ?, shipsTo = ?, categoryId = ?, categoryPath = ?,
      includeSubcategories = ?, viewId = ?, updatedAt = ?
    WHERE id = ?
  `).run(
    merged.enabled ? 1 : 0,
    merged.group,
    JSON.stringify(merged.keywords),
    merged.searchInDesc ? 1 : 0,
    merged.priceMin,
    merged.priceMax,
    merged.condition,
    merged.format,
    merged.freeShippingOnly ? 1 : 0,
    JSON.stringify(merged.excludeKeywords),
    merged.sellerMinFeedback,
    merged.usOnly ? 1 : 0,
    merged.totalPriceMode ? 1 : 0,
    JSON.stringify(merged.allowSellers),
    JSON.stringify(merged.denySellers),
    merged.intervalSec,
    merged.viewType,
    merged.site,
    merged.locatedIn,
    merged.shipsTo,
    merged.categoryId,
    merged.categoryPath || '',
    merged.includeSubcategories ? 1 : 0,
    merged.viewId || '',
    now,
    input.id
  )
  return getMonitor(input.id)!
}

export function deleteMonitor(id: number): boolean {
  const result = getDb().prepare('DELETE FROM monitors WHERE id = ?').run(id)
  return result.changes > 0
}

export function updateMonitorStatus(id: number, status: Monitor['status'], lastCheckAt?: string): void {
  const now = lastCheckAt || new Date().toISOString()
  getDb().prepare('UPDATE monitors SET status = ?, lastCheckAt = ?, updatedAt = ? WHERE id = ?')
    .run(status, now, new Date().toISOString(), id)
}

// ============================================================
// Listing CRUD
// ============================================================

function rowToListing(row: Record<string, unknown>): Listing {
  return {
    id: row.id as number,
    itemId: row.itemId as string,
    monitorId: row.monitorId as number | null,
    title: row.title as string,
    url: row.url as string,
    price: row.price as number,
    shipping: row.shipping as number,
    total: row.total as number,
    condition: row.condition as string,
    sellerName: row.sellerName as string,
    sellerFeedback: row.sellerFeedback as number,
    returnsAccepted: !!(row.returnsAccepted as number),
    bestOffer: !!(row.bestOffer as number),
    postedAt: row.postedAt as string,
    foundAt: row.foundAt as string,
    images: JSON.parse(row.images_json as string),
    itemSpecifics: JSON.parse(row.itemSpecifics_json as string),
    rawJson: row.raw_json as string,
    dismissedAt: (row.dismissedAt as string) || null,
    createdAt: row.createdAt as string
  }
}

/** Returns { listing, isNew } so callers know if this was an insert */
export function upsertListing(listing: Omit<Listing, 'id' | 'createdAt'>): { listing: Listing; isNew: boolean } {
  const existing = getDb().prepare('SELECT id FROM listings WHERE itemId = ?').get(listing.itemId) as { id: number } | undefined

  if (existing) {
    return {
      listing: rowToListing(
        getDb().prepare('SELECT * FROM listings WHERE id = ?').get(existing.id) as Record<string, unknown>
      ),
      isNew: false
    }
  }

  const result = getDb().prepare(`
    INSERT INTO listings (
      itemId, monitorId, title, url, price, shipping, total, condition,
      sellerName, sellerFeedback, returnsAccepted, bestOffer, postedAt,
      foundAt, images_json, itemSpecifics_json, raw_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    listing.itemId,
    listing.monitorId,
    listing.title,
    listing.url,
    listing.price,
    listing.shipping,
    listing.total,
    listing.condition,
    listing.sellerName,
    listing.sellerFeedback,
    listing.returnsAccepted ? 1 : 0,
    listing.bestOffer ? 1 : 0,
    listing.postedAt,
    listing.foundAt,
    JSON.stringify(listing.images),
    JSON.stringify(listing.itemSpecifics),
    listing.rawJson
  )

  return {
    listing: rowToListing(
      getDb().prepare('SELECT * FROM listings WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>
    ),
    isNew: true
  }
}

export function upsertListings(listings: Omit<Listing, 'id' | 'createdAt'>[]): { saved: Listing[]; newCount: number } {
  const saved: Listing[] = []
  let newCount = 0
  const insertMany = getDb().transaction((items: Omit<Listing, 'id' | 'createdAt'>[]) => {
    for (const item of items) {
      const result = upsertListing(item)
      saved.push(result.listing)
      if (result.isNew) newCount++
    }
  })
  insertMany(listings)
  return { saved, newCount }
}

export function getListings(params: {
  limit?: number
  offset?: number
  monitorId?: number
  dateFrom?: string
  dateTo?: string
  includeDismissed?: boolean
}): Listing[] {
  let sql = 'SELECT * FROM listings WHERE 1=1'
  const args: unknown[] = []

  if (!params.includeDismissed) {
    sql += ' AND dismissedAt IS NULL'
  }
  if (params.monitorId) {
    sql += ' AND monitorId = ?'
    args.push(params.monitorId)
  }
  if (params.dateFrom) {
    sql += ' AND foundAt >= ?'
    args.push(params.dateFrom)
  }
  if (params.dateTo) {
    sql += ' AND foundAt <= ?'
    args.push(params.dateTo)
  }

  sql += ' ORDER BY foundAt DESC'

  if (params.limit) {
    sql += ' LIMIT ?'
    args.push(params.limit)
  }
  if (params.offset) {
    sql += ' OFFSET ?'
    args.push(params.offset)
  }

  const rows = getDb().prepare(sql).all(...args) as Record<string, unknown>[]
  return rows.map(rowToListing)
}

export function getListingCount(params: {
  monitorId?: number
  dateFrom?: string
  dateTo?: string
}): number {
  let sql = 'SELECT COUNT(*) as count FROM listings WHERE 1=1'
  const args: unknown[] = []

  if (params.monitorId) {
    sql += ' AND monitorId = ?'
    args.push(params.monitorId)
  }
  if (params.dateFrom) {
    sql += ' AND foundAt >= ?'
    args.push(params.dateFrom)
  }
  if (params.dateTo) {
    sql += ' AND foundAt <= ?'
    args.push(params.dateTo)
  }

  const row = getDb().prepare(sql).get(...args) as { count: number }
  return row.count
}

export function exportListingsCsv(params: {
  monitorId?: number
  dateFrom?: string
  dateTo?: string
}): string {
  const listings = getListings({ ...params, limit: 10000 })
  const headers = [
    'Item ID', 'Title', 'URL', 'Price', 'Shipping', 'Total',
    'Condition', 'Seller', 'Feedback', 'Returns', 'Best Offer',
    'Posted', 'Found', 'Monitor ID'
  ]

  const rows = listings.map(l => [
    l.itemId, `"${l.title.replace(/"/g, '""')}"`, l.url,
    l.price, l.shipping, l.total, l.condition,
    l.sellerName, l.sellerFeedback, l.returnsAccepted, l.bestOffer,
    l.postedAt, l.foundAt, l.monitorId ?? ''
  ])

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
}

// ============================================================
// Logs
// ============================================================

export function addLog(
  level: LogEntry['level'],
  message: string,
  monitorId?: number | null,
  details?: Record<string, unknown>
): void {
  getDb().prepare(`
    INSERT INTO logs (level, monitorId, message, details_json)
    VALUES (?, ?, ?, ?)
  `).run(level, monitorId ?? null, message, JSON.stringify(details || {}))
}

export function getLogs(params: {
  limit?: number
  level?: string
  monitorId?: number
}): LogEntry[] {
  let sql = 'SELECT * FROM logs WHERE 1=1'
  const args: unknown[] = []

  if (params.level) {
    sql += ' AND level = ?'
    args.push(params.level)
  }
  if (params.monitorId) {
    sql += ' AND monitorId = ?'
    args.push(params.monitorId)
  }

  sql += ' ORDER BY ts DESC'
  sql += ' LIMIT ?'
  args.push(params.limit || 200)

  const rows = getDb().prepare(sql).all(...args) as Record<string, unknown>[]
  return rows.map(row => ({
    id: row.id as number,
    ts: row.ts as string,
    level: row.level as LogEntry['level'],
    monitorId: row.monitorId as number | null,
    message: row.message as string,
    details: JSON.parse(row.details_json as string)
  }))
}

export function clearLogs(): boolean {
  getDb().prepare('DELETE FROM logs').run()
  return true
}

// ============================================================
// App State
// ============================================================

export function getAppState(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM app_state WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setAppState(key: string, value: string): void {
  getDb().prepare('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)').run(key, value)
}

// ============================================================
// Seller operations
// ============================================================

export function addDenySeller(sellerName: string, monitorId?: number): boolean {
  if (monitorId) {
    const monitor = getMonitor(monitorId)
    if (!monitor) return false
    if (!monitor.denySellers.includes(sellerName)) {
      const updated = [...monitor.denySellers, sellerName]
      getDb().prepare('UPDATE monitors SET denySellers_json = ? WHERE id = ?')
        .run(JSON.stringify(updated), monitorId)
    }
  } else {
    // Add to all monitors
    const monitors = listMonitors()
    for (const m of monitors) {
      if (!m.denySellers.includes(sellerName)) {
        const updated = [...m.denySellers, sellerName]
        getDb().prepare('UPDATE monitors SET denySellers_json = ? WHERE id = ?')
          .run(JSON.stringify(updated), m.id)
      }
    }
  }
  return true
}

export function removeDenySeller(sellerName: string, monitorId?: number): boolean {
  if (monitorId) {
    const monitor = getMonitor(monitorId)
    if (!monitor) return false
    const updated = monitor.denySellers.filter(s => s !== sellerName)
    getDb().prepare('UPDATE monitors SET denySellers_json = ? WHERE id = ?')
      .run(JSON.stringify(updated), monitorId)
  } else {
    const monitors = listMonitors()
    for (const m of monitors) {
      const updated = m.denySellers.filter(s => s !== sellerName)
      getDb().prepare('UPDATE monitors SET denySellers_json = ? WHERE id = ?')
        .run(JSON.stringify(updated), m.id)
    }
  }
  return true
}

export function addExcludeKeyword(keyword: string, monitorId?: number): boolean {
  if (monitorId) {
    const monitor = getMonitor(monitorId)
    if (!monitor) return false
    if (!monitor.excludeKeywords.includes(keyword)) {
      const updated = [...monitor.excludeKeywords, keyword]
      getDb().prepare('UPDATE monitors SET excludeKeywords_json = ? WHERE id = ?')
        .run(JSON.stringify(updated), monitorId)
    }
  } else {
    const monitors = listMonitors()
    for (const m of monitors) {
      if (!m.excludeKeywords.includes(keyword)) {
        const updated = [...m.excludeKeywords, keyword]
        getDb().prepare('UPDATE monitors SET excludeKeywords_json = ? WHERE id = ?')
          .run(JSON.stringify(updated), m.id)
      }
    }
  }
  return true
}

// ============================================================
// Category Operations
// ============================================================

export function getCategoryCount(): number {
  const row = getDb().prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number }
  return row.count
}

export function upsertCategories(categories: EbayCategory[]): void {
  const insert = getDb().transaction((cats: EbayCategory[]) => {
    for (const cat of cats) {
      getDb().prepare(`
        INSERT OR REPLACE INTO categories (categoryId, parentId, name, path, isLeaf, marketplace)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(cat.categoryId, cat.parentId, cat.name, cat.path, cat.isLeaf ? 1 : 0, cat.marketplace)
    }
  })
  insert(categories)
}

export function searchCategories(query: string, limit: number = 50): CategorySearchResult[] {
  const trimmed = query.trim()
  if (!trimmed) return []

  // If query is a number, search by categoryId first
  const isNumeric = /^\d+$/.test(trimmed)

  if (isNumeric) {
    const exact = getDb().prepare(
      'SELECT categoryId, name, path, isLeaf FROM categories WHERE categoryId = ?'
    ).get(trimmed) as Record<string, unknown> | undefined

    if (exact) {
      return [{
        categoryId: exact.categoryId as string,
        name: exact.name as string,
        path: exact.path as string,
        isLeaf: !!(exact.isLeaf as number)
      }]
    }
  }

  // Search by name: exact > prefix > contains
  const lowerQuery = trimmed.toLowerCase()
  const rows = getDb().prepare(`
    SELECT categoryId, name, path, isLeaf,
      CASE
        WHEN LOWER(name) = ? THEN 0
        WHEN LOWER(name) LIKE ? THEN 1
        WHEN LOWER(name) LIKE ? THEN 2
        WHEN LOWER(path) LIKE ? THEN 3
        ELSE 4
      END as rank
    FROM categories
    WHERE LOWER(name) LIKE ? OR LOWER(path) LIKE ? OR categoryId LIKE ?
    ORDER BY rank ASC, LENGTH(name) ASC
    LIMIT ?
  `).all(
    lowerQuery,
    lowerQuery + '%',
    '%' + lowerQuery + '%',
    '%' + lowerQuery + '%',
    '%' + lowerQuery + '%',
    '%' + lowerQuery + '%',
    trimmed + '%',
    limit
  ) as Record<string, unknown>[]

  return rows.map(r => ({
    categoryId: r.categoryId as string,
    name: r.name as string,
    path: r.path as string,
    isLeaf: !!(r.isLeaf as number)
  }))
}

export function getRecentCategories(limit: number = 10): RecentCategory[] {
  const rows = getDb().prepare(`
    SELECT rc.id, rc.categoryId, c.name, c.path, rc.usedAt
    FROM recent_categories rc
    LEFT JOIN categories c ON rc.categoryId = c.categoryId
    ORDER BY rc.usedAt DESC
    LIMIT ?
  `).all(limit) as Record<string, unknown>[]

  return rows.map(r => ({
    id: r.id as number,
    categoryId: r.categoryId as string,
    name: (r.name as string) || 'Unknown',
    path: (r.path as string) || '',
    usedAt: r.usedAt as number
  }))
}

export function trackCategoryUsage(categoryId: string): boolean {
  // Remove old entry if exists, keep only last 10
  getDb().prepare('DELETE FROM recent_categories WHERE categoryId = ?').run(categoryId)
  getDb().prepare('INSERT INTO recent_categories (categoryId, usedAt) VALUES (?, ?)').run(categoryId, Date.now())
  // Trim to 10
  getDb().prepare(`
    DELETE FROM recent_categories WHERE id NOT IN (
      SELECT id FROM recent_categories ORDER BY usedAt DESC LIMIT 10
    )
  `).run()
  return true
}

export function saveCategoryTree(treeId: string, marketplace: string, version: string, rawJson: string): void {
  getDb().prepare(`
    INSERT OR REPLACE INTO category_trees (treeId, marketplace, fetchedAt, version, rawJson)
    VALUES (?, ?, ?, ?, ?)
  `).run(treeId, marketplace, Date.now(), version, rawJson)
}

// ============================================================
// View Operations
// ============================================================

function rowToView(row: Record<string, unknown>): View {
  return {
    id: row.id as string,
    name: row.name as string,
    isDefault: !!(row.isDefault as number),
    scope: (row.scope as string) as View['scope'],
    filters: JSON.parse((row.filtersJson as string) || '{}'),
    sort: row.sortJson ? JSON.parse(row.sortJson as string) : null,
    columns: row.columnsJson ? JSON.parse(row.columnsJson as string) : null,
    groupFilter: row.groupFilterJson ? JSON.parse(row.groupFilterJson as string) : null,
    monitorIds: row.monitorIdsJson ? JSON.parse(row.monitorIdsJson as string) : null,
    createdAt: row.createdAt as number,
    updatedAt: row.updatedAt as number
  }
}

export function listViews(): View[] {
  const rows = getDb().prepare('SELECT * FROM views ORDER BY name').all() as Record<string, unknown>[]
  return rows.map(rowToView)
}

export function getView(id: string): View | null {
  const row = getDb().prepare('SELECT * FROM views WHERE id = ?').get(id) as Record<string, unknown> | undefined
  return row ? rowToView(row) : null
}

export function createView(input: ViewCreateInput): View {
  const now = Date.now()
  getDb().prepare(`
    INSERT INTO views (id, name, isDefault, scope, filtersJson, sortJson, columnsJson, groupFilterJson, monitorIdsJson, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.id,
    input.name,
    input.isDefault ? 1 : 0,
    input.scope,
    JSON.stringify(input.filters),
    input.sort ? JSON.stringify(input.sort) : null,
    input.columns ? JSON.stringify(input.columns) : null,
    input.groupFilter ? JSON.stringify(input.groupFilter) : null,
    input.monitorIds ? JSON.stringify(input.monitorIds) : null,
    now,
    now
  )
  return getView(input.id)!
}

export function updateView(input: ViewUpdateInput): View {
  const existing = getView(input.id)
  if (!existing) throw new Error(`View ${input.id} not found`)

  const now = Date.now()
  const merged = { ...existing, ...input }

  getDb().prepare(`
    UPDATE views SET
      name = ?, isDefault = ?, scope = ?, filtersJson = ?,
      sortJson = ?, columnsJson = ?, groupFilterJson = ?,
      monitorIdsJson = ?, updatedAt = ?
    WHERE id = ?
  `).run(
    merged.name,
    merged.isDefault ? 1 : 0,
    merged.scope,
    JSON.stringify(merged.filters),
    merged.sort ? JSON.stringify(merged.sort) : null,
    merged.columns ? JSON.stringify(merged.columns) : null,
    merged.groupFilter ? JSON.stringify(merged.groupFilter) : null,
    merged.monitorIds ? JSON.stringify(merged.monitorIds) : null,
    now,
    input.id
  )
  return getView(input.id)!
}

export function deleteView(id: string): boolean {
  const result = getDb().prepare('DELETE FROM views WHERE id = ?').run(id)
  return result.changes > 0
}

export function setDefaultView(id: string): boolean {
  getDb().prepare('UPDATE views SET isDefault = 0 WHERE isDefault = 1').run()
  const result = getDb().prepare('UPDATE views SET isDefault = 1 WHERE id = ?').run(id)
  return result.changes > 0
}

// ============================================================
// Dismiss / Delete Operations
// ============================================================

export function dismissListings(itemIds: string[]): number {
  const now = new Date().toISOString()
  let count = 0
  const dismiss = getDb().transaction((ids: string[]) => {
    for (const itemId of ids) {
      const result = getDb().prepare('UPDATE listings SET dismissedAt = ? WHERE itemId = ? AND dismissedAt IS NULL').run(now, itemId)
      count += result.changes
    }
  })
  dismiss(itemIds)
  return count
}

export function dismissByView(monitorIds?: number[], groupNames?: string[]): number {
  const now = new Date().toISOString()
  if (monitorIds && monitorIds.length > 0) {
    let count = 0
    for (const mid of monitorIds) {
      const result = getDb().prepare('UPDATE listings SET dismissedAt = ? WHERE monitorId = ? AND dismissedAt IS NULL').run(now, mid)
      count += result.changes
    }
    return count
  }
  if (groupNames && groupNames.length > 0) {
    const monitors = listMonitors().filter(m => groupNames.includes(m.group))
    let count = 0
    for (const m of monitors) {
      const result = getDb().prepare('UPDATE listings SET dismissedAt = ? WHERE monitorId = ? AND dismissedAt IS NULL').run(now, m.id)
      count += result.changes
    }
    return count
  }
  // Dismiss all
  const result = getDb().prepare('UPDATE listings SET dismissedAt = ? WHERE dismissedAt IS NULL').run(now)
  return result.changes
}

export function resetDismissed(monitorIds?: number[], groupNames?: string[]): number {
  if (monitorIds && monitorIds.length > 0) {
    let count = 0
    for (const mid of monitorIds) {
      const result = getDb().prepare('UPDATE listings SET dismissedAt = NULL WHERE monitorId = ? AND dismissedAt IS NOT NULL').run(mid)
      count += result.changes
    }
    return count
  }
  if (groupNames && groupNames.length > 0) {
    const monitors = listMonitors().filter(m => groupNames.includes(m.group))
    let count = 0
    for (const m of monitors) {
      const result = getDb().prepare('UPDATE listings SET dismissedAt = NULL WHERE monitorId = ? AND dismissedAt IS NOT NULL').run(m.id)
      count += result.changes
    }
    return count
  }
  // Reset all
  const result = getDb().prepare('UPDATE listings SET dismissedAt = NULL WHERE dismissedAt IS NOT NULL').run()
  return result.changes
}

export function deleteListingsByScope(scope: string, monitorId?: number, groupName?: string): number {
  if (scope === 'monitor' && monitorId) {
    const result = getDb().prepare('DELETE FROM listings WHERE monitorId = ?').run(monitorId)
    return result.changes
  }
  if (scope === 'group' && groupName) {
    const monitors = listMonitors().filter(m => m.group === groupName)
    let count = 0
    for (const m of monitors) {
      const result = getDb().prepare('DELETE FROM listings WHERE monitorId = ?').run(m.id)
      count += result.changes
    }
    return count
  }
  if (scope === 'all') {
    const result = getDb().prepare('DELETE FROM listings').run()
    return result.changes
  }
  return 0
}
