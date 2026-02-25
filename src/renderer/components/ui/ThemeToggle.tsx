import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { Button } from './button'
import { useAppStore } from '@/stores/appStore'

export function ThemeToggle(): React.JSX.Element {
  const { theme, toggleTheme } = useAppStore()

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={toggleTheme}
      className="h-7 w-7 shrink-0"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
    </Button>
  )
}
