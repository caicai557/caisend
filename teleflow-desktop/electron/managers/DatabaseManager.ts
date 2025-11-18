import DatabaseConstructor from 'better-sqlite3'
import * as fs from 'fs'
import * as path from 'path'

export type DatabaseConnection = DatabaseConstructor.Database

interface MigrationRecord {
  id: string
}

export class DatabaseManager {
  private dbPath: string
  private schemaPath: string
  private migrationsDir: string
  private connectionPool: DatabaseConnection[] = []
  private activeConnections: Set<DatabaseConnection> = new Set()
  private maxPoolSize = 4
  private projectRoot: string

  constructor(appDataPath: string) {
    this.projectRoot = path.join(__dirname, '../../..')
    this.dbPath = path.join(appDataPath, 'data', 'teleflow.db')
    this.schemaPath = path.join(this.projectRoot, 'database', 'schema.sql')
    this.migrationsDir = path.join(this.projectRoot, 'database', 'migrations')

    this.ensureDirectories()
    const isFreshDatabase = !fs.existsSync(this.dbPath)
    if (isFreshDatabase) {
      console.log('🆕 检测到新的数据库，写入基础 schema')
      this.applySchemaSnapshot()
    }

    this.applyPendingMigrations()
  }

  getDatabasePath(): string {
    return this.dbPath
  }

  withConnection<T>(handler: (connection: DatabaseConnection) => T): T {
    const connection = this.acquireConnection()
    try {
      return handler(connection)
    } finally {
      this.releaseConnection(connection)
    }
  }

  runInTransaction<T>(handler: (connection: DatabaseConnection) => T): T {
    return this.withConnection((connection) => {
      connection.exec('BEGIN')
      try {
        const result = handler(connection)
        connection.exec('COMMIT')
        return result
      } catch (error) {
        connection.exec('ROLLBACK')
        throw error
      }
    })
  }

  vacuum(): void {
    this.withConnection((connection) => {
      connection.exec('VACUUM')
    })
  }

  close(): void {
    this.connectionPool.forEach((conn) => conn.close())
    this.activeConnections.forEach((conn) => conn.close())
    this.connectionPool = []
    this.activeConnections.clear()
  }

  private ensureDirectories() {
    const dir = path.dirname(this.dbPath)
    fs.mkdirSync(dir, { recursive: true })
  }

  private applySchemaSnapshot() {
    if (!fs.existsSync(this.schemaPath)) {
      console.warn('⚠ 未找到 schema.sql，跳过基础表初始化')
      return
    }

    const schemaSql = fs.readFileSync(this.schemaPath, 'utf-8')
    this.withConnection((connection) => {
      connection.exec(schemaSql)
    })
  }

  private applyPendingMigrations() {
    if (!fs.existsSync(this.migrationsDir)) {
      console.warn('⚠ 未找到 migrations 目录，跳过迁移执行')
      return
    }

    const migrationFiles = fs
      .readdirSync(this.migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b))

    if (migrationFiles.length === 0) {
      return
    }

    this.withConnection((connection) => {
      connection.exec(
        'CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)'
      )

      const applied = connection
        .prepare('SELECT id FROM schema_migrations')
        .all() as MigrationRecord[]
      const appliedIds = new Set(applied.map((record) => record.id))

      for (const file of migrationFiles) {
        if (appliedIds.has(file)) {
          continue
        }

        const filePath = path.join(this.migrationsDir, file)
        const sql = fs.readFileSync(filePath, 'utf-8')

        try {
          connection.exec('BEGIN')
          connection.exec(sql)
          connection.prepare('INSERT INTO schema_migrations (id) VALUES (?)').run(file)
          connection.exec('COMMIT')
          console.log(`✅ 数据库迁移完成: ${file}`)
        } catch (error) {
          connection.exec('ROLLBACK')
          console.error(`❌ 数据库迁移失败: ${file}`, error)
          throw error
        }
      }
    })
  }

  private acquireConnection(): DatabaseConnection {
    const connection = this.connectionPool.pop() ?? this.createConnection()
    this.activeConnections.add(connection)
    return connection
  }

  private releaseConnection(connection: DatabaseConnection) {
    if (!this.activeConnections.has(connection)) {
      return
    }

    this.activeConnections.delete(connection)
    if (this.connectionPool.length >= this.maxPoolSize) {
      connection.close()
      return
    }

    this.connectionPool.push(connection)
  }

  private createConnection(): DatabaseConnection {
    const connection = new DatabaseConstructor(this.dbPath)
    connection.pragma('journal_mode = WAL')
    connection.pragma('foreign_keys = ON')
    return connection
  }
}
