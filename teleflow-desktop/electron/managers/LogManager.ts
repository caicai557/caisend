/**
 * 日志管理器
 * 负责日志的记录、查询和导出
 */

import type { BrowserWindow } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'

type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical'
type LogMetadata = Record<string, unknown>

interface LogEntry {
  id: string
  timestamp: string
  accountId: string
  accountName: string
  level: LogLevel
  module: string
  message: string
  details?: LogMetadata
  stackTrace?: string
  metadata?: LogMetadata
}

interface LogFilter {
  accountIds?: string[]
  levels?: LogLevel[]
  startTime?: string
  endTime?: string
  keyword?: string
  page?: number
  pageSize?: number
}

export class LogManager {
  private logs: LogEntry[] = []
  private maxLogs = 10000
  private logsDir: string
  private mainWindow: BrowserWindow | null = null
  private currentLogFile: string = ''

  constructor(appDataPath: string) {
    this.logsDir = path.join(appDataPath, 'logs')
    this.initLogsDir()
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  private async initLogsDir() {
    try {
      await fs.mkdir(this.logsDir, { recursive: true })
      this.currentLogFile = path.join(
        this.logsDir,
        `app-${new Date().toISOString().split('T')[0]}.log`
      )
    } catch (error) {
      console.error('初始化日志目录失败:', error)
    }
  }

  private notifyNewLog(log: LogEntry) {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('log:new', { log })
    }
  }

  // 记录日志
  async log(
    level: LogLevel,
    message: string,
    options: {
      accountId?: string
      accountName?: string
      module?: string
      details?: LogMetadata
      stackTrace?: string
      metadata?: LogMetadata
    } = {}
  ): Promise<LogEntry> {
    const logEntry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      accountId: options.accountId || 'system',
      accountName: options.accountName || 'System',
      level,
      module: options.module || 'unknown',
      message,
      details: options.details,
      stackTrace: options.stackTrace,
      metadata: options.metadata
    }

    // 添加到内存
    this.logs.push(logEntry)

    // 限制内存中的日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // 写入文件
    await this.writeToFile(logEntry)

    // 通知前端
    this.notifyNewLog(logEntry)

    // 同时输出到控制台
    const levelColors: Record<LogLevel, string> = {
      debug: '\x1b[90m',
      info: '\x1b[36m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      critical: '\x1b[35m'
    }

    const color = levelColors[level] || '\x1b[0m'
    const reset = '\x1b[0m'
    
    console.log(
      `${color}[${level.toUpperCase()}]${reset} ` +
      `${logEntry.accountName} - ${logEntry.module}: ${message}`
    )

    return logEntry
  }

  private async writeToFile(log: LogEntry) {
    try {
      const logLine = JSON.stringify(log) + '\n'
      await fs.appendFile(this.currentLogFile, logLine, 'utf-8')
    } catch (error) {
      console.error('写入日志文件失败:', error)
    }
  }

  // 便捷方法
  async debug(message: string, options: LogMetadata = {}) {
    return this.log('debug', message, options)
  }

  async info(message: string, options: LogMetadata = {}) {
    return this.log('info', message, options)
  }

  async warning(message: string, options: LogMetadata = {}) {
    return this.log('warning', message, options)
  }

  async error(message: string, options: LogMetadata = {}) {
    return this.log('error', message, options)
  }

  async critical(message: string, options: LogMetadata = {}) {
    return this.log('critical', message, options)
  }

  // 查询日志
  async query(filter: LogFilter): Promise<{
    logs: LogEntry[]
    total: number
    page: number
    pageSize: number
  }> {
    let filtered = [...this.logs]

    // 按账号过滤
    if (filter.accountIds && filter.accountIds.length > 0) {
      filtered = filtered.filter(log => filter.accountIds!.includes(log.accountId))
    }

    // 按级别过滤
    if (filter.levels && filter.levels.length > 0) {
      filtered = filtered.filter(log => filter.levels!.includes(log.level))
    }

    // 按时间范围过滤
    if (filter.startTime) {
      filtered = filtered.filter(log => log.timestamp >= filter.startTime!)
    }

    if (filter.endTime) {
      filtered = filtered.filter(log => log.timestamp <= filter.endTime!)
    }

    // 按关键词过滤
    if (filter.keyword) {
      const keyword = filter.keyword.toLowerCase()
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(keyword) ||
        log.accountName.toLowerCase().includes(keyword) ||
        log.module.toLowerCase().includes(keyword)
      )
    }

    // 分页
    const page = filter.page || 1
    const pageSize = filter.pageSize || 50
    const total = filtered.length
    const start = (page - 1) * pageSize
    const end = start + pageSize

    const logs = filtered.slice(start, end).reverse() // 最新的在前

    return {
      logs,
      total,
      page,
      pageSize
    }
  }

  // 导出日志
  async export(filter: LogFilter, format: 'json' | 'csv' | 'txt', outputPath?: string): Promise<string> {
    const { logs } = await this.query(filter)

    const fileName = `logs-export-${Date.now()}.${format}`
    const filePath = outputPath || path.join(this.logsDir, fileName)

    let content = ''

    switch (format) {
      case 'json': {
        content = JSON.stringify(logs, null, 2)
        break
      }
      case 'csv': {
        const headers = ['时间', '账号', '级别', '模块', '消息']
        const rows = logs.map(log => [
          log.timestamp,
          log.accountName,
          log.level,
          log.module,
          log.message.replace(/"/g, '""')
        ])

        content = [
          headers.join(','),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')
        break
      }
      case 'txt': {
        content = logs.map(log =>
          `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.accountName} - ${log.module}: ${log.message}`
        ).join('\n')
        break
      }
      default:
        break
    }

    await fs.writeFile(filePath, content, 'utf-8')

    return filePath
  }

  // 清理日志
  async clear(filter?: { accountIds?: string[]; beforeDate?: string }): Promise<number> {
    const beforeCount = this.logs.length

    if (filter?.accountIds) {
      this.logs = this.logs.filter(log => !filter.accountIds!.includes(log.accountId))
    } else if (filter?.beforeDate) {
      this.logs = this.logs.filter(log => log.timestamp >= filter.beforeDate!)
    } else {
      this.logs = []
    }

    const deletedCount = beforeCount - this.logs.length

    return deletedCount
  }

  // 清理旧日志文件
  async cleanOldLogFiles(days: number = 30) {
    try {
      const files = await fs.readdir(this.logsDir)
      const now = Date.now()
      const maxAge = days * 24 * 60 * 60 * 1000

      for (const file of files) {
        if (file.endsWith('.log')) {
          const filePath = path.join(this.logsDir, file)
          const stats = await fs.stat(filePath)
          
          if (now - stats.mtimeMs > maxAge) {
            await fs.unlink(filePath)
            console.log(`删除旧日志文件: ${file}`)
          }
        }
      }
    } catch (error) {
      console.error('清理旧日志文件失败:', error)
    }
  }
}
