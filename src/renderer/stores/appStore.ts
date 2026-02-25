import { create } from 'zustand'
import type { EngineStatus, AppSettings } from '@shared/types'
import { invoke } from '../hooks/useIpc'

export type TabId = 'search' | 'monitors' | 'history' | 'settings'
export type Theme = 'light' | 'dark'

interface AppStore {
  activeTab: TabId
  setActiveTab: (tab: TabId) => void

  theme: Theme
  toggleTheme: () => void

  engineStatus: EngineStatus
  setEngineStatus: (status: EngineStatus) => void
  fetchEngineStatus: () => Promise<void>
  startEngine: () => Promise<void>
  stopEngine: () => Promise<void>

  settings: AppSettings | null
  fetchSettings: () => Promise<void>
  saveSettings: (partial: Partial<AppSettings>) => Promise<void>
}

const defaultEngineStatus: EngineStatus = {
  running: false,
  connected: false,
  mockMode: true,
  apiCallsToday: 0,
  apiCallLimit: 5000,
  lastCheckTime: null,
  activeMonitors: 0
}

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark') return stored
  return 'dark'
}

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  localStorage.setItem('theme', theme)
}

export const useAppStore = create<AppStore>((set, get) => ({
  activeTab: 'search',
  setActiveTab: (tab) => set({ activeTab: tab }),

  theme: getInitialTheme(),
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    set({ theme: next })
  },

  engineStatus: defaultEngineStatus,
  setEngineStatus: (status) => set({ engineStatus: status }),

  fetchEngineStatus: async () => {
    const status = await invoke('engine:status')
    set({ engineStatus: status })
  },

  startEngine: async () => {
    await invoke('engine:start')
    await get().fetchEngineStatus()
  },

  stopEngine: async () => {
    await invoke('engine:stop')
    await get().fetchEngineStatus()
  },

  settings: null,

  fetchSettings: async () => {
    const settings = await invoke('settings:get')
    set({ settings })
  },

  saveSettings: async (partial) => {
    const settings = await invoke('settings:save', partial)
    set({ settings })
  }
}))
