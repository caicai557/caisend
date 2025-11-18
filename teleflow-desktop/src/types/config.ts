/**
 * 系统配置相关类型定义
 */

import type { LogEntry, LogLevel } from './log'

/**
 * 系统配置
 */
export interface SystemConfig {
  // 全局设置
  global: {
    theme: 'light' | 'dark' | 'auto'
    language: 'zh-CN' | 'en-US'
    logLevel: LogLevel
    logRetentionDays: number   // 日志保留天数
  }
  
  // Playwright 默认配置
  playwright: {
    executablePath?: string    // Chromium 路径
    headless: boolean
    slowMo: number
    timeout: number
    downloadsPath: string
  }
  
  // 后台服务配置
  backend: {
    pythonPath: string         // Python 解释器路径
    scriptPath: string         // Python 脚本路径
    host: string               // 服务地址
    port: number               // 服务端口
  }
  
  // 路径配置
  paths: {
    config: string             // 配置文件目录
    logs: string               // 日志文件目录
    profiles: string           // Profile 目录
    downloads: string          // 下载目录
  }
}

/**
 * 活动时间线条目
 */
export interface ActivityEntry {
  id: string
  timestamp: string
  accountId: string
  accountName: string
  type: 'reply' | 'read' | 'error' | 'start' | 'stop'
  description: string
  details?: LogEntry['metadata']
}

/**
 * 仪表盘指标
 */
export interface DashboardMetrics {
  totalAccounts: number
  runningAccounts: number
  todayReplies: number
  todayErrors: number
  systemUptime: number
}

/**
 * 系统状态
 */
export interface SystemStatus {
  isBackendRunning: boolean
  backendVersion?: string
  lastHealthCheck?: string
  pythonVersion?: string
}
