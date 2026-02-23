import { useEffect } from 'react'
import type { IpcChannelName, IpcChannels, IpcEventName, IpcEvents } from '@shared/ipc-channels'

export function invoke<K extends IpcChannelName>(
  channel: K,
  ...args: IpcChannels[K]['request'] extends void ? [] : [IpcChannels[K]['request']]
): Promise<IpcChannels[K]['response']> {
  return window.api.invoke(channel, ...args)
}

export function useIpcEvent<K extends IpcEventName>(
  channel: K,
  callback: (data: IpcEvents[K]) => void
): void {
  useEffect(() => {
    const cleanup = window.api.on(channel, (data) => {
      callback(data as IpcEvents[K])
    })
    return cleanup
  }, [channel, callback])
}

export function openExternal(url: string): void {
  window.api.openExternal(url)
}
