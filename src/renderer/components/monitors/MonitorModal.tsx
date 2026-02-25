import React, { useState, useCallback } from 'react'
import {
  TestTube, X, ChevronDown, ChevronUp, FolderOpen, Info, Zap, AlertCircle
} from 'lucide-react'
import { Dialog } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select } from '../ui/select'
import { Toggle } from '../ui/toggle'
import { Badge } from '../ui/badge'
import { CategoryCombobox } from '../ui/CategoryCombobox'
import { CategoryExplorer } from '../ui/CategoryExplorer'
import { useMonitorStore } from '@/stores/monitorStore'
import { useLicenseStore } from '@/stores/licenseStore'
import { invoke } from '@/hooks/useIpc'
import { formatPrice, cn } from '@/lib/utils'
import type { Monitor, MonitorCreateInput, TestSearchPreview } from '@shared/types'

interface MonitorModalProps {
  open: boolean
  onClose: () => void
  onCreated?: (monitorId: number) => void
  editMonitor?: Monitor | null
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

interface Preset {
  label: string
  apply: (form: FormState) => FormState
  applyExcludes?: (chips: string[]) => string[]
}

const PRESETS: Preset[] = [
  {
    label: 'BIN \u2022 Newly Listed',
    apply: (f) => ({ ...f, format: 'BuyItNow' as const, viewType: 'Results' as const })
  },
  {
    label: 'Auction \u2022 Ending Soon',
    apply: (f) => ({ ...f, format: 'Auction' as const, viewType: 'AuctionEnding' as const })
  },
  {
    label: 'Free Ship \u2022 US Only',
    apply: (f) => ({ ...f, freeShippingOnly: true, usOnly: true })
  },
  {
    label: 'Lots (excl broken/parts)',
    apply: (f) => f,
    applyExcludes: (chips) => {
      const toAdd = ['broken', 'parts', 'for parts', 'not working', 'as is']
      const existing = new Set(chips.map(c => c.toLowerCase()))
      return [...chips, ...toAdd.filter(k => !existing.has(k))]
    }
  }
]

interface FormState {
  keywords: string
  group: string
  priceMin: string
  priceMax: string
  condition: string
  format: 'BuyItNow' | 'Auction' | 'All'
  freeShippingOnly: boolean
  sellerMinFeedback: string
  usOnly: boolean
  intervalSec: string
  viewType: 'Results' | 'AuctionEnding'
  searchInDesc: boolean
  categoryId: string
  categoryPath: string
  includeSubcategories: boolean
}

const DEFAULT_FORM: FormState = {
  keywords: '', group: 'Default', priceMin: '', priceMax: '',
  condition: 'Any', format: 'BuyItNow', freeShippingOnly: false,
  sellerMinFeedback: '', usOnly: true,
  intervalSec: '60', viewType: 'Results', searchInDesc: false,
  categoryId: '', categoryPath: '', includeSubcategories: false
}

export function MonitorModal({ open, onClose, onCreated, editMonitor }: MonitorModalProps): React.JSX.Element {
  const { createMonitor, updateMonitor, monitors } = useMonitorStore()
  const { entitlements, setShowActivateModal } = useLicenseStore()
  const monitorLimitReached = !editMonitor && monitors.length >= entitlements.maxMonitors
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestSearchPreview | null>(null)
  const [excludeChips, setExcludeChips] = useState<string[]>([])
  const [excludeInput, setExcludeInput] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showExplorer, setShowExplorer] = useState(false)

  const editForm: FormState | undefined = editMonitor ? {
    keywords: editMonitor.keywords.join(', '),
    group: editMonitor.group,
    priceMin: editMonitor.priceMin != null ? String(editMonitor.priceMin) : '',
    priceMax: editMonitor.priceMax != null ? String(editMonitor.priceMax) : '',
    condition: editMonitor.condition,
    format: editMonitor.format,
    freeShippingOnly: editMonitor.freeShippingOnly,
    sellerMinFeedback: editMonitor.sellerMinFeedback ? String(editMonitor.sellerMinFeedback) : '',
    usOnly: editMonitor.usOnly,
    intervalSec: String(editMonitor.intervalSec),
    viewType: editMonitor.viewType,
    searchInDesc: editMonitor.searchInDesc,
    categoryId: editMonitor.categoryId,
    categoryPath: editMonitor.categoryPath,
    includeSubcategories: editMonitor.includeSubcategories
  } : undefined

  const [form, setForm] = useState<FormState>(editForm || { ...DEFAULT_FORM })

  // Re-initialize form when editMonitor changes
  React.useEffect(() => {
    if (editMonitor) {
      setForm(editForm!)
      setExcludeChips([...editMonitor.excludeKeywords])
    }
  }, [editMonitor?.id])

  const update = <K extends keyof FormState>(key: K, value: FormState[K]): void => {
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
    intervalSec: Math.max(entitlements.minIntervalSec, Number(form.intervalSec) || 60),
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
      setTestResult(result)
    } catch {
      setTestResult({ count: 0, sampleListings: [], suggestions: ['Test failed - check your connection'] })
    } finally {
      setTesting(false)
    }
  }, [form.keywords, buildInput])

  const handleSave = async (): Promise<void> => {
    if (!form.keywords.trim()) return
    setSaving(true)
    try {
      if (editMonitor) {
        await updateMonitor({ id: editMonitor.id, ...buildInput() })
      } else {
        const monitor = await createMonitor(buildInput())
        onCreated?.(monitor.id)
      }
      onClose()
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  const resetForm = (): void => {
    setForm({ ...DEFAULT_FORM })
    setExcludeChips([])
    setExcludeInput('')
    setTestResult(null)
    setShowAdvanced(false)
  }

  const handlePreset = (preset: Preset) => {
    setForm(f => preset.apply(f))
    if (preset.applyExcludes) {
      setExcludeChips(c => preset.applyExcludes!(c))
    }
  }

  // Keyboard shortcut: Ctrl+Enter to create
  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      if (form.keywords.trim() && !saving) {
        handleSave()
      }
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} title={editMonitor ? 'Edit Monitor' : 'New Monitor'} className="max-w-lg">
        <div className="flex flex-col gap-3" onKeyDown={handleModalKeyDown}>
          {/* Presets */}
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(preset => (
              <button
                key={preset.label}
                onClick={() => handlePreset(preset)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium',
                  'border border-border bg-muted/30 hover:bg-muted/60 transition-colors'
                )}
              >
                <Zap size={9} />
                {preset.label}
              </button>
            ))}
          </div>

          {/* Keywords */}
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

          {/* Basic Fields: Group, Interval, Format */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">Group</label>
              <Input
                value={form.group}
                onChange={(e) => update('group', e.target.value)}
                className="h-7 text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">
                Interval (sec)
                <span className="inline-block ml-1 cursor-help" title="How often to check for new listings (minimum 10s)">
                  <Info size={9} className="inline text-muted-foreground" />
                </span>
              </label>
              <Input
                type="number"
                value={form.intervalSec}
                onChange={(e) => update('intervalSec', e.target.value)}
                className="h-7 text-xs"
                min="10"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">Format</label>
              <Select
                value={form.format}
                onChange={(e) => update('format', e.target.value as FormState['format'])}
                options={FORMAT_OPTIONS}
                className="h-7 text-xs w-full"
              />
            </div>
          </div>

          {/* Category + Browse */}
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Category</label>
            <div className="flex gap-1.5">
              <div className="flex-1">
                <CategoryCombobox
                  value={form.categoryId ? { categoryId: form.categoryId, categoryPath: form.categoryPath } : null}
                  onChange={(cat) => {
                    if (cat) {
                      setForm(f => ({ ...f, categoryId: cat.categoryId, categoryPath: cat.path }))
                    } else {
                      setForm(f => ({ ...f, categoryId: '', categoryPath: '' }))
                    }
                  }}
                  onBrowse={() => setShowExplorer(true)}
                />
              </div>
              <Button
                size="xs"
                variant="outline"
                onClick={() => setShowExplorer(true)}
                className="shrink-0 h-7"
                title="Browse categories"
              >
                <FolderOpen size={12} />
              </Button>
            </div>
            {form.categoryId && (
              <div className="flex items-center gap-3 mt-1.5 pl-1">
                <Toggle
                  checked={form.includeSubcategories}
                  onChange={(v) => update('includeSubcategories', v)}
                  label="Include subcategories"
                />
              </div>
            )}
          </div>

          {/* Price Max (basic) */}
          <div className="grid grid-cols-2 gap-3">
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
            <div className="flex items-end">
              <button
                onClick={() => setShowAdvanced(v => !v)}
                className="text-[11px] text-primary hover:underline flex items-center gap-1 pb-1"
              >
                {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
              </button>
            </div>
          </div>

          {/* Advanced Section */}
          {showAdvanced && (
            <div className="flex flex-col gap-3 pl-3 border-l-2 border-primary/20">
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
                  <label className="text-[11px] text-muted-foreground mb-1 block">Condition</label>
                  <Select
                    value={form.condition}
                    onChange={(e) => update('condition', e.target.value)}
                    options={CONDITION_OPTIONS}
                    className="h-7 text-xs w-full"
                  />
                </div>
              </div>

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
                <label className="text-[11px] text-muted-foreground mb-1 block">
                  Min Seller Feedback
                  <span className="inline-block ml-1 cursor-help" title="Minimum seller feedback score to include">
                    <Info size={9} className="inline text-muted-foreground" />
                  </span>
                </label>
                <Input
                  type="number"
                  value={form.sellerMinFeedback}
                  onChange={(e) => update('sellerMinFeedback', e.target.value)}
                  className="h-7 text-xs"
                  placeholder="0"
                />
              </div>

              <div className="flex gap-4 flex-wrap">
                <Toggle checked={form.freeShippingOnly} onChange={(v) => update('freeShippingOnly', v)} label="Free shipping" />
                <Toggle checked={form.usOnly} onChange={(v) => update('usOnly', v)} label="US only" />
                <Toggle
                  checked={form.searchInDesc}
                  onChange={(v) => update('searchInDesc', v)}
                  label="Search desc"
                />
              </div>
            </div>
          )}

          {/* Test Result Preview */}
          {testResult && (
            <div className="rounded-md border border-border bg-muted/20 p-2 text-xs space-y-1">
              <div className="font-medium">
                {testResult.count === 0 ? 'No results found' : `Found ${testResult.count} result(s)`}
              </div>
              {testResult.sampleListings.length > 0 && (
                <div className="space-y-0.5">
                  {testResult.sampleListings.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-muted-foreground">
                      <span className="truncate flex-1">{item.title}</span>
                      <span className="shrink-0 font-medium text-foreground">{formatPrice(item.total)}</span>
                    </div>
                  ))}
                </div>
              )}
              {testResult.suggestions.length > 0 && (
                <div className="text-[10px] text-muted-foreground pt-1 border-t border-border mt-1 space-y-0.5">
                  {testResult.suggestions.map((s, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <Info size={9} className="shrink-0" /> {s}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Monitor limit warning */}
          {monitorLimitReached && (
            <Badge variant="warning" className="text-xs py-1.5 px-3 justify-start">
              <AlertCircle size={12} className="mr-1.5 shrink-0" />
              Monitor limit reached ({entitlements.maxMonitors}).{' '}
              <button className="underline ml-1" onClick={() => { onClose(); setShowActivateModal(true) }}>Upgrade</button>
            </Badge>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-1">
            <Button size="xs" variant="outline" onClick={handleTestMonitor} disabled={testing || !form.keywords.trim()}>
              <TestTube size={12} className="mr-1" />
              {testing ? 'Testing...' : 'Test'}
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.keywords.trim() || monitorLimitReached}>
              {saving ? 'Saving...' : editMonitor ? 'Update Monitor' : 'Create Monitor'}
            </Button>
          </div>

          {/* Keyboard hint */}
          <div className="text-[10px] text-muted-foreground text-right -mt-1">
            Ctrl+Enter to create
          </div>
        </div>
      </Dialog>

      {/* Category Explorer dialog */}
      <CategoryExplorer
        open={showExplorer}
        onClose={() => setShowExplorer(false)}
        onSelect={(cat) => {
          setForm(f => ({ ...f, categoryId: cat.categoryId, categoryPath: cat.path }))
        }}
        includeSubcategories={form.includeSubcategories}
        onIncludeSubcategoriesChange={(v) => update('includeSubcategories', v)}
      />
    </>
  )
}
