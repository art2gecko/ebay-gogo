import React, { useState, useCallback } from 'react'
import { Key, ExternalLink, AlertCircle } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useLicenseStore } from '@/stores/licenseStore'
import { openExternal } from '@/hooks/useIpc'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PURCHASE_URL = ((import.meta as any).env?.VITE_PURCHASE_URL as string) || 'https://example.com/purchase'

export function ActivateLicenseModal(): React.JSX.Element | null {
  const { showActivateModal, setShowActivateModal, activateLicense, activating, activateError, entitlements } = useLicenseStore()
  const [key, setKey] = useState('')

  const handleActivate = useCallback(async () => {
    const trimmed = key.trim()
    if (!trimmed) return
    const success = await activateLicense(trimmed)
    if (success) {
      setKey('')
    }
  }, [key, activateLicense])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !activating) {
      e.preventDefault()
      handleActivate()
    }
  }, [handleActivate, activating])

  const isExpired = entitlements.status === 'expired' || entitlements.status === 'unlicensed'
  const isBlocked = entitlements.status === 'blocked'

  if (!showActivateModal) return null

  return (
    <Dialog open={showActivateModal} onClose={() => setShowActivateModal(false)} title="Activate License">
      <div className="flex flex-col gap-4">
        {isExpired && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-xs">
            <AlertCircle size={14} className="text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">
                {entitlements.status === 'expired' ? 'Your trial or license has expired.' : 'No active license found.'}
              </p>
              <p className="text-muted-foreground mt-1">
                Enter a license key below to unlock all features, or purchase one to get started.
              </p>
            </div>
          </div>
        )}

        {isBlocked && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-xs">
            <AlertCircle size={14} className="text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">This license has been blocked.</p>
              <p className="text-muted-foreground mt-1">
                Please contact support if you believe this is an error.
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="text-[11px] text-muted-foreground mb-1 block">License Key</label>
          <div className="flex gap-2">
            <Input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="h-9 text-xs font-mono flex-1"
              autoFocus
              disabled={activating}
            />
            <Button onClick={handleActivate} disabled={activating || !key.trim()} className="shrink-0">
              <Key size={14} className="mr-1.5" />
              {activating ? 'Activating...' : 'Activate'}
            </Button>
          </div>
        </div>

        {activateError && (
          <Badge variant="destructive" className="text-xs py-1.5 px-3 justify-start">
            <AlertCircle size={12} className="mr-1.5 shrink-0" />
            {activateError}
          </Badge>
        )}

        {entitlements.seatsUsed != null && entitlements.seatsTotal != null && (
          <p className="text-xs text-muted-foreground">
            Seats used: {entitlements.seatsUsed} / {entitlements.seatsTotal}
          </p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openExternal(PURCHASE_URL)}
            className="text-xs"
          >
            <ExternalLink size={12} className="mr-1.5" />
            Purchase a License
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowActivateModal(false)}>
            Cancel
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
