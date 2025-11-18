# Telegram Web 助手控制台 - 架构设计文档

## 数据模型（TypeScript 类型定义）

### src/renderer/types/account.ts
```typescript
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
```

### src/renderer/types/log.ts
```typescript
/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * 日志条目
 */
export interface LogEntry {
  id: string
  timestamp: string            // ISO 8601 格式
  accountId: string            // 所属账号
  accountName: string          // 账号名称
  level: LogLevel              // 日志级别
  module: string               // 模块名称
  message: string              // 日志消息
  details?: any                // 详细信息（JSON）
  stackTrace?: string          // 错误堆栈
}

/**
 * 日志查询过滤器
 */
export interface LogFilter {
  accountIds?: string[]        // 账号 ID 列表
  levels?: LogLevel[]          // 日志级别
  startTime?: string           // 开始时间
  endTime?: string             // 结束时间
  keyword?: string             // 关键词搜索
  limit?: number               // 返回数量限制
  offset?: number              // 偏移量
}
```

### src/renderer/types/config.ts
```typescript
/**
 * 系统配置
 */
export interface SystemConfig {
  // 全局设置
  global: {
    theme: 'light' | 'dark' | 'auto'
    language: 'zh-CN' | 'en-US'
    logLevel: LogLevel
    logRetentionDays: number   // 日志保留天数
  }
  
  // Playwright 默认配置
  playwright: {
    executablePath?: string    // Chromium 路径
    headless: boolean
    slowMo: number
    timeout: number
    downloadsPath: string
  }
  
  // 后台服务配置
  backend: {
    pythonPath: string         // Python 解释器路径
    scriptPath: string         // Python 脚本路径
    host: string               // 服务地址
    port: number               // 服务端口
  }
  
  // 路径配置
  paths: {
    config: string             // 配置文件目录
    logs: string               // 日志文件目录
    profiles: string           // Profile 目录
    downloads: string          // 下载目录
  }
}

/**
 * 活动时间线条目
 */
export interface ActivityEntry {
  id: string
  timestamp: string
  accountId: string
  accountName: string
  type: 'reply' | 'read' | 'error' | 'start' | 'stop'
  description: string
  details?: any
}
```

## 与 Python YAML 配置的映射关系

### Python config.yaml 示例
```yaml
# 账号配置
accounts:
  - id: "account_001"
    name: "主账号"
    phone: "+86 138 1234 5678"
    profile_path: "./profiles/account_001"
    enabled: true
    
    # 运行配置
    config:
      poll_interval: 2
      poll_interval_range: [1, 3]
      auto_read: true
      read_delay: 500
      
      # Playwright 配置
      headless: false
      slow_mo: 100
      timeout: 30000
      
      # 聊天配置
      chats:
        - chat_id: "chat_123"
          chat_name: "客户群"
          enabled: true
          rules:
            - id: "rule_001"
              name: "价格查询"
              enabled: true
              priority: 10
              trigger:
                type: "keyword"
                pattern: "价格"
                case_sensitive: false
              action:
                type: "reply"
                content: "请稍等，我查一下价格..."
                delay: 1000
              limits:
                max_per_hour: 10
                cooldown: 60

# 系统配置
system:
  global:
    theme: "dark"
    language: "zh-CN"
    log_level: "info"
    log_retention_days: 30
  
  playwright:
    headless: false
    slow_mo: 100
    timeout: 30000
    downloads_path: "./downloads"
  
  backend:
    python_path: "python"
    script_path: "./backend/main.py"
    host: "127.0.0.1"
    port: 8888
  
  paths:
    config: "./config"
    logs: "./logs"
    profiles: "./profiles"
    downloads: "./downloads"
```

### 字段映射说明

| TypeScript 字段 | Python YAML 字段 | 说明 |
|----------------|------------------|------|
| `Account.id` | `accounts[].id` | 账号唯一标识 |
| `Account.name` | `accounts[].name` | 账号名称 |
| `Account.phone` | `accounts[].phone` | 手机号 |
| `Account.profilePath` | `accounts[].profile_path` | Profile 路径 |
| `AccountConfig.pollInterval` | `config.poll_interval` | 轮询间隔 |
| `AccountConfig.autoRead` | `config.auto_read` | 自动已读 |
| `ChatConfig.chatId` | `chats[].chat_id` | 聊天 ID |
| `Rule.trigger.type` | `rules[].trigger.type` | 触发类型 |
| `Rule.action.content` | `rules[].action.content` | 回复内容 |
| `SystemConfig.global.theme` | `system.global.theme` | 主题 |
| `SystemConfig.playwright.*` | `system.playwright.*` | Playwright 配置 |

## API 接口规范

### IPC 通信协议

所有请求/响应都使用统一的格式：

```typescript
// 请求格式
interface IPCRequest<T = any> {
  channel: string
  data: T
}

// 响应格式
interface IPCResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
}
```

### 账号管理 API

| 方法 | Channel | 请求参数 | 返回值 |
|------|---------|----------|--------|
| 获取账号列表 | `account:list` | - | `Account[]` |
| 获取账号详情 | `account:get` | `{ id: string }` | `Account` |
| 创建账号 | `account:create` | `Partial<Account>` | `Account` |
| 更新账号 | `account:update` | `{ id: string, data: Partial<Account> }` | `Account` |
| 删除账号 | `account:delete` | `{ id: string }` | `void` |
| 启动账号 | `account:start` | `{ id: string }` | `void` |
| 停止账号 | `account:stop` | `{ id: string }` | `void` |
| 获取账号统计 | `account:stats` | `{ id: string }` | `AccountStats` |

### 规则管理 API

| 方法 | Channel | 请求参数 | 返回值 |
|------|---------|----------|--------|
| 获取规则列表 | `rule:list` | `{ accountId: string, chatId: string }` | `Rule[]` |
| 创建规则 | `rule:create` | `{ accountId: string, chatId: string, rule: Partial<Rule> }` | `Rule` |
| 更新规则 | `rule:update` | `{ id: string, data: Partial<Rule> }` | `Rule` |
| 删除规则 | `rule:delete` | `{ id: string }` | `void` |
| 切换规则状态 | `rule:toggle` | `{ id: string, enabled: boolean }` | `Rule` |

### 日志管理 API

| 方法 | Channel | 请求参数 | 返回值 |
|------|---------|----------|--------|
| 查询日志 | `log:query` | `LogFilter` | `{ logs: LogEntry[], total: number }` |
| 导出日志 | `log:export` | `{ filter: LogFilter, format: 'json' \| 'csv' }` | `{ path: string }` |
| 清理日志 | `log:clean` | `{ beforeDate: string }` | `void` |

### 配置管理 API

| 方法 | Channel | 请求参数 | 返回值 |
|------|---------|----------|--------|
| 获取系统配置 | `config:get` | - | `SystemConfig` |
| 更新系统配置 | `config:update` | `Partial<SystemConfig>` | `SystemConfig` |
| 重置配置 | `config:reset` | - | `SystemConfig` |

### 实时事件推送

后台通过 IPC 主动推送事件到前端：

| 事件名 | 数据类型 | 说明 |
|--------|---------|------|
| `account:status-changed` | `{ id: string, status: AccountStatus }` | 账号状态变化 |
| `log:new-entry` | `LogEntry` | 新日志产生 |
| `stats:updated` | `{ accountId: string, stats: AccountStats }` | 统计数据更新 |
| `activity:new` | `ActivityEntry` | 新活动记录 |

## 组件职责说明

### 布局层（Layouts）

1. **MainLayout** - 主布局容器
   - 职责：管理整体布局结构（TopBar + Sidebar + Content + StatusBar）
   - 状态：当前选中的视图、侧边栏展开/收起状态

2. **TopBar** - 顶部栏
   - 职责：显示产品信息、全局操作按钮
   - 功能：启动全部、停止全部、打开日志目录、设置

3. **Sidebar** - 左侧栏
   - 职责：账号列表 + 导航菜单
   - 功能：账号选择、右键菜单、导航切换

4. **StatusBar** - 底部状态栏
   - 职责：显示系统状态信息
   - 内容：当前提示、统计数据、时间、网络状态

### 视图层（Views）

1. **Dashboard** - 仪表盘
   - MetricsCards：关键指标卡片
   - AccountStatusTable：账号状态表格
   - ActivityTimeline：活动时间线

2. **AccountDetail** - 账号详情
   - AccountHeader：账号信息头部
   - Tabs：规则与聊天、运行状态、调试与日志
   - RulesTable：规则表格（支持行内编辑）

3. **Logs** - 运行日志
   - LogsFilter：日志过滤器
   - LogsTable：日志表格

4. **Settings** - 系统设置
   - GeneralSettings：常规设置
   - ThemeSettings：主题设置

### 组件层（Components）

1. **AccountList** - 账号列表
   - 显示所有账号
   - 支持选中、右键菜单

2. **StatusIndicator** - 状态指示器
   - 显示运行状态（颜色点 + 文字）

3. **EditableCell** - 可编辑单元格
   - 点击编辑、失焦保存
   - 用于表格行内编辑

4. **ContextMenu** - 右键菜单
   - 通用右键菜单组件

## 状态管理方案

使用 Zustand 进行状态管理：

```typescript
// accountStore.ts
interface AccountStore {
  accounts: Account[]
  selectedAccountId: string | null
  
  // Actions
  setAccounts: (accounts: Account[]) => void
  addAccount: (account: Account) => void
  updateAccount: (id: string, data: Partial<Account>) => void
  deleteAccount: (id: string) => void
  selectAccount: (id: string | null) => void
}

// appStore.ts
interface AppStore {
  currentView: 'dashboard' | 'account' | 'logs' | 'settings'
  sidebarCollapsed: boolean
  theme: 'light' | 'dark'
  systemConfig: SystemConfig | null
  
  // Actions
  setView: (view: string) => void
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark') => void
  setSystemConfig: (config: SystemConfig) => void
}
```

## 路由结构

```
/                          # 仪表盘
/account/:id               # 账号详情
  /account/:id/rules       # 规则与聊天
  /account/:id/status      # 运行状态
  /account/:id/logs        # 调试与日志
/logs                      # 全局日志
/settings                  # 系统设置
```
