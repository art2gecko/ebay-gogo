import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select } from '../ui/select'
import { Toggle } from '../ui/toggle'
import { X, Check } from 'lucide-react'
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
  const [applied, setApplied] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Debounced search for text/numeric inputs
  const debouncedSearch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      runSearch()
      flashApplied()
    }, 500)
  }, [runSearch])

  // Instant apply for toggles and selects
  const instantApply = useCallback(() => {
    // Use queueMicrotask to wait for Zustand state to be set
    queueMicrotask(() => {
      runSearch()
      flashApplied()
    })
  }, [runSearch])

  const flashApplied = (): void => {
    setApplied(true)
    setTimeout(() => setApplied(false), 1500)
  }

  // Cleanup debounce timer
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  // Enter key to immediately apply from any input
  const handleInputKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      runSearch()
      flashApplied()
    }
  }

  // Exclude keywords as chips
  const [excludeInput, setExcludeInput] = useState('')

  const addExcludeChip = (text: string): void => {
    const words = text.split(',').map(s => s.trim()).filter(Boolean)
    if (words.length === 0) return
    const updated = [...new Set([...filters.excludeKeywords, ...words])]
    setFilter('excludeKeywords', updated)
    setExcludeInput('')
    debouncedSearch()
  }

  const removeExcludeChip = (keyword: string): void => {
    setFilter('excludeKeywords', filters.excludeKeywords.filter(k => k !== keyword))
    instantApply()
  }

  const handleExcludeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addExcludeChip(excludeInput)
    }
    if (e.key === 'Backspace' && excludeInput === '' && filters.excludeKeywords.length > 0) {
      removeExcludeChip(filters.excludeKeywords[filters.excludeKeywords.length - 1])
    }
  }

  const handleExcludePaste = (e: React.ClipboardEvent): void => {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    addExcludeChip(text)
  }

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
            onChange={(e) => {
              setFilter('priceMin', e.target.value ? Number(e.target.value) : null)
              debouncedSearch()
            }}
            onKeyDown={handleInputKeyDown}
          />
          <span className="text-muted-foreground text-[10px]">-</span>
          <Input
            type="number"
            placeholder="Max"
            className="h-6 text-[11px] px-2"
            value={filters.priceMax ?? ''}
            onChange={(e) => {
              setFilter('priceMax', e.target.value ? Number(e.target.value) : null)
              debouncedSearch()
            }}
            onKeyDown={handleInputKeyDown}
          />
        </div>
      </div>

      {/* Condition */}
      <div>
        <label className="text-[11px] text-muted-foreground mb-1 block">Condition</label>
        <Select
          value={filters.condition}
          onChange={(e) => { setFilter('condition', e.target.value); instantApply() }}
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
              onClick={() => { setFilter('format', fmt); instantApply() }}
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

      {/* Toggles — instant apply */}
      <div className="flex flex-col gap-2">
        <Toggle
          checked={filters.freeShippingOnly}
          onChange={(v) => { setFilter('freeShippingOnly', v); instantApply() }}
          label="Free shipping only"
        />
        <Toggle
          checked={filters.usOnly}
          onChange={(v) => { setFilter('usOnly', v); instantApply() }}
          label="US only"
        />
        <Toggle
          checked={filters.totalPriceMode}
          onChange={(v) => { setFilter('totalPriceMode', v); instantApply() }}
          label="Total price (item+ship)"
        />
      </div>

      {/* Seller feedback — debounced */}
      <div>
        <label className="text-[11px] text-muted-foreground mb-1 block">Min Seller Feedback</label>
        <Input
          type="number"
          placeholder="0"
          className="h-6 text-[11px] px-2"
          value={filters.sellerMinFeedback || ''}
          onChange={(e) => {
            setFilter('sellerMinFeedback', Number(e.target.value) || 0)
            debouncedSearch()
          }}
          onKeyDown={handleInputKeyDown}
        />
      </div>

      {/* Exclude keywords — chips */}
      <div>
        <label className="text-[11px] text-muted-foreground mb-1 block">Exclude Keywords</label>
        <div className="flex flex-wrap gap-1 mb-1">
          {filters.excludeKeywords.map((kw) => (
            <span key={kw} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-destructive/10 text-destructive text-[10px]">
              {kw}
              <button onClick={() => removeExcludeChip(kw)} className="hover:text-destructive/70"><X size={9} /></button>
            </span>
          ))}
        </div>
        <Input
          placeholder="Type & press Enter"
          className="h-6 text-[11px] px-2"
          value={excludeInput}
          onChange={(e) => setExcludeInput(e.target.value)}
          onKeyDown={handleExcludeKeyDown}
          onPaste={handleExcludePaste}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 mt-auto pt-2 border-t border-border">
        <Button size="xs" variant="ghost" className="flex-1" onClick={() => { resetFilters(); instantApply() }}>
          Reset
        </Button>
        <Button size="xs" className="flex-1" onClick={() => { runSearch(); flashApplied() }}>
          {applied ? <><Check size={10} className="mr-1" />Applied</> : 'Apply'}
        </Button>
      </div>
    </div>
  )
}
