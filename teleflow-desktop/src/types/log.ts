/**
 * 日志相关类型定义
 */

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * 日志条目
 */
export interface LogEntry {
  id: string
  timestamp: string            // ISO 8601 格式
  accountId: string            // 所属账号
  accountName: string          // 账号名称
  level: LogLevel              // 日志级别
  module: string               // 模块名称
  message: string              // 日志消息
  details?: Record<string, unknown> // 详细信息（JSON）
  stackTrace?: string          // 错误堆栈
  metadata?: Record<string, unknown>
}

/**
 * 日志查询过滤器
 */
export interface LogFilter {
  accountIds?: string[]        // 账号 ID 列表
  levels?: LogLevel[]          // 日志级别
  startTime?: string           // 开始时间
  endTime?: string             // 结束时间
  keyword?: string             // 关键词搜索
  limit?: number               // 返回数量限制
  offset?: number              // 偏移量
}

/**
 * 日志查询结果
 */
export interface LogQueryResult {
  logs: LogEntry[]
  total: number
  hasMore: boolean
}

/**
 * 日志导出选项
 */
export interface LogExportOptions {
  filter: LogFilter
  format: 'json' | 'csv' | 'txt'
  includeDetails?: boolean
}
