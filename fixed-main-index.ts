// 修复后的主进程文件
// 文件位置: telegram-web-auto-reply/src/main/index.ts

import { app, BrowserWindow, ipcMain, Menu, shell, MenuItemConstructorOptions } from 'electron'
import path from 'path'
// 注意：如果使用@electron-toolkit/utils，请确保已安装
// import { electronApp, optimizer, is } from '@electron-toolkit/utils'
// 临时使用备用方案
import * as fs from 'fs'

// 图标路径 - 使用相对路径
const iconPath = path.join(__dirname, '../../assets/icon.png')

// 导入错误处理模块
const { errorHandler, memoryOptimizer } = require('./error-handler')

class MainWindow {
  private instance: BrowserWindow | null = null

  create(): BrowserWindow {
    try {
      // 修复SSR导入问题 - 使用安全的app路径获取
      const appPath = this.getAppPathSafe()
      
      // 检查图标文件是否存在
      let iconToShow: string | undefined
      if (fs.existsSync(iconPath)) {
        iconToShow = iconPath
      }

      this.instance = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        autoHideMenuBar: true,
        icon: iconToShow,
        webPreferences: {
          preload: path.join(__dirname, '../preload/index.js'),
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: false,
          webSecurity: true
        }
      })

      // 加载应用
      this.instance.on('ready-to-show', () => {
        this.instance?.show()
      })

      this.instance.webContents.setWindowOpenHandler((details: { url: string }) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
      })

      // 加载页面 - 使用安全路径
      const indexPath = path.join(appPath, 'dist/index.html')
      this.instance.loadFile(indexPath)

      // 错误处理
      this.setupErrorHandling()

      return this.instance
    } catch (error) {
      errorHandler.handleError(error, 'WINDOW_CREATION')
      throw error
    }
  }

  // 安全获取app路径 - 修复SSR问题
  private getAppPathSafe(): string {
    try {
      // 方法1: 直接使用app.getAppPath()
      if (typeof app.getAppPath === 'function') {
        return app.getAppPath()
      }
      
      // 方法2: 使用process.cwd()
      const cwd = process.cwd()
      if (cwd.includes('telegram-web-auto-reply')) {
        return cwd
      }
      
      // 方法3: 使用__dirname推断
      const srcPath = __dirname
      const projectRoot = path.resolve(srcPath, '../..')
      return projectRoot
      
    } catch (error) {
      console.error('获取应用路径失败，使用备用方案:', error)
      return process.cwd()
    }
  }

  private setupErrorHandling() {
    if (!this.instance) return

    // 渲染进程崩溃处理
    this.instance.webContents.on('render-process-gone', (event: any, details: any) => {
      console.error('渲染进程崩溃:', details)
      errorHandler.handleRendererCrash(details)
    })

    // 页面加载失败处理
    this.instance.webContents.on('did-fail-load', (event: any, errorCode: number, errorDescription: string) => {
      console.error('页面加载失败:', errorCode, errorDescription)
      this.handleLoadError(errorCode, errorDescription)
    })

    // 无响应处理
    this.instance.on('unresponsive', () => {
      console.warn('窗口无响应，尝试恢复...')
      this.handleUnresponsive()
    })
  }

  private handleLoadError(errorCode: number, errorDescription: string) {
    // 尝试重新加载
    setTimeout(() => {
      if (this.instance && !this.instance.isDestroyed()) {
        this.instance.reload()
      }
    }, 2000)
  }

  private handleUnresponsive() {
    // 尝试恢复响应
    setTimeout(() => {
      if (this.instance && !this.instance.isDestroyed()) {
        this.instance.webContents.forcefullyCrashRenderer()
        this.instance.reload()
      }
    }, 3000)
  }
}

class TelegramAutoReplyApp {
  private mainWindow: MainWindow
  private isQuitting: boolean = false

  constructor() {
    this.mainWindow = new MainWindow()
    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    // 应用就绪
    app.whenReady().then(() => {
      // 设置应用ID
      app.setAppUserModelId('com.telegram-auto-reply')
      
      // 开发环境处理
      const isDev = process.env.NODE_ENV === 'development'
      if (isDev) {
        app.on('browser-window-created', (_: any, window: BrowserWindow) => {
          // 开发环境的快捷键处理
          window.webContents.on('before-input-event', (event: any, input: any) => {
            if (input.key === 'F12' && (input.control || input.meta)) {
              window.webContents.toggleDevTools()
            }
          })
        })
      }

      this.createWindow()
      this.setupMenu()

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow()
        }
      })
    }).catch((error: any) => {
      errorHandler.handleError(error, 'APP_READY')
    })

    // 所有窗口关闭
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.quit()
      }
    })

    // 应用退出前
    app.on('before-quit', () => {
      this.isQuitting = true
      this.cleanup()
    })
  }

  private createWindow() {
    try {
      this.mainWindow.create()
    } catch (error) {
      errorHandler.handleError(error, 'MAIN_WINDOW_CREATE')
    }
  }

  private setupMenu() {
    const template: MenuItemConstructorOptions[] = [
      {
        label: '文件',
        submenu: [
          {
            label: '重新加载',
            accelerator: 'CmdOrCtrl+R',
            click: () => {
              BrowserWindow.getFocusedWindow()?.reload()
            }
          },
          {
            label: '退出',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              this.quit()
            }
          }
        ]
      },
      {
        label: '开发',
        submenu: [
          {
            label: '开发者工具',
            accelerator: 'F12',
            click: () => {
              BrowserWindow.getFocusedWindow()?.webContents.toggleDevTools()
            }
          }
        ]
      }
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
  }

  private cleanup() {
    console.log('清理资源...')
    // 清理定时器、连接等资源
  }

  private quit() {
    if (!this.isQuitting) {
      this.isQuitting = true
      app.quit()
    }
  }
}

// 启动应用
try {
  new TelegramAutoReplyApp()
} catch (error) {
  console.error('应用启动失败:', error)
  errorHandler.handleError(error, 'APP_STARTUP')
}
