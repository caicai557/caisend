import { spawn, type ChildProcess } from 'child_process'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'yaml'

// 导入管理器
import { AccountManager } from './managers/AccountManager'
import { ConfigManager as SystemConfigManager } from './managers/ConfigManager'
import { DashboardManager } from './managers/DashboardManager'
import { DatabaseManager } from './managers/DatabaseManager'
import { LogManager } from './managers/LogManager'
import { PlaywrightManager } from './managers/PlaywrightManager'
import { RuleManager } from './managers/RuleManager'
import { TrayManager } from './managers/TrayManager'

// Electron 主进程 - 管理 Teleflow Python 后端进程

interface AccountProcess {
  process: ChildProcess
  status: 'starting' | 'running' | 'stopping' | 'stopped'
  startTime: Date
  configPath: string
}

type AccountStatusMap = Record<
  string,
  {
    running: boolean
    status: AccountProcess['status']
    pid?: number
    startTime?: Date
  }
>

type ConfigData = unknown

interface ConfigResult {
  success: boolean
  config?: ConfigData
  path?: string
  error?: string
}

interface SaveConfigResult {
  success: boolean
  path?: string
  error?: string
}

interface ValidateConfigResult {
  success: boolean
  message?: string
  accountCount?: number
  error?: string
}

class ProcessManager {
  private processes: Map<string, AccountProcess> = new Map()
  private mainWindow: BrowserWindow | null = null
  private pythonPath: string = 'python'
  private projectRoot: string

  constructor() {
    // __dirname 是 dist-electron/main，需要回到项目根目录
    this.projectRoot = path.join(__dirname, '../../..')
    
    // 调试路径信息
    console.log('🔍 ProcessManager 路径调试:')
    console.log('  __dirname:', __dirname)
    console.log('  process.cwd():', process.cwd())
    console.log('  计算的 projectRoot:', this.projectRoot)
    console.log('  config.yaml 路径:', path.join(this.projectRoot, 'config.yaml'))
    console.log('  config.yaml 是否存在:', fs.existsSync(path.join(this.projectRoot, 'config.yaml')))
    
    this.detectPythonPath()
  }

  private async detectPythonPath() {
    const candidates = ['python', 'python3', 'py']
    
    for (const cmd of candidates) {
      try {
        const proc = spawn(cmd, ['--version'])
        await new Promise((resolve, reject) => {
          proc.on('exit', (code) => code === 0 ? resolve(true) : reject())
          proc.on('error', reject)
          setTimeout(reject, 2000)
        })
        this.pythonPath = cmd
        console.log(`✓ 检测到 Python: ${cmd}`)
        return
      } catch {
        continue
      }
    }
    console.warn('⚠ 未检测到 Python，将使用默认命令 "python"')
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  async startAccount(accountName: string, configPath?: string) {
    // 如果提供了相对路径，转换为绝对路径
    let finalConfigPath: string
    if (configPath && !path.isAbsolute(configPath)) {
      finalConfigPath = path.join(this.projectRoot, configPath)
    } else {
      finalConfigPath = configPath || path.join(this.projectRoot, 'config.yaml')
    }
    
    console.log(`🚀 启动账号: ${accountName}`)
    console.log(`   项目根目录: ${this.projectRoot}`)
    console.log(`   配置文件: ${finalConfigPath}`)
    
    // 检查是否已在运行
    if (this.processes.has(accountName)) {
      const existing = this.processes.get(accountName)!
      if (existing.status === 'running' || existing.status === 'starting') {
        console.warn(`⚠ 账号 ${accountName} 已在运行中`)
        return { success: false, error: '账号已在运行中' }
      }
    }

    // 检查配置文件是否存在
    if (!fs.existsSync(finalConfigPath)) {
      console.error(`❌ 配置文件不存在: ${finalConfigPath}`)
      return { success: false, error: `配置文件不存在: ${finalConfigPath}` }
    }

    try {
      // 启动 Python 后端进程
      const proc = spawn(this.pythonPath, [
        '-m', 'teleflow.cli',
        'run',
        '--account', accountName,
        '--config', finalConfigPath
      ], {
        cwd: this.projectRoot,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1'  // 实时输出日志
        }
      })

      // 创建进程记录
      const accountProcess: AccountProcess = {
        process: proc,
        status: 'starting',
        startTime: new Date(),
        configPath: finalConfigPath
      }

      // 监听标准输出
      proc.stdout?.on('data', (data) => {
        const message = data.toString().trim()
        if (message) {
          console.log(`[${accountName}] ${message}`)
          
          // 发送日志到 UI
          this.mainWindow?.webContents.send('log-update', {
            account: accountName,
            message: message,
            timestamp: new Date().toISOString(),
            level: 'info'
          })
        }
      })

      // 监听标准错误
      proc.stderr?.on('data', (data) => {
        const error = data.toString().trim()
        if (error) {
          console.error(`[${accountName}] ERROR: ${error}`)
          
          // 发送错误日志到 UI
          this.mainWindow?.webContents.send('log-update', {
            account: accountName,
            message: error,
            timestamp: new Date().toISOString(),
            level: 'error'
          })
        }
      })

      // 监听进程退出
      proc.on('exit', (code, signal) => {
        console.log(`[${accountName}] 进程退出 - 代码: ${code}, 信号: ${signal}`)
        accountProcess.status = 'stopped'
        this.processes.delete(accountName)
        
        // 通知 UI 状态变化
        this.mainWindow?.webContents.send('account-status-changed', {
          account: accountName,
          status: 'stopped',
          exitCode: code,
          signal: signal
        })
      })

      // 监听进程错误
      proc.on('error', (err) => {
        console.error(`[${accountName}] 进程错误:`, err)
        accountProcess.status = 'stopped'
        this.processes.delete(accountName)
        
        this.mainWindow?.webContents.send('log-update', {
          account: accountName,
          message: `进程启动失败: ${err.message}`,
          timestamp: new Date().toISOString(),
          level: 'error'
        })
      })

      // 假设进程启动成功（可以通过检测特定日志来确认）
      setTimeout(() => {
        if (accountProcess.status === 'starting') {
          accountProcess.status = 'running'
          console.log(`✓ 账号 ${accountName} 已启动`)
          
          this.mainWindow?.webContents.send('account-status-changed', {
            account: accountName,
            status: 'running',
            pid: proc.pid
          })
        }
      }, 2000)

      this.processes.set(accountName, accountProcess)
      
      return { 
        success: true, 
        pid: proc.pid,
        message: '进程已启动'
      }

    } catch (error) {
      console.error(`❌ 启动账号失败:`, error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  async stopAccount(accountName: string) {
    console.log(`🛑 停止账号: ${accountName}`)
    
    const accountProcess = this.processes.get(accountName)
    if (!accountProcess) {
      console.warn(`⚠ 账号 ${accountName} 不在运行中`)
      return { success: false, error: '账号未运行' }
    }

    try {
      accountProcess.status = 'stopping'
      
      // 发送 SIGTERM 信号优雅关闭
      accountProcess.process.kill('SIGTERM')
      
      // 等待 5 秒后强制关闭
      setTimeout(() => {
        if (this.processes.has(accountName)) {
          console.warn(`⚠ 强制终止账号: ${accountName}`)
          accountProcess.process.kill('SIGKILL')
          this.processes.delete(accountName)
        }
      }, 5000)
      
      return { success: true, message: '停止信号已发送' }
    } catch (error) {
      console.error(`❌ 停止账号失败:`, error)
      this.processes.delete(accountName)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  getAccountStatus(accountName: string) {
    const accountProcess = this.processes.get(accountName)
    return {
      running: !!accountProcess,
      status: accountProcess?.status || 'stopped',
      pid: accountProcess?.process.pid,
      startTime: accountProcess?.startTime,
      configPath: accountProcess?.configPath
    }
  }

  getAllStatus(): AccountStatusMap {
    const statusMap: AccountStatusMap = {}
    this.processes.forEach((accountProcess, name) => {
      statusMap[name] = {
        running: true,
        status: accountProcess.status,
        pid: accountProcess.process.pid,
        startTime: accountProcess.startTime
      }
    })
    return statusMap
  }

  stopAll() {
    console.log('🛑 停止所有账号进程...')
    this.processes.forEach((accountProcess, name) => {
      console.log(`  - 停止: ${name}`)
      try {
        accountProcess.process.kill('SIGTERM')
      } catch (err) {
        console.error(`    失败:`, err)
      }
    })
    this.processes.clear()
  }
}

// 配置管理器
class ConfigManager {
  private projectRoot: string

  constructor() {
    this.projectRoot = path.join(__dirname, '../../..')
  }

  async getConfig(configPath?: string): Promise<ConfigResult> {
    const finalPath = configPath || path.join(this.projectRoot, 'config.yaml')
    
    try {
      if (!fs.existsSync(finalPath)) {
        return {
          success: false,
          error: `配置文件不存在: ${finalPath}`
        }
      }

      const content = fs.readFileSync(finalPath, 'utf-8')
      const config = yaml.parse(content) as ConfigData
      
      return {
        success: true,
        config: config,
        path: finalPath
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  async saveConfig(config: ConfigData, configPath?: string): Promise<SaveConfigResult> {
    const finalPath = configPath || path.join(this.projectRoot, 'config.yaml')
    
    try {
      const content = yaml.stringify(config)
      fs.writeFileSync(finalPath, content, 'utf-8')
      
      return {
        success: true,
        path: finalPath
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  async validateConfig(configPath?: string): Promise<ValidateConfigResult> {
    const finalPath = configPath || path.join(this.projectRoot, 'config.yaml')
    
    try {
      const content = fs.readFileSync(finalPath, 'utf-8')
      const config = yaml.parse(content) as ConfigData & {
        accounts?: Array<{ name?: string }>
      }
      
      if (!config.accounts || !Array.isArray(config.accounts)) {
        return {
          success: false,
          error: '配置文件必须包含 accounts 数组'
        }
      }

      // 验证每个账号
      for (const account of config.accounts) {
        if (!account.name) {
          return {
            success: false,
            error: '每个账号必须有 name 字段'
          }
        }
      }
      
      return {
        success: true,
        message: '配置文件格式正确',
        accountCount: config.accounts.length
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
}

// 初始化管理器
const processManager = new ProcessManager()
const configManager = new ConfigManager()

// 初始化新管理器
const appDataPath = app.getPath('userData')
const logManager = new LogManager(appDataPath)
const accountManager = new AccountManager(appDataPath)
const ruleManager = new RuleManager(appDataPath)
const systemConfigManager = new SystemConfigManager(appDataPath)
const dashboardManager = new DashboardManager(accountManager)

// 初始化 Playwright 管理器
const playwrightConfig = {
  headless: false,
  timeout: 30000,
  slowMo: 100
}
const databaseManager = new DatabaseManager(appDataPath)
const playwrightManager = new PlaywrightManager(appDataPath, logManager, ruleManager, playwrightConfig)

// 初始化系统托盘管理器
const trayManager = new TrayManager()

// 更新路径配置
systemConfigManager.updatePaths({
  logs: path.join(appDataPath, 'logs'),
  data: path.join(appDataPath, 'data'),
  profiles: path.join(appDataPath, 'profiles'),
  temp: path.join(appDataPath, 'temp')
})

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'Teleflow Desktop'
  })

  processManager.setMainWindow(mainWindow)
  accountManager.setMainWindow(mainWindow)
  ruleManager.setMainWindow(mainWindow)
  logManager.setMainWindow(mainWindow)
  systemConfigManager.setMainWindow(mainWindow)
  dashboardManager.setMainWindow(mainWindow)
  playwrightManager.setMainWindow(mainWindow)
  trayManager.setMainWindow(mainWindow)

  // 记录启动日志
  logManager.info('应用启动', { module: 'system' })
  logManager.info('数据库初始化完成', {
    module: 'database',
    metadata: { path: databaseManager.getDatabasePath() }
  })
  dashboardManager.recordSystemActivity('info', '系统启动', 'Teleflow Desktop 已启动')

  // 开发模式加载 Vite 服务器
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    // 生产模式加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// IPC 处理器
ipcMain.handle('get-config', async (_event, configPath) => {
  // 如果没有指定路径，返回模拟账号数据（临时解决方案）
  if (!configPath) {
    console.log('🔍 使用模拟账号数据（临时解决方案）')
    
    const mockConfig = {
      accounts: [
        {
          name: "1",
          monitor_chats: [],
          rules: []
        }
      ]
    }
    
    console.log(`✅ 返回 ${mockConfig.accounts.length} 个模拟账号`)
    return { 
      success: true, 
      config: mockConfig 
    }
  }
  
  // 系统配置（原有逻辑）
  return await configManager.getConfig(configPath)
})

ipcMain.handle('save-config', async (_event, config, configPath) => {
  return await configManager.saveConfig(config, configPath)
})

ipcMain.handle('validate-config', async (_event, configPath) => {
  return await configManager.validateConfig(configPath)
})

ipcMain.handle('start-account', async (_event, accountName, configPath) => {
  return await processManager.startAccount(accountName, configPath)
})

ipcMain.handle('stop-account', async (_event, accountName) => {
  return await processManager.stopAccount(accountName)
})

ipcMain.handle('get-account-status', async (_event, accountName) => {
  return processManager.getAccountStatus(accountName)
})

ipcMain.handle('get-all-status', async () => {
  return processManager.getAllStatus()
})

// ==================== 账号管理 IPC ====================
ipcMain.handle('account:list', async () => {
  try {
    const accounts = await accountManager.getAll()
    return { success: true, accounts }
  } catch (error) {
    await logManager.error('获取账号列表失败', { module: 'account', details: error })
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('account:get', async (_event, { accountId }) => {
  try {
    const account = await accountManager.getById(accountId)
    if (!account) {
      return { success: false, error: '账号不存在' }
    }
    return { success: true, account }
  } catch (error) {
    await logManager.error('获取账号详情失败', { module: 'account', details: error })
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('account:create', async (_event, data) => {
  try {
    const account = await accountManager.create(data)
    await logManager.info(`创建账号: ${account.name}`, { module: 'account', accountId: account.id })
    dashboardManager.recordAccountActivity('created', account.id, account.name)
    return { success: true, account }
  } catch (error) {
    await logManager.error('创建账号失败', { module: 'account', details: error })
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('account:update', async (_event, { accountId, ...data }) => {
  try {
    const account = await accountManager.update(accountId, data)
    if (!account) {
      return { success: false, error: '账号不存在' }
    }
    await logManager.info(`更新账号: ${account.name}`, { module: 'account', accountId })
    return { success: true, account }
  } catch (error) {
    await logManager.error('更新账号失败', { module: 'account', accountId, details: error })
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('account:delete', async (_event, { accountId }) => {
  try {
    const success = await accountManager.delete(accountId)
    if (success) {
      await logManager.info(`删除账号: ${accountId}`, { module: 'account' })
    }
    return { success, error: success ? undefined : '账号不存在' }
  } catch (error) {
    await logManager.error('删除账号失败', { module: 'account', accountId, details: error })
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('account:start', async (_event, { accountId }) => {
  try {
    const account = await accountManager.getById(accountId)
    if (!account) {
      return { success: false, error: '账号不存在' }
    }

    // 启动 Playwright 浏览器会话
    const success = await playwrightManager.startSession(accountId, account.name)
    
    if (success) {
      // 更新账号状态
      await accountManager.start(accountId)
      await logManager.info(`启动账号: ${account.name}`, { module: 'account', accountId })
      dashboardManager.recordAccountActivity('started', accountId, account.name)
      
      // 更新托盘运行账号数
      const activeSessions = playwrightManager.getActiveSessions()
      trayManager.updateRunningCount(activeSessions.length)
    } else {
      dashboardManager.recordAccountActivity('error', accountId, account.name)
    }
    
    return { success, error: success ? undefined : '启动失败' }
  } catch (error) {
    await logManager.error('启动账号失败', { module: 'account', accountId, details: error })
    dashboardManager.recordAccountActivity('error', accountId, '')
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('account:stop', async (_event, { accountId }) => {
  try {
    const account = await accountManager.getById(accountId)
    if (!account) {
      return { success: false, error: '账号不存在' }
    }

    // 停止 Playwright 浏览器会话
    const success = await playwrightManager.stopSession(accountId)
    
    if (success) {
      // 更新账号状态
      await accountManager.stop(accountId)
      await logManager.info(`停止账号: ${account.name}`, { module: 'account', accountId })
      dashboardManager.recordAccountActivity('stopped', accountId, account.name)
      
      // 更新托盘运行账号数
      const activeSessions = playwrightManager.getActiveSessions()
      trayManager.updateRunningCount(activeSessions.length)
    }
    
    return { success, error: success ? undefined : '停止失败' }
  } catch (error) {
    await logManager.error('停止账号失败', { module: 'account', accountId, details: error })
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// ==================== 规则管理 IPC ====================
ipcMain.handle('rule:list', async (_event, { accountId }) => {
  try {
    const rules = await ruleManager.getRules(accountId)
    return { success: true, rules }
  } catch (error) {
    await logManager.error('获取规则列表失败', { module: 'rule', accountId, details: error })
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('rule:create', async (_event, { accountId, ...data }) => {
  try {
    const rule = await ruleManager.create(accountId, data)
    await logManager.info(`创建规则: ${rule.name}`, { module: 'rule', accountId, metadata: { ruleId: rule.id } })
    return { success: true, rule }
  } catch (error) {
    await logManager.error('创建规则失败', { module: 'rule', accountId, details: error })
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('rule:update', async (_event, { ruleId, ...data }) => {
  try {
    const rule = await ruleManager.update(ruleId, data)
    if (!rule) {
      return { success: false, error: '规则不存在' }
    }
    await logManager.info(`更新规则: ${rule.name}`, { module: 'rule', metadata: { ruleId } })
    return { success: true, rule }
  } catch (error) {
    await logManager.error('更新规则失败', { module: 'rule', metadata: { ruleId }, details: error })
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('rule:delete', async (_event, { ruleId }) => {
  try {
    const success = await ruleManager.delete(ruleId)
    if (success) {
      await logManager.info(`删除规则: ${ruleId}`, { module: 'rule' })
    }
    return { success, error: success ? undefined : '规则不存在' }
  } catch (error) {
    await logManager.error('删除规则失败', { module: 'rule', metadata: { ruleId }, details: error })
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('rule:toggle', async (_event, { ruleId, enabled }) => {
  try {
    const rule = await ruleManager.toggle(ruleId, enabled)
    if (!rule) {
      return { success: false, error: '规则不存在' }
    }
    await logManager.info(`${enabled ? '启用' : '禁用'}规则: ${rule.name}`, { module: 'rule', metadata: { ruleId } })
    return { success: true, rule }
  } catch (error) {
    await logManager.error('切换规则状态失败', { module: 'rule', metadata: { ruleId }, details: error })
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('rule:test', async (_event, params) => {
  try {
    const result = await ruleManager.test(params.ruleId, params.testMessage, params.variables)
    return { success: true, result }
  } catch (error) {
    await logManager.error('测试规则失败', { module: 'rule', details: error })
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// ==================== 日志管理 IPC ====================
ipcMain.handle('log:query', async (_event, filter) => {
  try {
    const data = await logManager.query(filter)
    return { success: true, data }
  } catch (error) {
    console.error('查询日志失败:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('log:export', async (_event, { accountIds, levels, startTime, endTime, format, outputPath }) => {
  try {
    const filePath = await logManager.export(
      { accountIds, levels, startTime, endTime },
      format,
      outputPath
    )
    return { success: true, filePath }
  } catch (error) {
    await logManager.error('导出日志失败', { module: 'log', details: error })
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('log:clear', async (_event, { accountIds, beforeDate }) => {
  try {
    const deletedCount = await logManager.clear({ accountIds, beforeDate })
    await logManager.info(`清理了 ${deletedCount} 条日志`, { module: 'log' })
    return { success: true, deletedCount }
  } catch (error) {
    await logManager.error('清理日志失败', { module: 'log', details: error })
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// ==================== 系统功能 IPC ====================
ipcMain.handle('system:openPath', async (_event, { path: targetPath }) => {
  try {
    await shell.openPath(targetPath)
    return { success: true }
  } catch (error) {
    await logManager.error('打开路径失败', { module: 'system', details: error })
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// ==================== 配置管理 IPC ====================
ipcMain.handle('config:get', async () => {
  try {
    const config = await systemConfigManager.getConfig()
    return { success: true, config }
  } catch (error) {
    await logManager.error('获取配置失败', { module: 'config', details: error })
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('config:update', async (_event, updates) => {
  try {
    const config = await systemConfigManager.updateConfig(updates)
    await logManager.info('配置已更新', { module: 'config' })
    dashboardManager.recordSystemActivity('info', '配置更新', '系统配置已更新')
    return { success: true, config }
  } catch (error) {
    await logManager.error('更新配置失败', { module: 'config', details: error })
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('config:reset', async () => {
  try {
    const config = await systemConfigManager.resetConfig()
    await logManager.info('配置已重置', { module: 'config' })
    dashboardManager.recordSystemActivity('warning', '配置重置', '系统配置已重置为默认值')
    return { success: true, config }
  } catch (error) {
    await logManager.error('重置配置失败', { module: 'config', details: error })
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// ==================== 仪表盘数据 IPC ====================
ipcMain.handle('dashboard:getData', async () => {
  try {
    const data = await dashboardManager.getData()
    return { success: true, data }
  } catch (error) {
    await logManager.error('获取仪表盘数据失败', { module: 'dashboard', details: error })
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// ==================== Playwright IPC ====================
ipcMain.handle('playwright:screenshot', async (_event, { accountId }) => {
  try {
    const path = await playwrightManager.captureScreenshot(accountId)
    return { success: true, path }
  } catch (error) {
    await logManager.error('截图失败', { module: 'playwright', accountId, details: error })
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('playwright:getStatus', async (_event, { accountId }) => {
  try {
    const status = playwrightManager.getSessionStatus(accountId)
    return { success: true, status }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('playwright:getActiveSessions', async () => {
  try {
    const sessions = playwrightManager.getActiveSessions()
    return { success: true, sessions }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// 应用生命周期
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  processManager.stopAll()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  processManager.stopAll()
  
  // 清理 Playwright 会话
  await playwrightManager.cleanup()
  
  // 销毁托盘
  trayManager.destroy()
  databaseManager.close()
})

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error)
})

process.on('unhandledRejection', (reason) => {
  console.error('未处理的 Promise 拒绝:', reason)
})
