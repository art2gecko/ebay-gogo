import React, { useState, useCallback } from 'react'
import { TestTube, X } from 'lucide-react'
import { Dialog } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select } from '../ui/select'
import { Toggle } from '../ui/toggle'
import { CategoryCombobox } from '../ui/CategoryCombobox'
import { useMonitorStore } from '@/stores/monitorStore'
import { invoke } from '@/hooks/useIpc'
import type { MonitorCreateInput } from '@shared/types'

interface MonitorModalProps {
  open: boolean
  onClose: () => void
}

const FORMAT_OPTIONS = [
  { value: 'BuyItNow', label: 'Buy It Now' },
  { value: 'Auction', label: 'Auction' },
  { value: 'All', label: 'All' }
]

const CONDITION_OPTIONS = [
  { value: 'Any', label: 'Any' },
  { value: 'New', label: 'New' },
  { value: 'Open Box', label: 'Open Box' },
  { value: 'Refurbished', label: 'Refurbished' },
  { value: 'Used', label: 'Used' }
]

const VIEW_TYPE_OPTIONS = [
  { value: 'Results', label: 'Results' },
  { value: 'AuctionEnding', label: 'Auction Ending' }
]

export function MonitorModal({ open, onClose }: MonitorModalProps): React.JSX.Element {
  const { createMonitor } = useMonitorStore()
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [excludeChips, setExcludeChips] = useState<string[]>([])
  const [excludeInput, setExcludeInput] = useState('')
  const [form, setForm] = useState({
    keywords: '',
    group: 'Default',
    priceMin: '',
    priceMax: '',
    condition: 'Any',
    format: 'BuyItNow' as const,
    freeShippingOnly: false,
    sellerMinFeedback: '',
    usOnly: true,
    intervalSec: '60',
    viewType: 'Results' as const,
    searchInDesc: false,
    categoryId: '',
    categoryPath: '',
    includeSubcategories: false
  })

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]): void => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const handleExcludeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const trimmed = excludeInput.trim().replace(/,/g, '')
      if (trimmed && !excludeChips.includes(trimmed)) {
        setExcludeChips(c => [...c, trimmed])
      }
      setExcludeInput('')
    } else if (e.key === 'Backspace' && !excludeInput && excludeChips.length > 0) {
      setExcludeChips(c => c.slice(0, -1))
    }
  }

  const handleExcludePaste = (e: React.ClipboardEvent): void => {
    const text = e.clipboardData.getData('text')
    if (text.includes(',')) {
      e.preventDefault()
      const newChips = text.split(',').map(s => s.trim()).filter(Boolean).filter(c => !excludeChips.includes(c))
      setExcludeChips(c => [...c, ...newChips])
      setExcludeInput('')
    }
  }

  const buildInput = useCallback((): MonitorCreateInput => ({
    enabled: true,
    group: form.group || 'Default',
    keywords: form.keywords.split(',').map(s => s.trim()).filter(Boolean),
    searchInDesc: form.searchInDesc,
    priceMin: form.priceMin ? Number(form.priceMin) : null,
    priceMax: form.priceMax ? Number(form.priceMax) : null,
    condition: form.condition,
    format: form.format,
    freeShippingOnly: form.freeShippingOnly,
    excludeKeywords: excludeChips,
    sellerMinFeedback: Number(form.sellerMinFeedback) || 0,
    usOnly: form.usOnly,
    totalPriceMode: false,
    allowSellers: [],
    denySellers: [],
    intervalSec: Math.max(10, Number(form.intervalSec) || 60),
    viewType: form.viewType,
    site: 'EBAY-US',
    locatedIn: '',
    shipsTo: '',
    categoryId: form.categoryId,
    categoryPath: form.categoryPath,
    includeSubcategories: form.includeSubcategories,
    viewId: ''
  }), [form, excludeChips])

  const handleTestMonitor = useCallback(async () => {
    if (!form.keywords.trim()) return
    setTesting(true)
    setTestResult(null)
    try {
      const result = await invoke('monitors:testSearch', buildInput())
      setTestResult(`Found ${result.count} result(s)`)
    } catch {
      setTestResult('Test failed')
    } finally {
      setTesting(false)
    }
  }, [form.keywords, buildInput])

  const handleSave = async (): Promise<void> => {
    if (!form.keywords.trim()) return
    setSaving(true)
    try {
      await createMonitor(buildInput())
      onClose()
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  const resetForm = (): void => {
    setForm({
      keywords: '', group: 'Default', priceMin: '', priceMax: '',
      condition: 'Any', format: 'BuyItNow', freeShippingOnly: false,
      sellerMinFeedback: '', usOnly: true,
      intervalSec: '60', viewType: 'Results', searchInDesc: false,
      categoryId: '', categoryPath: '', includeSubcategories: false
    })
    setExcludeChips([])
    setExcludeInput('')
    setTestResult(null)
  }

  const handleRefreshCategories = (): void => {
    invoke('categories:refresh').catch(() => {})
  }

  return (
    <Dialog open={open} onClose={onClose} title="New Monitor" className="max-w-md">
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-[11px] text-muted-foreground mb-1 block">Keywords (comma separated)</label>
          <Input
            value={form.keywords}
            onChange={(e) => update('keywords', e.target.value)}
            placeholder="MacBook Pro, iPhone 15..."
            className="h-8 text-xs"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Group</label>
            <Input
              value={form.group}
              onChange={(e) => update('group', e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Interval (sec)</label>
            <Input
              type="number"
              value={form.intervalSec}
              onChange={(e) => update('intervalSec', e.target.value)}
              className="h-7 text-xs"
              min="10"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Price Min</label>
            <Input
              type="number"
              value={form.priceMin}
              onChange={(e) => update('priceMin', e.target.value)}
              className="h-7 text-xs"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Price Max</label>
            <Input
              type="number"
              value={form.priceMax}
              onChange={(e) => update('priceMax', e.target.value)}
              className="h-7 text-xs"
              placeholder="999"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Format</label>
            <Select
              value={form.format}
              onChange={(e) => update('format', e.target.value as typeof form.format)}
              options={FORMAT_OPTIONS}
              className="h-7 text-xs w-full"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Condition</label>
            <Select
              value={form.condition}
              onChange={(e) => update('condition', e.target.value)}
              options={CONDITION_OPTIONS}
              className="h-7 text-xs w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">View Type</label>
            <Select
              value={form.viewType}
              onChange={(e) => update('viewType', e.target.value as typeof form.viewType)}
              options={VIEW_TYPE_OPTIONS}
              className="h-7 text-xs w-full"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Category</label>
            <CategoryCombobox
              value={form.categoryId ? { categoryId: form.categoryId, categoryPath: form.categoryPath } : null}
              onChange={(cat) => {
                if (cat) {
                  setForm(f => ({ ...f, categoryId: cat.categoryId, categoryPath: cat.path }))
                } else {
                  setForm(f => ({ ...f, categoryId: '', categoryPath: '' }))
                }
              }}
              onRefreshCategories={handleRefreshCategories}
            />
          </div>
        </div>

        {form.categoryId && (
          <div className="pl-1">
            <Toggle
              checked={form.includeSubcategories}
              onChange={(v) => update('includeSubcategories', v)}
              label="Include subcategories"
            />
          </div>
        )}

        {/* Exclude keywords as chips */}
        <div>
          <label className="text-[11px] text-muted-foreground mb-1 block">Exclude Keywords</label>
          <div className="flex flex-wrap gap-1 rounded-md border border-input bg-background px-2 py-1 min-h-[28px] items-center">
            {excludeChips.map(chip => (
              <span
                key={chip}
                className="inline-flex items-center gap-0.5 bg-muted rounded px-1.5 py-0.5 text-[10px]"
              >
                {chip}
                <button onClick={() => setExcludeChips(c => c.filter(x => x !== chip))} className="hover:text-destructive">
                  <X size={10} />
                </button>
              </span>
            ))}
            <input
              value={excludeInput}
              onChange={e => setExcludeInput(e.target.value)}
              onKeyDown={handleExcludeKeyDown}
              onPaste={handleExcludePaste}
              placeholder={excludeChips.length === 0 ? 'Type and press Enter...' : ''}
              className="flex-1 min-w-[60px] bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] text-muted-foreground mb-1 block">Min Seller Feedback</label>
          <Input
            type="number"
            value={form.sellerMinFeedback}
            onChange={(e) => update('sellerMinFeedback', e.target.value)}
            className="h-7 text-xs"
            placeholder="0"
          />
        </div>

        <div className="flex gap-4">
          <Toggle checked={form.freeShippingOnly} onChange={(v) => update('freeShippingOnly', v)} label="Free shipping" />
          <Toggle checked={form.usOnly} onChange={(v) => update('usOnly', v)} label="US only" />
          <Toggle checked={form.searchInDesc} onChange={(v) => update('searchInDesc', v)} label="Search desc" />
        </div>

        <div className="flex gap-2 mt-2">
          <Button size="xs" variant="outline" onClick={handleTestMonitor} disabled={testing || !form.keywords.trim()}>
            <TestTube size={12} className="mr-1" />
            {testing ? 'Testing...' : 'Test'}
          </Button>
          {testResult && <span className="text-xs text-muted-foreground self-center">{testResult}</span>}
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !form.keywords.trim()}>
            {saving ? 'Saving...' : 'Create Monitor'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
