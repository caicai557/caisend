// 修复SSR导入问题的解决方案
// 文件位置: telegram-web-auto-reply/src/main/index.ts

// 修复前的问题代码:
// import { app } from 'electron'
// const appPath = app.getAppPath() // 这里会报错

// 修复后的代码:
const { app } = require('electron') // 使用require而不是import
const appPath = app.getAppPath()

// 或者如果在ES模块中:
import { app } from 'electron'
const appPath = app.getAppPath?.() || app.default?.getAppPath?.()

// 完整的主进程修复示例:
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

function createWindow() {
  try {
    const mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/index.js')
      }
    })

    // 修复SSR导入问题
    const appPath = app.getAppPath()
    const indexPath = path.join(appPath, 'dist/index.html')
    
    mainWindow.loadFile(indexPath)
    
    return mainWindow
  } catch (error) {
    console.error('创建窗口失败:', error)
    throw error
  }
}

app.whenReady().then(() => {
  createWindow()
}).catch(console.error)
