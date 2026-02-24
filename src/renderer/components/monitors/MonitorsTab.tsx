import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, CellValueChangedEvent, RowSelectedEvent } from 'ag-grid-community'
import { Button } from '../ui/button'
import { MonitorModal } from './MonitorModal'
import { useMonitorStore } from '@/stores/monitorStore'
import { timeAgo } from '@/lib/utils'
import type { Monitor } from '@shared/types'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

export function MonitorsTab(): React.JSX.Element {
  const { monitors, fetchMonitors, updateMonitor, deleteMonitor } = useMonitorStore()
  const [showModal, setShowModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

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
        <Button size="xs" onClick={() => setShowModal(true)}>
          <Plus size={12} className="mr-1" />
          New Monitor
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

      <div className="ag-theme-alpine-dark flex-1">
        <AgGridReact<Monitor>
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

      <MonitorModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  )
}
