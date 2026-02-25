import React, { useState } from 'react'
import { Dialog } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select } from '../ui/select'
import { Toggle } from '../ui/toggle'
import { useViewStore, defaultViewFilters } from '@/stores/viewStore'
import { useSearchStore } from '@/stores/searchStore'
import type { ViewCreateInput, ViewScope } from '@shared/types'

interface CreateViewModalProps {
  open: boolean
  onClose: () => void
}

const SCOPE_OPTIONS = [
  { value: 'global', label: 'Global' },
  { value: 'group', label: 'Group' },
  { value: 'monitor', label: 'Monitor' }
]

export function CreateViewModal({ open, onClose }: CreateViewModalProps): React.JSX.Element {
  const { createView, views, setActiveView } = useViewStore()
  const { filters } = useSearchStore()
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [scope, setScope] = useState<ViewScope>('global')
  const [cloneFrom, setCloneFrom] = useState<string>('')
  const [useCurrentFilters, setUseCurrentFilters] = useState(true)

  const handleSave = async (): Promise<void> => {
    if (!name.trim()) return
    setSaving(true)
    try {
      let viewFilters = { ...defaultViewFilters }

      if (cloneFrom) {
        const source = views.find(v => v.id === cloneFrom)
        if (source) {
          viewFilters = { ...source.filters }
        }
      } else if (useCurrentFilters) {
        viewFilters = {
          ...defaultViewFilters,
          priceMin: filters.priceMin,
          priceMax: filters.priceMax,
          condition: filters.condition,
          format: filters.format,
          freeShippingOnly: filters.freeShippingOnly,
          excludeKeywords: [...filters.excludeKeywords],
          sellerMinFeedback: filters.sellerMinFeedback,
          usOnly: filters.usOnly,
          totalPriceMode: filters.totalPriceMode
        }
      }

      const input: ViewCreateInput = {
        id: crypto.randomUUID(),
        name: name.trim(),
        isDefault: false,
        scope,
        filters: viewFilters,
        sort: null,
        columns: null,
        groupFilter: null,
        monitorIds: null
      }

      const view = await createView(input)
      setActiveView(view.id)
      onClose()
      setName('')
      setScope('global')
      setCloneFrom('')
    } finally {
      setSaving(false)
    }
  }

  const cloneOptions = [
    { value: '', label: 'Start fresh' },
    ...views.map(v => ({ value: v.id, label: v.name }))
  ]

  return (
    <Dialog open={open} onClose={onClose} title="New View" className="max-w-sm">
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-[11px] text-muted-foreground mb-1 block">View Name</label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="My View"
            className="h-8 text-xs"
            autoFocus
          />
        </div>

        <div>
          <label className="text-[11px] text-muted-foreground mb-1 block">Scope</label>
          <Select
            value={scope}
            onChange={e => setScope(e.target.value as ViewScope)}
            options={SCOPE_OPTIONS}
            className="h-7 text-xs w-full"
          />
        </div>

        {views.length > 0 && (
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Clone from</label>
            <Select
              value={cloneFrom}
              onChange={e => setCloneFrom(e.target.value)}
              options={cloneOptions}
              className="h-7 text-xs w-full"
            />
          </div>
        )}

        {!cloneFrom && (
          <Toggle
            checked={useCurrentFilters}
            onChange={setUseCurrentFilters}
            label="Use current sidebar filters"
          />
        )}

        <div className="flex gap-2 mt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Creating...' : 'Create View'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
