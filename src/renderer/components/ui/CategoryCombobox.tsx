import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, ChevronDown, ChevronRight, Clock, Star, FolderTree, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { invoke } from '@/hooks/useIpc'
import type { CategorySearchResult, RecentCategory, FavoriteCategory, EbayCategory } from '@shared/types'

interface CategoryComboboxProps {
  value: { categoryId: string; categoryPath: string } | null
  onChange: (value: { categoryId: string; name: string; path: string } | null) => void
  onBrowse?: () => void
  className?: string
}

interface DisplayItem {
  section: 'recent' | 'favorites' | 'topLevel' | 'search'
  categoryId: string
  name: string
  path: string
  isLeaf?: boolean
  isFavorite?: boolean
  hasChildren?: boolean
}

export function CategoryCombobox({ value, onChange, onBrowse, className }: CategoryComboboxProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CategorySearchResult[]>([])
  const [recentCategories, setRecentCategories] = useState<RecentCategory[]>([])
  const [favoriteCategories, setFavoriteCategories] = useState<FavoriteCategory[]>([])
  const [topLevelCategories, setTopLevelCategories] = useState<EbayCategory[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Build display items
  const displayItems = useCallback((): DisplayItem[] => {
    if (query.trim()) {
      return searchResults.map(r => ({
        section: 'search' as const,
        categoryId: r.categoryId,
        name: r.name,
        path: r.path,
        isLeaf: r.isLeaf,
        isFavorite: favoriteIds.has(r.categoryId)
      }))
    }

    const items: DisplayItem[] = []
    const seen = new Set<string>()

    // Recent
    for (const r of recentCategories.slice(0, 10)) {
      if (!seen.has(r.categoryId)) {
        seen.add(r.categoryId)
        items.push({
          section: 'recent',
          categoryId: r.categoryId,
          name: r.name,
          path: r.path,
          isFavorite: favoriteIds.has(r.categoryId)
        })
      }
    }

    // Favorites
    for (const f of favoriteCategories) {
      if (!seen.has(f.categoryId)) {
        seen.add(f.categoryId)
        items.push({
          section: 'favorites',
          categoryId: f.categoryId,
          name: f.name,
          path: f.path,
          isLeaf: f.isLeaf,
          isFavorite: true
        })
      }
    }

    // Top level
    for (const c of topLevelCategories) {
      items.push({
        section: 'topLevel',
        categoryId: c.categoryId,
        name: c.name,
        path: c.path,
        isLeaf: c.isLeaf,
        isFavorite: favoriteIds.has(c.categoryId),
        hasChildren: !c.isLeaf
      })
    }

    return items
  }, [query, searchResults, recentCategories, favoriteCategories, topLevelCategories, favoriteIds])

  const items = displayItems()

  // Load data on mount
  const loadData = useCallback(() => {
    invoke('categories:recent').then(setRecentCategories).catch(() => {})
    invoke('categories:favorites').then(favs => {
      setFavoriteCategories(favs)
      setFavoriteIds(new Set(favs.map(f => f.categoryId)))
    }).catch(() => {})
    invoke('categories:topLevel', { marketplace: 'EBAY_US' }).then(setTopLevelCategories).catch(() => {})
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Search with debounce
  const doSearch = useCallback((q: string) => {
    if (!q.trim()) {
      setSearchResults([])
      return
    }
    setLoading(true)
    invoke('categories:search', { query: q, limit: 50 })
      .then(r => {
        setSearchResults(r)
        setHighlightIdx(0)
      })
      .catch(() => setSearchResults([]))
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
    setTimeout(loadData, 100)
  }

  const handleClear = () => {
    onChange(null)
    setQuery('')
  }

  const handleToggleFavorite = (e: React.MouseEvent, categoryId: string) => {
    e.stopPropagation()
    const isFav = !favoriteIds.has(categoryId)
    invoke('categories:toggleFavorite', { categoryId, isFav }).catch(() => {})
    setFavoriteIds(prev => {
      const next = new Set(prev)
      if (isFav) next.add(categoryId)
      else next.delete(categoryId)
      return next
    })
    if (isFav) {
      const item = items.find(i => i.categoryId === categoryId)
      if (item && !favoriteCategories.find(f => f.categoryId === categoryId)) {
        setFavoriteCategories(prev => [...prev, {
          categoryId: item.categoryId,
          name: item.name,
          path: item.path,
          isLeaf: item.isLeaf || false,
          starredAt: Date.now()
        }])
      }
    } else {
      setFavoriteCategories(prev => prev.filter(f => f.categoryId !== categoryId))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
        handleSelect({ categoryId: item.categoryId, name: item.name, path: item.path })
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

  // Section headers
  const renderSectionHeader = (section: string, idx: number) => {
    if (idx === 0 || items[idx - 1]?.section !== section) {
      const iconMap = {
        recent: <Clock size={10} />,
        favorites: <Star size={10} />,
        topLevel: <Layers size={10} />,
        search: <Search size={10} />
      }
      const labelMap = {
        recent: 'Recent',
        favorites: 'Favorites',
        topLevel: 'Browse Categories',
        search: 'Search Results'
      }
      return (
        <div className="px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1 sticky top-0 bg-card z-10">
          {iconMap[section as keyof typeof iconMap]}
          {labelMap[section as keyof typeof labelMap]}
        </div>
      )
    }
    return null
  }

  const showDropdown = open && (items.length > 0 || loading || (query.trim() && !loading))

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
            placeholder="Search categories..."
            className={cn(
              'flex h-7 w-full rounded-md border border-input bg-background pl-7 pr-7 py-1 text-xs',
              'transition-colors placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
            )}
          />
          <ChevronDown
            size={12}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer"
            onClick={() => { setOpen(!open); inputRef.current?.focus() }}
          />
        </div>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-lg"
          style={{ maxHeight: '480px', overflowY: 'auto' }}
        >
          {items.map((item, idx) => (
            <React.Fragment key={`${item.section}-${item.categoryId}`}>
              {renderSectionHeader(item.section, idx)}
              <button
                data-highlighted={idx === highlightIdx}
                onClick={() => handleSelect({ categoryId: item.categoryId, name: item.name, path: item.path })}
                className={cn(
                  'w-full text-left px-2 py-1.5 text-xs hover:bg-muted/50 flex items-center gap-1.5 group',
                  idx === highlightIdx && 'bg-muted/50'
                )}
              >
                {item.hasChildren && (
                  <ChevronRight size={10} className="text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{item.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-auto">{item.categoryId}</span>
                  </div>
                  {item.path && item.path !== item.name && (
                    <div className="text-[10px] text-muted-foreground truncate">{item.path}</div>
                  )}
                </div>
                <button
                  onClick={(e) => handleToggleFavorite(e, item.categoryId)}
                  className={cn(
                    'shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity',
                    item.isFavorite && 'opacity-100'
                  )}
                  title={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Star
                    size={11}
                    className={cn(
                      item.isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'
                    )}
                  />
                </button>
              </button>
            </React.Fragment>
          ))}

          {/* Loading */}
          {loading && (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">Searching...</div>
          )}

          {/* Empty search */}
          {query.trim() && !loading && searchResults.length === 0 && (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">No categories found</div>
          )}

          {/* Browse button */}
          {onBrowse && (
            <div className="border-t border-border px-2 py-1.5">
              <button
                onClick={() => { onBrowse(); setOpen(false) }}
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
              >
                <FolderTree size={11} />
                Browse all categories...
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
