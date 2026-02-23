import { create } from 'zustand'
import type { Monitor, MonitorCreateInput, MonitorUpdateInput } from '@shared/types'
import { invoke } from '../hooks/useIpc'

interface MonitorStore {
  monitors: Monitor[]
  loading: boolean

  fetchMonitors: () => Promise<void>
  createMonitor: (input: MonitorCreateInput) => Promise<Monitor>
  updateMonitor: (input: MonitorUpdateInput) => Promise<Monitor>
  deleteMonitor: (id: number) => Promise<void>
  updateMonitorInList: (monitor: Monitor) => void
}

export const useMonitorStore = create<MonitorStore>((set, get) => ({
  monitors: [],
  loading: false,

  fetchMonitors: async () => {
    set({ loading: true })
    try {
      const monitors = await invoke('monitors:list')
      set({ monitors })
    } finally {
      set({ loading: false })
    }
  },

  createMonitor: async (input) => {
    const monitor = await invoke('monitors:create', input)
    set((s) => ({ monitors: [...s.monitors, monitor] }))
    return monitor
  },

  updateMonitor: async (input) => {
    const monitor = await invoke('monitors:update', input)
    set((s) => ({
      monitors: s.monitors.map((m) => (m.id === monitor.id ? monitor : m))
    }))
    return monitor
  },

  deleteMonitor: async (id) => {
    await invoke('monitors:delete', id)
    set((s) => ({ monitors: s.monitors.filter((m) => m.id !== id) }))
  },

  updateMonitorInList: (monitor) => {
    set((s) => ({
      monitors: s.monitors.map((m) => (m.id === monitor.id ? monitor : m))
    }))
  }
}))
