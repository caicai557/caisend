/**
 * Playwright 自动化管理器
 * 负责浏览器自动化、Telegram Web 控制和消息处理
 */

import type { BrowserWindow } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import { chromium } from 'playwright'
import type { Browser, BrowserContext, ConsoleMessage, Page } from 'playwright'

import type { LogManager } from './LogManager'
import type { RuleManager } from './RuleManager'

interface BrowserSession {
  accountId: string
  accountName: string
  browser: Browser
  context: BrowserContext
  page: Page
  isRunning: boolean
  lastActivity: Date
}

interface PlaywrightConfig {
  headless: boolean
  timeout: number
  slowMo: number
  userDataDir?: string
  proxy?: string
}

export class PlaywrightManager {
  private mainWindow: BrowserWindow | null = null
  private sessions: Map<string, BrowserSession> = new Map()
  private logManager: LogManager
  private ruleManager: RuleManager
  private config: PlaywrightConfig
  private userDataPath: string

  constructor(
    userDataPath: string,
    logManager: LogManager,
    ruleManager: RuleManager,
    config: PlaywrightConfig
  ) {
    this.userDataPath = userDataPath
    this.logManager = logManager
    this.ruleManager = ruleManager
    this.config = config
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  updateConfig(config: Partial<PlaywrightConfig>) {
    this.config = { ...this.config, ...config }
  }

  // 启动账号浏览器会话
  async startSession(accountId: string, accountName: string): Promise<boolean> {
    try {
      // 检查是否已经在运行
      if (this.sessions.has(accountId)) {
        await this.logManager.warning(`账号 ${accountName} 已在运行`, {
          module: 'playwright',
          accountId
        })
        return false
      }

      await this.logManager.info(`正在启动 ${accountName} 的浏览器会话...`, {
        module: 'playwright',
        accountId
      })

      // 创建用户数据目录
      const userDataDir = path.join(this.userDataPath, 'profiles', accountId)
      await fs.mkdir(userDataDir, { recursive: true })

      // 启动浏览器
      const browser = await chromium.launch({
        headless: this.config.headless,
        slowMo: this.config.slowMo,
        args: this.config.proxy ? [`--proxy-server=${this.config.proxy}`] : []
      })

      // 创建浏览器上下文
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
        locale: 'zh-CN',
        timezoneId: 'Asia/Shanghai'
      })

      // 设置超时
      context.setDefaultTimeout(this.config.timeout)

      // 创建页面
      const page = await context.newPage()

      // 保存会话
      const session: BrowserSession = {
        accountId,
        accountName,
        browser,
        context,
        page,
        isRunning: true,
        lastActivity: new Date()
      }
      this.sessions.set(accountId, session)

      // 导航到 Telegram Web
      await page.goto('https://web.telegram.org/k/', { waitUntil: 'networkidle' })

      await this.logManager.info(`${accountName} 浏览器会话已启动`, {
        module: 'playwright',
        accountId
      })

      // 等待页面完全加载
      await page.waitForLoadState('domcontentloaded')
      
      // 尝试捕获 QR 码 - 使用改进的策略
      try {
        await this.logManager.info(`开始检测 QR 码...`, {
          module: 'playwright',
          accountId
        })
        
        // 等待登录容器出现
        await page.waitForSelector('.login-wrapper, .auth-pages, [class*="login"], [class*="auth"]', { 
          timeout: 15000, 
          state: 'visible' 
        })
        
        // 等待 QR 码容器渲染
        await page.waitForTimeout(2000)
        
        // 多重策略查找 QR 码
        const qrSelectors = [
          'canvas.qr-canvas',
          'canvas[class*="qr"]',
          '.qr-container canvas',
          '.login-qr canvas',
          'canvas[width="256"]',
          'canvas[width="200"]',
          '.auth-qr canvas',
          '[class*="qr"] canvas'
        ]
        
        let qrCodeElement = null
        for (const selector of qrSelectors) {
          try {
            qrCodeElement = await page.$(selector)
            if (qrCodeElement) {
              await this.logManager.info(`找到 QR 码 canvas: ${selector}`, {
                module: 'playwright',
                accountId
              })
              break
            }
          } catch (e) {
            // 继续尝试下一个选择器
          }
        }
        
        if (qrCodeElement) {
          // 额外等待确保 canvas 完全渲染
          await page.waitForTimeout(1000)
          
          await this.logManager.info(`正在截取 QR 码...`, {
            module: 'playwright',
            accountId
          })
          
          // 截图 QR 码
          const qrCodeBuffer = await qrCodeElement.screenshot({ type: 'png' })
          const qrCodeBase64 = `data:image/png;base64,${qrCodeBuffer.toString('base64')}`
          
          // 通过主窗口发送 QR 码给前端
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('account:qrCode', {
              accountId,
              accountName,
              qrCode: qrCodeBase64
            })
            
            await this.logManager.info(`✅ QR 码已成功发送到前端 (${qrCodeBuffer.length} bytes)`, {
              module: 'playwright',
              accountId
            })
          }
        } else {
          // 检查是否已经登录
          const chatListVisible = await page.locator('.chat-list, .ChatList, #column-left').isVisible().catch(() => false)
          
          if (chatListVisible) {
            await this.logManager.info(`账号已登录，无需 QR 码`, {
              module: 'playwright',
              accountId
            })
            
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
              this.mainWindow.webContents.send('account:loginSuccess', {
                accountId,
                accountName
              })
            }
          } else {
            await this.logManager.warning(`⚠️ 未找到 QR 码元素，请检查页面结构`, {
              module: 'playwright',
              accountId
            })
            
            // 截取整个登录页面用于调试
            const debugScreenshot = await page.screenshot({ fullPage: false })
            await this.logManager.debug(`登录页面截图大小: ${debugScreenshot.length} bytes`, {
              module: 'playwright',
              accountId
            })
          }
        }
      } catch (error) {
        await this.logManager.error(`❌ 捕获 QR 码失败`, {
          module: 'playwright',
          accountId,
          details: error
        })
      }

      // 启动消息监听
      this.startMessageListener(session)

      return true
    } catch (error) {
      await this.logManager.error(`启动 ${accountName} 浏览器会话失败`, {
        module: 'playwright',
        accountId,
        details: error
      })
      return false
    }
  }

  // 停止账号浏览器会话
  async stopSession(accountId: string): Promise<boolean> {
    try {
      const session = this.sessions.get(accountId)
      if (!session) {
        await this.logManager.warning(`账号会话不存在: ${accountId}`, {
          module: 'playwright',
          accountId
        })
        return false
      }

      await this.logManager.info(`正在停止 ${session.accountName} 的浏览器会话...`, {
        module: 'playwright',
        accountId
      })

      // 关闭浏览器
      session.isRunning = false
      await session.page.close()
      await session.context.close()
      await session.browser.close()

      // 移除会话
      this.sessions.delete(accountId)

      await this.logManager.info(`${session.accountName} 浏览器会话已停止`, {
        module: 'playwright',
        accountId
      })

      return true
    } catch (error) {
      await this.logManager.error(`停止浏览器会话失败`, {
        module: 'playwright',
        accountId,
        details: error
      })
      return false
    }
  }

  // 启动消息监听
  private startMessageListener(session: BrowserSession) {
    const { page, accountId } = session

    // 监听页面上的新消息
    // 注意：实际实现需要根据 Telegram Web 的 DOM 结构调整选择器
    page.on('console', async (msg: ConsoleMessage) => {
      // 可以监听页面的 console 消息用于调试
      if (msg.type() === 'log' && msg.text().includes('message')) {
        await this.logManager.debug(`页面日志: ${msg.text()}`, {
          module: 'playwright',
          accountId
        })
      }
    })

    // 定期检查新消息（轮询方式）
    const checkInterval = setInterval(async () => {
      if (!session.isRunning) {
        clearInterval(checkInterval)
        return
      }

      try {
        await this.checkForNewMessages(session)
      } catch (error) {
        await this.logManager.error(`检查新消息失败`, {
          module: 'playwright',
          accountId,
          details: error
        })
      }
    }, 5000) // 每5秒检查一次
  }

  // 检查新消息
  private async checkForNewMessages(session: BrowserSession) {
    const { page, accountId } = session

    try {
      // Telegram Web K 版本的选择器
      // 注意：这些选择器基于 Telegram Web K (https://web.telegram.org/k/)
      // 如果使用旧版 A (https://web.telegram.org/a/)，需要调整
      
      // 获取当前聊天窗口的新消息
      const messages = await page.evaluate(() => {
        const messageElements = document.querySelectorAll<HTMLElement>('.message:not(.is-out)')
        const results: Array<{ text: string; sender: string; chatName: string; messageId: string }> = []
        
        messageElements.forEach((el) => {
          // 检查是否已处理
          if (el.dataset.processed) return
          
          // 获取消息文本
          const textEl = el.querySelector('.message-content-wrapper .text-content')
          const text = textEl ? textEl.textContent?.trim() : ''
          
          // 获取发送者
          const senderEl = el.querySelector('.peer-title')
          const sender = senderEl ? senderEl.textContent?.trim() : '未知'
          
          // 获取聊天名称
          const chatTitleEl = document.querySelector('.chat-info .peer-title')
          const chatName = chatTitleEl ? chatTitleEl.textContent?.trim() : '未知'
          
          // 获取消息 ID
          const messageId = el.dataset.mid || Math.random().toString()
          
          if (text) {
            results.push({ text, sender, chatName, messageId })
            el.dataset.processed = 'true' // 标记为已处理
          }
        })
        
        return results
      })

      // 处理每条新消息
      for (const message of messages) {
        await this.logManager.debug(`检测到新消息 [${message.messageId}]`, {
          module: 'playwright',
          accountId,
          metadata: { sender: message.sender, preview: message.text.substring(0, 30) }
        })
        
        await this.handleMessage(session, message)
      }
    } catch (error) {
      // 忽略选择器错误，因为可能在登录页面或其他页面
      await this.logManager.debug(`检查消息时出错: ${error instanceof Error ? error.message : String(error)}`, {
        module: 'playwright',
        accountId
      })
    }
  }

  // 处理消息
  private async handleMessage(
    session: BrowserSession,
    message: { text: string; sender: string; chatName: string }
  ) {
    const { accountId, accountName } = session

    await this.logManager.info(`收到消息: ${message.text.substring(0, 50)}...`, {
      module: 'playwright',
      accountId,
      accountName,
      metadata: {
        sender: message.sender,
        chatName: message.chatName
      }
    })

    try {
      // 获取该账号的规则
      const rules = await this.ruleManager.getByAccountId(accountId)

      // 匹配规则
      for (const rule of rules) {
        if (!rule.enabled) continue

        const match = await this.ruleManager.matchRule(rule.id, message.text, {
          sender: message.sender,
          chatName: message.chatName,
          message: message.text
        })

        if (match.matched && match.response) {
          await this.logManager.info(`规则匹配: ${rule.name}`, {
            module: 'playwright',
            accountId,
            accountName,
            metadata: {
              ruleId: rule.id,
              ruleName: rule.name,
              response: match.response.substring(0, 50)
            }
          })

          // 发送回复
          const sent = await this.sendMessage(session, match.response)
          
          if (sent) {
            await this.logManager.info(`自动回复已发送`, {
              module: 'playwright',
              accountId,
              accountName
            })
          } else {
            await this.logManager.warning(`自动回复发送失败`, {
              module: 'playwright',
              accountId,
              accountName
            })
          }

          break // 只使用第一个匹配的规则
        }
      }
    } catch (error) {
      await this.logManager.error(`处理消息失败`, {
        module: 'playwright',
        accountId,
        accountName,
        details: error
      })
    }
  }

  // 发送消息
  private async sendMessage(session: BrowserSession, text: string): Promise<boolean> {
    const { page, accountId, accountName } = session

    try {
      await this.logManager.info(`正在发送回复: ${text.substring(0, 50)}...`, {
        module: 'playwright',
        accountId,
        accountName
      })

      // Telegram Web K 版本的输入框选择器
      const inputSelector = 'div.input-message-input[contenteditable="true"]'
      
      // 等待输入框出现
      await page.waitForSelector(inputSelector, { timeout: 5000 })
      
      // 聚焦输入框
      await page.focus(inputSelector)
      
      // 清空输入框
      await page.evaluate((selector: string) => {
        const el = document.querySelector(selector)
        if (el) {
          (el as HTMLElement).innerHTML = ''
        }
      }, inputSelector)
      
      // 输入文本（使用 type 而不是 fill，更自然）
      await page.type(inputSelector, text, { delay: 50 })
      
      // 等待一小段时间确保文本已输入
      await page.waitForTimeout(300)
      
      // 发送消息（按 Enter 键或点击发送按钮）
      try {
        // 方法1：按 Enter 键
        await page.keyboard.press('Enter')
      } catch {
        // 方法2：点击发送按钮
        const sendButtonSelector = 'button.btn-send:not(.is-disabled)'
        await page.click(sendButtonSelector, { timeout: 2000 })
      }

      await this.logManager.info(`回复已发送`, {
        module: 'playwright',
        accountId,
        accountName
      })

      // 更新最后活动时间
      session.lastActivity = new Date()

      return true
    } catch (error) {
      await this.logManager.error(`发送消息失败`, {
        module: 'playwright',
        accountId,
        accountName,
        details: error instanceof Error ? error.message : String(error)
      })
      return false
    }
  }

  // 获取会话状态
  getSessionStatus(accountId: string): {
    isRunning: boolean
    lastActivity?: Date
  } | null {
    const session = this.sessions.get(accountId)
    if (!session) return null

    return {
      isRunning: session.isRunning,
      lastActivity: session.lastActivity
    }
  }

  // 获取所有活动会话
  getActiveSessions(): Array<{
    accountId: string
    accountName: string
    isRunning: boolean
    lastActivity: Date
  }> {
    return Array.from(this.sessions.values()).map((session) => ({
      accountId: session.accountId,
      accountName: session.accountName,
      isRunning: session.isRunning,
      lastActivity: session.lastActivity
    }))
  }

  // 截图（用于调试）
  async captureScreenshot(accountId: string): Promise<string | null> {
    try {
      const session = this.sessions.get(accountId)
      if (!session) return null

      const screenshotPath = path.join(
        this.userDataPath,
        'screenshots',
        `${accountId}-${Date.now()}.png`
      )

      await fs.mkdir(path.dirname(screenshotPath), { recursive: true })
      await session.page.screenshot({ path: screenshotPath, fullPage: false })

      await this.logManager.info(`截图已保存: ${screenshotPath}`, {
        module: 'playwright',
        accountId
      })

      return screenshotPath
    } catch (error) {
      await this.logManager.error(`截图失败`, {
        module: 'playwright',
        accountId,
        details: error
      })
      return null
    }
  }

  // 清理所有会话
  async cleanup() {
    await this.logManager.info('正在清理所有 Playwright 会话...', {
      module: 'playwright'
    })

    const accountIds = Array.from(this.sessions.keys())
    for (const accountId of accountIds) {
      await this.stopSession(accountId)
    }

    await this.logManager.info('所有 Playwright 会话已清理', {
      module: 'playwright'
    })
  }
}
