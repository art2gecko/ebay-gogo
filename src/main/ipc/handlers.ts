import { ipcMain, shell } from 'electron'
import {
  listMonitors, getMonitor, createMonitor, updateMonitor, deleteMonitor,
  getListings, getListingCount, exportListingsCsv, upsertListings,
  getLogs, clearLogs, addDenySeller, removeDenySeller, addExcludeKeyword, addLog,
  searchCategories, getRecentCategories, trackCategoryUsage, getCategoryCount,
  getTopLevelCategories, getChildrenCategories, getFavoriteCategories, toggleFavoriteCategory,
  listViews, getView, createView, updateView, deleteView, setDefaultView,
  dismissListings, dismissByView, resetDismissed, deleteListingsByScope
} from '../db/database'
import { searchListings, setCredentials, testConnection } from '../ebay/client'
import { startEngine, stopEngine, getStatus, refreshMonitors } from '../engine/engine'
import { fetchAndStoreCategoryTree } from '../ebay/taxonomy'
import { getSettings, saveSettings } from '../store'
import type { IpcChannels } from '@shared/ipc-channels'

type Handler<K extends keyof IpcChannels> = (
  event: Electron.IpcMainInvokeEvent,
  args: IpcChannels[K]['request']
) => Promise<IpcChannels[K]['response']> | IpcChannels[K]['response']

function handle<K extends keyof IpcChannels>(channel: K, handler: Handler<K>): void {
  ipcMain.handle(channel, handler as (event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => unknown)
}

export function registerIpcHandlers(): void {
  // ============================================================
  // Monitors
  // ============================================================
  handle('monitors:list', () => listMonitors())

  handle('monitors:get', (_e, id) => getMonitor(id))

  handle('monitors:create', (_e, input) => {
    const monitor = createMonitor(input)
    addLog('info', `Created monitor: ${input.keywords.join(', ')}`, monitor.id)
    refreshMonitors()
    return monitor
  })

  handle('monitors:update', (_e, input) => {
    const monitor = updateMonitor(input)
    addLog('info', `Updated monitor ${input.id}`, monitor.id)
    refreshMonitors()
    return monitor
  })

  handle('monitors:delete', (_e, id) => {
    const result = deleteMonitor(id)
    if (result) {
      addLog('info', `Deleted monitor ${id}`)
      refreshMonitors()
    }
    return result
  })

  // ============================================================
  // Listings
  // ============================================================
  handle('listings:search', async (_e, params) => {
    const results = await searchListings(params)
    return upsertListings(results).saved
  })

  handle('listings:getByMonitor', (_e, { monitorId, limit }) =>
    getListings({ monitorId, limit: limit || 200 })
  )

  handle('listings:getAll', (_e, params) => getListings(params))

  handle('listings:count', (_e, params) => getListingCount(params))

  handle('listings:exportCsv', (_e, params) => exportListingsCsv(params))

  // ============================================================
  // Engine
  // ============================================================
  handle('engine:start', () => startEngine())
  handle('engine:stop', () => stopEngine())
  handle('engine:status', () => getStatus())

  // ============================================================
  // Settings
  // ============================================================
  handle('settings:get', () => getSettings())

  handle('settings:save', (_e, partial) => {
    if (partial.credentials) {
      const hasAppId = !!partial.credentials.appId
      const hasCertId = !!partial.credentials.certId
      const hasOAuthToken = !!partial.credentials.oauthToken
      const tokenLen = partial.credentials.oauthToken?.length || 0
      addLog('info', `Saving credentials: appId=${hasAppId}, certId=${hasCertId}, oauthToken=${hasOAuthToken} (${tokenLen} chars), env=${partial.credentials.environment}`)
    }
    const settings = saveSettings(partial)
    if (partial.credentials) {
      setCredentials(partial.credentials)
    }
    return settings
  })

  handle('settings:testConnection', () => testConnection())

  // ============================================================
  // Logs
  // ============================================================
  handle('logs:get', (_e, params) => getLogs(params))
  handle('logs:clear', () => clearLogs())

  // ============================================================
  // Sellers
  // ============================================================
  handle('sellers:ignore', (_e, { sellerName, monitorId }) => addDenySeller(sellerName, monitorId))
  handle('sellers:unignore', (_e, { sellerName, monitorId }) => removeDenySeller(sellerName, monitorId))

  // ============================================================
  // One-shot search
  // ============================================================
  handle('search:run', async (_e, params) => {
    const results = await searchListings(params)
    return upsertListings(results).saved
  })

  // ============================================================
  // Exclude keywords
  // ============================================================
  handle('exclude:add', (_e, { keyword, monitorId }) => addExcludeKeyword(keyword, monitorId))

  // ============================================================
  // Test monitor (one-shot search to preview)
  // ============================================================
  handle('monitors:testSearch', async (_e, input) => {
    const params = {
      keywords: input.keywords.join(' '),
      searchInDesc: input.searchInDesc,
      priceMin: input.priceMin,
      priceMax: input.priceMax,
      condition: input.condition,
      format: input.format,
      freeShippingOnly: input.freeShippingOnly,
      categoryId: input.categoryId || undefined,
      limit: 10
    }
    const results = await searchListings(params)
    const sampleListings = results.slice(0, 3).map(r => ({
      title: r.title,
      total: r.total
    }))
    const suggestions: string[] = []
    if (results.length >= 10 && !input.categoryId) suggestions.push('Add a category to narrow results')
    if (results.length >= 10 && input.priceMin == null) suggestions.push('Set a minimum price to filter low-value items')
    if (results.length >= 10 && input.excludeKeywords.length === 0) suggestions.push('Add exclude keywords to remove irrelevant listings')
    if (results.length === 0) suggestions.push('Try broader keywords or remove filters')
    return { count: results.length, sampleListings, suggestions }
  })

  // ============================================================
  // Categories
  // ============================================================
  handle('categories:search', (_e, { query, limit }) => searchCategories(query, limit || 50))
  handle('categories:recent', () => getRecentCategories(10))
  handle('categories:trackUsage', (_e, { categoryId }) => trackCategoryUsage(categoryId))
  handle('categories:refresh', () => fetchAndStoreCategoryTree())
  handle('categories:count', () => getCategoryCount())
  handle('categories:topLevel', (_e, { marketplace }) => getTopLevelCategories(marketplace))
  handle('categories:children', (_e, { parentId, marketplace }) => getChildrenCategories(parentId, marketplace))
  handle('categories:favorites', () => getFavoriteCategories())
  handle('categories:toggleFavorite', (_e, { categoryId, isFav }) => toggleFavoriteCategory(categoryId, isFav))

  // ============================================================
  // Views
  // ============================================================
  handle('views:list', () => listViews())
  handle('views:get', (_e, id) => getView(id))
  handle('views:create', (_e, input) => createView(input))
  handle('views:update', (_e, input) => updateView(input))
  handle('views:delete', (_e, id) => deleteView(id))
  handle('views:setDefault', (_e, id) => setDefaultView(id))

  // ============================================================
  // Dismiss / Delete
  // ============================================================
  handle('listings:dismiss', (_e, { itemIds }) => dismissListings(itemIds))
  handle('listings:dismissByView', (_e, params) => dismissByView(params.monitorIds, params.groupNames))
  handle('listings:resetDismissed', (_e, params) => resetDismissed(params.monitorIds, params.groupNames))
  handle('listings:deleteByScope', (_e, params) => deleteListingsByScope(params.scope, params.monitorId, params.groupName))

  // ============================================================
  // Shell operations (not IPC channel, direct)
  // ============================================================
  ipcMain.on('shell:openExternal', (_e, url: string) => {
    shell.openExternal(url)
  })
}
