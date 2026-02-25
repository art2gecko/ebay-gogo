import React, { useCallback } from 'react'
import { Search, Save, Play, Square, Zap } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select } from '../ui/select'
import { Badge } from '../ui/badge'
import { ThemeToggle } from '../ui/ThemeToggle'
import { useSearchStore } from '@/stores/searchStore'
import { useAppStore } from '@/stores/appStore'
import { timeAgo } from '@/lib/utils'

const SORT_OPTIONS = [
  { value: 'NewlyListed', label: 'Newly Listed' },
  { value: 'PriceLow', label: 'Price: Low to High' },
  { value: 'PriceHigh', label: 'Price: High to Low' },
  { value: 'EndingSoon', label: 'Ending Soon' },
  { value: 'BestMatch', label: 'Best Match' }
]

interface TopBarProps {
  onSaveMonitor?: () => void
}

export function TopBar({ onSaveMonitor }: TopBarProps): React.JSX.Element {
  const { query, setQuery, sortBy, setSortBy, runSearch, loading } = useSearchStore()
  const { engineStatus, startEngine, stopEngine } = useAppStore()

  const handleSearch = useCallback(() => {
    runSearch()
  }, [runSearch])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSearch()
      }
    },
    [handleSearch]
  )

  return (
    <div className="flex items-center gap-3 h-11 px-3 border-b border-border bg-card shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Zap size={18} className="text-primary" />
        <span className="font-bold text-sm tracking-tight">eBay-GoGo</span>
      </div>

      {/* Search input */}
      <div className="flex-1 max-w-xl">
        <Input
          placeholder="Search eBay..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 text-xs"
        />
      </div>

      {/* Sort */}
      <Select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
        options={SORT_OPTIONS}
        className="h-7 text-xs w-40"
      />

      {/* Action buttons */}
      <Button size="xs" onClick={handleSearch} disabled={loading || !query.trim()}>
        <Search size={12} className="mr-1" />
        Search
      </Button>

      <Button size="xs" variant="outline" onClick={onSaveMonitor} disabled={!query.trim()}>
        <Save size={12} className="mr-1" />
        Save Monitor
      </Button>

      {engineStatus.running ? (
        <Button size="xs" variant="destructive" onClick={stopEngine}>
          <Square size={12} className="mr-1" />
          Stop
        </Button>
      ) : (
        <Button size="xs" variant="secondary" onClick={startEngine}>
          <Play size={12} className="mr-1" />
          Start
        </Button>
      )}

      <ThemeToggle />

      {/* Status pill */}
      <div className="flex items-center gap-2 shrink-0 ml-auto">
        <Badge variant={engineStatus.mockMode ? 'warning' : engineStatus.running ? 'success' : 'secondary'}>
          {engineStatus.mockMode ? 'MOCK' : engineStatus.running ? 'Connected' : 'Disconnected'}
        </Badge>
        {engineStatus.lastCheckTime && (
          <span className="text-[10px] text-muted-foreground">
            {timeAgo(engineStatus.lastCheckTime)}
          </span>
        )}
        <span className="text-[10px] text-muted-foreground">
          {engineStatus.apiCallsToday}/{engineStatus.apiCallLimit}
        </span>
      </div>
    </div>
  )
}
