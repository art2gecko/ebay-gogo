import { BrowserWindow } from 'electron'
import {
  listMonitors, updateMonitorStatus, upsertListings, addLog
} from '../db/database'
import { searchListings, isMockMode, getApiCallsToday } from '../ebay/client'
import type { Monitor, Listing, EngineStatus, SearchParams } from '@shared/types'

const MAX_CONCURRENCY = 3
const API_CALL_LIMIT = 5000

let running = false
let timers: Map<number, NodeJS.Timeout> = new Map()
let activeTasks = 0
let mainWindow: BrowserWindow | null = null

export function setMainWindow(win: BrowserWindow): void {
  mainWindow = win
}

function sendToRenderer(channel: string, data: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
}

function monitorToSearchParams(monitor: Monitor): SearchParams {
  return {
    keywords: monitor.keywords.join(' '),
    searchInDesc: monitor.searchInDesc,
    priceMin: monitor.priceMin,
    priceMax: monitor.priceMax,
    condition: monitor.condition,
    format: monitor.format,
    freeShippingOnly: monitor.freeShippingOnly,
    excludeKeywords: monitor.excludeKeywords,
    sellerMinFeedback: monitor.sellerMinFeedback,
    usOnly: monitor.usOnly,
    totalPriceMode: monitor.totalPriceMode,
    categoryId: monitor.categoryId,
    sortBy: monitor.viewType === 'AuctionEnding' ? 'EndingSoon' : 'NewlyListed',
    limit: 50
  }
}

async function runMonitorCheck(monitor: Monitor): Promise<void> {
  if (!running) return

  // Check API quota
  if (getApiCallsToday() >= API_CALL_LIMIT && !isMockMode()) {
    addLog('warn', `API call limit reached (${API_CALL_LIMIT})`, monitor.id)
    updateMonitorStatus(monitor.id, 'RateLimited')
    sendToRenderer('monitor:updated', { ...monitor, status: 'RateLimited' })
    return
  }

  try {
    activeTasks++
    const params = monitorToSearchParams(monitor)
    const rawListings = await searchListings(params)

    // Filter by deny list
    const filtered = rawListings.filter(l => {
      if (monitor.denySellers.includes(l.sellerName)) return false
      if (monitor.sellerMinFeedback > 0 && l.sellerFeedback < monitor.sellerMinFeedback) return false
      if (monitor.excludeKeywords.length > 0) {
        const titleLower = l.title.toLowerCase()
        for (const kw of monitor.excludeKeywords) {
          if (titleLower.includes(kw.toLowerCase())) return false
        }
      }
      if (monitor.allowSellers.length > 0 && !monitor.allowSellers.includes(l.sellerName)) return false
      return true
    })

    // Set monitorId on each listing
    const withMonitorId = filtered.map(l => ({ ...l, monitorId: monitor.id }))

    // Upsert to DB
    const saved = upsertListings(withMonitorId)

    // Find truly new listings (just inserted)
    const newListings = saved.filter(s => {
      const foundTime = new Date(s.foundAt).getTime()
      const now = Date.now()
      return now - foundTime < 5000 // within 5 seconds = new
    })

    if (newListings.length > 0) {
      addLog('info', `Found ${newListings.length} new listing(s) for "${monitor.keywords.join(' ')}"`, monitor.id)
      sendToRenderer('engine:new-listings', newListings)

      // Desktop notification
      if (newListings.length > 0) {
        const { Notification } = require('electron') as typeof import('electron')
        if (Notification.isSupported()) {
          new Notification({
            title: `eBay-GoGo: ${newListings.length} new listing(s)`,
            body: `${monitor.keywords.join(' ')} - ${newListings[0].title}`
          }).show()
        }
      }
    }

    const now = new Date().toISOString()
    updateMonitorStatus(monitor.id, 'OK', now)
    sendToRenderer('monitor:updated', { ...monitor, status: 'OK', lastCheckAt: now })
    sendToRenderer('engine:status-changed', getStatus())
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const status = message === 'RATE_LIMITED' ? 'RateLimited' : 'Error'
    addLog('error', `Monitor check failed: ${message}`, monitor.id)
    updateMonitorStatus(monitor.id, status as Monitor['status'])
    sendToRenderer('engine:error', { monitorId: monitor.id, message })
    sendToRenderer('monitor:updated', { ...monitor, status })
  } finally {
    activeTasks--
  }
}

function scheduleMonitor(monitor: Monitor): void {
  if (timers.has(monitor.id)) {
    clearInterval(timers.get(monitor.id)!)
  }

  const interval = Math.max(monitor.intervalSec, 10) * 1000

  // Run immediately, then on interval
  const task = async (): Promise<void> => {
    if (activeTasks >= MAX_CONCURRENCY) {
      // Queue for next interval
      return
    }
    await runMonitorCheck(monitor)
  }

  task() // Initial run
  const timer = setInterval(task, interval)
  timers.set(monitor.id, timer)
}

export function startEngine(): boolean {
  if (running) return true

  running = true
  addLog('info', 'Engine started')

  const monitors = listMonitors().filter(m => m.enabled)
  addLog('info', `Starting ${monitors.length} enabled monitor(s)`)

  for (const monitor of monitors) {
    scheduleMonitor(monitor)
  }

  sendToRenderer('engine:status-changed', getStatus())
  return true
}

export function stopEngine(): boolean {
  running = false

  for (const [id, timer] of timers) {
    clearInterval(timer)
    timers.delete(id)
  }

  addLog('info', 'Engine stopped')
  sendToRenderer('engine:status-changed', getStatus())
  return true
}

export function restartMonitor(monitorId: number): void {
  if (!running) return

  // Clear existing timer
  if (timers.has(monitorId)) {
    clearInterval(timers.get(monitorId)!)
    timers.delete(monitorId)
  }

  const monitors = listMonitors()
  const monitor = monitors.find(m => m.id === monitorId)
  if (monitor && monitor.enabled) {
    scheduleMonitor(monitor)
  }
}

export function refreshMonitors(): void {
  if (!running) return

  // Stop all timers
  for (const [, timer] of timers) {
    clearInterval(timer)
  }
  timers.clear()

  // Restart all enabled monitors
  const monitors = listMonitors().filter(m => m.enabled)
  for (const monitor of monitors) {
    scheduleMonitor(monitor)
  }
}

export function isRunning(): boolean {
  return running
}

export function getStatus(): EngineStatus {
  const monitors = listMonitors()
  return {
    running,
    connected: !isMockMode(),
    mockMode: isMockMode(),
    apiCallsToday: getApiCallsToday(),
    apiCallLimit: API_CALL_LIMIT,
    lastCheckTime: monitors
      .filter(m => m.lastCheckAt)
      .sort((a, b) => (b.lastCheckAt || '').localeCompare(a.lastCheckAt || ''))[0]?.lastCheckAt || null,
    activeMonitors: monitors.filter(m => m.enabled).length
  }
}
