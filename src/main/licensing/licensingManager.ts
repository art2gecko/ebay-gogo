import { app, BrowserWindow } from 'electron'
import { getDeviceId } from './deviceId'
import { verifyReceiptSignature, isReceiptExpired, daysUntil } from './receipts'
import { startTrial, activateLicense, validateLicense, deactivateLicense, LicenseClientError } from './licenseClient'
import { getLicenseData, saveLicenseData, getLicenseKey, saveLicenseKey, clearLicenseKey } from './licenseStore'
import { addLog } from '../db/database'
import type {
  Entitlements, LicenseStatus, LicensePlan, Receipt, CachedLicenseData,
  LicenseActivateResult, LicenseDeactivateResult
} from '@shared/licensingTypes'
import { PLAN_LIMITS, TRIAL_LIMITS, UNLICENSED_ENTITLEMENTS } from '@shared/licensingTypes'

const VALIDATE_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours
const GRACE_PERIOD_MS = 72 * 60 * 60 * 1000 // 72 hours

let currentEntitlements: Entitlements = UNLICENSED_ENTITLEMENTS
let validateTimer: NodeJS.Timeout | null = null
let mainWindow: BrowserWindow | null = null

export function setLicensingWindow(win: BrowserWindow): void {
  mainWindow = win
}

function sendEntitlements(ent: Entitlements): void {
  currentEntitlements = ent
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('license:entitlements-changed', ent)
  }
}

function buildEntitlements(
  status: LicenseStatus,
  receipt: Receipt | null,
  cached: CachedLicenseData
): Entitlements {
  const plan: LicensePlan = (receipt?.plan as LicensePlan) || 'starter'
  const limits = status === 'trial' ? TRIAL_LIMITS : PLAN_LIMITS[plan]

  let daysRemaining: number | null = null
  if (status === 'trial' && receipt?.trialEndsAt) {
    daysRemaining = daysUntil(receipt.trialEndsAt)
  } else if ((status === 'active' || status === 'grace') && receipt?.expiresAt) {
    daysRemaining = daysUntil(receipt.expiresAt)
  }

  let graceDeadline: string | null = null
  if (status === 'grace' && cached.lastValidatedAt) {
    graceDeadline = new Date(new Date(cached.lastValidatedAt).getTime() + GRACE_PERIOD_MS).toISOString()
  }

  // Expired/blocked/unlicensed get zero entitlements
  const locked = status === 'expired' || status === 'blocked' || status === 'unlicensed'

  return {
    status,
    plan,
    trialEndsAt: receipt?.trialEndsAt || null,
    expiresAt: receipt?.expiresAt || null,
    lastValidatedAt: cached.lastValidatedAt,
    seatsUsed: receipt?.seatsUsed ?? null,
    seatsTotal: receipt?.seatsTotal ?? null,
    maxMonitors: locked ? 0 : limits.maxMonitors,
    minIntervalSec: locked ? 999 : limits.minIntervalSec,
    viewsEnabled: locked ? false : limits.viewsEnabled,
    alertsEnabled: locked ? false : limits.alertsEnabled,
    daysRemaining,
    graceDeadline
  }
}

export async function initializeLicensing(): Promise<Entitlements> {
  const cached = getLicenseData()
  const licenseKey = getLicenseKey()

  // Case 1: We have a license key — validate it
  if (licenseKey && cached.receipt && cached.signature) {
    const sigValid = verifyReceiptSignature(cached.receipt, cached.signature)
    if (!sigValid) {
      addLog('warn', 'License receipt signature verification failed — treating as unlicensed')
      const ent = buildEntitlements('unlicensed', null, cached)
      sendEntitlements(ent)
      return ent
    }

    // Try online validation
    const ent = await runValidation(licenseKey, cached)
    scheduleValidation(licenseKey)
    return ent
  }

  // Case 2: We have a trial receipt
  if (cached.receipt && cached.receipt.type === 'trial' && cached.signature) {
    const sigValid = verifyReceiptSignature(cached.receipt, cached.signature)
    if (sigValid) {
      if (isReceiptExpired(cached.receipt)) {
        addLog('info', 'Trial has expired')
        const ent = buildEntitlements('expired', cached.receipt, cached)
        sendEntitlements(ent)
        return ent
      }
      addLog('info', `Trial active — ${daysUntil(cached.receipt.trialEndsAt || cached.receipt.expiresAt)} days remaining`)
      const ent = buildEntitlements('trial', cached.receipt, cached)
      sendEntitlements(ent)
      return ent
    }
    addLog('warn', 'Trial receipt signature invalid')
  }

  // Case 3: Fresh install — start trial
  return startTrialFlow()
}

async function startTrialFlow(): Promise<Entitlements> {
  try {
    const deviceId = await getDeviceId()
    const res = await startTrial({
      deviceId,
      platform: process.platform,
      appVersion: app.getVersion()
    })

    const sigValid = verifyReceiptSignature(res.receipt, res.signature)
    if (!sigValid) {
      addLog('warn', 'Trial receipt from server has invalid signature')
      const ent = buildEntitlements('unlicensed', null, getLicenseData())
      sendEntitlements(ent)
      return ent
    }

    saveLicenseData({
      receipt: res.receipt,
      signature: res.signature,
      licenseKey: null,
      lastValidatedAt: new Date().toISOString(),
      trialStartedAt: new Date().toISOString()
    })

    addLog('info', 'Trial started successfully')
    const ent = buildEntitlements('trial', res.receipt, getLicenseData())
    sendEntitlements(ent)
    return ent
  } catch (err) {
    addLog('warn', `Failed to start trial: ${err instanceof Error ? err.message : String(err)}`)
    // Offline on first launch — unlicensed
    const ent = buildEntitlements('unlicensed', null, getLicenseData())
    sendEntitlements(ent)
    return ent
  }
}

async function runValidation(licenseKey: string, cached: CachedLicenseData): Promise<Entitlements> {
  try {
    const deviceId = await getDeviceId()
    const res = await validateLicense({ licenseKey, deviceId })

    if (!res.valid) {
      addLog('warn', 'License validation returned invalid — license may be blocked')
      const ent = buildEntitlements('blocked', cached.receipt, cached)
      sendEntitlements(ent)
      return ent
    }

    const sigValid = verifyReceiptSignature(res.receipt, res.signature)
    if (!sigValid) {
      addLog('warn', 'Validation response signature invalid')
      const ent = buildEntitlements('unlicensed', null, cached)
      sendEntitlements(ent)
      return ent
    }

    // Update cache
    const updated: CachedLicenseData = {
      ...cached,
      receipt: res.receipt,
      signature: res.signature,
      lastValidatedAt: new Date().toISOString()
    }
    saveLicenseData(updated)

    if (isReceiptExpired(res.receipt)) {
      addLog('info', 'License has expired')
      const ent = buildEntitlements('expired', res.receipt, updated)
      sendEntitlements(ent)
      return ent
    }

    addLog('info', 'License validated successfully')
    const ent = buildEntitlements('active', res.receipt, updated)
    sendEntitlements(ent)
    return ent
  } catch (err) {
    // Network error — enter grace if within window
    const message = err instanceof Error ? err.message : String(err)
    addLog('warn', `License validation failed: ${message}`)

    if (cached.lastValidatedAt) {
      const elapsed = Date.now() - new Date(cached.lastValidatedAt).getTime()
      if (elapsed < GRACE_PERIOD_MS && cached.receipt && !isReceiptExpired(cached.receipt)) {
        addLog('info', 'Entering offline grace period')
        const ent = buildEntitlements('grace', cached.receipt, cached)
        sendEntitlements(ent)
        return ent
      }
    }

    // Grace exceeded or no previous validation
    addLog('warn', 'Offline grace period exceeded — requires internet to re-validate')
    const ent = buildEntitlements('expired', cached.receipt, cached)
    sendEntitlements(ent)
    return ent
  }
}

function scheduleValidation(licenseKey: string): void {
  if (validateTimer) clearInterval(validateTimer)
  validateTimer = setInterval(async () => {
    const cached = getLicenseData()
    await runValidation(licenseKey, cached)
  }, VALIDATE_INTERVAL_MS)
}

export async function activate(key: string): Promise<LicenseActivateResult> {
  try {
    const deviceId = await getDeviceId()
    const res = await activateLicense({
      licenseKey: key,
      deviceId,
      platform: process.platform,
      appVersion: app.getVersion()
    })

    const sigValid = verifyReceiptSignature(res.receipt, res.signature)
    if (!sigValid) {
      return {
        success: false,
        error: 'Invalid receipt signature from server',
        entitlements: currentEntitlements
      }
    }

    saveLicenseKey(key)
    const updated: CachedLicenseData = {
      receipt: res.receipt,
      signature: res.signature,
      licenseKey: key,
      lastValidatedAt: new Date().toISOString(),
      trialStartedAt: getLicenseData().trialStartedAt
    }
    saveLicenseData(updated)

    addLog('info', 'License activated successfully')
    scheduleValidation(key)

    const ent = buildEntitlements('active', res.receipt, updated)
    sendEntitlements(ent)
    return { success: true, entitlements: ent }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    let userMessage = 'Activation failed. Please check your key and try again.'

    if (err instanceof LicenseClientError) {
      if (err.statusCode === 404) userMessage = 'Invalid license key.'
      else if (err.statusCode === 409) userMessage = 'Seat limit reached. Deactivate another device first.'
      else if (err.statusCode === 403) userMessage = 'This license key has been blocked.'
      else if (err.serverMessage) userMessage = err.serverMessage
    }

    addLog('warn', `License activation failed: ${message}`)
    return { success: false, error: userMessage, entitlements: currentEntitlements }
  }
}

export async function deactivate(): Promise<LicenseDeactivateResult> {
  const licenseKey = getLicenseKey()
  if (!licenseKey) {
    return { success: false, error: 'No license key to deactivate' }
  }

  try {
    const deviceId = await getDeviceId()
    await deactivateLicense({ licenseKey, deviceId })

    clearLicenseKey()
    saveLicenseData({
      receipt: null,
      signature: null,
      licenseKey: null,
      lastValidatedAt: null,
      trialStartedAt: getLicenseData().trialStartedAt
    })

    if (validateTimer) {
      clearInterval(validateTimer)
      validateTimer = null
    }

    addLog('info', 'License deactivated on this device')
    const ent = buildEntitlements('unlicensed', null, getLicenseData())
    sendEntitlements(ent)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    addLog('warn', `License deactivation failed: ${message}`)
    return { success: false, error: 'Failed to deactivate. Check your connection.' }
  }
}

export async function refreshEntitlements(): Promise<Entitlements> {
  const cached = getLicenseData()
  const licenseKey = getLicenseKey()

  if (licenseKey) {
    return runValidation(licenseKey, cached)
  }

  // Re-evaluate trial/cached state
  if (cached.receipt && cached.receipt.type === 'trial' && cached.signature) {
    const sigValid = verifyReceiptSignature(cached.receipt, cached.signature)
    if (sigValid && !isReceiptExpired(cached.receipt)) {
      const ent = buildEntitlements('trial', cached.receipt, cached)
      sendEntitlements(ent)
      return ent
    }
    const ent = buildEntitlements('expired', cached.receipt, cached)
    sendEntitlements(ent)
    return ent
  }

  return currentEntitlements
}

export function getEntitlements(): Entitlements {
  return currentEntitlements
}

export function canStartEngine(): boolean {
  const s = currentEntitlements.status
  return s === 'trial' || s === 'active' || s === 'grace'
}

export function cleanup(): void {
  if (validateTimer) {
    clearInterval(validateTimer)
    validateTimer = null
  }
}
