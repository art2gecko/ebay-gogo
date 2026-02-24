import React from 'react'
import { Search, Plus, Tag } from 'lucide-react'
import { Button } from '../ui/button'
import { useSearchStore } from '@/stores/searchStore'

interface EmptyStateProps {
  onCreateMonitor: () => void
}

export function EmptyState({ onCreateMonitor }: EmptyStateProps): React.JSX.Element {
  const { setQuery, setFilter, setSortBy, runSearch } = useSearchStore()

  const runPreset = (keywords: string, filters: Record<string, unknown>): void => {
    // Zustand setState is synchronous, so all state is updated before runSearch reads it
    setQuery(keywords)
    if (filters.format) setFilter('format', filters.format as 'BuyItNow' | 'Auction' | 'All')
    if (filters.freeShippingOnly) setFilter('freeShippingOnly', true)
    if (filters.condition) setFilter('condition', filters.condition as string)
    if (filters.priceMax) setFilter('priceMax', filters.priceMax as number)
    if (filters.sortBy) setSortBy(filters.sortBy as 'NewlyListed' | 'EndingSoon')
    // Use queueMicrotask to ensure all Zustand batched updates are flushed
    queueMicrotask(() => runSearch())
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center p-8">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <Search size={28} className="text-primary" />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-1">No results yet</h2>
        <p className="text-sm text-muted-foreground">
          Search eBay or create a monitor to start tracking listings
        </p>
      </div>

      <div className="flex gap-3">
        <Button onClick={onCreateMonitor}>
          <Plus size={14} className="mr-1.5" />
          Create Monitor
        </Button>
        <Button variant="outline" onClick={() => {
          setQuery('MacBook Pro')
          runSearch()
        }}>
          <Search size={14} className="mr-1.5" />
          Run Search
        </Button>
      </div>

      {/* Preset chips */}
      <div className="flex flex-col gap-2 mt-4">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Quick Presets</p>
        <div className="flex gap-2 flex-wrap justify-center">
          <button
            onClick={() => runPreset('electronics', { format: 'BuyItNow', sortBy: 'NewlyListed', priceMax: 100 })}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-secondary rounded-full hover:bg-secondary/80 transition-colors"
          >
            <Tag size={11} />
            BIN &middot; Newly Listed &middot; Under $100
          </button>
          <button
            onClick={() => runPreset('vintage', { format: 'Auction', sortBy: 'EndingSoon' })}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-secondary rounded-full hover:bg-secondary/80 transition-colors"
          >
            <Tag size={11} />
            Auction &middot; Ending Soon
          </button>
          <button
            onClick={() => runPreset('new arrivals', { freeShippingOnly: true, condition: 'New', priceMax: 50 })}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-secondary rounded-full hover:bg-secondary/80 transition-colors"
          >
            <Tag size={11} />
            Free Shipping &middot; New &middot; Under $50
          </button>
        </div>
      </div>
    </div>
  )
}
