import type { RunResult } from 'better-sqlite3'

import type { DatabaseConnection, DatabaseManager } from '../../electron/managers/DatabaseManager'

type SqlParams = Record<string, unknown> | unknown[]

export abstract class BaseRepository<TDbRow = unknown> {
  protected constructor(protected readonly dbManager: DatabaseManager) {}

  protected queryOne<TResult = TDbRow>(sql: string, params: SqlParams = {}): TResult | null {
    return this.dbManager.withConnection((connection) => {
      const statement = connection.prepare(sql)
      const row = Array.isArray(params) ? statement.get(...params) : statement.get(params)
      return (row as TResult) ?? null
    })
  }

  protected queryMany<TResult = TDbRow>(sql: string, params: SqlParams = {}): TResult[] {
    return this.dbManager.withConnection((connection) => {
      const statement = connection.prepare(sql)
      const rows = Array.isArray(params) ? statement.all(...params) : statement.all(params)
      return rows as TResult[]
    })
  }

  protected run(sql: string, params: SqlParams = {}): RunResult {
    return this.dbManager.withConnection((connection) => {
      const statement = connection.prepare(sql)
      return Array.isArray(params) ? statement.run(...params) : statement.run(params)
    })
  }

  protected exists(sql: string, params: SqlParams = {}): boolean {
    const row = this.queryOne<{ count: number }>(sql, params)
    return !!row && Number(row.count) > 0
  }

  protected withTransaction<TResult>(handler: (connection: DatabaseConnection) => TResult): TResult {
    return this.dbManager.runInTransaction(handler)
  }

  protected nowSeconds(): number {
    return Math.floor(Date.now() / 1000)
  }
}
