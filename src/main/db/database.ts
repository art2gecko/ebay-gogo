import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import { runMigrations } from './migrations'
import type {
  Monitor, MonitorCreateInput, MonitorUpdateInput,
  Listing, LogEntry, SearchParams
} from '@shared/types'

let db: Database.Database

export function initDatabase(): Database.Database {
  const dbPath = path.join(app.getPath('userData'), 'ebay-gogo.db')
  db = new Database(dbPath)
  runMigrations(db)
  console.log(`[DB] Initialized at ${dbPath}`)
  return db
}

export function getDb(): Database.Database {
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
      categoryId, status, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Idle', ?, ?)
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
      locatedIn = ?, shipsTo = ?, categoryId = ?, updatedAt = ?
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
}): Listing[] {
  let sql = 'SELECT * FROM listings WHERE 1=1'
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
