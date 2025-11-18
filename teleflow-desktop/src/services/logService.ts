/**
 * 日志管理服务
 */

import { api } from './api'
import type { LogEntry, LogExportOptions, LogFilter, LogQueryResult } from '../types/log'

class LogService {
  /**
   * 查询日志
   */
  async query(filter: LogFilter): Promise<LogQueryResult> {
    return api.invoke('log:query', filter)
  }

  /**
   * 导出日志
   */
  async export(options: LogExportOptions): Promise<{ path: string }> {
    return api.invoke('log:export', options)
  }

  /**
   * 清理日志
   */
  async clean(beforeDate: string): Promise<void> {
    return api.invoke('log:clean', { beforeDate })
  }

  /**
   * 监听新日志
   */
  onNewLog(callback: (log: LogEntry) => void): () => void {
    return api.on('log:new-entry', callback)
  }
}

export const logService = new LogService()
