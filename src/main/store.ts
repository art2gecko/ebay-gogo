import Store from 'electron-store'
import type { AppSettings, EbayCredentials } from '@shared/types'

interface StoreSchema {
  credentials: EbayCredentials
  defaultSite: string
  defaultCurrency: string
  notifications: {
    soundEnabled: boolean
    desktopEnabled: boolean
    quietHoursStart: string
    quietHoursEnd: string
  }
  hotkeysEnabled: boolean
}

const store = new Store<StoreSchema>({
  name: 'ebay-gogo-settings',
  encryptionKey: 'ebay-gogo-local-encryption-key',
  defaults: {
    credentials: {
      appId: '',
      certId: '',
      devId: '',
      oauthToken: '',
      environment: 'SANDBOX',
      siteId: 'EBAY-US'
    },
    defaultSite: 'EBAY-US',
    defaultCurrency: 'USD',
    notifications: {
      soundEnabled: true,
      desktopEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00'
    },
    hotkeysEnabled: true
  }
})

export function getSettings(): AppSettings {
  return {
    credentials: store.get('credentials'),
    defaultSite: store.get('defaultSite'),
    defaultCurrency: store.get('defaultCurrency'),
    notifications: store.get('notifications'),
    hotkeysEnabled: store.get('hotkeysEnabled')
  }
}

export function saveSettings(partial: Partial<AppSettings>): AppSettings {
  if (partial.credentials) store.set('credentials', partial.credentials)
  if (partial.defaultSite) store.set('defaultSite', partial.defaultSite)
  if (partial.defaultCurrency) store.set('defaultCurrency', partial.defaultCurrency)
  if (partial.notifications) store.set('notifications', partial.notifications)
  if (partial.hotkeysEnabled !== undefined) store.set('hotkeysEnabled', partial.hotkeysEnabled)
  return getSettings()
}

export function getCredentials(): EbayCredentials {
  return store.get('credentials')
}
