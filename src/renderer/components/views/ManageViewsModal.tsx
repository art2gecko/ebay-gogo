import React, { useState } from 'react'
import { Star, Copy, Trash2, Pencil, Check, X } from 'lucide-react'
import { Dialog } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { useViewStore } from '@/stores/viewStore'

interface ManageViewsModalProps {
  open: boolean
  onClose: () => void
}

export function ManageViewsModal({ open, onClose }: ManageViewsModalProps): React.JSX.Element {
  const { views, deleteView, updateView, setDefaultView, createView, setActiveView } = useViewStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleRename = async (id: string): Promise<void> => {
    if (!editName.trim()) return
    await updateView({ id, name: editName.trim() })
    setEditingId(null)
    setEditName('')
  }

  const handleDuplicate = async (viewId: string): Promise<void> => {
    const source = views.find(v => v.id === viewId)
    if (!source) return
    const newView = await createView({
      id: crypto.randomUUID(),
      name: `${source.name} (Copy)`,
      isDefault: false,
      scope: source.scope,
      filters: { ...source.filters },
      sort: source.sort ? { ...source.sort } : null,
      columns: source.columns ? [...source.columns] : null,
      groupFilter: source.groupFilter ? [...source.groupFilter] : null,
      monitorIds: source.monitorIds ? [...source.monitorIds] : null
    })
    setActiveView(newView.id)
  }

  const handleDelete = async (id: string): Promise<void> => {
    await deleteView(id)
  }

  const handleSetDefault = async (id: string): Promise<void> => {
    await setDefaultView(id)
  }

  return (
    <Dialog open={open} onClose={onClose} title="Manage Views" className="max-w-md">
      <div className="flex flex-col gap-1 max-h-80 overflow-y-auto">
        {views.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No views created yet.</p>
        )}
        {views.map(view => (
          <div key={view.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 group">
            {editingId === view.id ? (
              <>
                <Input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="h-6 text-xs flex-1"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(view.id) }}
                />
                <Button size="xs" variant="ghost" onClick={() => handleRename(view.id)}>
                  <Check size={12} />
                </Button>
                <Button size="xs" variant="ghost" onClick={() => setEditingId(null)}>
                  <X size={12} />
                </Button>
              </>
            ) : (
              <>
                <span className="text-xs flex-1">{view.name}</span>
                <span className="text-[10px] text-muted-foreground">{view.scope}</span>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => handleSetDefault(view.id)}
                  title={view.isDefault ? 'Default view' : 'Set as default'}
                  className={view.isDefault ? 'text-yellow-400' : 'opacity-0 group-hover:opacity-100'}
                >
                  <Star size={12} fill={view.isDefault ? 'currentColor' : 'none'} />
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => { setEditingId(view.id); setEditName(view.name) }}
                  className="opacity-0 group-hover:opacity-100"
                >
                  <Pencil size={12} />
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => handleDuplicate(view.id)}
                  className="opacity-0 group-hover:opacity-100"
                >
                  <Copy size={12} />
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => handleDelete(view.id)}
                  className="opacity-0 group-hover:opacity-100 text-destructive"
                >
                  <Trash2 size={12} />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-3">
        <Button variant="outline" size="sm" onClick={onClose}>Done</Button>
      </div>
    </Dialog>
  )
}
