import React, { useEffect, useCallback, useState } from 'react'
import {
  Key, ShieldCheck, Copy, ExternalLink, LogOut, RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLicenseStore } from '@/stores/licenseStore'
import { openExternal } from '@/hooks/useIpc'
import { copyToClipboard } from '@/lib/utils'
import { showToast } from '@/components/ui/Toast'
import type { LicenseStatus } from '@shared/licensingTypes'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PURCHASE_URL = ((import.meta as any).env?.VITE_PURCHASE_URL as string) || 'https://example.com/purchase'

const STATUS_LABELS: Record<LicenseStatus, string> = {
  trial: 'Trial',
  active: 'Active',
  expired: 'Expired',
  blocked: 'Blocked',
  grace: 'Offline Grace',
  unlicensed: 'Unlicensed'
}

const STATUS_VARIANTS: Record<LicenseStatus, 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'outline'> = {
  trial: 'warning',
  active: 'success',
  expired: 'destructive',
  blocked: 'destructive',
  grace: 'warning',
  unlicensed: 'secondary'
}

export function LicenseSettingsPanel(): React.JSX.Element {
  const {
    entitlements, deviceId, setShowActivateModal,
    fetchDeviceId, deactivateLicense, refreshLicense
  } = useLicenseStore()
  const [deactivating, setDeactivating] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchDeviceId()
  }, [fetchDeviceId])

  const handleDeactivate = useCallback(async () => {
    setDeactivating(true)
    const ok = await deactivateLicense()
    setDeactivating(false)
    if (ok) {
      showToast('License deactivated on this device')
    } else {
      showToast('Failed to deactivate')
    }
  }, [deactivateLicense])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await refreshLicense()
    setRefreshing(false)
  }, [refreshLicense])

  const handleCopyDeviceId = useCallback(() => {
    if (deviceId) {
      copyToClipboard(deviceId)
      showToast('Device ID copied')
    }
  }, [deviceId])

  const { status, plan, daysRemaining, trialEndsAt, expiresAt, lastValidatedAt, seatsUsed, seatsTotal, graceDeadline } = entitlements
  const hasKey = status === 'active' || status === 'grace' || status === 'blocked'

  const formatDate = (d: string | null): string => {
    if (!d) return '—'
    return new Date(d).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
    })
  }

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck size={16} className="text-primary" />
        <h3 className="text-sm font-semibold">License</h3>
        <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>
        {plan && hasKey && (
          <Badge variant="outline" className="capitalize">{plan}</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-4">
        <span className="text-muted-foreground">Status</span>
        <span>{STATUS_LABELS[status]}{daysRemaining != null ? ` (${daysRemaining} days left)` : ''}</span>

        {status === 'trial' && trialEndsAt && (
          <>
            <span className="text-muted-foreground">Trial ends</span>
            <span>{formatDate(trialEndsAt)}</span>
          </>
        )}

        {hasKey && expiresAt && (
          <>
            <span className="text-muted-foreground">Expires</span>
            <span>{formatDate(expiresAt)}</span>
          </>
        )}

        {seatsUsed != null && seatsTotal != null && (
          <>
            <span className="text-muted-foreground">Seats</span>
            <span>{seatsUsed} / {seatsTotal}</span>
          </>
        )}

        {lastValidatedAt && (
          <>
            <span className="text-muted-foreground">Last validated</span>
            <span>{formatDate(lastValidatedAt)}</span>
          </>
        )}

        {status === 'grace' && graceDeadline && (
          <>
            <span className="text-muted-foreground">Grace deadline</span>
            <span className="text-warning">{formatDate(graceDeadline)}</span>
          </>
        )}

        <span className="text-muted-foreground">Device ID</span>
        <span className="font-mono text-[10px] truncate" title={deviceId || ''}>
          {deviceId ? `${deviceId.slice(0, 16)}...` : 'Loading...'}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {!hasKey && (
          <Button size="sm" onClick={() => setShowActivateModal(true)}>
            <Key size={14} className="mr-1.5" />
            Activate License
          </Button>
        )}

        {hasKey && (
          <Button size="sm" variant="outline" onClick={() => setShowActivateModal(true)}>
            <Key size={14} className="mr-1.5" />
            Change Key
          </Button>
        )}

        {hasKey && (
          <Button size="sm" variant="outline" onClick={handleDeactivate} disabled={deactivating}>
            <LogOut size={14} className="mr-1.5" />
            {deactivating ? 'Deactivating...' : 'Deactivate Device'}
          </Button>
        )}

        <Button size="sm" variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={14} className={`mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Checking...' : 'Re-validate'}
        </Button>

        {deviceId && (
          <Button size="sm" variant="ghost" onClick={handleCopyDeviceId}>
            <Copy size={14} className="mr-1.5" />
            Copy Device ID
          </Button>
        )}

        <Button size="sm" variant="ghost" onClick={() => openExternal(PURCHASE_URL)}>
          <ExternalLink size={14} className="mr-1.5" />
          Upgrade
        </Button>
      </div>
    </section>
  )
}
