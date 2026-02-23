import React from 'react'
import { Search, Monitor, History, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore, type TabId } from '@/stores/appStore'

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'search', label: 'Search', icon: Search },
  { id: 'monitors', label: 'Monitors', icon: Monitor },
  { id: 'history', label: 'History', icon: History },
  { id: 'settings', label: 'Settings', icon: Settings }
]

export function NavTabs(): React.JSX.Element {
  const { activeTab, setActiveTab } = useAppStore()

  return (
    <div className="flex items-center h-8 px-2 border-b border-border bg-background shrink-0">
      {TABS.map((tab) => {
        const Icon = tab.icon
        const active = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-t transition-colors',
              active
                ? 'text-foreground bg-card border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <Icon size={13} />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
