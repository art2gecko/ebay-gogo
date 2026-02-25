import { create } from 'zustand'
import type { View, ViewCreateInput, ViewUpdateInput, ViewFilters } from '@shared/types'
import { invoke } from '../hooks/useIpc'

export const defaultViewFilters: ViewFilters = {
  priceMin: null,
  priceMax: null,
  condition: 'Any',
  format: 'BuyItNow',
  freeShippingOnly: false,
  excludeKeywords: [],
  sellerMinFeedback: 0,
  usOnly: true,
  totalPriceMode: false,
  showDismissed: false
}

interface ViewStore {
  views: View[]
  activeViewId: string | null
  loading: boolean

  fetchViews: () => Promise<void>
  createView: (input: ViewCreateInput) => Promise<View>
  updateView: (input: ViewUpdateInput) => Promise<View>
  deleteView: (id: string) => Promise<void>
  setActiveView: (id: string | null) => void
  setDefaultView: (id: string) => Promise<void>
  getActiveView: () => View | null
}

export const useViewStore = create<ViewStore>((set, get) => ({
  views: [],
  activeViewId: null,
  loading: false,

  fetchViews: async () => {
    set({ loading: true })
    try {
      const views = await invoke('views:list')
      set({ views })
      // Auto-select default view if none active
      if (!get().activeViewId) {
        const defaultView = views.find(v => v.isDefault)
        if (defaultView) {
          set({ activeViewId: defaultView.id })
        }
      }
    } finally {
      set({ loading: false })
    }
  },

  createView: async (input) => {
    const view = await invoke('views:create', input)
    set(s => ({ views: [...s.views, view] }))
    return view
  },

  updateView: async (input) => {
    const view = await invoke('views:update', input)
    set(s => ({
      views: s.views.map(v => v.id === view.id ? view : v)
    }))
    return view
  },

  deleteView: async (id) => {
    await invoke('views:delete', id)
    set(s => ({
      views: s.views.filter(v => v.id !== id),
      activeViewId: s.activeViewId === id ? null : s.activeViewId
    }))
  },

  setActiveView: (id) => set({ activeViewId: id }),

  setDefaultView: async (id) => {
    await invoke('views:setDefault', id)
    set(s => ({
      views: s.views.map(v => ({
        ...v,
        isDefault: v.id === id
      }))
    }))
  },

  getActiveView: () => {
    const { views, activeViewId } = get()
    if (!activeViewId) return null
    return views.find(v => v.id === activeViewId) ?? null
  }
}))
