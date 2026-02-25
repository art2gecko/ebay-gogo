import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, RowClickedEvent, CellKeyDownEvent, ColumnMovedEvent, ColumnResizedEvent, SortChangedEvent } from 'ag-grid-community'
import { useSearchStore } from '@/stores/searchStore'
import { useAppStore } from '@/stores/appStore'
import { useViewStore } from '@/stores/viewStore'
import { formatPrice, timeAgo, copyToClipboard } from '@/lib/utils'
import { openExternal, invoke } from '@/hooks/useIpc'
import type { Listing } from '@shared/types'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

interface ContextMenuState {
  x: number
  y: number
  visible: boolean
}

interface ResultsGridProps {
  showDismissed: boolean
  onToggleShowDismissed: () => void
}

export function ResultsGrid({ showDismissed, onToggleShowDismissed }: ResultsGridProps): React.JSX.Element {
  const { results, selectedListing, setSelectedListing, ignoreSeller, addExcludeKeyword } = useSearchStore()
  const theme = useAppStore((s) => s.theme)
  const { activeViewId, updateView } = useViewStore()
  const gridRef = useRef<AgGridReact>(null)
  const selectedRef = useRef<Listing | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ x: 0, y: 0, visible: false })
  const columnSaveTimerRef = useRef<ReturnType<typeof setTimeout>>()

  selectedRef.current = selectedListing

  const displayResults = useMemo(() => {
    if (showDismissed) return results
    return results.filter(r => !r.dismissedAt)
  }, [results, showDismissed])

  const columnDefs = useMemo<ColDef<Listing>[]>(() => [
    {
      headerName: '',
      field: 'images',
      width: 50,
      sortable: false,
      filter: false,
      cellRenderer: (params: { value: string[] }) => {
        const src = params.value?.[0]
        if (!src) return ''
        const escaped = src.replace(/"/g, '&quot;')
        return `<img src="${escaped}" style="width:30px;height:30px;object-fit:cover;border-radius:3px;" alt="" />`
      }
    },
    { headerName: 'Title', field: 'title', flex: 2, minWidth: 200, filter: 'agTextColumnFilter' },
    { headerName: 'Price', field: 'price', width: 90, valueFormatter: (p) => formatPrice(p.value) },
    { headerName: 'Ship', field: 'shipping', width: 75, valueFormatter: (p) => p.value === 0 ? 'Free' : formatPrice(p.value) },
    { headerName: 'Total', field: 'total', width: 90, valueFormatter: (p) => formatPrice(p.value) },
    { headerName: 'Condition', field: 'condition', width: 100, filter: 'agTextColumnFilter' },
    { headerName: 'Seller', field: 'sellerName', width: 120, filter: 'agTextColumnFilter' },
    { headerName: 'FB', field: 'sellerFeedback', width: 65, valueFormatter: (p) => p.value?.toLocaleString() || '0' },
    { headerName: 'Returns', field: 'returnsAccepted', width: 70, valueFormatter: (p) => p.value ? 'Yes' : 'No' },
    { headerName: 'Offer', field: 'bestOffer', width: 65, valueFormatter: (p) => p.value ? 'Yes' : 'No' },
    { headerName: 'Posted', field: 'postedAt', width: 95, valueFormatter: (p) => timeAgo(p.value) },
    { headerName: 'Found', field: 'foundAt', width: 95, valueFormatter: (p) => timeAgo(p.value) },
    ...(showDismissed ? [{
      headerName: 'Dismissed',
      field: 'dismissedAt' as keyof Listing,
      width: 95,
      valueFormatter: (p: { value: unknown }) => p.value ? timeAgo(p.value as string) : ''
    }] : [])
  ], [showDismissed])

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
    setContextMenu({ x: e.clientX, y: e.clientY, visible: true })
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
    if (ids.length === 0) return
    await invoke('listings:dismiss', { itemIds: ids })
    useSearchStore.setState(s => ({
      results: s.results.map(r => ids.includes(r.itemId) ? { ...r, dismissedAt: new Date().toISOString() } : r)
    }))
  }

  const handleDismissAll = async (): Promise<void> => {
    await invoke('listings:dismissByView', {})
    useSearchStore.setState(s => ({
      results: s.results.map(r => ({ ...r, dismissedAt: r.dismissedAt || new Date().toISOString() }))
    }))
  }

  const handleResetDismissed = async (): Promise<void> => {
    await invoke('listings:resetDismissed', {})
    useSearchStore.setState(s => ({
      results: s.results.map(r => ({ ...r, dismissedAt: null }))
    }))
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return

      // Clear from screen: Ctrl+L
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l' && !e.shiftKey) {
        e.preventDefault()
        useSearchStore.setState({ results: [] })
        return
      }

      // Reset dismissed: Ctrl+Shift+L
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l' && e.shiftKey) {
        e.preventDefault()
        handleResetDismissed()
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
          const firstWord = listing.title.split(' ')[0]
          if (firstWord) addExcludeKeyword(firstWord)
          break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [ignoreSeller, addExcludeKeyword])

  const onCellKeyDown = useCallback((event: CellKeyDownEvent<Listing>) => {
    const e = event.event as KeyboardEvent | undefined
    if (!e) return
    if (e.key === 'Enter' && event.data) setSelectedListing(event.data)
  }, [setSelectedListing])

  return (
    <div className={`${theme === 'dark' ? 'ag-theme-alpine-dark' : 'ag-theme-alpine'} flex-1 w-full relative`} onContextMenu={handleContextMenu}>
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
        getRowId={(params) => params.data.itemId}
        suppressCellFocus={false}
        enableCellTextSelection={true}
        overlayNoRowsTemplate='<span class="text-muted-foreground text-sm">No results</span>'
        rowClassRules={{
          'opacity-50': (params) => !!params.data?.dismissedAt
        }}
      />

      {contextMenu.visible && (
        <div
          className="fixed z-[100] min-w-[180px] rounded-md border border-border bg-card shadow-lg py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50" onClick={handleDismissSelected}>
            Dismiss Selected
          </button>
          <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50" onClick={handleDismissAll}>
            Dismiss All (Current View)
          </button>
          <div className="h-px bg-border my-1" />
          <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50" onClick={handleResetDismissed}>
            Reset Dismissed
          </button>
          <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50" onClick={onToggleShowDismissed}>
            {showDismissed ? 'Hide Dismissed' : 'Show Dismissed'}
          </button>
        </div>
      )}
    </div>
  )
}
