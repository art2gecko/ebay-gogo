import { contextBridge, ipcRenderer } from 'electron'
import type { IpcChannelName, IpcEventName } from '@shared/ipc-channels'

const api = {
  invoke: <T = unknown>(channel: IpcChannelName, ...args: unknown[]): Promise<T> => {
    return ipcRenderer.invoke(channel, ...args)
  },

  on: (channel: IpcEventName | string, callback: (...args: unknown[]) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]): void => {
      callback(...args)
    }
    ipcRenderer.on(channel, listener)
    return () => {
      ipcRenderer.removeListener(channel, listener)
    }
  },

  openExternal: (url: string): void => {
    ipcRenderer.send('shell:openExternal', url)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronApi = typeof api
