import { ipcMain } from 'electron'
import { getEntitlements, activate, deactivate, refreshEntitlements } from './licensingManager'
import { getDeviceId } from './deviceId'
import type { IpcChannels } from '@shared/ipc-channels'

type Handler<K extends keyof IpcChannels> = (
  event: Electron.IpcMainInvokeEvent,
  args: IpcChannels[K]['request']
) => Promise<IpcChannels[K]['response']> | IpcChannels[K]['response']

function handle<K extends keyof IpcChannels>(channel: K, handler: Handler<K>): void {
  ipcMain.handle(channel, handler as (event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => unknown)
}

export function registerLicensingIpcHandlers(): void {
  handle('license:getEntitlements', () => getEntitlements())

  handle('license:activate', async (_e, { licenseKey }) => {
    return activate(licenseKey)
  })

  handle('license:deactivate', async () => {
    return deactivate()
  })

  handle('license:getDeviceId', () => getDeviceId())

  handle('license:refresh', async () => {
    return refreshEntitlements()
  })
}
