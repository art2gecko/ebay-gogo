import Store from 'electron-store'
import type { CachedLicenseData } from '@shared/licensingTypes'
import { DEFAULT_CACHED_LICENSE } from '@shared/licensingTypes'

// ============================================================
// Persistent license data (electron-store with encryption)
// ============================================================

interface LicenseStoreSchema extends Record<string, unknown> {
  license: CachedLicenseData
}

const store = new Store<LicenseStoreSchema>({
  name: 'ebay-gogo-license',
  encryptionKey: 'ebay-gogo-license-key-store',
  defaults: {
    license: DEFAULT_CACHED_LICENSE
  }
})

export function getLicenseData(): CachedLicenseData {
  return store.get('license')
}

export function saveLicenseData(data: CachedLicenseData): void {
  store.set('license', data)
}

// ============================================================
// License key storage — keytar (OS keychain) with fallback
// ============================================================

const KEYTAR_SERVICE = 'ebay-gogo'
const KEYTAR_ACCOUNT = 'license-key'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let keytarModule: any = null
let keytarAvailable: boolean | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getKeytar(): Promise<any> {
  if (keytarAvailable === false) return null
  if (keytarModule) return keytarModule

  try {
    keytarModule = await import('keytar')
    keytarAvailable = true
    return keytarModule
  } catch {
    keytarAvailable = false
    return null
  }
}

export function getLicenseKey(): string | null {
  // Synchronous fallback: read from electron-store
  // keytar is async, so we cache the key in electron-store too
  return store.get('license').licenseKey || null
}

export async function getLicenseKeyAsync(): Promise<string | null> {
  const keytar = await getKeytar()
  if (keytar) {
    try {
      const key = await keytar.getPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT)
      return key
    } catch {
      // Fall through to electron-store
    }
  }
  return store.get('license').licenseKey || null
}

export function saveLicenseKey(key: string): void {
  // Always save to electron-store for sync access
  const current = store.get('license')
  store.set('license', { ...current, licenseKey: key })

  // Also save to keytar async (fire and forget)
  getKeytar().then(keytar => {
    if (keytar) {
      keytar.setPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT, key).catch(() => {})
    }
  }).catch(() => {})
}

export function clearLicenseKey(): void {
  const current = store.get('license')
  store.set('license', { ...current, licenseKey: null })

  getKeytar().then(keytar => {
    if (keytar) {
      keytar.deletePassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT).catch(() => {})
    }
  }).catch(() => {})
}
