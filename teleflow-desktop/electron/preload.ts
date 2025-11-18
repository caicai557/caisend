import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

// 预加载脚本 - 暴露安全的 IPC API 给渲染进程

export interface ElectronAPI {
  // 配置操作
  getConfig: (configPath?: string) => Promise<any>
  saveConfig: (config: any, configPath?: string) => Promise<any>
  validateConfig: (configPath?: string) => Promise<any>
  
  // 进程控制
  startAccount: (accountName: string, configPath?: string) => Promise<any>
  stopAccount: (accountName: string) => Promise<any>
  getAccountStatus: (accountName: string) => Promise<any>
  
  // 日志监听
  onLogUpdate: (callback: (log: any) => void) => () => void
  onAccountStatusChanged: (callback: (status: any) => void) => () => void
  onQrCode: (callback: (data: { accountId: string; accountName: string; qrCode: string }) => void) => () => void
  onLoginSuccess: (callback: (data: { accountId: string; accountName: string }) => void) => () => void
}

const electronAPI: ElectronAPI = {
  // 配置操作
  getConfig: (configPath) => ipcRenderer.invoke('get-config', configPath),
  saveConfig: (config, configPath) => ipcRenderer.invoke('save-config', config, configPath),
  validateConfig: (configPath) => ipcRenderer.invoke('validate-config', configPath),
  
  // 进程控制
  startAccount: (accountName, configPath) => ipcRenderer.invoke('start-account', accountName, configPath),
  stopAccount: (accountName) => ipcRenderer.invoke('stop-account', accountName),
  getAccountStatus: (accountName) => ipcRenderer.invoke('get-account-status', accountName),
  
  // 日志监听
  onLogUpdate: (callback) => {
    const subscription = (_event: IpcRendererEvent, log: any) => callback(log)
    ipcRenderer.on('log-update', subscription)
    
    // 返回清理函数
    return () => {
      ipcRenderer.removeListener('log-update', subscription)
    }
  },
  
  onAccountStatusChanged: (callback) => {
    const subscription = (_event: IpcRendererEvent, status: any) => callback(status)
    ipcRenderer.on('account-status-changed', subscription)
    
    return () => {
      ipcRenderer.removeListener('account-status-changed', subscription)
    }
  },
  
  onQrCode: (callback) => {
    const subscription = (_event: IpcRendererEvent, data: any) => callback(data)
    ipcRenderer.on('account:qrCode', subscription)
    
    return () => {
      ipcRenderer.removeListener('account:qrCode', subscription)
    }
  },
  
  onLoginSuccess: (callback) => {
    const subscription = (_event: IpcRendererEvent, data: any) => callback(data)
    ipcRenderer.on('account:loginSuccess', subscription)
    
    return () => {
      ipcRenderer.removeListener('account:loginSuccess', subscription)
    }
  }
}

// 将 API 暴露给渲染进程
contextBridge.exposeInMainWorld('electron', electronAPI)

// TypeScript 类型声明
declare global {
  interface Window {
    electron: ElectronAPI
  }
}
