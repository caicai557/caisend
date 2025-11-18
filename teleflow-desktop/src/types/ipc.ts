import type { AccountStats, AccountStatus } from './account'

/**
 * IPC 通信相关类型定义
 */

/**
 * IPC 请求格式
 */
export interface IPCRequest<T = unknown> {
  channel: string
  data?: T
}

/**
 * IPC 响应格式
 */
export interface IPCResponse<T = unknown> {
  success: boolean
  data?: T
  error?: IPCError
}

export interface IPCError {
  code: string
  message: string
  details?: Record<string, unknown>
}

/**
 * IPC 事件类型
 */
export type IPCEventType = 
  | 'account:status-changed'
  | 'log:new-entry'
  | 'stats:updated'
  | 'activity:new'
  | 'backend:status-changed'

/**
 * IPC 事件数据
 */
export interface IPCEvent<T = unknown> {
  type: IPCEventType
  data: T
  timestamp: string
}

/**
 * 账号状态变化事件
 */
export interface AccountStatusChangedEvent {
  accountId: string
  oldStatus: AccountStatus
  newStatus: AccountStatus
}

/**
 * 统计数据更新事件
 */
export interface StatsUpdatedEvent {
  accountId: string
  stats: AccountStats
}
