import { create } from 'zustand'
import { invoke } from '../hooks/useIpc'
import type { Entitlements } from '@shared/licensingTypes'
import { UNLICENSED_ENTITLEMENTS } from '@shared/licensingTypes'

interface LicenseStore {
  entitlements: Entitlements
  deviceId: string | null
  loading: boolean
  activating: boolean
  activateError: string | null
  showActivateModal: boolean

  setEntitlements: (ent: Entitlements) => void
  fetchEntitlements: () => Promise<void>
  fetchDeviceId: () => Promise<void>
  activateLicense: (key: string) => Promise<boolean>
  deactivateLicense: () => Promise<boolean>
  refreshLicense: () => Promise<void>
  setShowActivateModal: (show: boolean) => void
  clearActivateError: () => void
}

export const useLicenseStore = create<LicenseStore>((set, get) => ({
  entitlements: UNLICENSED_ENTITLEMENTS,
  deviceId: null,
  loading: true,
  activating: false,
  activateError: null,
  showActivateModal: false,

  setEntitlements: (entitlements) => set({ entitlements }),

  fetchEntitlements: async () => {
    try {
      const entitlements = await invoke('license:getEntitlements')
      set({ entitlements, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  fetchDeviceId: async () => {
    try {
      const deviceId = await invoke('license:getDeviceId')
      set({ deviceId })
    } catch {
      // ignore
    }
  },

  activateLicense: async (key: string) => {
    set({ activating: true, activateError: null })
    try {
      const result = await invoke('license:activate', { licenseKey: key })
      if (result.success) {
        set({ entitlements: result.entitlements, activating: false, showActivateModal: false })
        return true
      } else {
        set({ activateError: result.error || 'Activation failed', activating: false })
        return false
      }
    } catch (err) {
      set({ activateError: 'Connection error. Please try again.', activating: false })
      return false
    }
  },

  deactivateLicense: async () => {
    try {
      const result = await invoke('license:deactivate')
      if (result.success) {
        await get().fetchEntitlements()
        return true
      }
      return false
    } catch {
      return false
    }
  },

  refreshLicense: async () => {
    try {
      const entitlements = await invoke('license:refresh')
      set({ entitlements })
    } catch {
      // ignore
    }
  },

  setShowActivateModal: (show) => set({ showActivateModal: show, activateError: null }),
  clearActivateError: () => set({ activateError: null })
}))
