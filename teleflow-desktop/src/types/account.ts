/**
 * 账号相关类型定义
 */

/**
 * 账号状态枚举
 */
export enum AccountStatus {
  STOPPED = 'stopped',     // 已停止
  RUNNING = 'running',     // 运行中
  ERROR = 'error',         // 错误
  STARTING = 'starting',   // 启动中
  STOPPING = 'stopping'    // 停止中
}

/**
 * 账号配置
 */
export interface Account {
  id: string                    // 账号唯一 ID
  name: string                  // 账号名称
  phone: string                 // 手机号
  status: AccountStatus         // 当前状态
  profilePath: string           // Playwright Profile 路径
  enabled: boolean              // 是否启用
  createdAt: string            // 创建时间
  lastActiveAt?: string        // 最后活跃时间
  processId?: number           // 进程 ID（运行时）
  
  // 运行配置
  config: AccountConfig
  
  // 统计信息
  stats: AccountStats
}

/**
 * 账号运行配置
 */
export interface AccountConfig {
  // 轮询配置
  pollInterval: number         // 轮询间隔（秒）
  pollIntervalRange: [number, number] // 随机范围
  
  // 自动已读
  autoRead: boolean
  readDelay: number            // 已读延时（毫秒）
  
  // 聊天配置
  chats: ChatConfig[]
  
  // Playwright 配置
  headless: boolean
  slowMo: number
  timeout: number
}

/**
 * 聊天配置
 */
export interface ChatConfig {
  id: string
  chatId: string               // Telegram 聊天 ID
  chatName: string             // 聊天名称
  enabled: boolean             // 是否启用
  
  // 规则列表
  rules: Rule[]
}

/**
 * 自动回复规则
 */
export interface Rule {
  id: string
  name: string                 // 规则名称
  enabled: boolean             // 是否启用
  priority: number             // 优先级（数字越大越高）
  
  // 触发条件
  trigger: {
    type: 'keyword' | 'regex' | 'contains' | 'exact'
    pattern: string            // 匹配模式
    caseSensitive: boolean     // 大小写敏感
  }
  
  // 响应动作
  action: {
    type: 'reply' | 'forward' | 'custom'
    content: string            // 回复内容（支持变量）
    delay: number              // 延时（毫秒）
  }
  
  // 限制条件
  limits?: {
    maxPerHour?: number        // 每小时最大触发次数
    maxPerDay?: number         // 每天最大触发次数
    cooldown?: number          // 冷却时间（秒）
  }
  
  createdAt: string
  updatedAt: string
}

/**
 * 账号统计信息
 */
export interface AccountStats {
  totalReplies: number         // 总回复数
  todayReplies: number         // 今日回复数
  totalErrors: number          // 总错误数
  todayErrors: number          // 今日错误数
  uptime: number               // 运行时长（秒）
  lastError?: string           // 最后错误信息
}

/**
 * 创建账号的请求参数
 */
export interface CreateAccountRequest {
  name: string
  phone: string
  config: Partial<AccountConfig>
}

/**
 * 更新账号的请求参数
 */
export interface UpdateAccountRequest {
  id: string
  data: Partial<Omit<Account, 'id' | 'createdAt' | 'stats'>>
}
