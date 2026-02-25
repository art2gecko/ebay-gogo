import React, { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle2, X } from 'lucide-react'

interface ToastProps {
  message: string
  visible: boolean
  onDismiss: () => void
  durationMs?: number
}

export function Toast({ message, visible, onDismiss, durationMs = 3000 }: ToastProps): React.JSX.Element | null {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (visible) {
      setShow(true)
      const timer = setTimeout(() => {
        setShow(false)
        setTimeout(onDismiss, 200)
      }, durationMs)
      return () => clearTimeout(timer)
    } else {
      setShow(false)
    }
  }, [visible, durationMs, onDismiss])

  if (!visible && !show) return null

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-[100] flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 shadow-lg transition-all duration-200',
        show ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      )}
    >
      <CheckCircle2 size={14} className="text-green-500 shrink-0" />
      <span className="text-xs">{message}</span>
      <button onClick={() => { setShow(false); setTimeout(onDismiss, 200) }} className="ml-1 text-muted-foreground hover:text-foreground shrink-0">
        <X size={12} />
      </button>
    </div>
  )
}
