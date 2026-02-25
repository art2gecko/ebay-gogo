import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, CellValueChangedEvent, RowClickedEvent } from 'ag-grid-community'
import { useMonitorStore } from '@/stores/monitorStore'
import { useAppStore } from '@/stores/appStore'
import { timeAgo } from '@/lib/utils'
import { invoke } from '@/hooks/useIpc'
import { showToast } from '../ui/Toast'
import { MonitorModal } from './MonitorModal'
import type { Monitor, MonitorCreateInput } from '@shared/types'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

interface ContextMenuState {
  x: number
  y: number
  visible: boolean
  monitor: Monitor | null
}

export function MonitorsBottomTable(): React.JSX.Element {
  const { monitors, fetchMonitors, updateMonitor, createMonitor, deleteMonitor } = useMonitorStore()
  const theme = useAppStore((s) => s.theme)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ x: 0, y: 0, visible: false, monitor: null })
  const [editMonitor, setEditMonitor] = useState<Monitor | null>(null)
  const gridRef = useRef<AgGridReact>(null)

  useEffect(() => {
    fetchMonitors()
  }, [fetchMonitors])

  useEffect(() => {
    const close = (): void => setContextMenu(p => ({ ...p, visible: false }))
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

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

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const rowNode = gridRef.current?.api?.getRenderedNodes().find(n => {
      const el = document.querySelector(`[row-id="${n.data?.id}"]`)
      if (!el) return false
      const rect = el.getBoundingClientRect()
      return e.clientY >= rect.top && e.clientY <= rect.bottom
    })
    setContextMenu({ x: e.clientX, y: e.clientY, visible: true, monitor: rowNode?.data || null })
  }, [])

  const handleTest = async (monitor: Monitor): Promise<void> => {
    showToast(`Testing: ${monitor.keywords.join(', ')}...`)
    try {
      const input: MonitorCreateInput = {
        enabled: monitor.enabled,
        group: monitor.group,
        keywords: monitor.keywords,
        searchInDesc: monitor.searchInDesc,
        priceMin: monitor.priceMin,
        priceMax: monitor.priceMax,
        condition: monitor.condition,
        format: monitor.format,
        freeShippingOnly: monitor.freeShippingOnly,
        excludeKeywords: monitor.excludeKeywords,
        sellerMinFeedback: monitor.sellerMinFeedback,
        usOnly: monitor.usOnly,
        totalPriceMode: monitor.totalPriceMode,
        allowSellers: monitor.allowSellers,
        denySellers: monitor.denySellers,
        intervalSec: monitor.intervalSec,
        viewType: monitor.viewType,
        site: monitor.site,
        locatedIn: monitor.locatedIn,
        shipsTo: monitor.shipsTo,
        categoryId: monitor.categoryId,
        categoryPath: monitor.categoryPath,
        includeSubcategories: monitor.includeSubcategories,
        viewId: monitor.viewId
      }
      const result = await invoke('monitors:testSearch', input)
      showToast(`Test: ${result.count} results found`)
    } catch {
      showToast('Test failed')
    }
  }

  const handleDuplicate = async (monitor: Monitor): Promise<void> => {
    const input: MonitorCreateInput = {
      enabled: monitor.enabled,
      group: monitor.group,
      keywords: [...monitor.keywords],
      searchInDesc: monitor.searchInDesc,
      priceMin: monitor.priceMin,
      priceMax: monitor.priceMax,
      condition: monitor.condition,
      format: monitor.format,
      freeShippingOnly: monitor.freeShippingOnly,
      excludeKeywords: [...monitor.excludeKeywords],
      sellerMinFeedback: monitor.sellerMinFeedback,
      usOnly: monitor.usOnly,
      totalPriceMode: monitor.totalPriceMode,
      allowSellers: [...monitor.allowSellers],
      denySellers: [...monitor.denySellers],
      intervalSec: monitor.intervalSec,
      viewType: monitor.viewType,
      site: monitor.site,
      locatedIn: monitor.locatedIn,
      shipsTo: monitor.shipsTo,
      categoryId: monitor.categoryId,
      categoryPath: monitor.categoryPath,
      includeSubcategories: monitor.includeSubcategories,
      viewId: monitor.viewId
    }
    await createMonitor(input)
    showToast('Monitor duplicated')
  }

  const handlePauseResume = async (monitor: Monitor): Promise<void> => {
    await updateMonitor({ id: monitor.id, enabled: !monitor.enabled })
    showToast(monitor.enabled ? 'Monitor paused' : 'Monitor resumed')
  }

  const handleResetDismissed = async (monitorId: number): Promise<void> => {
    await invoke('listings:resetDismissed', { monitorIds: [monitorId] })
    showToast('Dismissed listings reset for this monitor')
  }

  const handleExportJson = (monitor: Monitor): void => {
    const { id: _, status: _s, lastCheckAt: _l, createdAt: _c, updatedAt: _u, ...data } = monitor
    const json = JSON.stringify(data, null, 2)
    navigator.clipboard.writeText(json)
    showToast('Monitor JSON copied to clipboard')
  }

  // Actions column renderer
  const ActionsCellRenderer = useCallback((params: { data: Monitor }) => {
    return `<div class="flex items-center gap-0.5 h-full">
      <button class="monitor-action-test px-1 py-0.5 text-[10px] rounded hover:bg-primary/10 text-muted-foreground hover:text-primary" title="Test">&#9654;</button>
      <button class="monitor-action-edit px-1 py-0.5 text-[10px] rounded hover:bg-primary/10 text-muted-foreground hover:text-primary" title="Edit">&#9998;</button>
      <button class="monitor-action-dup px-1 py-0.5 text-[10px] rounded hover:bg-primary/10 text-muted-foreground hover:text-primary" title="Duplicate">&#10697;</button>
    </div>`
  }, [])

  const onRowClicked = useCallback((event: RowClickedEvent<Monitor>) => {
    if (!event.event) return
    const target = event.event.target as HTMLElement
    if (target.classList.contains('monitor-action-test') && event.data) {
      handleTest(event.data)
    } else if (target.classList.contains('monitor-action-edit') && event.data) {
      setEditMonitor(event.data)
    } else if (target.classList.contains('monitor-action-dup') && event.data) {
      handleDuplicate(event.data)
    }
  }, [])

  const columnDefs = useMemo<ColDef<Monitor>[]>(() => [
    {
      headerName: '',
      field: 'id' as keyof Monitor,
      width: 80,
      sortable: false,
      filter: false,
      cellRenderer: ActionsCellRenderer
    },
    {
      headerName: 'On',
      field: 'enabled',
      width: 50,
      cellDataType: 'boolean',
      editable: true
    },
    {
      headerName: 'Group',
      field: 'group',
      width: 80,
      editable: true
    },
    {
      headerName: 'Keywords',
      field: 'keywords' as keyof Monitor,
      flex: 1,
      minWidth: 130,
      editable: true,
      valueFormatter: (p) => Array.isArray(p.value) ? p.value.join(', ') : String(p.value || '')
    },
    {
      headerName: 'Min$',
      field: 'priceMin',
      width: 60,
      editable: true,
      valueFormatter: (p) => p.value != null ? `$${p.value}` : ''
    },
    {
      headerName: 'Max$',
      field: 'priceMax',
      width: 60,
      editable: true,
      valueFormatter: (p) => p.value != null ? `$${p.value}` : ''
    },
    {
      headerName: 'Cond',
      field: 'condition',
      width: 75,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['Any', 'New', 'Open Box', 'Refurbished', 'Used'] }
    },
    {
      headerName: 'Type',
      field: 'format',
      width: 70,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['BuyItNow', 'Auction', 'All'] }
    },
    {
      headerName: 'Int(s)',
      field: 'intervalSec',
      width: 55,
      editable: true
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 80,
      cellRenderer: (params: { value: string }) => {
        const styleMap: Record<string, string> = {
          OK: 'color:#22c55e',
          Idle: 'color:#94a3b8',
          RateLimited: 'color:#f59e0b',
          AuthError: 'color:#ef4444',
          Error: 'color:#ef4444'
        }
        return `<span style="${styleMap[params.value] || ''};font-size:10px;font-weight:500">${params.value}</span>`
      }
    },
    {
      headerName: 'Last Check',
      field: 'lastCheckAt',
      width: 85,
      valueFormatter: (p) => p.value ? timeAgo(p.value) : 'Never'
    }
  ], [ActionsCellRenderer])

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    suppressMovable: false
  }), [])

  return (
    <div className={`${theme === 'dark' ? 'ag-theme-alpine-dark' : 'ag-theme-alpine'} h-full w-full relative`} onContextMenu={handleContextMenu}>
      <AgGridReact<Monitor>
        ref={gridRef}
        rowData={monitors}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        onCellValueChanged={onCellValueChanged}
        onRowClicked={onRowClicked}
        getRowId={(params) => String(params.data.id)}
        singleClickEdit={true}
        stopEditingWhenCellsLoseFocus={true}
        animateRows={true}
        rowHeight={30}
        headerHeight={28}
        overlayNoRowsTemplate='<span class="text-muted-foreground text-xs">No monitors yet. Create one to start tracking.</span>'
      />

      {/* Context menu */}
      {contextMenu.visible && contextMenu.monitor && (
        <div
          className="fixed z-[100] min-w-[200px] rounded-md border border-border bg-card shadow-lg py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50" onClick={() => handleTest(contextMenu.monitor!)}>
            Test (run once)
          </button>
          <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50" onClick={() => setEditMonitor(contextMenu.monitor!)}>
            Edit
          </button>
          <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50" onClick={() => handleDuplicate(contextMenu.monitor!)}>
            Duplicate
          </button>
          <div className="h-px bg-border my-1" />
          <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50" onClick={() => handlePauseResume(contextMenu.monitor!)}>
            {contextMenu.monitor.enabled ? 'Pause' : 'Resume'}
          </button>
          <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50" onClick={() => handleResetDismissed(contextMenu.monitor!.id)}>
            Reset dismissed for this monitor
          </button>
          <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50" onClick={() => handleExportJson(contextMenu.monitor!)}>
            Export monitor JSON
          </button>
          <div className="h-px bg-border my-1" />
          <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 text-destructive" onClick={() => { deleteMonitor(contextMenu.monitor!.id); showToast('Monitor deleted') }}>
            Delete
          </button>
        </div>
      )}

      {/* Edit monitor modal */}
      {editMonitor && (
        <MonitorModal
          open={true}
          onClose={() => setEditMonitor(null)}
          editMonitor={editMonitor}
        />
      )}
    </div>
  )
}
