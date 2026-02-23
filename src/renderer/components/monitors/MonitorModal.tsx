import React, { useState } from 'react'
import { Dialog } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select } from '../ui/select'
import { Toggle } from '../ui/toggle'
import { useMonitorStore } from '@/stores/monitorStore'
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
  const [form, setForm] = useState({
    keywords: '',
    group: 'Default',
    priceMin: '',
    priceMax: '',
    condition: 'Any',
    format: 'BuyItNow' as const,
    freeShippingOnly: false,
    excludeKeywords: '',
    sellerMinFeedback: '',
    usOnly: true,
    intervalSec: '60',
    viewType: 'Results' as const,
    searchInDesc: false,
    categoryId: ''
  })

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]): void => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const handleSave = async (): Promise<void> => {
    if (!form.keywords.trim()) return
    setSaving(true)
    try {
      const input: MonitorCreateInput = {
        enabled: true,
        group: form.group || 'Default',
        keywords: form.keywords.split(',').map((s) => s.trim()).filter(Boolean),
        searchInDesc: form.searchInDesc,
        priceMin: form.priceMin ? Number(form.priceMin) : null,
        priceMax: form.priceMax ? Number(form.priceMax) : null,
        condition: form.condition,
        format: form.format,
        freeShippingOnly: form.freeShippingOnly,
        excludeKeywords: form.excludeKeywords.split(',').map((s) => s.trim()).filter(Boolean),
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
        categoryId: form.categoryId
      }
      await createMonitor(input)
      onClose()
      // Reset form
      setForm({
        keywords: '', group: 'Default', priceMin: '', priceMax: '',
        condition: 'Any', format: 'BuyItNow', freeShippingOnly: false,
        excludeKeywords: '', sellerMinFeedback: '', usOnly: true,
        intervalSec: '60', viewType: 'Results', searchInDesc: false, categoryId: ''
      })
    } finally {
      setSaving(false)
    }
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
            <label className="text-[11px] text-muted-foreground mb-1 block">Category ID</label>
            <Input
              value={form.categoryId}
              onChange={(e) => update('categoryId', e.target.value)}
              className="h-7 text-xs"
              placeholder="Optional"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] text-muted-foreground mb-1 block">Exclude Keywords</label>
          <Input
            value={form.excludeKeywords}
            onChange={(e) => update('excludeKeywords', e.target.value)}
            placeholder="broken, parts, ..."
            className="h-7 text-xs"
          />
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
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving || !form.keywords.trim()}>
            {saving ? 'Saving...' : 'Create Monitor'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
