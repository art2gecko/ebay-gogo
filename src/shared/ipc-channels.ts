// ============================================================
// Typed IPC Channel Definitions
// ============================================================

import type {
  Monitor, MonitorCreateInput, MonitorUpdateInput,
  Listing, SearchParams, EngineStatus, AppSettings, LogEntry
} from './types'

// Request-Response channels (invoke/handle)
export interface IpcChannels {
  // Monitors
  'monitors:list': { request: void; response: Monitor[] }
  'monitors:get': { request: number; response: Monitor | null }
  'monitors:create': { request: MonitorCreateInput; response: Monitor }
  'monitors:update': { request: MonitorUpdateInput; response: Monitor }
  'monitors:delete': { request: number; response: boolean }

  // Listings
  'listings:search': { request: SearchParams; response: Listing[] }
  'listings:getByMonitor': { request: { monitorId: number; limit?: number }; response: Listing[] }
  'listings:getAll': { request: { limit?: number; offset?: number; monitorId?: number; dateFrom?: string; dateTo?: string }; response: Listing[] }
  'listings:count': { request: { monitorId?: number; dateFrom?: string; dateTo?: string }; response: number }
  'listings:exportCsv': { request: { monitorId?: number; dateFrom?: string; dateTo?: string }; response: string }

  // Engine
  'engine:start': { request: void; response: boolean }
  'engine:stop': { request: void; response: boolean }
  'engine:status': { request: void; response: EngineStatus }

  // Settings
  'settings:get': { request: void; response: AppSettings }
  'settings:save': { request: Partial<AppSettings>; response: AppSettings }
  'settings:testConnection': { request: void; response: { success: boolean; message: string } }

  // Logs
  'logs:get': { request: { limit?: number; level?: string; monitorId?: number }; response: LogEntry[] }
  'logs:clear': { request: void; response: boolean }

  // Sellers
  'sellers:ignore': { request: { sellerName: string; monitorId?: number }; response: boolean }
  'sellers:unignore': { request: { sellerName: string; monitorId?: number }; response: boolean }

  // Search (one-shot, not engine)
  'search:run': { request: SearchParams; response: Listing[] }

  // Exclude keywords
  'exclude:add': { request: { keyword: string; monitorId?: number }; response: boolean }
}

// Event channels (main -> renderer, one-way streaming)
export interface IpcEvents {
  'engine:status-changed': EngineStatus
  'engine:new-listings': Listing[]
  'engine:error': { monitorId: number | null; message: string }
  'monitor:updated': Monitor
}

// Channel name literal types for type safety
export type IpcChannelName = keyof IpcChannels
export type IpcEventName = keyof IpcEvents
