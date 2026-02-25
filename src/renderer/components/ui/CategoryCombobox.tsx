import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, ChevronDown, Clock, FolderTree } from 'lucide-react'
import { cn } from '@/lib/utils'
import { invoke } from '@/hooks/useIpc'
import type { CategorySearchResult, RecentCategory } from '@shared/types'

interface CategoryComboboxProps {
  value: { categoryId: string; categoryPath: string } | null
  onChange: (value: { categoryId: string; name: string; path: string } | null) => void
  className?: string
  onRefreshCategories?: () => void
}

export function CategoryCombobox({ value, onChange, className, onRefreshCategories }: CategoryComboboxProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CategorySearchResult[]>([])
  const [recentCategories, setRecentCategories] = useState<RecentCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Fetch recent categories on mount
  useEffect(() => {
    invoke('categories:recent').then(setRecentCategories).catch(() => {})
  }, [])

  // Search with debounce
  const doSearch = useCallback((q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    invoke('categories:search', { query: q, limit: 50 })
      .then(r => {
        setResults(r)
        setHighlightIdx(0)
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(query), 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, doSearch])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (cat: { categoryId: string; name: string; path: string }) => {
    onChange(cat)
    setQuery('')
    setOpen(false)
    invoke('categories:trackUsage', { categoryId: cat.categoryId }).catch(() => {})
    // Refresh recents
    invoke('categories:recent').then(setRecentCategories).catch(() => {})
  }

  const handleClear = () => {
    onChange(null)
    setQuery('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = query.trim() ? results : recentCategories
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx(i => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = items[highlightIdx]
      if (item) {
        handleSelect({
          categoryId: item.categoryId,
          name: item.name,
          path: item.path
        })
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // Scroll highlighted into view
  useEffect(() => {
    if (listRef.current) {
      const highlighted = listRef.current.querySelector('[data-highlighted="true"]')
      if (highlighted) {
        highlighted.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightIdx])

  const showRecent = open && !query.trim() && recentCategories.length > 0
  const showResults = open && query.trim() && results.length > 0
  const showEmpty = open && query.trim() && !loading && results.length === 0

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Display selected value or input */}
      {value?.categoryId ? (
        <div className="flex items-center gap-1 h-7 rounded-md border border-input bg-background px-2 text-xs">
          <FolderTree size={11} className="text-muted-foreground shrink-0" />
          <span className="truncate flex-1" title={value.categoryPath}>
            {value.categoryPath || value.categoryId}
          </span>
          <span className="text-muted-foreground text-[10px] shrink-0">{value.categoryId}</span>
          <button onClick={handleClear} className="ml-1 hover:text-destructive shrink-0">
            <X size={12} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Category (type to search)"
            className={cn(
              'flex h-7 w-full rounded-md border border-input bg-background pl-7 pr-7 py-1 text-xs',
              'transition-colors placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
            )}
          />
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </div>
      )}

      {/* Dropdown */}
      {(showRecent || showResults || showEmpty) && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-border bg-card shadow-lg"
        >
          {/* Recent categories */}
          {showRecent && (
            <>
              <div className="px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Clock size={10} />
                Recent Categories
              </div>
              {recentCategories.map((cat, idx) => (
                <button
                  key={cat.id}
                  data-highlighted={idx === highlightIdx}
                  onClick={() => handleSelect({ categoryId: cat.categoryId, name: cat.name, path: cat.path })}
                  className={cn(
                    'w-full text-left px-2 py-1.5 text-xs hover:bg-muted/50 flex flex-col gap-0.5',
                    idx === highlightIdx && 'bg-muted/50'
                  )}
                >
                  <span className="font-medium">{cat.name}</span>
                  <span className="text-[10px] text-muted-foreground truncate">{cat.path}</span>
                </button>
              ))}
            </>
          )}

          {/* Search results */}
          {showResults && results.map((cat, idx) => (
            <button
              key={cat.categoryId}
              data-highlighted={idx === highlightIdx}
              onClick={() => handleSelect({ categoryId: cat.categoryId, name: cat.name, path: cat.path })}
              className={cn(
                'w-full text-left px-2 py-1.5 text-xs hover:bg-muted/50 flex flex-col gap-0.5',
                idx === highlightIdx && 'bg-muted/50'
              )}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium flex-1 truncate">{cat.name}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{cat.categoryId}</span>
              </div>
              <span className="text-[10px] text-muted-foreground truncate">{cat.path}</span>
            </button>
          ))}

          {/* Loading */}
          {loading && (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">Searching...</div>
          )}

          {/* Empty */}
          {showEmpty && (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">No categories found</div>
          )}

          {/* Refresh link */}
          {onRefreshCategories && (
            <div className="border-t border-border px-2 py-1">
              <button
                onClick={() => { onRefreshCategories(); setOpen(false) }}
                className="text-[10px] text-primary hover:underline"
              >
                Refresh categories from eBay
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
