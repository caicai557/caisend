/**
 * 账号管理器
 * 负责账号的 CRUD 和状态管理
 */

import type { BrowserWindow } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'

interface Account {
  id: string
  name: string
  phone: string
  enabled: boolean
  status: 'idle' | 'running' | 'paused' | 'error'
  config: {
    maxRepliesPerDay: number
    replyDelay: number
    pollingInterval: number
    enableAI: boolean
    enableGroupReply: boolean
    enablePrivateReply: boolean
  }
  stats: {
    totalReplies: number
    todayReplies: number
    successRate: number
    uptime: number
    lastActiveAt?: string
  }
  createdAt: string
  updatedAt: string
}

export class AccountManager {
  private accounts: Map<string, Account> = new Map()
  private dataDir: string
  private mainWindow: BrowserWindow | null = null

  constructor(appDataPath: string) {
    this.dataDir = path.join(appDataPath, 'data', 'accounts')
    this.initDataDir()
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  private async initDataDir() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true })
      await this.loadAccounts()
    } catch (error) {
      console.error('初始化数据目录失败:', error)
    }
  }

  private async loadAccounts() {
    try {
      const files = await fs.readdir(this.dataDir)
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.dataDir, file)
          const content = await fs.readFile(filePath, 'utf-8')
          const account = JSON.parse(content) as Account
          this.accounts.set(account.id, account)
        }
      }

      console.log(`加载了 ${this.accounts.size} 个账号`)
    } catch (error) {
      console.error('加载账号失败:', error)
    }
  }

  private async saveAccount(account: Account) {
    const filePath = path.join(this.dataDir, `${account.id}.json`)
    await fs.writeFile(filePath, JSON.stringify(account, null, 2), 'utf-8')
  }

  private async deleteAccountFile(accountId: string) {
    const filePath = path.join(this.dataDir, `${accountId}.json`)
    await fs.unlink(filePath)
  }

  private notifyChange(event: string, data: unknown) {
    if (this.mainWindow) {
      this.mainWindow.webContents.send(event, data)
    }
  }

  // 获取所有账号
  async getAll(): Promise<Account[]> {
    return Array.from(this.accounts.values())
  }

  // 获取单个账号
  async getById(id: string): Promise<Account | null> {
    return this.accounts.get(id) || null
  }

  // 创建账号
  async create(data: {
    name: string
    phone: string
    config?: Partial<Account['config']>
  }): Promise<Account> {
    const account: Account = {
      id: `account-${Date.now()}`,
      name: data.name,
      phone: data.phone,
      enabled: true,
      status: 'idle',
      config: {
        maxRepliesPerDay: 100,
        replyDelay: 2000,
        pollingInterval: 5,
        enableAI: false,
        enableGroupReply: true,
        enablePrivateReply: true,
        ...data.config
      },
      stats: {
        totalReplies: 0,
        todayReplies: 0,
        successRate: 0,
        uptime: 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    this.accounts.set(account.id, account)
    await this.saveAccount(account)
    
    this.notifyChange('account:created', account)
    
    return account
  }

  // 更新账号
  async update(id: string, data: Partial<Account>): Promise<Account | null> {
    const account = this.accounts.get(id)
    if (!account) {
      return null
    }

    const updatedAccount = {
      ...account,
      ...data,
      id: account.id, // 确保 ID 不被修改
      updatedAt: new Date().toISOString()
    }

    this.accounts.set(id, updatedAccount)
    await this.saveAccount(updatedAccount)
    
    this.notifyChange('account:updated', updatedAccount)
    
    return updatedAccount
  }

  // 删除账号
  async delete(id: string): Promise<boolean> {
    const account = this.accounts.get(id)
    if (!account) {
      return false
    }

    // 如果账号正在运行，先停止
    if (account.status === 'running') {
      await this.stop(id)
    }

    this.accounts.delete(id)
    await this.deleteAccountFile(id)
    
    this.notifyChange('account:deleted', { id })
    
    return true
  }

  // 启动账号
  async start(id: string): Promise<boolean> {
    const account = this.accounts.get(id)
    if (!account) {
      return false
    }

    if (account.status === 'running') {
      return true
    }

    account.status = 'running'
    account.stats.lastActiveAt = new Date().toISOString()
    
    await this.saveAccount(account)
    this.notifyChange('account:status-changed', {
      accountId: id,
      status: 'running',
      timestamp: new Date().toISOString()
    })

    // TODO: 启动 Playwright 实例
    console.log(`账号 ${account.name} 已启动`)

    return true
  }

  // 停止账号
  async stop(id: string): Promise<boolean> {
    const account = this.accounts.get(id)
    if (!account) {
      return false
    }

    if (account.status !== 'running') {
      return true
    }

    account.status = 'idle'
    
    await this.saveAccount(account)
    this.notifyChange('account:status-changed', {
      accountId: id,
      status: 'idle',
      timestamp: new Date().toISOString()
    })

    // TODO: 停止 Playwright 实例
    console.log(`账号 ${account.name} 已停止`)

    return true
  }

  // 更新统计
  async updateStats(id: string, stats: Partial<Account['stats']>): Promise<void> {
    const account = this.accounts.get(id)
    if (!account) {
      return
    }

    account.stats = {
      ...account.stats,
      ...stats
    }

    await this.saveAccount(account)
    this.notifyChange('account:stats-updated', {
      accountId: id,
      stats: account.stats
    })
  }
}
