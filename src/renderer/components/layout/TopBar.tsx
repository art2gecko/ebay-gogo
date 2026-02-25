import React, { useCallback, useState, useEffect, useRef } from 'react'
import { Search, Save, Play, Square, Zap, Eraser, Eye, ChevronDown, Plus, Settings2, Wifi, WifiOff } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select } from '../ui/select'
import { Badge } from '../ui/badge'
import { ThemeToggle } from '../ui/ThemeToggle'
import { useSearchStore } from '@/stores/searchStore'
import { useAppStore } from '@/stores/appStore'
import { useViewStore } from '@/stores/viewStore'
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
  onClearResults?: () => void
  onCreateView?: () => void
  onManageViews?: () => void
}

export function TopBar({ onSaveMonitor, onClearResults, onCreateView, onManageViews }: TopBarProps): React.JSX.Element {
  const { query, setQuery, sortBy, setSortBy, runSearch, loading } = useSearchStore()
  const { engineStatus, startEngine, stopEngine, activeTab } = useAppStore()
  const { views, activeViewId, setActiveView } = useViewStore()
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false)
  const viewDropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      if (viewDropRef.current && !viewDropRef.current.contains(e.target as Node)) {
        setViewDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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

  const activeView = views.find(v => v.id === activeViewId)
  const isSearchTab = activeTab === 'search'

  return (
    <div className="flex flex-col shrink-0">
      {!engineStatus.mockMode && !engineStatus.connected && engineStatus.running && (
        <div className="flex items-center gap-2 px-3 py-1 bg-destructive/10 border-b border-destructive/30 text-xs text-destructive">
          <WifiOff size={12} />
          Connection lost. Check your eBay credentials in Settings.
        </div>
      )}

      <div className="flex items-center gap-2 h-11 px-3 border-b border-border bg-card">
        <div className="flex items-center gap-1.5 shrink-0">
          <Zap size={18} className="text-primary" />
          <span className="font-bold text-sm tracking-tight">eBay-GoGo</span>
        </div>

        <div className="flex-1 max-w-xl">
          <Input
            placeholder="Search eBay..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-7 text-xs"
          />
        </div>

        <Select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          options={SORT_OPTIONS}
          className="h-7 text-xs w-36"
        />

        {isSearchTab && (
          <div ref={viewDropRef} className="relative">
            <Button
              size="xs"
              variant="outline"
              onClick={() => setViewDropdownOpen(!viewDropdownOpen)}
              className="gap-1"
            >
              <Eye size={12} />
              {activeView ? activeView.name : 'Default'}
              <ChevronDown size={10} />
            </Button>
            {viewDropdownOpen && (
              <div className="absolute z-50 mt-1 right-0 w-48 rounded-md border border-border bg-card shadow-lg">
                <button
                  onClick={() => { setActiveView(null); setViewDropdownOpen(false) }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 ${!activeViewId ? 'bg-muted/50 font-medium' : ''}`}
                >
                  Default (All Results)
                </button>
                {views.map(v => (
                  <button
                    key={v.id}
                    onClick={() => { setActiveView(v.id); setViewDropdownOpen(false) }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 ${activeViewId === v.id ? 'bg-muted/50 font-medium' : ''}`}
                  >
                    {v.name}
                    {v.isDefault && <span className="text-[9px] text-muted-foreground ml-1">(default)</span>}
                  </button>
                ))}
                <div className="border-t border-border">
                  <button
                    onClick={() => { onCreateView?.(); setViewDropdownOpen(false) }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 flex items-center gap-1"
                  >
                    <Plus size={10} /> New View
                  </button>
                  <button
                    onClick={() => { onManageViews?.(); setViewDropdownOpen(false) }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 flex items-center gap-1"
                  >
                    <Settings2 size={10} /> Manage Views
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <Button size="xs" onClick={handleSearch} disabled={loading || !query.trim()}>
          <Search size={12} className="mr-1" />
          Search
        </Button>

        {isSearchTab && (
          <Button size="xs" variant="outline" onClick={onClearResults} title="Clear from screen (Ctrl+L)">
            <Eraser size={12} className="mr-1" />
            Clear
          </Button>
        )}

        <Button size="xs" variant="outline" onClick={onSaveMonitor} disabled={!query.trim()}>
          <Save size={12} className="mr-1" />
          Monitor
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

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <Badge
            variant={engineStatus.mockMode ? 'warning' : engineStatus.running ? 'success' : 'secondary'}
            className="flex items-center gap-1"
          >
            {engineStatus.mockMode ? (
              <>MOCK</>
            ) : engineStatus.running ? (
              <><Wifi size={10} /> Connected</>
            ) : (
              <><WifiOff size={10} /> Disconnected</>
            )}
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
    </div>
  )
}
