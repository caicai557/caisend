/**
 * 规则管理器
 * 负责规则的 CRUD 和匹配执行
 */

import type { BrowserWindow } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'

interface Rule {
  id: string
  accountId: string
  name: string
  enabled: boolean
  priority: number
  trigger: {
    type: 'keyword' | 'regex' | 'all' | 'mention' | 'private' | 'group'
    pattern?: string
    matchMode?: 'exact' | 'contains' | 'starts' | 'ends' | 'regex'
    caseSensitive?: boolean
  }
  response: {
    type: 'text' | 'image' | 'file' | 'forward' | 'ignore'
    content?: string
    delay?: number
    template?: string
    filePath?: string
  }
  limits?: {
    maxPerDay?: number
    maxPerHour?: number
    cooldown?: number
    timeRange?: {
      start: string
      end: string
    }
  }
  stats: {
    totalTriggers: number
    todayTriggers: number
    lastTriggered?: string
  }
  createdAt: string
  updatedAt: string
}

interface VariableMap {
  sender: string
  message: string
  time: string
  date: string
  chatName: string
  [key: string]: string
}

export class RuleManager {
  private rules: Map<string, Rule[]> = new Map() // accountId -> rules
  private dataDir: string
  private mainWindow: BrowserWindow | null = null
  private lastTriggerTime: Map<string, number> = new Map() // ruleId -> timestamp

  constructor(appDataPath: string) {
    this.dataDir = path.join(appDataPath, 'data', 'rules')
    this.initDataDir()
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  private async initDataDir() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true })
      await this.loadRules()
    } catch (error) {
      console.error('初始化规则目录失败:', error)
    }
  }

  private async loadRules() {
    try {
      const files = await fs.readdir(this.dataDir)
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.dataDir, file)
          const content = await fs.readFile(filePath, 'utf-8')
          const data = JSON.parse(content)
          
          if (data.accountId) {
            const accountRules = this.rules.get(data.accountId) || []
            accountRules.push(...(data.rules || []))
            this.rules.set(data.accountId, accountRules)
          }
        }
      }

      console.log(`加载了规则配置`)
    } catch (error) {
      console.error('加载规则失败:', error)
    }
  }

  private async saveRules(accountId: string) {
    const rules = this.rules.get(accountId) || []
    const filePath = path.join(this.dataDir, `${accountId}.json`)
    await fs.writeFile(
      filePath,
      JSON.stringify({ accountId, rules }, null, 2),
      'utf-8'
    )
  }

  private notifyChange(event: string, data: unknown) {
    if (this.mainWindow) {
      this.mainWindow.webContents.send(event, data)
    }
  }

  // 获取账号的所有规则
  async getRules(accountId: string): Promise<Rule[]> {
    const rules = this.rules.get(accountId) || []
    return rules.sort((a, b) => a.priority - b.priority)
  }

  // 创建规则
  async create(accountId: string, data: Omit<Rule, 'id' | 'accountId' | 'stats' | 'createdAt' | 'updatedAt'>): Promise<Rule> {
    const rule: Rule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      accountId,
      ...data,
      stats: {
        totalTriggers: 0,
        todayTriggers: 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const accountRules = this.rules.get(accountId) || []
    accountRules.push(rule)
    this.rules.set(accountId, accountRules)
    
    await this.saveRules(accountId)
    this.notifyChange('rule:created', rule)

    return rule
  }

  // 更新规则
  async update(ruleId: string, data: Partial<Rule>): Promise<Rule | null> {
    for (const [accountId, rules] of this.rules.entries()) {
      const index = rules.findIndex(r => r.id === ruleId)
      if (index !== -1) {
        const rule = rules[index]
        const updatedRule = {
          ...rule,
          ...data,
          id: rule.id,
          accountId: rule.accountId,
          updatedAt: new Date().toISOString()
        }

        rules[index] = updatedRule
        await this.saveRules(accountId)
        this.notifyChange('rule:updated', updatedRule)

        return updatedRule
      }
    }

    return null
  }

  // 删除规则
  async delete(ruleId: string): Promise<boolean> {
    for (const [accountId, rules] of this.rules.entries()) {
      const index = rules.findIndex(r => r.id === ruleId)
      if (index !== -1) {
        rules.splice(index, 1)
        await this.saveRules(accountId)
        this.notifyChange('rule:deleted', { ruleId })
        return true
      }
    }

    return false
  }

  // 切换规则状态
  async toggle(ruleId: string, enabled: boolean): Promise<Rule | null> {
    return this.update(ruleId, { enabled })
  }

  // 匹配消息并返回响应
  async matchMessage(accountId: string, message: string, context: Partial<VariableMap>): Promise<{
    matched: boolean
    rule?: Rule
    response?: string
  }> {
    const rules = await this.getRules(accountId)
    
    for (const rule of rules) {
      if (!rule.enabled) {
        continue
      }

      // 检查冷却时间
      if (rule.limits?.cooldown) {
        const lastTrigger = this.lastTriggerTime.get(rule.id) || 0
        const now = Date.now()
        if (now - lastTrigger < rule.limits.cooldown * 1000) {
          continue
        }
      }

      // 检查每日限制
      if (rule.limits?.maxPerDay && rule.stats.todayTriggers >= rule.limits.maxPerDay) {
        continue
      }

      // 匹配规则
      if (this.isMatch(rule, message)) {
        // 生成响应
        const response = this.generateResponse(rule, message, context)
        
        // 更新统计
        rule.stats.totalTriggers++
        rule.stats.todayTriggers++
        rule.stats.lastTriggered = new Date().toISOString()
        this.lastTriggerTime.set(rule.id, Date.now())
        
        await this.saveRules(accountId)
        
        // 通知触发
        this.notifyChange('rule:triggered', {
          ruleId: rule.id,
          matched: true,
          response,
          action: rule.response.type,
          timestamp: new Date().toISOString()
        })

        return { matched: true, rule, response }
      }
    }

    return { matched: false }
  }

  // 判断是否匹配
  private isMatch(rule: Rule, message: string): boolean {
    const { trigger } = rule

    switch (trigger.type) {
      case 'all':
        return true

      case 'keyword':
        if (!trigger.pattern) return false
        return this.matchKeyword(message, trigger.pattern, trigger.matchMode || 'contains', trigger.caseSensitive || false)

      case 'regex':
        if (!trigger.pattern) return false
        return this.matchRegex(message, trigger.pattern, trigger.caseSensitive || false)

      default:
        return false
    }
  }

  private matchKeyword(message: string, pattern: string, mode: string, caseSensitive: boolean): boolean {
    const msg = caseSensitive ? message : message.toLowerCase()
    const pat = caseSensitive ? pattern : pattern.toLowerCase()

    switch (mode) {
      case 'exact':
        return msg === pat
      case 'contains':
        return msg.includes(pat)
      case 'starts':
        return msg.startsWith(pat)
      case 'ends':
        return msg.endsWith(pat)
      default:
        return false
    }
  }

  private matchRegex(message: string, pattern: string, caseSensitive: boolean): boolean {
    try {
      const flags = caseSensitive ? '' : 'i'
      const regex = new RegExp(pattern, flags)
      return regex.test(message)
    } catch {
      return false
    }
  }

  // 生成响应
  private generateResponse(rule: Rule, message: string, context: Partial<VariableMap>): string {
    if (rule.response.type !== 'text' || !rule.response.content) {
      return ''
    }

    let response = rule.response.content

    // 变量替换
    const variables: VariableMap = {
      sender: context.sender || '未知用户',
      message: message,
      time: new Date().toLocaleTimeString('zh-CN'),
      date: new Date().toLocaleDateString('zh-CN'),
      chatName: context.chatName || '未知',
      ...context
    }

    for (const [key, value] of Object.entries(variables)) {
      response = response.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    }

    return response
  }

  // 测试规则
  async test(ruleId: string, testMessage: string, variables?: Partial<VariableMap>): Promise<{
    matched: boolean
    response: string | null
  }> {
    for (const rules of this.rules.values()) {
      const rule = rules.find(r => r.id === ruleId)
      if (rule) {
        const matched = this.isMatch(rule, testMessage)
        const response = matched ? this.generateResponse(rule, testMessage, variables || {}) : null
        return { matched, response }
      }
    }

    return { matched: false, response: null }
  }

  // 重置今日统计
  async resetDailyStats() {
    for (const [accountId, rules] of this.rules.entries()) {
      for (const rule of rules) {
        rule.stats.todayTriggers = 0
      }
      await this.saveRules(accountId)
    }
  }

  // 获取账号的所有规则（别名方法，用于 Playwright）
  async getByAccountId(accountId: string): Promise<Rule[]> {
    return this.getRules(accountId)
  }

  // 匹配单个规则（用于 Playwright）
  async matchRule(
    ruleId: string,
    message: string,
    context: Partial<VariableMap>
  ): Promise<{
    matched: boolean
    response?: string
  }> {
    for (const rules of this.rules.values()) {
      const rule = rules.find(r => r.id === ruleId)
      if (rule && rule.enabled) {
        const matched = this.isMatch(rule, message)
        if (matched) {
          const response = this.generateResponse(rule, message, context)
          
          // 更新统计
          rule.stats.totalTriggers++
          rule.stats.todayTriggers++
          rule.stats.lastTriggered = new Date().toISOString()
          this.lastTriggerTime.set(rule.id, Date.now())
          
          await this.saveRules(rule.accountId)
          
          // 通知触发
          this.notifyChange('rule:triggered', {
            ruleId: rule.id,
            matched: true,
            response,
            action: rule.response.type,
            timestamp: new Date().toISOString()
          })

          return { matched: true, response }
        }
      }
    }

    return { matched: false }
  }
}
