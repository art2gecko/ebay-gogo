import React from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select } from '../ui/select'
import { Toggle } from '../ui/toggle'
import { useSearchStore } from '@/stores/searchStore'

const CONDITION_OPTIONS = [
  { value: 'Any', label: 'Any Condition' },
  { value: 'New', label: 'New' },
  { value: 'Open Box', label: 'Open Box' },
  { value: 'Refurbished', label: 'Refurbished' },
  { value: 'Used', label: 'Used' }
]

export function FilterSidebar(): React.JSX.Element {
  const { filters, setFilter, resetFilters, runSearch } = useSearchStore()

  return (
    <div className="w-52 shrink-0 border-r border-border bg-card overflow-y-auto p-3 flex flex-col gap-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filters</h3>

      {/* Price Range */}
      <div>
        <label className="text-[11px] text-muted-foreground mb-1 block">Price Range</label>
        <div className="flex gap-1.5 items-center">
          <Input
            type="number"
            placeholder="Min"
            className="h-6 text-[11px] px-2"
            value={filters.priceMin ?? ''}
            onChange={(e) =>
              setFilter('priceMin', e.target.value ? Number(e.target.value) : null)
            }
          />
          <span className="text-muted-foreground text-[10px]">-</span>
          <Input
            type="number"
            placeholder="Max"
            className="h-6 text-[11px] px-2"
            value={filters.priceMax ?? ''}
            onChange={(e) =>
              setFilter('priceMax', e.target.value ? Number(e.target.value) : null)
            }
          />
        </div>
      </div>

      {/* Condition */}
      <div>
        <label className="text-[11px] text-muted-foreground mb-1 block">Condition</label>
        <Select
          value={filters.condition}
          onChange={(e) => setFilter('condition', e.target.value)}
          options={CONDITION_OPTIONS}
          className="h-6 text-[11px] w-full"
        />
      </div>

      {/* Buying Format */}
      <div>
        <label className="text-[11px] text-muted-foreground mb-1 block">Buying Format</label>
        <div className="flex gap-1">
          {(['BuyItNow', 'Auction', 'All'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setFilter('format', fmt)}
              className={`flex-1 text-[10px] py-1 rounded border transition-colors ${
                filters.format === fmt
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {fmt === 'BuyItNow' ? 'BIN' : fmt}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-col gap-2">
        <Toggle
          checked={filters.freeShippingOnly}
          onChange={(v) => setFilter('freeShippingOnly', v)}
          label="Free shipping only"
        />
        <Toggle
          checked={filters.usOnly}
          onChange={(v) => setFilter('usOnly', v)}
          label="US only"
        />
        <Toggle
          checked={filters.totalPriceMode}
          onChange={(v) => setFilter('totalPriceMode', v)}
          label="Total price (item+ship)"
        />
      </div>

      {/* Seller feedback */}
      <div>
        <label className="text-[11px] text-muted-foreground mb-1 block">Min Seller Feedback</label>
        <Input
          type="number"
          placeholder="0"
          className="h-6 text-[11px] px-2"
          value={filters.sellerMinFeedback || ''}
          onChange={(e) =>
            setFilter('sellerMinFeedback', Number(e.target.value) || 0)
          }
        />
      </div>

      {/* Exclude keywords */}
      <div>
        <label className="text-[11px] text-muted-foreground mb-1 block">Exclude Keywords</label>
        <Input
          placeholder="word1, word2, ..."
          className="h-6 text-[11px] px-2"
          value={filters.excludeKeywords.join(', ')}
          onChange={(e) =>
            setFilter(
              'excludeKeywords',
              e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
        />
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 mt-auto pt-2 border-t border-border">
        <Button size="xs" variant="ghost" className="flex-1" onClick={resetFilters}>
          Reset
        </Button>
        <Button size="xs" className="flex-1" onClick={runSearch}>
          Apply
        </Button>
      </div>
    </div>
  )
}
