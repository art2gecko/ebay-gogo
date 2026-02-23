declare module 'better-sqlite3' {
  interface Statement {
    run(...params: unknown[]): Database.RunResult
    get(...params: unknown[]): unknown
    all(...params: unknown[]): unknown[]
  }

  interface RunResult {
    changes: number
    lastInsertRowid: number | bigint
  }

  interface Transaction<F extends (...args: unknown[]) => unknown> {
    (...args: Parameters<F>): ReturnType<F>
  }

  interface Database {
    prepare(sql: string): Statement
    exec(sql: string): this
    pragma(pragma: string, options?: { simple?: boolean }): unknown
    transaction<F extends (...args: unknown[]) => unknown>(fn: F): Transaction<F>
    close(): void
  }

  interface DatabaseConstructor {
    new (filename: string, options?: Record<string, unknown>): Database
    (filename: string, options?: Record<string, unknown>): Database
  }

  const Database: DatabaseConstructor
  type Database = InstanceType<typeof Database>
  export = Database
}
