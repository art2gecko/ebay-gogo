import React, { useState, useCallback, useRef } from 'react'
import { FilterSidebar } from './FilterSidebar'
import { ResultsGrid } from './ResultsGrid'
import { DetailsPane } from './DetailsPane'
import { ImagesPane } from './ImagesPane'
import { EmptyState } from './EmptyState'
import { MonitorsBottomTable } from '../monitors/MonitorsBottomTable'
import { MonitorModal } from '../monitors/MonitorModal'
import { useSearchStore } from '@/stores/searchStore'

export function SearchLayout(): React.JSX.Element {
  const { results, loading } = useSearchStore()
  const [showMonitorModal, setShowMonitorModal] = useState(false)
  const [bottomHeight, setBottomHeight] = useState(200)
  const [rightWidth, setRightWidth] = useState(300)
  const resizingRef = useRef<'bottom' | 'right' | null>(null)
  const startPosRef = useRef(0)
  const startSizeRef = useRef(0)

  const handleMouseDown = useCallback((direction: 'bottom' | 'right', e: React.MouseEvent) => {
    resizingRef.current = direction
    startPosRef.current = direction === 'bottom' ? e.clientY : e.clientX
    startSizeRef.current = direction === 'bottom' ? bottomHeight : rightWidth

    const handleMouseMove = (ev: MouseEvent): void => {
      if (!resizingRef.current) return
      if (resizingRef.current === 'bottom') {
        const delta = startPosRef.current - ev.clientY
        setBottomHeight(Math.max(100, Math.min(500, startSizeRef.current + delta)))
      } else {
        const delta = startPosRef.current - ev.clientX
        setRightWidth(Math.max(200, Math.min(500, startSizeRef.current + delta)))
      }
    }

    const handleMouseUp = (): void => {
      resizingRef.current = null
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = direction === 'bottom' ? 'row-resize' : 'col-resize'
    document.body.style.userSelect = 'none'
  }, [bottomHeight, rightWidth])

  const hasResults = results.length > 0 || loading

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 flex min-h-0">
        {/* Left: Filter sidebar */}
        <FilterSidebar />

        {/* Center + Right */}
        <div className="flex-1 flex min-h-0 min-w-0">
          {/* Center: Results grid or empty state */}
          <div className="flex-1 flex flex-col min-w-0">
            {hasResults ? (
              <ResultsGrid />
            ) : (
              <EmptyState onCreateMonitor={() => setShowMonitorModal(true)} />
            )}
          </div>

          {/* Right resize handle */}
          <div
            className="w-1 hover:bg-primary/50 cursor-col-resize shrink-0 bg-border"
            onMouseDown={(e) => handleMouseDown('right', e)}
          />

          {/* Right: Details + Images */}
          <div className="shrink-0 flex flex-col border-l border-border bg-card" style={{ width: rightWidth }}>
            <div className="flex-1 min-h-0 overflow-hidden">
              <DetailsPane />
            </div>
            <div className="h-px bg-border" />
            <div className="h-48 shrink-0">
              <ImagesPane />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom resize handle */}
      <div
        className="h-1 hover:bg-primary/50 cursor-row-resize shrink-0 bg-border"
        onMouseDown={(e) => handleMouseDown('bottom', e)}
      />

      {/* Bottom: Monitors table */}
      <div className="shrink-0 border-t border-border" style={{ height: bottomHeight }}>
        <MonitorsBottomTable />
      </div>

      {/* Monitor modal */}
      <MonitorModal open={showMonitorModal} onClose={() => setShowMonitorModal(false)} />
    </div>
  )
}
