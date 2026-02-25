import { ipcMain, shell } from 'electron'
import {
  listMonitors, getMonitor, createMonitor, updateMonitor, deleteMonitor,
  getListings, getListingCount, exportListingsCsv, upsertListings,
  getLogs, clearLogs, addDenySeller, removeDenySeller, addExcludeKeyword, addLog
} from '../db/database'
import { searchListings, setCredentials, testConnection } from '../ebay/client'
import { startEngine, stopEngine, getStatus, refreshMonitors } from '../engine/engine'
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
  // Shell operations (not IPC channel, direct)
  // ============================================================
  ipcMain.on('shell:openExternal', (_e, url: string) => {
    shell.openExternal(url)
  })
}
