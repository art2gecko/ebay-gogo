// ============================================================
// Typed IPC Channel Definitions
// ============================================================

import type {
  Monitor, MonitorCreateInput, MonitorUpdateInput,
  Listing, SearchParams, EngineStatus, AppSettings, LogEntry,
  CategorySearchResult, RecentCategory, FavoriteCategory, EbayCategory,
  TestSearchPreview,
  View, ViewCreateInput, ViewUpdateInput
} from './types'

// Request-Response channels (invoke/handle)
export interface IpcChannels {
  // Monitors
  'monitors:list': { request: void; response: Monitor[] }
  'monitors:get': { request: number; response: Monitor | null }
  'monitors:create': { request: MonitorCreateInput; response: Monitor }
  'monitors:update': { request: MonitorUpdateInput; response: Monitor }
  'monitors:delete': { request: number; response: boolean }
  'monitors:testSearch': { request: MonitorCreateInput; response: TestSearchPreview }

  // Listings
  'listings:search': { request: SearchParams; response: Listing[] }
  'listings:getByMonitor': { request: { monitorId: number; limit?: number }; response: Listing[] }
  'listings:getAll': { request: { limit?: number; offset?: number; monitorId?: number; dateFrom?: string; dateTo?: string; includeDismissed?: boolean }; response: Listing[] }
  'listings:count': { request: { monitorId?: number; dateFrom?: string; dateTo?: string }; response: number }
  'listings:exportCsv': { request: { monitorId?: number; dateFrom?: string; dateTo?: string }; response: string }

  // Dismiss / Delete
  'listings:dismiss': { request: { itemIds: string[] }; response: number }
  'listings:undoDismiss': { request: { itemIds: string[] }; response: number }
  'listings:dismissByView': { request: { monitorIds?: number[]; groupNames?: string[] }; response: number }
  'listings:resetDismissed': { request: { monitorIds?: number[]; groupNames?: string[] }; response: number }
  'listings:deleteByScope': { request: { scope: 'view' | 'monitor' | 'group' | 'all'; monitorId?: number; groupName?: string }; response: number }

  // App State (for persisting UI preferences)
  'appState:get': { request: string; response: string | null }
  'appState:set': { request: { key: string; value: string }; response: boolean }

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

  // Categories
  'categories:search': { request: { query: string; marketplace?: string; limit?: number }; response: CategorySearchResult[] }
  'categories:recent': { request: void; response: RecentCategory[] }
  'categories:trackUsage': { request: { categoryId: string }; response: boolean }
  'categories:refresh': { request: void; response: { success: boolean; count: number; message: string } }
  'categories:count': { request: void; response: number }
  'categories:topLevel': { request: { marketplace?: string }; response: EbayCategory[] }
  'categories:children': { request: { parentId: string; marketplace?: string }; response: EbayCategory[] }
  'categories:favorites': { request: void; response: FavoriteCategory[] }
  'categories:toggleFavorite': { request: { categoryId: string; isFav: boolean }; response: boolean }

  // Views
  'views:list': { request: void; response: View[] }
  'views:get': { request: string; response: View | null }
  'views:create': { request: ViewCreateInput; response: View }
  'views:update': { request: ViewUpdateInput; response: View }
  'views:delete': { request: string; response: boolean }
  'views:setDefault': { request: string; response: boolean }
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
