/**
 * 配置管理器
 * 负责系统配置的读取、更新和持久化
 */

import type { BrowserWindow } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'

interface SystemConfig {
  global: {
    theme: 'light' | 'dark' | 'auto'
    language: 'zh-CN' | 'en-US'
    logRetentionDays: number
    autoStart: boolean
    minimizeToTray: boolean
  }
  playwright: {
    headless: boolean
    timeout: number
    slowMo: number
    userDataDir?: string
    proxy?: string
  }
  backend: {
    port: number
    host: string
    maxConnections: number
  }
  paths: {
    logs: string
    data: string
    profiles: string
    temp: string
  }
}

export class ConfigManager {
  private config: SystemConfig | null = null
  private configPath: string
  private mainWindow: BrowserWindow | null = null

  constructor(appDataPath: string) {
    this.configPath = path.join(appDataPath, 'config', 'settings.json')
    this.initConfig()
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  private async initConfig() {
    try {
      const configDir = path.dirname(this.configPath)
      await fs.mkdir(configDir, { recursive: true })

      try {
        const content = await fs.readFile(this.configPath, 'utf-8')
        this.config = JSON.parse(content)
        console.log('配置已加载')
      } catch {
        // 配置文件不存在，使用默认配置
        this.config = this.getDefaultConfig()
        await this.saveConfig()
        console.log('使用默认配置')
      }
    } catch (error) {
      console.error('初始化配置失败:', error)
      this.config = this.getDefaultConfig()
    }
  }

  private getDefaultConfig(): SystemConfig {
    return {
      global: {
        theme: 'dark',
        language: 'zh-CN',
        logRetentionDays: 30,
        autoStart: false,
        minimizeToTray: true
      },
      playwright: {
        headless: false,
        timeout: 30000,
        slowMo: 100,
        userDataDir: undefined,
        proxy: undefined
      },
      backend: {
        port: 3000,
        host: 'localhost',
        maxConnections: 10
      },
      paths: {
        logs: '',
        data: '',
        profiles: '',
        temp: ''
      }
    }
  }

  private async saveConfig() {
    if (!this.config) return

    try {
      await fs.writeFile(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        'utf-8'
      )
      console.log('配置已保存')
    } catch (error) {
      console.error('保存配置失败:', error)
      throw error
    }
  }

  // 获取配置
  async getConfig(): Promise<SystemConfig> {
    if (!this.config) {
      await this.initConfig()
    }
    return this.config!
  }

  // 更新配置
  async updateConfig(updates: Partial<{
    global: Partial<SystemConfig['global']>
    playwright: Partial<SystemConfig['playwright']>
    backend: Partial<SystemConfig['backend']>
  }>): Promise<SystemConfig> {
    if (!this.config) {
      await this.initConfig()
    }

    // 深度合并配置
    if (updates.global) {
      this.config!.global = {
        ...this.config!.global,
        ...updates.global
      }
    }

    if (updates.playwright) {
      this.config!.playwright = {
        ...this.config!.playwright,
        ...updates.playwright
      }
    }

    if (updates.backend) {
      this.config!.backend = {
        ...this.config!.backend,
        ...updates.backend
      }
    }

    await this.saveConfig()

    // 通知前端配置已更新
    if (this.mainWindow) {
      this.mainWindow.webContents.send('config:updated', this.config)
    }

    return this.config!
  }

  // 重置配置
  async resetConfig(): Promise<SystemConfig> {
    this.config = this.getDefaultConfig()
    await this.saveConfig()

    if (this.mainWindow) {
      this.mainWindow.webContents.send('config:updated', this.config)
    }

    return this.config
  }

  // 更新路径配置
  updatePaths(paths: {
    logs: string
    data: string
    profiles: string
    temp: string
  }) {
    if (this.config) {
      this.config.paths = paths
    }
  }
}
