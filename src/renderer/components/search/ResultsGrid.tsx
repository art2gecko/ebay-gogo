import React, { useCallback, useMemo, useRef, useEffect } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, RowClickedEvent, CellKeyDownEvent } from 'ag-grid-community'
import { useSearchStore } from '@/stores/searchStore'
import { useAppStore } from '@/stores/appStore'
import { formatPrice, timeAgo, copyToClipboard } from '@/lib/utils'
import { openExternal } from '@/hooks/useIpc'
import type { Listing } from '@shared/types'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

export function ResultsGrid(): React.JSX.Element {
  const { results, selectedListing, setSelectedListing, ignoreSeller, addExcludeKeyword } = useSearchStore()
  const theme = useAppStore((s) => s.theme)
  const gridRef = useRef<AgGridReact>(null)
  const selectedRef = useRef<Listing | null>(null)

  // Keep ref in sync so hotkey handler doesn't need selectedListing in deps
  selectedRef.current = selectedListing

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
    {
      headerName: 'Title',
      field: 'title',
      flex: 2,
      minWidth: 200,
      filter: 'agTextColumnFilter'
    },
    {
      headerName: 'Price',
      field: 'price',
      width: 90,
      valueFormatter: (p) => formatPrice(p.value)
    },
    {
      headerName: 'Ship',
      field: 'shipping',
      width: 75,
      valueFormatter: (p) => p.value === 0 ? 'Free' : formatPrice(p.value)
    },
    {
      headerName: 'Total',
      field: 'total',
      width: 90,
      valueFormatter: (p) => formatPrice(p.value)
    },
    {
      headerName: 'Condition',
      field: 'condition',
      width: 100,
      filter: 'agTextColumnFilter'
    },
    {
      headerName: 'Seller',
      field: 'sellerName',
      width: 120,
      filter: 'agTextColumnFilter'
    },
    {
      headerName: 'FB',
      field: 'sellerFeedback',
      width: 65,
      valueFormatter: (p) => p.value?.toLocaleString() || '0'
    },
    {
      headerName: 'Returns',
      field: 'returnsAccepted',
      width: 70,
      valueFormatter: (p) => p.value ? 'Yes' : 'No'
    },
    {
      headerName: 'Offer',
      field: 'bestOffer',
      width: 65,
      valueFormatter: (p) => p.value ? 'Yes' : 'No'
    },
    {
      headerName: 'Posted',
      field: 'postedAt',
      width: 95,
      valueFormatter: (p) => timeAgo(p.value)
    },
    {
      headerName: 'Found',
      field: 'foundAt',
      width: 95,
      valueFormatter: (p) => timeAgo(p.value)
    }
  ], [])

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    suppressMovable: false
  }), [])

  const onRowClicked = useCallback((event: RowClickedEvent<Listing>) => {
    if (event.data) {
      setSelectedListing(event.data)
    }
  }, [setSelectedListing])

  // Global hotkeys - uses ref to avoid re-adding listener on every selection change
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return

      const listing = selectedRef.current
      if (!listing) return

      switch (e.key.toLowerCase()) {
        case 'b':
          openExternal(listing.url)
          break
        case 'o':
          if (listing.bestOffer) {
            openExternal(listing.url + '?_trksid=p2047675.l1557')
          }
          break
        case 'c':
          copyToClipboard(listing.url)
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
    if (e.key === 'Enter' && event.data) {
      setSelectedListing(event.data)
    }
  }, [setSelectedListing])

  return (
    <div className={`${theme === 'dark' ? 'ag-theme-alpine-dark' : 'ag-theme-alpine'} flex-1 w-full`}>
      <AgGridReact<Listing>
        ref={gridRef}
        rowData={results}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        onRowClicked={onRowClicked}
        onCellKeyDown={onCellKeyDown}
        rowSelection="multiple"
        animateRows={true}
        getRowId={(params) => params.data.itemId}
        suppressCellFocus={false}
        enableCellTextSelection={true}
        overlayNoRowsTemplate='<span class="text-muted-foreground text-sm">No results</span>'
      />
    </div>
  )
}
