import { create } from 'zustand'
import type { Listing, SearchParams } from '@shared/types'
import { invoke } from '../hooks/useIpc'
import { showToast } from '../components/ui/Toast'

interface SearchStore {
  // Search state
  query: string
  setQuery: (q: string) => void
  sortBy: SearchParams['sortBy']
  setSortBy: (sort: SearchParams['sortBy']) => void

  // Filter state
  filters: {
    priceMin: number | null
    priceMax: number | null
    condition: string
    format: 'BuyItNow' | 'Auction' | 'All'
    freeShippingOnly: boolean
    excludeKeywords: string[]
    sellerMinFeedback: number
    usOnly: boolean
    totalPriceMode: boolean
  }
  setFilter: <K extends keyof SearchStore['filters']>(key: K, value: SearchStore['filters'][K]) => void
  resetFilters: () => void

  // Results
  results: Listing[]
  loading: boolean
  error: string | null
  runSearch: () => Promise<void>

  // Selection
  selectedListing: Listing | null
  setSelectedListing: (listing: Listing | null) => void

  // Dismiss with undo
  showDismissed: boolean
  setShowDismissed: (v: boolean) => void
  dismissItems: (itemIds: string[]) => Promise<void>
  undoDismiss: (itemIds: string[]) => Promise<void>
  dismissAll: () => Promise<void>
  clearSession: () => void

  // Actions with undo
  addExcludeKeyword: (keyword: string) => Promise<void>
  removeExcludeKeyword: (keyword: string) => void
  ignoreSeller: (sellerName: string) => Promise<void>

  // Density preference
  density: 'compact' | 'comfortable'
  setDensity: (d: 'compact' | 'comfortable') => void
}

const defaultFilters: SearchStore['filters'] = {
  priceMin: null,
  priceMax: null,
  condition: 'Any',
  format: 'BuyItNow',
  freeShippingOnly: false,
  excludeKeywords: [],
  sellerMinFeedback: 0,
  usOnly: true,
  totalPriceMode: false
}

export const useSearchStore = create<SearchStore>((set, get) => ({
  query: '',
  setQuery: (q) => set({ query: q }),
  sortBy: 'NewlyListed',
  setSortBy: (sort) => set({ sortBy: sort }),

  filters: { ...defaultFilters },
  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),

  results: [],
  loading: false,
  error: null,

  runSearch: async () => {
    const { query, sortBy, filters } = get()
    if (!query.trim()) return

    set({ loading: true, error: null })
    try {
      const params: SearchParams = {
        keywords: query,
        sortBy,
        priceMin: filters.priceMin,
        priceMax: filters.priceMax,
        condition: filters.condition,
        format: filters.format,
        freeShippingOnly: filters.freeShippingOnly,
        excludeKeywords: filters.excludeKeywords,
        sellerMinFeedback: filters.sellerMinFeedback,
        usOnly: filters.usOnly,
        totalPriceMode: filters.totalPriceMode,
        limit: 100
      }
      const results = await invoke('search:run', params)
      set({ results })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed'
      console.error('Search failed:', err)
      set({ error: message })
    } finally {
      set({ loading: false })
    }
  },

  selectedListing: null,
  setSelectedListing: (listing) => set({ selectedListing: listing }),

  // Dismiss
  showDismissed: false,
  setShowDismissed: (v) => set({ showDismissed: v }),

  dismissItems: async (itemIds) => {
    await invoke('listings:dismiss', { itemIds })
    const now = new Date().toISOString()
    set(s => ({
      results: s.results.map(r => itemIds.includes(r.itemId) ? { ...r, dismissedAt: now } : r)
    }))
    showToast(`Dismissed ${itemIds.length} item${itemIds.length > 1 ? 's' : ''}`, () => {
      get().undoDismiss(itemIds)
    })
  },

  undoDismiss: async (itemIds) => {
    await invoke('listings:undoDismiss', { itemIds })
    set(s => ({
      results: s.results.map(r => itemIds.includes(r.itemId) ? { ...r, dismissedAt: null } : r)
    }))
  },

  dismissAll: async () => {
    const { results, showDismissed } = get()
    const visible = showDismissed ? results : results.filter(r => !r.dismissedAt)
    const itemIds = visible.map(r => r.itemId)
    if (itemIds.length === 0) return
    await invoke('listings:dismiss', { itemIds })
    const now = new Date().toISOString()
    set(s => ({
      results: s.results.map(r => itemIds.includes(r.itemId) ? { ...r, dismissedAt: now } : r)
    }))
    showToast(`Dismissed ${itemIds.length} items`, () => {
      get().undoDismiss(itemIds)
    })
  },

  clearSession: () => {
    set({ results: [], selectedListing: null })
  },

  addExcludeKeyword: async (keyword) => {
    const { filters } = get()
    if (filters.excludeKeywords.includes(keyword)) return
    await invoke('exclude:add', { keyword })
    set((s) => ({
      filters: {
        ...s.filters,
        excludeKeywords: [...s.filters.excludeKeywords, keyword]
      }
    }))
    showToast(`Excluded keyword: "${keyword}"`, () => {
      get().removeExcludeKeyword(keyword)
    })
  },

  removeExcludeKeyword: (keyword) => {
    set((s) => ({
      filters: {
        ...s.filters,
        excludeKeywords: s.filters.excludeKeywords.filter(k => k !== keyword)
      }
    }))
  },

  ignoreSeller: async (sellerName) => {
    await invoke('sellers:ignore', { sellerName })
    const removedListings = get().results.filter(l => l.sellerName === sellerName)
    set((s) => ({
      results: s.results.filter((l) => l.sellerName !== sellerName),
      selectedListing: s.selectedListing?.sellerName === sellerName ? null : s.selectedListing
    }))
    showToast(`Ignored seller: ${sellerName}`, async () => {
      await invoke('sellers:unignore', { sellerName })
      set((s) => ({ results: [...removedListings, ...s.results] }))
    })
  },

  // Density
  density: 'comfortable',
  setDensity: (d) => {
    set({ density: d })
    invoke('appState:set', { key: 'gridDensity', value: d }).catch(() => {})
  }
}))

// Load persisted density on startup
invoke('appState:get', 'gridDensity').then(val => {
  if (val === 'compact' || val === 'comfortable') {
    useSearchStore.setState({ density: val })
  }
}).catch(() => {})
