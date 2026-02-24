import { create } from 'zustand'
import type { Listing, SearchParams } from '@shared/types'
import { invoke } from '../hooks/useIpc'

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

  // Actions
  addExcludeKeyword: (keyword: string) => Promise<void>
  ignoreSeller: (sellerName: string) => Promise<void>
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
  },

  ignoreSeller: async (sellerName) => {
    await invoke('sellers:ignore', { sellerName })
    // Remove listings from this seller from results
    set((s) => ({
      results: s.results.filter((l) => l.sellerName !== sellerName),
      selectedListing: s.selectedListing?.sellerName === sellerName ? null : s.selectedListing
    }))
  }
}))
