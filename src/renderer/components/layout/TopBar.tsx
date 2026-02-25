import React, { useCallback, useState, useEffect, useRef } from 'react'
import {
  Search, Save, Play, Square, Zap, Eraser, Eye, ChevronDown,
  Plus, Settings2, Wifi, WifiOff, Trash2, EyeOff, FileText,
  RefreshCw, AlertTriangle
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select } from '../ui/select'
import { Badge } from '../ui/badge'
import { ThemeToggle } from '../ui/ThemeToggle'
import { LicenseStatusPill } from '@/features/licensing/LicenseStatusPill'
import { useSearchStore } from '@/stores/searchStore'
import { useAppStore } from '@/stores/appStore'
import { useViewStore } from '@/stores/viewStore'
import { useLicenseStore } from '@/stores/licenseStore'
import { timeAgo } from '@/lib/utils'
import { invoke } from '@/hooks/useIpc'

const SORT_OPTIONS = [
  { value: 'NewlyListed', label: 'Newly Listed' },
  { value: 'PriceLow', label: 'Price: Low to High' },
  { value: 'PriceHigh', label: 'Price: High to Low' },
  { value: 'EndingSoon', label: 'Ending Soon' },
  { value: 'BestMatch', label: 'Best Match' }
]

interface TopBarProps {
  onSaveMonitor?: () => void
  onCreateView?: () => void
  onManageViews?: () => void
}

export function TopBar({ onSaveMonitor, onCreateView, onManageViews }: TopBarProps): React.JSX.Element {
  const { query, setQuery, sortBy, setSortBy, runSearch, loading, clearSession, dismissAll, showDismissed, setShowDismissed } = useSearchStore()
  const { engineStatus, startEngine, stopEngine, fetchEngineStatus, activeTab, setActiveTab } = useAppStore()
  const { views, activeViewId, setActiveView } = useViewStore()
  const { entitlements, setShowActivateModal } = useLicenseStore()
  const engineAllowed = entitlements.status === 'trial' || entitlements.status === 'active' || entitlements.status === 'grace'
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false)
  const [clearMenuOpen, setClearMenuOpen] = useState(false)
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const viewDropRef = useRef<HTMLDivElement>(null)
  const clearMenuRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      if (viewDropRef.current && !viewDropRef.current.contains(e.target as Node)) setViewDropdownOpen(false)
      if (clearMenuRef.current && !clearMenuRef.current.contains(e.target as Node)) { setClearMenuOpen(false); setDeleteConfirm(false) }
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusPopoverOpen(false)
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

  const handleDelete = async (): Promise<void> => {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }
    await invoke('listings:deleteByScope', { scope: 'all' })
    clearSession()
    setClearMenuOpen(false)
    setDeleteConfirm(false)
  }

  const activeView = views.find(v => v.id === activeViewId)
  const isSearchTab = activeTab === 'search'

  const isDisconnected = !engineStatus.mockMode && !engineStatus.connected && engineStatus.running

  return (
    <div className="flex flex-col shrink-0">
      {/* Disconnected banner */}
      {isDisconnected && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 border-b border-destructive/30 text-xs text-destructive">
          <AlertTriangle size={12} />
          <span className="flex-1">Monitoring paused — connection lost. Check eBay credentials in Settings.</span>
          <Button size="xs" variant="outline" className="text-destructive border-destructive/30 h-5" onClick={() => { fetchEngineStatus(); startEngine() }}>
            <RefreshCw size={10} className="mr-1" />
            Reconnect
          </Button>
          <Button size="xs" variant="ghost" className="text-destructive h-5" onClick={() => setActiveTab('settings')}>
            Settings
          </Button>
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

        {/* View selector */}
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

        {/* Clear menu */}
        {isSearchTab && (
          <div ref={clearMenuRef} className="relative">
            <Button size="xs" variant="outline" onClick={() => setClearMenuOpen(!clearMenuOpen)} title="Clear / Dismiss">
              <Eraser size={12} className="mr-1" />
              Clear
              <ChevronDown size={8} className="ml-0.5" />
            </Button>
            {clearMenuOpen && (
              <div className="absolute z-50 mt-1 right-0 w-56 rounded-md border border-border bg-card shadow-lg py-1">
                <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 flex items-center gap-2" onClick={() => { clearSession(); setClearMenuOpen(false) }}>
                  <Eraser size={11} /> Clear screen (session only)
                  <kbd className="ml-auto text-[9px] bg-muted px-1 rounded opacity-60">Ctrl+L</kbd>
                </button>
                <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 flex items-center gap-2" onClick={() => { dismissAll(); setClearMenuOpen(false) }}>
                  <EyeOff size={11} /> Dismiss all in view
                </button>
                <div className="h-px bg-border my-1" />
                <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 flex items-center gap-2" onClick={() => setShowDismissed(!showDismissed)}>
                  <Eye size={11} /> {showDismissed ? 'Hide dismissed' : 'Show dismissed'}
                </button>
                <div className="h-px bg-border my-1" />
                <button
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-destructive/10 text-destructive flex items-center gap-2"
                  onClick={handleDelete}
                >
                  <Trash2 size={11} />
                  {deleteConfirm ? 'Click again to confirm delete' : 'Delete all listings (danger)'}
                </button>
              </div>
            )}
          </div>
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
          <Button
            size="xs"
            variant="secondary"
            onClick={engineAllowed ? startEngine : () => setShowActivateModal(true)}
            title={engineAllowed ? 'Start monitoring engine' : 'License required to start engine'}
          >
            <Play size={12} className="mr-1" />
            Start
          </Button>
        )}

        <ThemeToggle />

        <LicenseStatusPill />

        {/* Status pill - clickable with popover */}
        <div ref={statusRef} className="relative flex items-center gap-2 shrink-0 ml-auto">
          <button
            onClick={() => setStatusPopoverOpen(!statusPopoverOpen)}
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer"
          >
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
            <span className="text-[10px] text-muted-foreground">
              {engineStatus.apiCallsToday}/{engineStatus.apiCallLimit}
            </span>
          </button>

          {/* Status popover */}
          {statusPopoverOpen && (
            <div className="absolute z-50 mt-1 right-0 top-full w-64 rounded-md border border-border bg-card shadow-lg p-3">
              <h4 className="text-xs font-semibold mb-2">Engine Status</h4>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                <span className="text-muted-foreground">Status</span>
                <span>{engineStatus.running ? 'Running' : 'Stopped'}</span>
                <span className="text-muted-foreground">Mode</span>
                <span>{engineStatus.mockMode ? 'Mock' : 'Live'}</span>
                <span className="text-muted-foreground">Active monitors</span>
                <span>{engineStatus.activeMonitors}</span>
                <span className="text-muted-foreground">API calls</span>
                <span>{engineStatus.apiCallsToday} / {engineStatus.apiCallLimit}</span>
                <span className="text-muted-foreground">Last check</span>
                <span>{engineStatus.lastCheckTime ? timeAgo(engineStatus.lastCheckTime) : 'Never'}</span>
                <span className="text-muted-foreground">Connection</span>
                <span className={engineStatus.connected ? 'text-green-400' : 'text-yellow-400'}>
                  {engineStatus.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex gap-1.5 mt-3 pt-2 border-t border-border">
                <Button size="xs" variant="outline" className="flex-1" onClick={() => { setActiveTab('history'); setStatusPopoverOpen(false) }}>
                  <FileText size={10} className="mr-1" />
                  View Logs
                </Button>
                <Button size="xs" variant="outline" className="flex-1" onClick={() => { fetchEngineStatus(); startEngine() }}>
                  <RefreshCw size={10} className="mr-1" />
                  Reconnect
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
