import React, { useCallback, useMemo, useEffect } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, CellValueChangedEvent } from 'ag-grid-community'
import { useMonitorStore } from '@/stores/monitorStore'
import { Badge } from '../ui/badge'
import { timeAgo } from '@/lib/utils'
import type { Monitor } from '@shared/types'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

export function MonitorsBottomTable(): React.JSX.Element {
  const { monitors, fetchMonitors, updateMonitor } = useMonitorStore()

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
        case 'enabled':
          update.enabled = value
          break
        case 'group':
          update.group = value
          break
        case 'keywords':
          update.keywords = typeof value === 'string'
            ? value.split(',').map((s: string) => s.trim()).filter(Boolean)
            : value
          break
        case 'priceMin':
          update.priceMin = value ? Number(value) : null
          break
        case 'priceMax':
          update.priceMax = value ? Number(value) : null
          break
        case 'condition':
          update.condition = value
          break
        case 'format':
          update.format = value
          break
        case 'intervalSec':
          update.intervalSec = Math.max(10, Number(value) || 60)
          break
        case 'searchInDesc':
          update.searchInDesc = value
          break
        case 'viewType':
          update.viewType = value
          break
        case 'site':
          update.site = value
          break
        default:
          return
      }

      await updateMonitor(update as { id: number } & Partial<Monitor>)
    },
    [updateMonitor]
  )

  const columnDefs = useMemo<ColDef<Monitor>[]>(() => [
    {
      headerName: 'On',
      field: 'enabled',
      width: 55,
      cellDataType: 'boolean',
      editable: true
    },
    {
      headerName: 'Group',
      field: 'group',
      width: 90,
      editable: true
    },
    {
      headerName: 'Keywords',
      field: 'keywords' as keyof Monitor,
      flex: 1,
      minWidth: 150,
      editable: true,
      valueFormatter: (p) => Array.isArray(p.value) ? p.value.join(', ') : String(p.value || '')
    },
    {
      headerName: 'Desc',
      field: 'searchInDesc',
      width: 55,
      cellDataType: 'boolean',
      editable: true
    },
    {
      headerName: 'Min$',
      field: 'priceMin',
      width: 65,
      editable: true,
      valueFormatter: (p) => p.value != null ? `$${p.value}` : ''
    },
    {
      headerName: 'Max$',
      field: 'priceMax',
      width: 65,
      editable: true,
      valueFormatter: (p) => p.value != null ? `$${p.value}` : ''
    },
    {
      headerName: 'Condition',
      field: 'condition',
      width: 90,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['Any', 'New', 'Open Box', 'Refurbished', 'Used']
      }
    },
    {
      headerName: 'Type',
      field: 'format',
      width: 80,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['BuyItNow', 'Auction', 'All']
      }
    },
    {
      headerName: 'Site',
      field: 'site',
      width: 80,
      editable: true
    },
    {
      headerName: 'Int(s)',
      field: 'intervalSec',
      width: 65,
      editable: true
    },
    {
      headerName: 'View',
      field: 'viewType',
      width: 85,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['Results', 'AuctionEnding']
      }
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 90,
      cellRenderer: (params: { value: string }) => {
        const colors: Record<string, string> = {
          OK: 'success',
          Idle: 'secondary',
          RateLimited: 'warning',
          AuthError: 'destructive',
          Error: 'destructive'
        }
        return `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium" style="background:var(--ag-background-color)">${params.value}</span>`
      }
    },
    {
      headerName: 'Last Check',
      field: 'lastCheckAt',
      width: 90,
      valueFormatter: (p) => p.value ? timeAgo(p.value) : 'Never'
    }
  ], [])

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    suppressMovable: false
  }), [])

  return (
    <div className="ag-theme-alpine-dark h-full w-full">
      <AgGridReact<Monitor>
        rowData={monitors}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        onCellValueChanged={onCellValueChanged}
        getRowId={(params) => String(params.data.id)}
        singleClickEdit={true}
        stopEditingWhenCellsLoseFocus={true}
        animateRows={true}
        overlayNoRowsTemplate='<span class="text-muted-foreground text-xs">No monitors yet. Create one to start tracking.</span>'
      />
    </div>
  )
}
