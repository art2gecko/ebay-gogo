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
// License key storage (electron-store)
// ============================================================

export function getLicenseKey(): string | null {
  return store.get('license').licenseKey || null
}

export function saveLicenseKey(key: string): void {
  const current = store.get('license')
  store.set('license', { ...current, licenseKey: key })
}

export function clearLicenseKey(): void {
  const current = store.get('license')
  store.set('license', { ...current, licenseKey: null })
}
