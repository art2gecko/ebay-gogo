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

export type MonitorCreateInput = Omit<Monitor, 'id' | 'status' | 'lastCheckAt' | 'createdAt' | 'updatedAt'>
export type MonitorUpdateInput = Partial<MonitorCreateInput> & { id: number }
