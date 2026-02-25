import React, { useEffect, useCallback, useState } from 'react'
import { TopBar } from './components/layout/TopBar'
import { NavTabs } from './components/layout/NavTabs'
import { SearchLayout } from './components/search/SearchLayout'
import { MonitorsTab } from './components/monitors/MonitorsTab'
import { HistoryTab } from './components/history/HistoryTab'
import { SettingsTab } from './components/settings/SettingsTab'
import { ToastContainer } from './components/ui/Toast'
import { ActivateLicenseModal } from './features/licensing/ActivateLicenseModal'
import { useAppStore } from './stores/appStore'
import { useMonitorStore } from './stores/monitorStore'
import { useSearchStore } from './stores/searchStore'
import { useViewStore } from './stores/viewStore'
import { useLicenseStore } from './stores/licenseStore'
import { useIpcEvent } from './hooks/useIpc'
import type { EngineStatus, Listing, Monitor } from '@shared/types'
import type { Entitlements } from '@shared/licensingTypes'

export default function App(): React.JSX.Element {
  const { activeTab, fetchEngineStatus, setEngineStatus } = useAppStore()
  const { fetchMonitors, updateMonitorInList } = useMonitorStore()
  const { fetchViews } = useViewStore()
  const { fetchEntitlements, setEntitlements } = useLicenseStore()
  const [showSaveMonitor, setShowSaveMonitor] = useState(false)
  const [showCreateView, setShowCreateView] = useState(false)
  const [showManageViews, setShowManageViews] = useState(false)

  useEffect(() => {
    fetchEngineStatus()
    fetchMonitors()
    fetchViews()
    fetchEntitlements()
    useSearchStore.getState().loadPersistedPrefs()
  }, [fetchEngineStatus, fetchMonitors, fetchViews, fetchEntitlements])

  const handleStatusChanged = useCallback((status: EngineStatus) => {
    setEngineStatus(status)
  }, [setEngineStatus])

  const handleNewListings = useCallback((newListings: Listing[]) => {
    const { results: currentResults } = useSearchStore.getState()
    const existingIds = new Set(currentResults.map(l => l.itemId))
    const newOnes = (newListings as Listing[]).filter(l => !existingIds.has(l.itemId))
    if (newOnes.length > 0) {
      useSearchStore.setState({ results: [...newOnes, ...currentResults] })
    }
  }, [])

  const handleMonitorUpdated = useCallback((monitor: Monitor) => {
    updateMonitorInList(monitor)
  }, [updateMonitorInList])

  const handleEntitlementsChanged = useCallback((ent: Entitlements) => {
    setEntitlements(ent)
  }, [setEntitlements])

  useIpcEvent('engine:status-changed', handleStatusChanged)
  useIpcEvent('engine:new-listings', handleNewListings)
  useIpcEvent('monitor:updated', handleMonitorUpdated)
  useIpcEvent('license:entitlements-changed', handleEntitlementsChanged)

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar
        onSaveMonitor={() => setShowSaveMonitor(true)}
        onCreateView={() => setShowCreateView(true)}
        onManageViews={() => setShowManageViews(true)}
      />
      <NavTabs />
      <main className="flex-1 flex flex-col min-h-0">
        {activeTab === 'search' && (
          <SearchLayout
            showSaveMonitor={showSaveMonitor}
            onCloseSaveMonitor={() => setShowSaveMonitor(false)}
            showCreateView={showCreateView}
            onCloseCreateView={() => setShowCreateView(false)}
            showManageViews={showManageViews}
            onCloseManageViews={() => setShowManageViews(false)}
          />
        )}
        {activeTab === 'monitors' && <MonitorsTab />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>
      <ToastContainer />
      <ActivateLicenseModal />
    </div>
  )
}
