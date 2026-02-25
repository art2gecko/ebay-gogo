import React, { useEffect, useState, useCallback } from 'react'
import { Save, TestTube, Shield, Bell, Keyboard, BarChart3, FolderTree, RefreshCw } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select } from '../ui/select'
import { Toggle } from '../ui/toggle'
import { Badge } from '../ui/badge'
import { LicenseSettingsPanel } from '@/features/licensing/LicenseSettingsPanel'
import { useAppStore } from '@/stores/appStore'
import { invoke } from '@/hooks/useIpc'

const SITE_OPTIONS = [
  { value: 'EBAY-US', label: 'eBay US' },
  { value: 'EBAY-GB', label: 'eBay UK' },
  { value: 'EBAY-DE', label: 'eBay Germany' },
  { value: 'EBAY-AU', label: 'eBay Australia' },
  { value: 'EBAY-CA', label: 'eBay Canada' },
  { value: 'EBAY-FR', label: 'eBay France' }
]

const ENV_OPTIONS = [
  { value: 'SANDBOX', label: 'Sandbox' },
  { value: 'PRODUCTION', label: 'Production' }
]

export function SettingsTab(): React.JSX.Element {
  const { settings, fetchSettings, saveSettings, engineStatus } = useAppStore()
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)

  // Local form state
  const [form, setForm] = useState({
    appId: '',
    certId: '',
    devId: '',
    oauthToken: '',
    environment: 'SANDBOX' as 'SANDBOX' | 'PRODUCTION',
    siteId: 'EBAY-US',
    defaultSite: 'EBAY-US',
    defaultCurrency: 'USD',
    soundEnabled: true,
    desktopEnabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    hotkeysEnabled: true
  })

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    if (settings) {
      setForm({
        appId: settings.credentials.appId,
        certId: settings.credentials.certId,
        devId: settings.credentials.devId,
        oauthToken: settings.credentials.oauthToken,
        environment: settings.credentials.environment,
        siteId: settings.credentials.siteId,
        defaultSite: settings.defaultSite,
        defaultCurrency: settings.defaultCurrency,
        soundEnabled: settings.notifications.soundEnabled,
        desktopEnabled: settings.notifications.desktopEnabled,
        quietHoursStart: settings.notifications.quietHoursStart,
        quietHoursEnd: settings.notifications.quietHoursEnd,
        hotkeysEnabled: settings.hotkeysEnabled
      })
    }
  }, [settings])

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]): void => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await saveSettings({
        credentials: {
          appId: form.appId,
          certId: form.certId,
          devId: form.devId,
          oauthToken: form.oauthToken,
          environment: form.environment,
          siteId: form.siteId
        },
        defaultSite: form.defaultSite,
        defaultCurrency: form.defaultCurrency,
        notifications: {
          soundEnabled: form.soundEnabled,
          desktopEnabled: form.desktopEnabled,
          quietHoursStart: form.quietHoursStart,
          quietHoursEnd: form.quietHoursEnd
        },
        hotkeysEnabled: form.hotkeysEnabled
      })
    } finally {
      setSaving(false)
    }
  }, [form, saveSettings])

  const handleTestConnection = useCallback(async () => {
    setTesting(true)
    setTestResult(null)
    try {
      // Save first so the credentials are applied
      await handleSave()
      const result = await invoke('settings:testConnection')
      setTestResult(result)
    } finally {
      setTesting(false)
    }
  }, [handleSave])

  const [categoryCount, setCategoryCount] = useState<number | null>(null)
  const [refreshingCategories, setRefreshingCategories] = useState(false)
  const [categoryMessage, setCategoryMessage] = useState('')

  useEffect(() => {
    invoke('categories:count').then(setCategoryCount).catch(() => {})
  }, [])

  const handleRefreshCategories = useCallback(async () => {
    setRefreshingCategories(true)
    setCategoryMessage('')
    try {
      const result = await invoke('categories:refresh')
      setCategoryMessage(result.message)
      if (result.success) {
        setCategoryCount(result.count)
      }
    } catch {
      setCategoryMessage('Failed to refresh categories')
    } finally {
      setRefreshingCategories(false)
    }
  }, [])

  const HOTKEYS = [
    { key: 'B', action: 'Buy / Open on eBay' },
    { key: 'O', action: 'Make Offer' },
    { key: 'C', action: 'Copy Link' },
    { key: 'I', action: 'Ignore Seller' },
    { key: 'E', action: 'Add Exclude Keyword' },
    { key: 'Ctrl+L', action: 'Clear from Screen' },
    { key: 'Ctrl+Shift+L', action: 'Reset Dismissed' },
    { key: 'Enter', action: 'Open Details' },
    { key: 'Arrow Up/Down', action: 'Navigate Results' }
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
      <h2 className="text-lg font-semibold mb-6">Settings</h2>

      {/* License */}
      <LicenseSettingsPanel />

      {/* eBay Credentials */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-primary" />
          <h3 className="text-sm font-semibold">eBay API Credentials</h3>
          <Badge variant={(form.appId || form.oauthToken) ? 'success' : 'warning'}>
            {(form.appId || form.oauthToken) ? 'Configured' : 'Mock Mode'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Get your keys from <span className="text-primary font-mono">developer.ebay.com/my/keys</span>.
          Uses Browse API with OAuth. Set environment to <strong>Production</strong> for live results. Leave blank for mock mode.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">App ID (Client ID)</label>
            <Input
              type="password"
              value={form.appId}
              onChange={(e) => update('appId', e.target.value)}
              className="h-8 text-xs font-mono"
              placeholder="YourApp-name-PRD-..."
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Cert ID (Client Secret)</label>
            <Input
              type="password"
              value={form.certId}
              onChange={(e) => update('certId', e.target.value)}
              className="h-8 text-xs font-mono"
              placeholder="PRD-xxxxxxxx-xxxx..."
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Dev ID</label>
            <Input
              type="password"
              value={form.devId}
              onChange={(e) => update('devId', e.target.value)}
              className="h-8 text-xs font-mono"
              placeholder="xxxxxxxx-xxxx-xxxx..."
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Environment</label>
            <Select
              value={form.environment}
              onChange={(e) => update('environment', e.target.value as 'SANDBOX' | 'PRODUCTION')}
              options={ENV_OPTIONS}
              className="h-8 text-xs w-full"
            />
          </div>
          <div className="col-span-2">
            <label className="text-[11px] text-muted-foreground mb-1 block">
              OAuth Application Token — click &quot;Get OAuth Application Token&quot; on developer.ebay.com and paste here
            </label>
            <Input
              type="password"
              value={form.oauthToken}
              onChange={(e) => update('oauthToken', e.target.value)}
              className="h-8 text-xs font-mono"
              placeholder="v^1.1#i^1#p^3#r^1#I^3#f^0#t^Ul4..."
            />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline" onClick={handleTestConnection} disabled={testing}>
            <TestTube size={14} className="mr-1.5" />
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>
          {testResult && (
            <Badge variant={testResult.success ? 'success' : 'destructive'}>
              {testResult.message}
            </Badge>
          )}
        </div>
      </section>

      {/* Default Site/Currency */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold mb-3">Defaults</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Default Site</label>
            <Select
              value={form.defaultSite}
              onChange={(e) => update('defaultSite', e.target.value)}
              options={SITE_OPTIONS}
              className="h-8 text-xs w-full"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Currency</label>
            <Input
              value={form.defaultCurrency}
              onChange={(e) => update('defaultCurrency', e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Bell size={16} className="text-primary" />
          <h3 className="text-sm font-semibold">Notifications</h3>
        </div>
        <div className="flex flex-col gap-3">
          <Toggle checked={form.soundEnabled} onChange={(v) => update('soundEnabled', v)} label="Sound notifications" />
          <Toggle checked={form.desktopEnabled} onChange={(v) => update('desktopEnabled', v)} label="Desktop notifications" />
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Quiet hours:</span>
            <Input
              type="time"
              value={form.quietHoursStart}
              onChange={(e) => update('quietHoursStart', e.target.value)}
              className="h-7 text-xs w-24"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="time"
              value={form.quietHoursEnd}
              onChange={(e) => update('quietHoursEnd', e.target.value)}
              className="h-7 text-xs w-24"
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <FolderTree size={16} className="text-primary" />
          <h3 className="text-sm font-semibold">eBay Categories</h3>
          {categoryCount !== null && (
            <Badge variant="secondary">{categoryCount.toLocaleString()} categories</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Categories are used for the typeahead picker in the Monitor setup.
          A bundled snapshot is loaded automatically. Refresh from eBay to get the latest tree.
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleRefreshCategories} disabled={refreshingCategories}>
            <RefreshCw size={14} className={`mr-1.5 ${refreshingCategories ? 'animate-spin' : ''}`} />
            {refreshingCategories ? 'Refreshing...' : 'Refresh from eBay'}
          </Button>
          {categoryMessage && (
            <span className="text-xs text-muted-foreground">{categoryMessage}</span>
          )}
        </div>
      </section>

      {/* Hotkeys */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Keyboard size={16} className="text-primary" />
          <h3 className="text-sm font-semibold">Hotkeys</h3>
          <Toggle checked={form.hotkeysEnabled} onChange={(v) => update('hotkeysEnabled', v)} />
        </div>
        <div className="grid grid-cols-2 gap-1">
          {HOTKEYS.map(({ key, action }) => (
            <div key={key} className="flex items-center gap-2 py-1">
              <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded font-mono min-w-[28px] text-center">{key}</kbd>
              <span className="text-xs text-muted-foreground">{action}</span>
            </div>
          ))}
        </div>
      </section>

      {/* API Quota */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={16} className="text-primary" />
          <h3 className="text-sm font-semibold">API Usage</h3>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">Today:</span>
          <span className="font-mono">{engineStatus.apiCallsToday} / {engineStatus.apiCallLimit}</span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(engineStatus.apiCallsToday / engineStatus.apiCallLimit) * 100}%` }}
            />
          </div>
        </div>
      </section>

      {/* Save */}
      <div className="sticky bottom-0 py-4 bg-background border-t border-border">
        <Button onClick={handleSave} disabled={saving}>
          <Save size={14} className="mr-1.5" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
