import React, { useEffect, useState, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle2, X, Undo2 } from 'lucide-react'

export interface ToastData {
  id: string
  message: string
  undoAction?: () => void
  durationMs?: number
}

interface ToastItemProps {
  toast: ToastData
  onDismiss: (id: string) => void
}

function ToastItem({ toast, onDismiss }: ToastItemProps): React.JSX.Element {
  const [show, setShow] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    requestAnimationFrame(() => setShow(true))
    timerRef.current = setTimeout(() => {
      setShow(false)
      setTimeout(() => onDismiss(toast.id), 200)
    }, toast.durationMs || 5000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [toast.id, toast.durationMs, onDismiss])

  const handleUndo = useCallback(() => {
    toast.undoAction?.()
    if (timerRef.current) clearTimeout(timerRef.current)
    setShow(false)
    setTimeout(() => onDismiss(toast.id), 200)
  }, [toast, onDismiss])

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 shadow-lg transition-all duration-200',
        show ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      )}
    >
      <CheckCircle2 size={14} className="text-green-500 shrink-0" />
      <span className="text-xs">{toast.message}</span>
      {toast.undoAction && (
        <button
          onClick={handleUndo}
          className="ml-1 flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 shrink-0"
        >
          <Undo2 size={11} />
          Undo
        </button>
      )}
      <button
        onClick={() => { setShow(false); setTimeout(() => onDismiss(toast.id), 200) }}
        className="ml-1 text-muted-foreground hover:text-foreground shrink-0"
      >
        <X size={12} />
      </button>
    </div>
  )
}

// ============================================================
// Toast Manager (singleton)
// ============================================================

let addToastFn: ((toast: Omit<ToastData, 'id'>) => void) | null = null

export function showToast(message: string, undoAction?: () => void, durationMs?: number): void {
  addToastFn?.({ message, undoAction, durationMs: durationMs || (undoAction ? 10000 : 3000) })
}

export function ToastContainer(): React.JSX.Element {
  const [toasts, setToasts] = useState<ToastData[]>([])

  useEffect(() => {
    addToastFn = (toast) => {
      const id = `${Date.now()}-${Math.random()}`
      setToasts(prev => [...prev, { ...toast, id }])
    }
    return () => { addToastFn = null }
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  if (toasts.length === 0) return <></>

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
      ))}
    </div>
  )
}
