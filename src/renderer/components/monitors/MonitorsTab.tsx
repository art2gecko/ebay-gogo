import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Plus, Trash2, Search } from 'lucide-react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, CellValueChangedEvent, RowSelectedEvent } from 'ag-grid-community'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { MonitorModal } from './MonitorModal'
import { Toast } from '../ui/Toast'
import { useMonitorStore } from '@/stores/monitorStore'
import { useAppStore } from '@/stores/appStore'
import { timeAgo } from '@/lib/utils'
import type { Monitor, MonitorCreateInput } from '@shared/types'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

export function MonitorsTab(): React.JSX.Element {
  const { monitors, fetchMonitors, updateMonitor, deleteMonitor, createMonitor } = useMonitorStore()
  const theme = useAppStore((s) => s.theme)
  const [showModal, setShowModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [quickKeywords, setQuickKeywords] = useState('')
  const [quickCreating, setQuickCreating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const gridRef = useRef<AgGridReact<Monitor>>(null)

  const handleQuickCreate = useCallback(async () => {
    const trimmed = quickKeywords.trim()
    if (!trimmed || quickCreating) return
    setQuickCreating(true)
    try {
      const input: MonitorCreateInput = {
        enabled: true,
        group: 'Default',
        keywords: trimmed.split(',').map((s) => s.trim()).filter(Boolean),
        searchInDesc: false,
        priceMin: null,
        priceMax: null,
        condition: 'Any',
        format: 'BuyItNow',
        freeShippingOnly: false,
        excludeKeywords: [],
        sellerMinFeedback: 0,
        usOnly: true,
        totalPriceMode: false,
        allowSellers: [],
        denySellers: [],
        intervalSec: 60,
        viewType: 'Results',
        site: 'EBAY-US',
        locatedIn: '',
        shipsTo: '',
        categoryId: '',
        categoryPath: '',
        includeSubcategories: false,
        viewId: ''
      }
      const monitor = await createMonitor(input)
      setQuickKeywords('')
      setToast('Monitor created and enabled')
      selectMonitorInGrid(monitor.id)
    } finally {
      setQuickCreating(false)
    }
  }, [quickKeywords, quickCreating, createMonitor])

  const handleMonitorCreated = useCallback((monitorId: number) => {
    setToast('Monitor created and enabled')
    // Slight delay to let the grid update
    setTimeout(() => selectMonitorInGrid(monitorId), 100)
  }, [])

  const selectMonitorInGrid = (monitorId: number) => {
    const api = gridRef.current?.api
    if (!api) return
    api.deselectAll()
    api.forEachNode(node => {
      if (node.data?.id === monitorId) {
        node.setSelected(true)
        api.ensureNodeVisible(node, 'middle')
      }
    })
  }

  useEffect(() => {
    fetchMonitors()
  }, [fetchMonitors])

  const onCellValueChanged = useCallback(
    async (event: CellValueChangedEvent<Monitor>) => {
      if (!event.data) return
      const field = event.colDef.field as string
      const value = event.newValue
      const update: Record<string, unknown> = { id: event.data.id }

      switch (field) {
        case 'enabled': update.enabled = value; break
        case 'group': update.group = value; break
        case 'keywords':
          update.keywords = typeof value === 'string'
            ? value.split(',').map((s: string) => s.trim()).filter(Boolean) : value
          break
        case 'priceMin': update.priceMin = value ? Number(value) : null; break
        case 'priceMax': update.priceMax = value ? Number(value) : null; break
        case 'condition': update.condition = value; break
        case 'format': update.format = value; break
        case 'intervalSec': update.intervalSec = Math.max(10, Number(value) || 60); break
        case 'searchInDesc': update.searchInDesc = value; break
        case 'viewType': update.viewType = value; break
        case 'site': update.site = value; break
        case 'freeShippingOnly': update.freeShippingOnly = value; break
        case 'usOnly': update.usOnly = value; break
        case 'sellerMinFeedback': update.sellerMinFeedback = Number(value) || 0; break
        default: return
      }
      await updateMonitor(update as { id: number } & Partial<Monitor>)
    },
    [updateMonitor]
  )

  const handleDelete = useCallback(async () => {
    for (const id of selectedIds) {
      await deleteMonitor(id)
    }
    setSelectedIds([])
  }, [selectedIds, deleteMonitor])

  const onRowSelected = useCallback((event: RowSelectedEvent<Monitor>) => {
    const api = event.api
    const selected = api.getSelectedRows()
    setSelectedIds(selected.map((m) => m.id))
  }, [])

  const columnDefs = useMemo<ColDef<Monitor>[]>(() => [
    { headerCheckboxSelection: true, checkboxSelection: true, width: 40, sortable: false, filter: false },
    { headerName: 'On', field: 'enabled', width: 55, cellDataType: 'boolean', editable: true },
    { headerName: 'Group', field: 'group', width: 100, editable: true },
    { headerName: 'Keywords', field: 'keywords' as keyof Monitor, flex: 1, minWidth: 180, editable: true,
      valueFormatter: (p) => Array.isArray(p.value) ? p.value.join(', ') : String(p.value || '') },
    { headerName: 'Desc', field: 'searchInDesc', width: 55, cellDataType: 'boolean', editable: true },
    { headerName: 'Min$', field: 'priceMin', width: 70, editable: true,
      valueFormatter: (p) => p.value != null ? `$${p.value}` : '' },
    { headerName: 'Max$', field: 'priceMax', width: 70, editable: true,
      valueFormatter: (p) => p.value != null ? `$${p.value}` : '' },
    { headerName: 'Category', field: 'categoryId', width: 85, editable: true },
    { headerName: 'Condition', field: 'condition', width: 90, editable: true,
      cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Any', 'New', 'Open Box', 'Refurbished', 'Used'] } },
    { headerName: 'Site', field: 'site', width: 80, editable: true },
    { headerName: 'Located', field: 'locatedIn', width: 80, editable: true },
    { headerName: 'Ships To', field: 'shipsTo', width: 80, editable: true },
    { headerName: 'Type', field: 'format', width: 80, editable: true,
      cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['BuyItNow', 'Auction', 'All'] } },
    { headerName: 'View', field: 'viewType', width: 90, editable: true,
      cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Results', 'AuctionEnding'] } },
    { headerName: 'Int(s)', field: 'intervalSec', width: 65, editable: true },
    { headerName: 'Status', field: 'status', width: 90 },
    { headerName: 'Last Check', field: 'lastCheckAt', width: 100,
      valueFormatter: (p) => p.value ? timeAgo(p.value) : 'Never' }
  ], [])

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    suppressMovable: false
  }), [])

  return (
    <div className="flex-1 flex flex-col min-h-0 p-3 gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">Monitors</h2>
        <div className="flex items-center gap-1.5 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={quickKeywords}
              onChange={(e) => setQuickKeywords(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleQuickCreate() }}
              placeholder="Type keywords and press Enter to create monitor..."
              className="h-7 text-xs pl-7"
            />
          </div>
          <Button size="xs" onClick={handleQuickCreate} disabled={!quickKeywords.trim() || quickCreating}>
            <Plus size={12} className="mr-1" />
            Add
          </Button>
        </div>
        <Button size="xs" variant="outline" onClick={() => setShowModal(true)}>
          <Plus size={12} className="mr-1" />
          Advanced
        </Button>
        {selectedIds.length > 0 && (
          <Button size="xs" variant="destructive" onClick={handleDelete}>
            <Trash2 size={12} className="mr-1" />
            Delete ({selectedIds.length})
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {monitors.length} monitor(s) &middot; {monitors.filter((m) => m.enabled).length} enabled
        </span>
      </div>

      <div className={`${theme === 'dark' ? 'ag-theme-alpine-dark' : 'ag-theme-alpine'} flex-1`}>
        <AgGridReact<Monitor>
          ref={gridRef}
          rowData={monitors}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onCellValueChanged={onCellValueChanged}
          onRowSelected={onRowSelected}
          getRowId={(params) => String(params.data.id)}
          rowSelection="multiple"
          singleClickEdit={true}
          stopEditingWhenCellsLoseFocus={true}
          animateRows={true}
        />
      </div>

      <MonitorModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={handleMonitorCreated}
      />

      <Toast
        message={toast || ''}
        visible={!!toast}
        onDismiss={() => setToast(null)}
      />
    </div>
  )
}
