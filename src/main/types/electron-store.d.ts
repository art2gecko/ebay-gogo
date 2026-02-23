declare module 'electron-store' {
  interface Options<T> {
    name?: string
    encryptionKey?: string
    defaults?: T
  }

  class Store<T extends Record<string, unknown> = Record<string, unknown>> {
    constructor(options?: Options<T>)
    get<K extends keyof T>(key: K): T[K]
    set<K extends keyof T>(key: K, value: T[K]): void
    delete<K extends keyof T>(key: K): void
    clear(): void
    has<K extends keyof T>(key: K): boolean
  }

  export = Store
}
