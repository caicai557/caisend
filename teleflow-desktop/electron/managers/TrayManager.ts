/**
 * 系统托盘管理器
 * 负责系统托盘图标、菜单和通知
 */

import type { BrowserWindow, Event as ElectronEvent } from 'electron'
import { Tray, Menu, app, nativeImage } from 'electron'
import * as path from 'path'

export class TrayManager {
  private tray: Tray | null = null
  private mainWindow: BrowserWindow | null = null
  private runningAccountsCount = 0

  constructor() {
    if (app.isReady()) {
      this.createTray()
    } else {
      app.once('ready', () => {
        this.createTray()
      })
    }
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window

    // 监听窗口最小化事件
    this.mainWindow.on('minimize', (event: ElectronEvent) => {
      event.preventDefault()
      this.mainWindow?.hide()
    })

    // 监听窗口关闭事件
    this.mainWindow.on('close', (event: ElectronEvent) => {
      const electronApp = app as typeof app & { isQuitting?: boolean }
      if (!electronApp.isQuitting) {
        event.preventDefault()
        this.mainWindow?.hide()
      }
    })
  }

  private createTray() {
    // 创建托盘图标
    // 注意：需要在 resources 目录放置 icon.png
    const iconPath = path.join(__dirname, '../../resources/icon.png')
    
    // 创建一个简单的图标（如果没有图标文件）
    const icon = nativeImage.createEmpty()
    
    try {
      this.tray = new Tray(iconPath)
    } catch {
      // 如果找不到图标，使用空图标
      this.tray = new Tray(icon)
    }

    this.tray.setToolTip('Teleflow Desktop')
    this.updateContextMenu()

    // 双击托盘图标显示窗口
    this.tray.on('double-click', () => {
      this.showWindow()
    })
  }

  private updateContextMenu() {
    if (!this.tray) return

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Teleflow Desktop',
        enabled: false
      },
      { type: 'separator' },
      {
        label: `运行中账号: ${this.runningAccountsCount}`,
        enabled: false
      },
      { type: 'separator' },
      {
        label: '显示窗口',
        click: () => {
          this.showWindow()
        }
      },
      {
        label: '隐藏窗口',
        click: () => {
          this.hideWindow()
        }
      },
      { type: 'separator' },
      {
        label: '启动所有账号',
        click: () => {
          this.mainWindow?.webContents.send('tray:start-all')
        }
      },
      {
        label: '停止所有账号',
        click: () => {
          this.mainWindow?.webContents.send('tray:stop-all')
        }
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          const electronApp = app as typeof app & { isQuitting?: boolean }
          electronApp.isQuitting = true
          app.quit()
        }
      }
    ])

    this.tray.setContextMenu(contextMenu)
  }

  // 显示窗口
  showWindow() {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore()
      }
      this.mainWindow.show()
      this.mainWindow.focus()
    }
  }

  // 隐藏窗口
  hideWindow() {
    if (this.mainWindow) {
      this.mainWindow.hide()
    }
  }

  // 更新运行账号数
  updateRunningCount(count: number) {
    this.runningAccountsCount = count
    this.updateContextMenu()

    // 更新托盘提示
    if (this.tray) {
      this.tray.setToolTip(
        `Teleflow Desktop\n运行中账号: ${count}`
      )
    }
  }

  // 显示通知
  showNotification(title: string, body: string) {
    if (this.tray) {
      this.tray.displayBalloon({
        title,
        content: body,
        icon: nativeImage.createEmpty()
      })
    }
  }

  // 闪烁托盘图标（用于提醒）
  flashTray() {
    if (!this.tray) return

    let count = 0
    const interval = setInterval(() => {
      if (count >= 6) {
        clearInterval(interval)
        return
      }
      // 这里可以切换不同的图标来实现闪烁效果
      count++
    }, 500)
  }

  // 销毁托盘
  destroy() {
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
    }
  }
}
