import { createHash, randomUUID } from 'crypto'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

let cachedDeviceId: string | null = null

function getFallbackIdPath(): string {
  return path.join(app.getPath('userData'), '.device-id')
}

function getOrCreateFallbackId(): string {
  const filePath = getFallbackIdPath()
  try {
    const existing = fs.readFileSync(filePath, 'utf-8').trim()
    if (existing) return existing
  } catch {
    // File doesn't exist, create it
  }
  const id = randomUUID()
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, id, 'utf-8')
  return id
}

async function getRawDeviceId(): Promise<string> {
  // Try node-machine-id if available
  try {
    const { machineIdSync } = await import('node-machine-id')
    return machineIdSync(true)
  } catch {
    // node-machine-id not installed, use fallback
  }

  return getOrCreateFallbackId()
}

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId

  const raw = await getRawDeviceId()
  const id = createHash('sha256').update(raw).digest('hex')
  cachedDeviceId = id
  return id
}
