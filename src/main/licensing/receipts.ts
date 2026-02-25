import { verify as cryptoVerify, createPublicKey } from 'crypto'
import type { Receipt } from '@shared/licensingTypes'
import { ReceiptSchema } from '@shared/licensingTypes'

// Ed25519 public key for verifying receipt signatures.
// Replace with your actual license server's public key (PEM format).
const LICENSE_PUBLIC_KEY_PEM = process.env.LICENSE_PUBLIC_KEY ||
  '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\n-----END PUBLIC KEY-----'

export function verifyReceiptSignature(receipt: Receipt, signature: string): boolean {
  try {
    const payload = Buffer.from(JSON.stringify(receipt), 'utf-8')
    const sig = Buffer.from(signature, 'base64')
    const pubKey = createPublicKey(LICENSE_PUBLIC_KEY_PEM)
    return cryptoVerify(null, payload, pubKey, sig)
  } catch {
    return false
  }
}

export function parseAndVerifyReceipt(
  rawReceipt: unknown,
  signature: string
): { valid: boolean; receipt: Receipt | null } {
  const parsed = ReceiptSchema.safeParse(rawReceipt)
  if (!parsed.success) {
    return { valid: false, receipt: null }
  }

  const receipt = parsed.data
  const sigValid = verifyReceiptSignature(receipt, signature)
  if (!sigValid) {
    return { valid: false, receipt: null }
  }

  return { valid: true, receipt }
}

export function isReceiptExpired(receipt: Receipt): boolean {
  const expiry = receipt.expiresAt || receipt.trialEndsAt
  if (!expiry) return true
  return new Date(expiry).getTime() < Date.now()
}

export function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}
