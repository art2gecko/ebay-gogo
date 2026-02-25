// ============================================================
// Core Data Types for eBay-GoGo
// ============================================================

export interface Monitor {
  id: number
  enabled: boolean
  group: string
  keywords: string[]
  searchInDesc: boolean
  priceMin: number | null
  priceMax: number | null
  condition: string
  format: 'BuyItNow' | 'Auction' | 'All'
  freeShippingOnly: boolean
  excludeKeywords: string[]
  sellerMinFeedback: number
  usOnly: boolean
  totalPriceMode: boolean
  allowSellers: string[]
  denySellers: string[]
  intervalSec: number
  viewType: 'Results' | 'AuctionEnding'
  site: string
  locatedIn: string
  shipsTo: string
  categoryId: string
  categoryPath: string
  includeSubcategories: boolean
  viewId: string
  status: 'OK' | 'RateLimited' | 'AuthError' | 'Error' | 'Idle'
  lastCheckAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Listing {
  id: number
  itemId: string
  monitorId: number | null
  title: string
  url: string
  price: number
  shipping: number
  total: number
  condition: string
  sellerName: string
  sellerFeedback: number
  returnsAccepted: boolean
  bestOffer: boolean
  postedAt: string
  foundAt: string
  images: string[]
  itemSpecifics: Record<string, string>
  rawJson: string
  dismissedAt: string | null
  createdAt: string
}

export interface LogEntry {
  id: number
  ts: string
  level: 'info' | 'warn' | 'error' | 'debug'
  monitorId: number | null
  message: string
  details: Record<string, unknown>
}

export interface AppState {
  key: string
  value: string
}

export interface EngineStatus {
  running: boolean
  connected: boolean
  mockMode: boolean
  apiCallsToday: number
  apiCallLimit: number
  lastCheckTime: string | null
  activeMonitors: number
}

export interface SearchParams {
  keywords: string
  searchInDesc?: boolean
  priceMin?: number | null
  priceMax?: number | null
  condition?: string
  format?: 'BuyItNow' | 'Auction' | 'All'
  freeShippingOnly?: boolean
  excludeKeywords?: string[]
  sellerMinFeedback?: number
  usOnly?: boolean
  totalPriceMode?: boolean
  categoryId?: string
  sortBy?: 'NewlyListed' | 'PriceLow' | 'PriceHigh' | 'EndingSoon' | 'BestMatch'
  page?: number
  limit?: number
}

export interface EbayCredentials {
  appId: string
  certId: string
  devId: string
  oauthToken: string
  environment: 'SANDBOX' | 'PRODUCTION'
  siteId: string
}

export interface AppSettings {
  credentials: EbayCredentials
  defaultSite: string
  defaultCurrency: string
  notifications: {
    soundEnabled: boolean
    desktopEnabled: boolean
    quietHoursStart: string
    quietHoursEnd: string
  }
  hotkeysEnabled: boolean
}

// ============================================================
// Category types
// ============================================================

export interface EbayCategory {
  categoryId: string
  parentId: string
  name: string
  path: string
  isLeaf: boolean
  marketplace: string
}

export interface CategorySearchResult {
  categoryId: string
  name: string
  path: string
  isLeaf: boolean
}

export interface RecentCategory {
  id: number
  categoryId: string
  name: string
  path: string
  usedAt: number
}

// ============================================================
// View types
// ============================================================

export type ViewScope = 'global' | 'group' | 'monitor'

export interface ViewFilters {
  priceMin: number | null
  priceMax: number | null
  condition: string
  format: 'BuyItNow' | 'Auction' | 'All'
  freeShippingOnly: boolean
  excludeKeywords: string[]
  sellerMinFeedback: number
  usOnly: boolean
  totalPriceMode: boolean
  showDismissed: boolean
}

export interface ViewSort {
  field: string
  direction: 'asc' | 'desc'
}

export interface ViewColumnState {
  colId: string
  width?: number
  hide?: boolean
  pinned?: 'left' | 'right' | null
  sort?: 'asc' | 'desc' | null
  sortIndex?: number | null
}

export interface View {
  id: string
  name: string
  isDefault: boolean
  scope: ViewScope
  filters: ViewFilters
  sort: ViewSort | null
  columns: ViewColumnState[] | null
  groupFilter: string[] | null
  monitorIds: number[] | null
  createdAt: number
  updatedAt: number
}

export type ViewCreateInput = Omit<View, 'createdAt' | 'updatedAt'>
export type ViewUpdateInput = Partial<ViewCreateInput> & { id: string }

export type MonitorCreateInput = Omit<Monitor, 'id' | 'status' | 'lastCheckAt' | 'createdAt' | 'updatedAt'>
export type MonitorUpdateInput = Partial<MonitorCreateInput> & { id: number }
