declare module 'sql.js' {
  interface QueryExecResult {
    columns: string[]
    values: unknown[][]
  }

  interface Statement {
    bind(params?: unknown[]): boolean
    step(): boolean
    getAsObject(): Record<string, unknown>
    get(): unknown[]
    getColumnNames(): string[]
    free(): boolean
    reset(): void
  }

  interface Database {
    run(sql: string, params?: unknown[]): Database
    exec(sql: string, params?: unknown[]): QueryExecResult[]
    prepare(sql: string): Statement
    getRowsModified(): number
    export(): Uint8Array
    close(): void
  }

  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database
  }

  function initSqlJs(config?: {
    locateFile?: (file: string) => string
    wasmBinary?: ArrayBuffer | Uint8Array
  }): Promise<SqlJsStatic>

  export default initSqlJs
  export type { Database, Statement, QueryExecResult, SqlJsStatic }
}
