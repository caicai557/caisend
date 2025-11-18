/**
 * 仪表盘管理器
 * 负责收集和提供仪表盘数据
 */

import type { BrowserWindow } from 'electron'

import { AccountManager } from './AccountManager'

interface DashboardMetrics {
  totalAccounts: number
  runningAccounts: number
  totalReplies: number
  todayReplies: number
  successRate: number
  uptime: number
}

interface ActivityTimelineItem {
  id: string
  timestamp: string
  type: 'info' | 'success' | 'warning' | 'error'
  accountId?: string
  accountName?: string
  title: string
  description: string
}

export class DashboardManager {
  private mainWindow: BrowserWindow | null = null
  private accountManager: AccountManager
  private activities: ActivityTimelineItem[] = []
  private maxActivities = 50

  constructor(accountManager: AccountManager) {
    this.accountManager = accountManager
    this.startPeriodicUpdate()
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  private startPeriodicUpdate() {
    // 每30秒更新一次仪表盘数据
    setInterval(() => {
      this.updateDashboard()
    }, 30000)
  }

  private async updateDashboard() {
    try {
      const data = await this.getData()
      if (this.mainWindow) {
        this.mainWindow.webContents.send('dashboard:updated', {
          metrics: data.metrics,
          timestamp: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('更新仪表盘失败:', error)
    }
  }

  // 获取仪表盘数据
  async getData(): Promise<{
    metrics: DashboardMetrics
    activities: ActivityTimelineItem[]
  }> {
    const metrics = await this.getMetrics()
    const activities = this.getActivities()

    return {
      metrics,
      activities
    }
  }

  // 计算指标
  private async getMetrics(): Promise<DashboardMetrics> {
    const accounts = await this.accountManager.getAll()

    const totalAccounts = accounts.length
    const runningAccounts = accounts.filter(a => a.status === 'running').length

    // 计算总回复数和今日回复数
    let totalReplies = 0
    let todayReplies = 0
    let totalSuccessRate = 0

    for (const account of accounts) {
      totalReplies += account.stats.totalReplies
      todayReplies += account.stats.todayReplies
      totalSuccessRate += account.stats.successRate
    }

    const successRate = totalAccounts > 0 ? totalSuccessRate / totalAccounts : 0

    // 计算总运行时间（小时）
    let uptime = 0
    for (const account of accounts) {
      uptime += account.stats.uptime
    }

    return {
      totalAccounts,
      runningAccounts,
      totalReplies,
      todayReplies,
      successRate: Math.round(successRate * 100) / 100,
      uptime: Math.round(uptime)
    }
  }

  // 获取活动时间线
  private getActivities(): ActivityTimelineItem[] {
    // 返回最近的活动
    return this.activities.slice(0, 20)
  }

  // 添加活动
  addActivity(activity: Omit<ActivityTimelineItem, 'id' | 'timestamp'>) {
    const item: ActivityTimelineItem = {
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...activity
    }

    this.activities.unshift(item)

    // 限制活动数量
    if (this.activities.length > this.maxActivities) {
      this.activities = this.activities.slice(0, this.maxActivities)
    }

    // 通知前端
    if (this.mainWindow) {
      this.mainWindow.webContents.send('activity:new', item)
    }
  }

  // 记录账号活动
  recordAccountActivity(
    type: 'created' | 'started' | 'stopped' | 'error',
    accountId: string,
    accountName: string
  ) {
    const typeMap = {
      created: { type: 'success' as const, title: '账号创建', description: `创建了账号 ${accountName}` },
      started: { type: 'info' as const, title: '账号启动', description: `${accountName} 已启动运行` },
      stopped: { type: 'warning' as const, title: '账号停止', description: `${accountName} 已停止运行` },
      error: { type: 'error' as const, title: '账号错误', description: `${accountName} 运行出错` }
    }

    const activity = typeMap[type]
    this.addActivity({
      ...activity,
      accountId,
      accountName
    })
  }

  // 记录规则活动
  recordRuleActivity(
    type: 'triggered' | 'created',
    ruleName: string,
    accountName?: string
  ) {
    if (type === 'triggered') {
      this.addActivity({
        type: 'success',
        accountName,
        title: '规则触发',
        description: `规则 "${ruleName}" 被触发`
      })
    } else {
      this.addActivity({
        type: 'info',
        title: '规则创建',
        description: `创建了新规则 "${ruleName}"`
      })
    }
  }

  // 记录系统活动
  recordSystemActivity(
    type: 'info' | 'warning' | 'error',
    title: string,
    description: string
  ) {
    this.addActivity({
      type,
      title,
      description
    })
  }
}
