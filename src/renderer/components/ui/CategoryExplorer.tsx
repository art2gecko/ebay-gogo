import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Search, ChevronRight, ChevronDown, FolderTree, Star, X, Loader2 } from 'lucide-react'
import { Dialog } from './dialog'
import { Button } from './button'
import { Toggle } from './toggle'
import { cn } from '@/lib/utils'
import { invoke } from '@/hooks/useIpc'
import type { EbayCategory, CategorySearchResult } from '@shared/types'

interface CategoryExplorerProps {
  open: boolean
  onClose: () => void
  onSelect: (cat: { categoryId: string; name: string; path: string }) => void
  includeSubcategories?: boolean
  onIncludeSubcategoriesChange?: (v: boolean) => void
}

interface TreeNode {
  category: EbayCategory
  children: TreeNode[] | null
  expanded: boolean
  loading: boolean
}

export function CategoryExplorer({
  open,
  onClose,
  onSelect,
  includeSubcategories,
  onIncludeSubcategoriesChange
}: CategoryExplorerProps): React.JSX.Element | null {
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([])
  const [selectedNode, setSelectedNode] = useState<EbayCategory | null>(null)
  const [rightPaneItems, setRightPaneItems] = useState<EbayCategory[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CategorySearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const leftPaneRef = useRef<HTMLDivElement>(null)
  const rightPaneRef = useRef<HTMLDivElement>(null)

  // Load top-level categories
  useEffect(() => {
    if (!open) return
    invoke('categories:topLevel', { marketplace: 'EBAY_US' }).then(cats => {
      setTreeNodes(cats.map(c => ({
        category: c,
        children: null,
        expanded: false,
        loading: false
      })))
    }).catch(() => {})
    invoke('categories:favorites').then(favs => {
      setFavoriteIds(new Set(favs.map(f => f.categoryId)))
    }).catch(() => {})
  }, [open])

  // Toggle expand a tree node
  const toggleExpand = useCallback(async (node: TreeNode, path: TreeNode[]) => {
    if (node.expanded) {
      // Collapse
      updateTreeNode(path, { expanded: false })
      return
    }

    if (node.children === null) {
      // Need to load children
      updateTreeNode(path, { loading: true })
      try {
        const children = await invoke('categories:children', {
          parentId: node.category.categoryId,
          marketplace: 'EBAY_US'
        })
        updateTreeNode(path, {
          expanded: true,
          loading: false,
          children: children.map(c => ({
            category: c,
            children: null,
            expanded: false,
            loading: false
          }))
        })
      } catch {
        updateTreeNode(path, { loading: false })
      }
    } else {
      updateTreeNode(path, { expanded: true })
    }
  }, [])

  // Helper to update a tree node by path
  const updateTreeNode = (path: TreeNode[], updates: Partial<TreeNode>) => {
    setTreeNodes(prev => {
      const cloned = [...prev]
      let nodes = cloned
      for (let i = 0; i < path.length - 1; i++) {
        const idx = nodes.findIndex(n => n.category.categoryId === path[i].category.categoryId)
        if (idx === -1) return prev
        nodes[idx] = { ...nodes[idx], children: nodes[idx].children ? [...nodes[idx].children!] : [] }
        nodes = nodes[idx].children!
      }
      const lastIdx = nodes.findIndex(n => n.category.categoryId === path[path.length - 1].category.categoryId)
      if (lastIdx !== -1) {
        nodes[lastIdx] = { ...nodes[lastIdx], ...updates }
      }
      return cloned
    })
  }

  // Select a tree node (show children in right pane)
  const handleNodeClick = useCallback(async (node: TreeNode, path: TreeNode[]) => {
    setSelectedNode(node.category)
    setBreadcrumbs(node.category.path.split(' > '))

    // Load children for right pane
    try {
      const children = await invoke('categories:children', {
        parentId: node.category.categoryId,
        marketplace: 'EBAY_US'
      })
      setRightPaneItems(children)

      // Also expand in tree
      if (!node.expanded) {
        toggleExpand(node, path)
      }
    } catch {
      setRightPaneItems([])
    }
  }, [toggleExpand])

  // Search with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!searchQuery.trim()) {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(() => {
      invoke('categories:search', { query: searchQuery, limit: 50 })
        .then(r => setSearchResults(r))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false))
    }, 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery])

  const handleToggleFavorite = (categoryId: string) => {
    const isFav = !favoriteIds.has(categoryId)
    invoke('categories:toggleFavorite', { categoryId, isFav }).catch(() => {})
    setFavoriteIds(prev => {
      const next = new Set(prev)
      if (isFav) next.add(categoryId)
      else next.delete(categoryId)
      return next
    })
  }

  const handleSelectCategory = (cat: { categoryId: string; name: string; path: string }) => {
    invoke('categories:trackUsage', { categoryId: cat.categoryId }).catch(() => {})
    onSelect(cat)
    onClose()
  }

  // Render tree node recursively
  const renderTreeNode = (node: TreeNode, depth: number, path: TreeNode[]): React.JSX.Element => {
    const isSelected = selectedNode?.categoryId === node.category.categoryId
    const hasChildren = !node.category.isLeaf

    return (
      <div key={node.category.categoryId}>
        <button
          className={cn(
            'w-full text-left flex items-center gap-1 py-1 px-1 text-xs hover:bg-muted/50 rounded-sm',
            isSelected && 'bg-muted'
          )}
          style={{ paddingLeft: `${depth * 16 + 4}px` }}
          onClick={() => handleNodeClick(node, path)}
          onDoubleClick={() => handleSelectCategory({
            categoryId: node.category.categoryId,
            name: node.category.name,
            path: node.category.path
          })}
        >
          {hasChildren ? (
            <button
              onClick={(e) => { e.stopPropagation(); toggleExpand(node, path) }}
              className="shrink-0 p-0.5"
            >
              {node.loading ? (
                <Loader2 size={10} className="animate-spin text-muted-foreground" />
              ) : node.expanded ? (
                <ChevronDown size={10} className="text-muted-foreground" />
              ) : (
                <ChevronRight size={10} className="text-muted-foreground" />
              )}
            </button>
          ) : (
            <span className="w-[14px] shrink-0" />
          )}
          <span className={cn('truncate flex-1', isSelected && 'font-medium')}>{node.category.name}</span>
        </button>
        {node.expanded && node.children && node.children.map(child =>
          renderTreeNode(child, depth + 1, [...path, child])
        )}
      </div>
    )
  }

  if (!open) return null

  const isSearching = searchQuery.trim().length > 0

  return (
    <Dialog open={open} onClose={onClose} title="Browse Categories" className="max-w-3xl">
      <div className="flex flex-col gap-3" style={{ height: '520px' }}>
        {/* Top: Search + Breadcrumbs + Select */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search categories..."
              className={cn(
                'flex h-7 w-full rounded-md border border-input bg-background pl-7 pr-2 py-1 text-xs',
                'transition-colors placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
              )}
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <Button
            size="xs"
            disabled={!selectedNode}
            onClick={() => selectedNode && handleSelectCategory({
              categoryId: selectedNode.categoryId,
              name: selectedNode.name,
              path: selectedNode.path
            })}
          >
            Select
          </Button>
        </div>

        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && !isSearching && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground overflow-x-auto">
            <FolderTree size={10} className="shrink-0" />
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight size={8} className="shrink-0" />}
                <span className={cn('shrink-0', i === breadcrumbs.length - 1 && 'text-foreground font-medium')}>
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Split view */}
        {isSearching ? (
          <div
            className="flex-1 overflow-y-auto rounded-md border border-border"
            style={{ minHeight: 0 }}
          >
            {searching && (
              <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                <Loader2 size={14} className="animate-spin mr-2" /> Searching...
              </div>
            )}
            {!searching && searchResults.length === 0 && (
              <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                No categories found
              </div>
            )}
            {searchResults.map(cat => (
              <button
                key={cat.categoryId}
                className={cn(
                  'w-full text-left px-3 py-2 text-xs hover:bg-muted/50 flex items-center gap-2 group',
                  selectedNode?.categoryId === cat.categoryId && 'bg-muted'
                )}
                onClick={() => {
                  setSelectedNode({
                    categoryId: cat.categoryId,
                    parentId: '',
                    name: cat.name,
                    path: cat.path,
                    isLeaf: cat.isLeaf,
                    marketplace: 'EBAY_US'
                  })
                  setBreadcrumbs(cat.path.split(' > '))
                }}
                onDoubleClick={() => handleSelectCategory({
                  categoryId: cat.categoryId,
                  name: cat.name,
                  path: cat.path
                })}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{cat.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{cat.path}</div>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{cat.categoryId}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleFavorite(cat.categoryId) }}
                  className={cn(
                    'shrink-0 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity',
                    favoriteIds.has(cat.categoryId) && 'opacity-100'
                  )}
                >
                  <Star
                    size={11}
                    className={cn(
                      favoriteIds.has(cat.categoryId) ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'
                    )}
                  />
                </button>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex gap-2 min-h-0">
            {/* Left: Tree */}
            <div
              ref={leftPaneRef}
              className="w-1/2 overflow-y-auto rounded-md border border-border p-1"
              style={{ minHeight: 0 }}
            >
              {treeNodes.map(node =>
                renderTreeNode(node, 0, [node])
              )}
              {treeNodes.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-4">
                  No categories loaded
                </div>
              )}
            </div>

            {/* Right: Subcategories */}
            <div
              ref={rightPaneRef}
              className="w-1/2 overflow-y-auto rounded-md border border-border"
              style={{ minHeight: 0 }}
            >
              {selectedNode ? (
                <>
                  <div className="px-2 py-1.5 border-b border-border bg-muted/30">
                    <div className="text-xs font-medium">{selectedNode.name}</div>
                    <div className="text-[10px] text-muted-foreground">{selectedNode.categoryId}</div>
                  </div>
                  {rightPaneItems.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-4">
                      No subcategories (leaf category)
                    </div>
                  ) : (
                    rightPaneItems.map(cat => (
                      <button
                        key={cat.categoryId}
                        className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted/50 flex items-center gap-1.5 group"
                        onClick={() => {
                          setSelectedNode(cat)
                          setBreadcrumbs(cat.path.split(' > '))
                          // Load its children in right pane
                          invoke('categories:children', {
                            parentId: cat.categoryId,
                            marketplace: 'EBAY_US'
                          }).then(setRightPaneItems).catch(() => setRightPaneItems([]))
                        }}
                        onDoubleClick={() => handleSelectCategory({
                          categoryId: cat.categoryId,
                          name: cat.name,
                          path: cat.path
                        })}
                      >
                        {!cat.isLeaf && <ChevronRight size={10} className="text-muted-foreground shrink-0" />}
                        <span className="truncate flex-1">{cat.name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{cat.categoryId}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleFavorite(cat.categoryId) }}
                          className={cn(
                            'shrink-0 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity',
                            favoriteIds.has(cat.categoryId) && 'opacity-100'
                          )}
                        >
                          <Star
                            size={11}
                            className={cn(
                              favoriteIds.has(cat.categoryId) ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'
                            )}
                          />
                        </button>
                      </button>
                    ))
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                  Select a category from the tree
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom: Include subcategories toggle */}
        {onIncludeSubcategoriesChange && (
          <div className="flex items-center justify-between border-t border-border pt-2">
            <Toggle
              checked={includeSubcategories || false}
              onChange={onIncludeSubcategoriesChange}
              label="Include subcategories"
            />
            <div className="text-[10px] text-muted-foreground">
              Double-click or select + click &quot;Select&quot; to choose
            </div>
          </div>
        )}
      </div>
    </Dialog>
  )
}
