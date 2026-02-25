import React from 'react'
import { Shield, ShieldCheck, ShieldAlert, ShieldOff, Clock, Wifi } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useLicenseStore } from '@/stores/licenseStore'
import type { LicenseStatus } from '@shared/licensingTypes'

const STATUS_CONFIG: Record<LicenseStatus, {
  label: string
  variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'
  icon: React.ElementType
}> = {
  trial: { label: 'Trial', variant: 'warning', icon: Clock },
  active: { label: 'Licensed', variant: 'success', icon: ShieldCheck },
  expired: { label: 'Expired', variant: 'destructive', icon: ShieldOff },
  blocked: { label: 'Blocked', variant: 'destructive', icon: ShieldAlert },
  grace: { label: 'Offline', variant: 'warning', icon: Wifi },
  unlicensed: { label: 'Unlicensed', variant: 'secondary', icon: Shield }
}

export function LicenseStatusPill(): React.JSX.Element {
  const { entitlements, setShowActivateModal } = useLicenseStore()
  const { status, daysRemaining } = entitlements
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  const showDays = (status === 'trial' || status === 'active' || status === 'grace') && daysRemaining != null

  return (
    <button
      onClick={() => {
        if (status === 'expired' || status === 'unlicensed' || status === 'blocked') {
          setShowActivateModal(true)
        }
      }}
      className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
      title={`License: ${config.label}${showDays ? ` (${daysRemaining}d left)` : ''}`}
    >
      <Badge variant={config.variant} className="flex items-center gap-1 text-[10px]">
        <Icon size={10} />
        {config.label}
        {showDays && (
          <span className="font-mono ml-0.5">{daysRemaining}d</span>
        )}
      </Badge>
    </button>
  )
}
