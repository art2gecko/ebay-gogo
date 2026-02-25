import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, RowClickedEvent, CellKeyDownEvent, ColumnMovedEvent, ColumnResizedEvent, SortChangedEvent } from 'ag-grid-community'
import { useSearchStore } from '@/stores/searchStore'
import { useAppStore } from '@/stores/appStore'
import { useViewStore } from '@/stores/viewStore'
import { formatPrice, timeSince, secondsSince, copyToClipboard } from '@/lib/utils'
import { openExternal } from '@/hooks/useIpc'
import { Rows3, Rows4, X } from 'lucide-react'
import type { Listing } from '@shared/types'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

interface ContextMenuState {
  x: number
  y: number
  visible: boolean
  listing: Listing | null
}

export function ResultsGrid(): React.JSX.Element {
  const {
    results, selectedListing, setSelectedListing, ignoreSeller, addExcludeKeyword,
    showDismissed, setShowDismissed, dismissItems, dismissAll, clearSession,
    density, setDensity, filters, setFilter, resetFilters
  } = useSearchStore()
  const theme = useAppStore((s) => s.theme)
  const { activeViewId, updateView } = useViewStore()
  const gridRef = useRef<AgGridReact>(null)
  const selectedRef = useRef<Listing | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ x: 0, y: 0, visible: false, listing: null })
  const columnSaveTimerRef = useRef<ReturnType<typeof setTimeout>>()
  // Force re-render for "time since" column every 10s
  const [, setTick] = useState(0)

  selectedRef.current = selectedListing

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 10000)
    return () => clearInterval(timer)
  }, [])

  const displayResults = useMemo(() => {
    if (showDismissed) return results
    return results.filter(r => !r.dismissedAt)
  }, [results, showDismissed])

  const isCompact = density === 'compact'
  const rowHeight = isCompact ? 28 : 38
  const headerHeight = isCompact ? 28 : 32
  const fontSize = isCompact ? '10px' : '11px'
  const imgSize = isCompact ? 22 : 30

  const columnDefs = useMemo<ColDef<Listing>[]>(() => [
    {
      headerName: '',
      field: 'images',
      width: isCompact ? 36 : 50,
      sortable: false,
      filter: false,
      cellRenderer: (params: { value: string[] }) => {
        const src = params.value?.[0]
        if (!src) return ''
        const escaped = src.replace(/"/g, '&quot;')
        return `<img src="${escaped}" style="width:${imgSize}px;height:${imgSize}px;object-fit:cover;border-radius:3px;" alt="" />`
      }
    },
    { headerName: 'Title', field: 'title', flex: 2, minWidth: 180, filter: 'agTextColumnFilter' },
    { headerName: 'Price', field: 'price', width: isCompact ? 78 : 90, valueFormatter: (p) => formatPrice(p.value) },
    {
      headerName: 'Ship', field: 'shipping', width: isCompact ? 62 : 75,
      valueFormatter: (p) => p.value === 0 ? 'Free' : formatPrice(p.value),
      cellStyle: (p) => p.value === 0 ? { color: '#22c55e' } : undefined
    },
    { headerName: 'Total', field: 'total', width: isCompact ? 78 : 90, valueFormatter: (p) => formatPrice(p.value) },
    { headerName: 'Cond', field: 'condition', width: isCompact ? 75 : 90, filter: 'agTextColumnFilter' },
    { headerName: 'Seller', field: 'sellerName', width: isCompact ? 90 : 120, filter: 'agTextColumnFilter' },
    {
      headerName: 'FB', field: 'sellerFeedback', width: 55,
      valueFormatter: (p) => p.value?.toLocaleString() || '0',
      cellStyle: (p) => {
        const minFB = useSearchStore.getState().filters.sellerMinFeedback
        if (minFB > 0 && p.value != null && p.value < minFB) return { color: '#f59e0b' }
        return undefined
      }
    },
    {
      headerName: 'Offer', field: 'bestOffer', width: 50,
      cellRenderer: (p: { value: boolean }) => p.value
        ? '<span style="color:#22c55e;font-weight:600" title="Best Offer available">BO</span>'
        : ''
    },
    {
      headerName: 'Since', field: 'foundAt', width: 60,
      valueFormatter: (p) => timeSince(p.value),
      cellStyle: (p) => {
        const secs = secondsSince(p.value)
        if (secs <= 60) return { color: '#22c55e', fontWeight: '700' }
        if (secs <= 300) return { color: '#22c55e' }
        return undefined
      }
    },
    ...(showDismissed ? [{
      headerName: 'Dismissed',
      field: 'dismissedAt' as keyof Listing,
      width: 80,
      valueFormatter: (p: { value: unknown }) => p.value ? timeSince(p.value as string) : ''
    }] : [])
  ], [showDismissed, isCompact, imgSize])

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    suppressMovable: false
  }), [])

  const onRowClicked = useCallback((event: RowClickedEvent<Listing>) => {
    if (event.data) setSelectedListing(event.data)
  }, [setSelectedListing])

  const saveColumnState = useCallback(() => {
    if (!activeViewId || !gridRef.current?.api) return
    if (columnSaveTimerRef.current) clearTimeout(columnSaveTimerRef.current)
    columnSaveTimerRef.current = setTimeout(() => {
      const api = gridRef.current?.api
      if (!api) return
      const colState = api.getColumnState()
      const columns = colState.map(c => ({
        colId: c.colId,
        width: c.width,
        hide: c.hide,
        pinned: c.pinned as 'left' | 'right' | null,
        sort: c.sort as 'asc' | 'desc' | null,
        sortIndex: c.sortIndex
      }))
      updateView({ id: activeViewId, columns }).catch(() => {})
    }, 1000)
  }, [activeViewId, updateView])

  const onColumnMoved = useCallback((_e: ColumnMovedEvent) => saveColumnState(), [saveColumnState])
  const onColumnResized = useCallback((_e: ColumnResizedEvent) => saveColumnState(), [saveColumnState])
  const onSortChanged = useCallback((_e: SortChangedEvent) => saveColumnState(), [saveColumnState])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    // Find the listing under the cursor from AG Grid
    const rowNode = gridRef.current?.api?.getRenderedNodes().find(n => {
      const el = document.querySelector(`[row-id="${n.data?.itemId}"]`)
      if (!el) return false
      const rect = el.getBoundingClientRect()
      return e.clientY >= rect.top && e.clientY <= rect.bottom
    })
    setContextMenu({ x: e.clientX, y: e.clientY, visible: true, listing: rowNode?.data || selectedRef.current })
  }, [])

  useEffect(() => {
    const close = (): void => setContextMenu(p => ({ ...p, visible: false }))
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  const getSelectedItemIds = (): string[] => {
    const rows = gridRef.current?.api?.getSelectedRows() || []
    return rows.map(r => r.itemId)
  }

  const handleDismissSelected = async (): Promise<void> => {
    const ids = getSelectedItemIds()
    if (ids.length === 0 && contextMenu.listing) {
      await dismissItems([contextMenu.listing.itemId])
    } else if (ids.length > 0) {
      await dismissItems(ids)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l' && !e.shiftKey) {
        e.preventDefault()
        clearSession()
        return
      }

      const listing = selectedRef.current
      if (!listing) return

      switch (e.key.toLowerCase()) {
        case 'b':
          openExternal(listing.url)
          break
        case 'o':
          if (listing.bestOffer) openExternal(listing.url + '?_trksid=p2047675.l1557')
          break
        case 'c':
          if (!e.ctrlKey && !e.metaKey) copyToClipboard(listing.url)
          break
        case 'i':
          ignoreSeller(listing.sellerName)
          break
        case 'e': {
          const sel = window.getSelection()?.toString().trim()
          const keyword = sel || listing.title.split(' ')[0]
          if (keyword) addExcludeKeyword(keyword)
          break
        }
        case 'd':
          dismissItems([listing.itemId])
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [ignoreSeller, addExcludeKeyword, clearSession, dismissItems])

  const onCellKeyDown = useCallback((event: CellKeyDownEvent<Listing>) => {
    const e = event.event as KeyboardEvent | undefined
    if (!e) return
    if (e.key === 'Enter' && event.data) setSelectedListing(event.data)
  }, [setSelectedListing])

  // Build active filter chips
  const activeChips: { label: string; key: string }[] = []
  if (filters.format !== 'All') activeChips.push({ label: filters.format === 'BuyItNow' ? 'BIN' : 'Auction', key: 'format' })
  if (filters.usOnly) activeChips.push({ label: 'US Only', key: 'usOnly' })
  if (filters.freeShippingOnly) activeChips.push({ label: 'Free Ship', key: 'freeShippingOnly' })
  if (filters.totalPriceMode) activeChips.push({ label: 'Total Price', key: 'totalPriceMode' })
  if (filters.condition !== 'Any') activeChips.push({ label: filters.condition, key: 'condition' })
  if (filters.priceMin != null) activeChips.push({ label: `Min $${filters.priceMin}`, key: 'priceMin' })
  if (filters.priceMax != null) activeChips.push({ label: `Max $${filters.priceMax}`, key: 'priceMax' })
  if (filters.sellerMinFeedback > 0) activeChips.push({ label: `FB ≥${filters.sellerMinFeedback}`, key: 'sellerMinFeedback' })
  filters.excludeKeywords.forEach((kw, i) => activeChips.push({ label: `-${kw}`, key: `exclude-${i}` }))

  const removeChip = (key: string): void => {
    if (key === 'format') setFilter('format', 'All')
    else if (key === 'usOnly') setFilter('usOnly', false)
    else if (key === 'freeShippingOnly') setFilter('freeShippingOnly', false)
    else if (key === 'totalPriceMode') setFilter('totalPriceMode', false)
    else if (key === 'condition') setFilter('condition', 'Any')
    else if (key === 'priceMin') setFilter('priceMin', null)
    else if (key === 'priceMax') setFilter('priceMax', null)
    else if (key === 'sellerMinFeedback') setFilter('sellerMinFeedback', 0)
    else if (key.startsWith('exclude-')) {
      const idx = parseInt(key.split('-')[1])
      const updated = filters.excludeKeywords.filter((_, i) => i !== idx)
      setFilter('excludeKeywords', updated)
    }
  }

  // Custom CSS for zebra striping and new-item accent
  const customCss = `
    .ebay-grid .ag-row-even { background-color: var(--ag-background-color) !important; }
    .ebay-grid .ag-row-odd { background-color: color-mix(in srgb, var(--ag-background-color), var(--ag-foreground-color) 3%) !important; }
    .ebay-grid .ag-row.row-new { border-left: 3px solid #22c55e !important; background-color: color-mix(in srgb, var(--ag-background-color), #22c55e 6%) !important; }
    .ebay-grid .ag-row.row-dismissed { opacity: 0.45; }
    .ebay-grid .ag-cell { display: flex; align-items: center; font-size: ${fontSize}; }
    .ebay-grid .ag-header-cell-label { font-size: ${fontSize}; }
  `

  return (
    <div className="flex-1 flex flex-col w-full min-h-0">
      {/* Filter chips bar + density toggle */}
      {(activeChips.length > 0 || showDismissed) && (
        <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border bg-card/50 shrink-0 overflow-x-auto">
          {activeChips.map((chip) => (
            <span key={chip.key} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium shrink-0">
              {chip.label}
              <button onClick={() => removeChip(chip.key)} className="hover:text-primary/70 ml-0.5"><X size={9} /></button>
            </span>
          ))}
          {activeChips.length > 2 && (
            <button onClick={resetFilters} className="text-[10px] text-muted-foreground hover:text-foreground shrink-0 ml-1">
              Clear all
            </button>
          )}
          {showDismissed && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 text-[10px] font-medium shrink-0">
              Showing dismissed
              <button onClick={() => setShowDismissed(false)} className="hover:text-yellow-400 ml-0.5"><X size={9} /></button>
            </span>
          )}
          <div className="ml-auto shrink-0 flex items-center gap-1">
            <button
              onClick={() => setDensity(isCompact ? 'comfortable' : 'compact')}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              title={isCompact ? 'Comfortable mode' : 'Compact mode'}
            >
              {isCompact ? <Rows3 size={13} /> : <Rows4 size={13} />}
            </button>
          </div>
        </div>
      )}

      {/* Density toggle when no chips (always accessible) */}
      {activeChips.length === 0 && !showDismissed && (
        <div className="flex items-center justify-end px-2 py-0.5 border-b border-border bg-card/50 shrink-0">
          <button
            onClick={() => setDensity(isCompact ? 'comfortable' : 'compact')}
            className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            title={isCompact ? 'Comfortable mode' : 'Compact mode'}
          >
            {isCompact ? <Rows3 size={13} /> : <Rows4 size={13} />}
          </button>
        </div>
      )}

      <style>{customCss}</style>
      <div className={`${theme === 'dark' ? 'ag-theme-alpine-dark' : 'ag-theme-alpine'} ebay-grid flex-1 w-full relative`} onContextMenu={handleContextMenu}>
        <AgGridReact<Listing>
          ref={gridRef}
          rowData={displayResults}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onRowClicked={onRowClicked}
          onCellKeyDown={onCellKeyDown}
          onColumnMoved={onColumnMoved}
          onColumnResized={onColumnResized}
          onSortChanged={onSortChanged}
          rowSelection="multiple"
          animateRows={true}
          rowHeight={rowHeight}
          headerHeight={headerHeight}
          getRowId={(params) => params.data.itemId}
          suppressCellFocus={false}
          enableCellTextSelection={true}
          overlayNoRowsTemplate='<span class="text-muted-foreground text-sm">No results</span>'
          rowClassRules={{
            'row-dismissed': (params) => !!params.data?.dismissedAt,
            'row-new': (params) => !params.data?.dismissedAt && secondsSince(params.data?.foundAt || '') <= 60
          }}
        />

        {contextMenu.visible && (
          <div
            className="fixed z-[100] min-w-[200px] rounded-md border border-border bg-card shadow-lg py-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {contextMenu.listing && (
              <>
                <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 flex justify-between" onClick={() => openExternal(contextMenu.listing!.url)}>
                  Open on eBay <span className="text-muted-foreground ml-4">B</span>
                </button>
                <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 flex justify-between" onClick={() => copyToClipboard(contextMenu.listing!.url)}>
                  Copy Link <span className="text-muted-foreground ml-4">C</span>
                </button>
                <div className="h-px bg-border my-1" />
              </>
            )}
            <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 flex justify-between" onClick={handleDismissSelected}>
              Dismiss Selected <span className="text-muted-foreground ml-4">D</span>
            </button>
            <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50" onClick={() => dismissAll()}>
              Dismiss All (Current View)
            </button>
            <div className="h-px bg-border my-1" />
            {contextMenu.listing && (
              <>
                <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 flex justify-between" onClick={() => ignoreSeller(contextMenu.listing!.sellerName)}>
                  Ignore Seller <span className="text-muted-foreground ml-4">I</span>
                </button>
                <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 flex justify-between" onClick={() => {
                  const sel = window.getSelection()?.toString().trim()
                  const keyword = sel || contextMenu.listing!.title.split(' ')[0]
                  if (keyword) addExcludeKeyword(keyword)
                }}>
                  Add Exclude Keyword <span className="text-muted-foreground ml-4">E</span>
                </button>
                <div className="h-px bg-border my-1" />
              </>
            )}
            <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50" onClick={() => setShowDismissed(!showDismissed)}>
              {showDismissed ? 'Hide Dismissed' : 'Show Dismissed'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
