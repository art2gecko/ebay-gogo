import { z } from 'zod'

// ============================================================
// License Status & Plan
// ============================================================

export type LicenseStatus = 'trial' | 'active' | 'expired' | 'blocked' | 'grace' | 'unlicensed'
export type LicensePlan = 'starter' | 'pro'

// ============================================================
// Entitlements — produced by main, consumed by renderer
// ============================================================

export interface Entitlements {
  status: LicenseStatus
  plan: LicensePlan
  trialEndsAt: string | null
  expiresAt: string | null
  lastValidatedAt: string | null
  seatsUsed: number | null
  seatsTotal: number | null
  maxMonitors: number
  minIntervalSec: number
  viewsEnabled: boolean
  alertsEnabled: boolean
  daysRemaining: number | null
  graceDeadline: string | null
}

// ============================================================
// Plan defaults
// ============================================================

export const PLAN_LIMITS: Record<LicensePlan, Pick<Entitlements, 'maxMonitors' | 'minIntervalSec' | 'viewsEnabled' | 'alertsEnabled'>> = {
  starter: {
    maxMonitors: 5,
    minIntervalSec: 60,
    viewsEnabled: false,
    alertsEnabled: false
  },
  pro: {
    maxMonitors: 50,
    minIntervalSec: 10,
    viewsEnabled: true,
    alertsEnabled: true
  }
}

export const TRIAL_LIMITS = PLAN_LIMITS.starter

export const UNLICENSED_ENTITLEMENTS: Entitlements = {
  status: 'unlicensed',
  plan: 'starter',
  trialEndsAt: null,
  expiresAt: null,
  lastValidatedAt: null,
  seatsUsed: null,
  seatsTotal: null,
  maxMonitors: 0,
  minIntervalSec: 999,
  viewsEnabled: false,
  alertsEnabled: false,
  daysRemaining: null,
  graceDeadline: null
}

// ============================================================
// Receipt — returned by the license server
// ============================================================

export const ReceiptSchema = z.object({
  type: z.enum(['trial', 'license']),
  deviceId: z.string(),
  plan: z.enum(['starter', 'pro']).optional(),
  licenseKey: z.string().optional(),
  seatsUsed: z.number().optional(),
  seatsTotal: z.number().optional(),
  issuedAt: z.string(),
  expiresAt: z.string(),
  trialEndsAt: z.string().optional()
})

export type Receipt = z.infer<typeof ReceiptSchema>

// ============================================================
// Cached license data (persisted in electron-store)
// ============================================================

export interface CachedLicenseData {
  receipt: Receipt | null
  signature: string | null
  licenseKey: string | null
  lastValidatedAt: string | null
  trialStartedAt: string | null
}

export const DEFAULT_CACHED_LICENSE: CachedLicenseData = {
  receipt: null,
  signature: null,
  licenseKey: null,
  lastValidatedAt: null,
  trialStartedAt: null
}

// ============================================================
// Server request/response shapes
// ============================================================

export interface TrialStartRequest {
  deviceId: string
  platform: string
  appVersion: string
}

export interface TrialStartResponse {
  receipt: Receipt
  signature: string
}

export interface ActivateRequest {
  licenseKey: string
  deviceId: string
  platform: string
  appVersion: string
}

export interface ActivateResponse {
  receipt: Receipt
  signature: string
}

export interface ValidateRequest {
  licenseKey: string
  deviceId: string
}

export interface ValidateResponse {
  valid: boolean
  receipt: Receipt
  signature: string
}

export interface DeactivateRequest {
  licenseKey: string
  deviceId: string
}

export interface DeactivateResponse {
  success: boolean
}

// ============================================================
// IPC Request/Response types
// ============================================================

export interface LicenseActivateResult {
  success: boolean
  error?: string
  entitlements: Entitlements
}

export interface LicenseDeactivateResult {
  success: boolean
  error?: string
}
