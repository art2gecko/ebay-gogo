import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef } from 'ag-grid-community'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select } from '../ui/select'
import { invoke } from '@/hooks/useIpc'
import { useMonitorStore } from '@/stores/monitorStore'
import { useAppStore } from '@/stores/appStore'
import { formatPrice, timeAgo } from '@/lib/utils'
import type { Listing } from '@shared/types'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

export function HistoryTab(): React.JSX.Element {
  const { monitors } = useMonitorStore()
  const theme = useAppStore((s) => s.theme)
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  // Filters
  const [monitorId, setMonitorId] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const monitorOptions = useMemo(() => [
    { value: '', label: 'All Monitors' },
    ...monitors.map((m) => ({
      value: String(m.id),
      label: m.keywords.join(', ').slice(0, 40)
    }))
  ], [monitors])

  const fetchListings = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { limit: 500, offset: 0 }
      if (monitorId) params.monitorId = Number(monitorId)
      if (dateFrom) params.dateFrom = new Date(dateFrom).toISOString()
      if (dateTo) params.dateTo = new Date(dateTo).toISOString()

      const [data, count] = await Promise.all([
        invoke('listings:getAll', params as { limit?: number; offset?: number; monitorId?: number; dateFrom?: string; dateTo?: string }),
        invoke('listings:count', { monitorId: monitorId ? Number(monitorId) : undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })
      ])
      setListings(data)
      setTotalCount(count)
    } finally {
      setLoading(false)
    }
  }, [monitorId, dateFrom, dateTo])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  const handleExportCsv = useCallback(async () => {
    const csv = await invoke('listings:exportCsv', {
      monitorId: monitorId ? Number(monitorId) : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined
    })
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ebay-gogo-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [monitorId, dateFrom, dateTo])

  const columnDefs = useMemo<ColDef<Listing>[]>(() => [
    { headerName: 'Title', field: 'title', flex: 2, minWidth: 200, filter: 'agTextColumnFilter' },
    { headerName: 'Price', field: 'price', width: 85, valueFormatter: (p) => formatPrice(p.value) },
    { headerName: 'Shipping', field: 'shipping', width: 80, valueFormatter: (p) => p.value === 0 ? 'Free' : formatPrice(p.value) },
    { headerName: 'Total', field: 'total', width: 85, valueFormatter: (p) => formatPrice(p.value) },
    { headerName: 'Condition', field: 'condition', width: 100 },
    { headerName: 'Seller', field: 'sellerName', width: 120 },
    { headerName: 'FB', field: 'sellerFeedback', width: 65 },
    { headerName: 'Posted', field: 'postedAt', width: 100, valueFormatter: (p) => timeAgo(p.value) },
    { headerName: 'Found', field: 'foundAt', width: 100, valueFormatter: (p) => timeAgo(p.value) },
    { headerName: 'Item ID', field: 'itemId', width: 120 }
  ], [])

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true
  }), [])

  return (
    <div className="flex-1 flex flex-col min-h-0 p-3 gap-3">
      {/* Filters bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-sm font-semibold">History</h2>

        <Select
          value={monitorId}
          onChange={(e) => setMonitorId(e.target.value)}
          options={monitorOptions}
          className="h-7 text-xs w-44"
        />

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">From:</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-7 text-xs w-32"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">To:</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-7 text-xs w-32"
          />
        </div>

        <Button size="xs" variant="outline" onClick={fetchListings} disabled={loading}>
          <RefreshCw size={12} className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>

        <Button size="xs" variant="outline" onClick={handleExportCsv}>
          <Download size={12} className="mr-1" />
          Export CSV
        </Button>

        <span className="text-xs text-muted-foreground ml-auto">
          {totalCount.toLocaleString()} listing(s)
        </span>
      </div>

      {/* Results grid */}
      <div className={`${theme === 'dark' ? 'ag-theme-alpine-dark' : 'ag-theme-alpine'} flex-1`}>
        <AgGridReact<Listing>
          rowData={listings}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          getRowId={(params) => params.data.itemId}
          animateRows={true}
          enableCellTextSelection={true}
        />
      </div>
    </div>
  )
}
