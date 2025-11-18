/**
 * App 应用相关类型定义
 */

/**
 * 账号运行时状态
 */
export interface AccountRuntimeStatus {
  online: boolean
  unreadCount: number
  chatCount: number
  needsLogin: boolean
  qrCode?: string
}

/**
 * 登录对话框状态
 */
export interface LoginDialogState {
  show: boolean
  account: string
  method: 'qr' | 'phone'
  step: 'phone' | 'code' | 'password'
  phoneNumber?: string
  countryCode?: string
  verificationCode?: string
  password?: string
  qrCode?: string
  resendCountdown: number
  countdown?: number
  codeSent?: boolean
  otpMethod?: 'sms' | 'call' | 'voice'
}

/**
 * 简化的账号数据（用于UI显示）
 */
export interface SimpleAccount {
  name: string
  phone?: string
  proxy?: string | null
  isNew?: boolean
  monitor_chats?: string[]
  rules?: unknown[]
  forward_rules?: unknown[]
}

/**
 * IPC 响应类型
 */
export interface IPCResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  config?: {
    accounts: SimpleAccount[]
  }
  pid?: number
  message?: string
}

/**
 * Electron API 完整类型定义
 */
export interface ElectronAPI {
  // 配置操作
  getConfig: () => Promise<IPCResponse>
  saveConfig?: (config: unknown) => Promise<IPCResponse>
  validateConfig: () => Promise<IPCResponse>
  
  // 进程控制
  startAccount: (accountName: string, configPath?: string) => Promise<IPCResponse>
  stopAccount: (accountName: string) => Promise<IPCResponse>
  getAccountStatus: (accountName: string) => Promise<IPCResponse>
  
  // 通用IPC
  invoke: <T = unknown>(channel: string, data?: unknown) => Promise<T>
  on: (channel: string, callback: (...args: unknown[]) => void) => void
  removeListener: (channel: string, callback: (...args: unknown[]) => void) => void
  send: (channel: string, data?: unknown) => void
  openPath?: (type: 'logs' | 'config' | 'profiles') => Promise<void>
  
  // 日志监听
  onLogUpdate?: (callback: (log: LogEntry) => void) => () => void
  onAccountStatusChanged?: (callback: (status: AccountStatusChangeEvent) => void) => () => void
  onQrCode?: (callback: (data: QrCodeEvent) => void) => () => void
  onLoginSuccess?: (callback: (data: LoginSuccessEvent) => void) => () => void
}

/**
 * 日志条目
 */
export interface LogEntry {
  account: string
  message: string
  level?: 'info' | 'warn' | 'error' | 'debug'
  timestamp?: string
}

/**
 * 账号状态变更事件
 */
export interface AccountStatusChangeEvent {
  account: string
  online?: boolean
  unreadCount?: number
  chatCount?: number
  needsLogin?: boolean
  qrCode?: string
}

/**
 * QR码事件
 */
export interface QrCodeEvent {
  accountId: string
  accountName: string
  qrCode: string
}

/**
 * 登录成功事件
 */
export interface LoginSuccessEvent {
  accountId: string
  accountName: string
}

/**
 * 国家信息
 */
export interface Country {
  code: string
  name: string
  flag: string
  id?: string
}

// 全局类型声明
export {}
