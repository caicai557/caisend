# Data Model Design: TeleFlow Desktop

**Date**: 2025-11-18  
**Feature**: TeleFlow Desktop 架构重构与功能整合  
**Branch**: 003-system-architecture-refactor

## Overview

本文档定义了 TeleFlow Desktop 的核心数据模型，包括实体定义、关系映射、验证规则和状态转换。所有模型使用 TypeScript 接口定义，并通过 Zod 进行运行时验证。

## Core Entities

### 1. Account（账号）

```typescript
interface Account {
  id: string                    // UUID
  name: string                  // 账号显示名称
  phone?: string               // 手机号（可选）
  username?: string            // Telegram 用户名
  sessionData?: string         // 加密的会话数据
  status: AccountStatus        // 在线状态
  browserContextPath: string   // Playwright 上下文路径
  settings: AccountSettings    // 账号设置
  createdAt: Date
  updatedAt: Date
  lastActiveAt?: Date
}

enum AccountStatus {
  OFFLINE = 'offline',
  CONNECTING = 'connecting',
  ONLINE = 'online',
  ERROR = 'error',
  SUSPENDED = 'suspended'
}

interface AccountSettings {
  autoReconnect: boolean
  notificationsEnabled: boolean
  translationEnabled: boolean
  defaultLanguage: string
  customRules: string[]        // 规则 ID 列表
}
```

**Validation Rules**:
- `name`: 必填，2-50 个字符
- `phone`: 可选，符合 E.164 格式
- `sessionData`: 加密存储，使用 Electron safeStorage
- `status`: 状态转换必须符合状态机规则

**State Transitions**:
```
OFFLINE -> CONNECTING -> ONLINE
ONLINE -> OFFLINE
CONNECTING -> ERROR -> OFFLINE
ONLINE -> SUSPENDED -> OFFLINE
```

### 2. Message（消息）

```typescript
interface Message {
  id: string                   // UUID
  accountId: string            // 所属账号
  chatId: string              // 聊天 ID
  messageId: string           // Telegram 消息 ID
  content: string             // 消息内容
  sender: MessageSender       // 发送者信息
  recipient?: string          // 接收者（私聊）
  timestamp: Date             // 消息时间
  type: MessageType           // 消息类型
  metadata?: MessageMetadata  // 元数据
  isRead: boolean
  isTranslated: boolean
  isProcessed: boolean
  createdAt: Date
}

interface MessageSender {
  id: string
  username?: string
  displayName: string
  isBot: boolean
  isSelf: boolean
}

enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  STICKER = 'sticker',
  LOCATION = 'location',
  CONTACT = 'contact'
}

interface MessageMetadata {
  editedAt?: Date
  replyTo?: string            // 回复的消息 ID
  forwardFrom?: string         // 转发来源
  mediaUrl?: string            // 媒体文件 URL
  fileSize?: number            // 文件大小
  duration?: number            // 音视频时长
}
```

**Validation Rules**:
- `content`: 最大 4096 字符
- `timestamp`: 不能是未来时间
- `type`: 必须是定义的枚举值之一
- `mediaUrl`: 如果是媒体类型必填

### 3. Rule（规则）

```typescript
interface Rule {
  id: string                   // UUID
  accountId?: string           // 所属账号（可全局）
  name: string                 // 规则名称
  description?: string         // 规则描述
  enabled: boolean             // 是否启用
  priority: number             // 优先级（越大越高）
  conditions: RuleCondition[]  // 触发条件
  actions: RuleAction[]        // 执行动作
  metadata: RuleMetadata       // 元数据
  createdAt: Date
  updatedAt: Date
}

interface RuleCondition {
  type: ConditionType
  operator: ConditionOperator
  value: any
  caseSensitive?: boolean
}

enum ConditionType {
  KEYWORD = 'keyword',
  REGEX = 'regex',
  SENDER = 'sender',
  CHAT = 'chat',
  TIME = 'time',
  MESSAGE_TYPE = 'messageType'
}

enum ConditionOperator {
  EQUALS = 'equals',
  CONTAINS = 'contains',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith',
  MATCHES = 'matches',
  IN = 'in',
  NOT_IN = 'notIn',
  BETWEEN = 'between'
}

interface RuleAction {
  type: ActionType
  params: Record<string, any>
  delay?: number              // 延迟执行（毫秒）
  randomDelay?: number        // 随机延迟上限
}

enum ActionType {
  REPLY = 'reply',
  FORWARD = 'forward',
  MARK_READ = 'markRead',
  TRANSLATE = 'translate',
  DELETE = 'delete',
  NOTIFY = 'notify',
  WEBHOOK = 'webhook',
  SCRIPT = 'script'
}

interface RuleMetadata {
  triggerCount: number         // 触发次数
  lastTriggered?: Date        // 最后触发时间
  successCount: number        // 成功次数
  failureCount: number        // 失败次数
  averageExecutionTime?: number // 平均执行时间
}
```

**Validation Rules**:
- `name`: 必填，2-100 个字符
- `priority`: 0-1000 范围
- `conditions`: 至少一个条件
- `actions`: 至少一个动作
- `delay`: 0-3600000（最大 1 小时）

### 4. Contact（联系人）

```typescript
interface Contact {
  id: string                   // UUID
  accountId: string            // 所属账号
  telegramId: string          // Telegram 用户 ID
  username?: string           // 用户名
  firstName?: string          // 名
  lastName?: string           // 姓
  displayName: string         // 显示名称
  phoneNumber?: string        // 电话号码
  avatar?: string             // 头像 URL
  bio?: string               // 个人简介
  isBot: boolean
  isContact: boolean          // 是否在通讯录
  isBlocked: boolean
  relationship: ContactRelationship
  tags: string[]              // 标签
  notes?: string              // 备注
  customData?: Record<string, any>
  interactionStats: InteractionStats
  createdAt: Date
  updatedAt: Date
}

enum ContactRelationship {
  VIP = 'vip',
  IMPORTANT = 'important',
  NORMAL = 'normal',
  BLACKLIST = 'blacklist'
}

interface InteractionStats {
  messagesReceived: number
  messagesSent: number
  lastMessageDate?: Date
  averageResponseTime?: number  // 毫秒
  favoriteTopics: string[]
  sentimentScore: number        // -1 到 1
}
```

**Validation Rules**:
- `displayName`: 必填，优先级: firstName + lastName > username > telegramId
- `tags`: 最多 20 个标签，每个标签最多 30 字符
- `notes`: 最大 5000 字符
- `sentimentScore`: -1 到 1 之间

### 5. Session（会话）

```typescript
interface Session {
  id: string                   // UUID
  accountId: string            // 所属账号
  chatId: string              // 聊天 ID
  chatType: ChatType          // 聊天类型
  title: string               // 会话标题
  participants: Participant[] // 参与者
  unreadCount: number         // 未读数
  lastMessage?: Message       // 最后一条消息
  isPinned: boolean           // 是否置顶
  isMuted: boolean            // 是否静音
  isArchived: boolean         // 是否归档
  metadata: SessionMetadata
  createdAt: Date
  updatedAt: Date
}

enum ChatType {
  PRIVATE = 'private',
  GROUP = 'group',
  CHANNEL = 'channel',
  BOT = 'bot'
}

interface Participant {
  userId: string
  role: ParticipantRole
  joinedAt: Date
}

enum ParticipantRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member'
}

interface SessionMetadata {
  messageCount: number
  mediaCount: number
  linkCount: number
  lastActivity: Date
  language?: string            // 检测到的主要语言
  topics: string[]            // 话题标签
}
```

### 6. Translation（翻译）

```typescript
interface Translation {
  id: string                   // UUID
  messageId?: string          // 关联消息 ID
  originalText: string        // 原文
  translatedText: string      // 译文
  sourceLang: string          // 源语言代码
  targetLang: string          // 目标语言代码
  engine: TranslationEngine   // 使用的引擎
  confidence?: number         // 置信度 (0-1)
  alternatives?: string[]     // 备选翻译
  metadata: TranslationMetadata
  createdAt: Date
}

enum TranslationEngine {
  GOOGLE = 'google',
  DEEPL = 'deepl',
  BAIDU = 'baidu',
  LIBRE = 'libre',
  CACHED = 'cached'
}

interface TranslationMetadata {
  cost?: number               // API 调用成本
  latency: number            // 响应时间（毫秒）
  fromCache: boolean         // 是否来自缓存
  retryCount: number         // 重试次数
}
```

### 7. Task（任务）

```typescript
interface Task {
  id: string                   // UUID
  accountId?: string          // 所属账号（可选）
  type: TaskType              // 任务类型
  status: TaskStatus          // 任务状态
  priority: number            // 优先级
  payload: Record<string, any> // 任务数据
  schedule?: TaskSchedule     // 调度信息
  execution?: TaskExecution   // 执行信息
  retryConfig: RetryConfig   // 重试配置
  createdAt: Date
  updatedAt: Date
}

enum TaskType {
  SEND_MESSAGE = 'sendMessage',
  BULK_SEND = 'bulkSend',
  SCHEDULED_MESSAGE = 'scheduledMessage',
  IMPORT_CONTACTS = 'importContacts',
  EXPORT_DATA = 'exportData',
  BACKUP = 'backup'
}

enum TaskStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

interface TaskSchedule {
  scheduledAt?: Date          // 一次性任务
  cronExpression?: string     // 循环任务
  timezone?: string           // 时区
  endDate?: Date             // 结束日期
}

interface TaskExecution {
  startedAt?: Date
  completedAt?: Date
  progress: number            // 0-100
  result?: any
  error?: string
  logs: string[]
}

interface RetryConfig {
  maxAttempts: number
  backoffType: 'linear' | 'exponential'
  retryDelay: number          // 基础延迟（毫秒）
  currentAttempt: number
}
```

### 8. Template（模板）

```typescript
interface Template {
  id: string                   // UUID
  accountId?: string          // 所属账号（可全局）
  name: string                // 模板名称
  category: TemplateCategory  // 模板分类
  content: string             // 模板内容
  variables: TemplateVariable[] // 变量定义
  tags: string[]              // 标签
  usageCount: number          // 使用次数
  isPublic: boolean           // 是否公开
  createdAt: Date
  updatedAt: Date
}

enum TemplateCategory {
  GREETING = 'greeting',
  REPLY = 'reply',
  NOTIFICATION = 'notification',
  MARKETING = 'marketing',
  SUPPORT = 'support',
  CUSTOM = 'custom'
}

interface TemplateVariable {
  name: string                // 变量名
  type: 'text' | 'number' | 'date' | 'select'
  defaultValue?: any
  options?: any[]            // select 类型的选项
  required: boolean
  description?: string
}
```

## Relationships

### Entity Relationships Diagram

```
Account (1) ──── (*) Message
Account (1) ──── (*) Rule
Account (1) ──── (*) Contact
Account (1) ──── (*) Session
Account (1) ──── (*) Task
Account (1) ──── (*) Template

Message (1) ──── (0..1) Translation
Message (*) ──── (1) Session

Rule (*) ──── (*) Message (through execution)

Contact (*) ──── (*) Session (participants)
Contact (1) ──── (*) Message (sender)

Session (1) ──── (*) Message
Session (*) ──── (*) Contact (participants)

Task (*) ──── (*) Message (bulk send)
Template (*) ──── (*) Message (generated from)
```

## Validation Schemas (Zod)

```typescript
import { z } from 'zod'

// Account validation schema
export const AccountSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(50),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/).optional(),
  username: z.string().min(5).max(32).optional(),
  sessionData: z.string().optional(),
  status: z.enum(['offline', 'connecting', 'online', 'error', 'suspended']),
  browserContextPath: z.string(),
  settings: z.object({
    autoReconnect: z.boolean(),
    notificationsEnabled: z.boolean(),
    translationEnabled: z.boolean(),
    defaultLanguage: z.string().length(2),
    customRules: z.array(z.string().uuid())
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastActiveAt: z.date().optional()
})

// Message validation schema
export const MessageSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  chatId: z.string(),
  messageId: z.string(),
  content: z.string().max(4096),
  sender: z.object({
    id: z.string(),
    username: z.string().optional(),
    displayName: z.string(),
    isBot: z.boolean(),
    isSelf: z.boolean()
  }),
  recipient: z.string().optional(),
  timestamp: z.date().refine(date => date <= new Date()),
  type: z.enum(['text', 'image', 'video', 'audio', 'document', 'sticker', 'location', 'contact']),
  metadata: z.object({
    editedAt: z.date().optional(),
    replyTo: z.string().optional(),
    forwardFrom: z.string().optional(),
    mediaUrl: z.string().url().optional(),
    fileSize: z.number().positive().optional(),
    duration: z.number().positive().optional()
  }).optional(),
  isRead: z.boolean(),
  isTranslated: z.boolean(),
  isProcessed: z.boolean(),
  createdAt: z.date()
})

// Rule validation schema
export const RuleSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid().optional(),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  enabled: z.boolean(),
  priority: z.number().min(0).max(1000),
  conditions: z.array(z.object({
    type: z.enum(['keyword', 'regex', 'sender', 'chat', 'time', 'messageType']),
    operator: z.enum(['equals', 'contains', 'startsWith', 'endsWith', 'matches', 'in', 'notIn', 'between']),
    value: z.any(),
    caseSensitive: z.boolean().optional()
  })).min(1),
  actions: z.array(z.object({
    type: z.enum(['reply', 'forward', 'markRead', 'translate', 'delete', 'notify', 'webhook', 'script']),
    params: z.record(z.any()),
    delay: z.number().min(0).max(3600000).optional(),
    randomDelay: z.number().min(0).max(3600000).optional()
  })).min(1),
  metadata: z.object({
    triggerCount: z.number(),
    lastTriggered: z.date().optional(),
    successCount: z.number(),
    failureCount: z.number(),
    averageExecutionTime: z.number().optional()
  }),
  createdAt: z.date(),
  updatedAt: z.date()
})
```

## State Management

### Account State Machine

```typescript
class AccountStateMachine {
  private currentState: AccountStatus
  
  transitions = {
    offline: ['connecting'],
    connecting: ['online', 'error'],
    online: ['offline', 'suspended'],
    error: ['offline', 'connecting'],
    suspended: ['offline']
  }
  
  canTransition(to: AccountStatus): boolean {
    return this.transitions[this.currentState]?.includes(to) ?? false
  }
  
  transition(to: AccountStatus): void {
    if (!this.canTransition(to)) {
      throw new Error(`Invalid transition from ${this.currentState} to ${to}`)
    }
    this.currentState = to
  }
}
```

### Task State Machine

```typescript
class TaskStateMachine {
  private currentState: TaskStatus
  
  transitions = {
    pending: ['queued', 'cancelled'],
    queued: ['running', 'cancelled'],
    running: ['paused', 'completed', 'failed'],
    paused: ['running', 'cancelled'],
    completed: [],
    failed: ['pending'], // Allow retry
    cancelled: []
  }
  
  canTransition(to: TaskStatus): boolean {
    return this.transitions[this.currentState]?.includes(to) ?? false
  }
  
  transition(to: TaskStatus): void {
    if (!this.canTransition(to)) {
      throw new Error(`Invalid transition from ${this.currentState} to ${to}`)
    }
    this.currentState = to
  }
}
```

## Data Persistence

### Repository Interfaces

```typescript
interface Repository<T> {
  findById(id: string): Promise<T | null>
  findAll(filter?: Partial<T>): Promise<T[]>
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>
  update(id: string, data: Partial<T>): Promise<T>
  delete(id: string): Promise<boolean>
  exists(id: string): Promise<boolean>
}

interface AccountRepository extends Repository<Account> {
  findByPhone(phone: string): Promise<Account | null>
  findByUsername(username: string): Promise<Account | null>
  findByStatus(status: AccountStatus): Promise<Account[]>
  updateStatus(id: string, status: AccountStatus): Promise<void>
}

interface MessageRepository extends Repository<Message> {
  findByChatId(chatId: string): Promise<Message[]>
  findUnread(accountId: string): Promise<Message[]>
  markAsRead(ids: string[]): Promise<void>
  searchByContent(query: string): Promise<Message[]>
}

interface RuleRepository extends Repository<Rule> {
  findEnabled(accountId?: string): Promise<Rule[]>
  findByPriority(minPriority: number): Promise<Rule[]>
  incrementTriggerCount(id: string): Promise<void>
}
```

## Indexes and Performance

### Database Indexes

```sql
-- Account indexes
CREATE INDEX idx_account_status ON accounts(status);
CREATE INDEX idx_account_phone ON accounts(phone);
CREATE UNIQUE INDEX idx_account_username ON accounts(username);

-- Message indexes
CREATE INDEX idx_message_account_chat ON messages(account_id, chat_id);
CREATE INDEX idx_message_timestamp ON messages(timestamp);
CREATE INDEX idx_message_unread ON messages(account_id, is_read);
CREATE FULLTEXT INDEX idx_message_content ON messages(content);

-- Rule indexes
CREATE INDEX idx_rule_account ON rules(account_id);
CREATE INDEX idx_rule_enabled_priority ON rules(enabled, priority);

-- Contact indexes
CREATE INDEX idx_contact_account ON contacts(account_id);
CREATE INDEX idx_contact_telegram_id ON contacts(telegram_id);
CREATE INDEX idx_contact_relationship ON contacts(relationship);

-- Session indexes
CREATE INDEX idx_session_account ON sessions(account_id);
CREATE INDEX idx_session_unread ON sessions(account_id, unread_count);
CREATE INDEX idx_session_last_activity ON sessions(last_activity);

-- Translation indexes
CREATE INDEX idx_translation_message ON translations(message_id);
CREATE INDEX idx_translation_hash ON translations(
  HASH(original_text, source_lang, target_lang)
);

-- Task indexes
CREATE INDEX idx_task_status ON tasks(status);
CREATE INDEX idx_task_scheduled ON tasks(scheduled_at);
```

## Data Migration Strategy

### Version Control

```typescript
interface Migration {
  version: string
  up(): Promise<void>
  down(): Promise<void>
}

class MigrationRunner {
  async run(migrations: Migration[]): Promise<void> {
    const currentVersion = await this.getCurrentVersion()
    const pending = migrations.filter(m => m.version > currentVersion)
    
    for (const migration of pending) {
      await migration.up()
      await this.saveVersion(migration.version)
    }
  }
}
```

## Data Security

### Encryption

- **Session Data**: 使用 Electron safeStorage API 加密
- **Passwords/Tokens**: 使用 bcrypt/argon2 哈希
- **Sensitive Fields**: AES-256-GCM 加密

### Access Control

```typescript
interface DataAccessControl {
  canRead(userId: string, entity: any): boolean
  canWrite(userId: string, entity: any): boolean
  canDelete(userId: string, entity: any): boolean
}

class AccountDataAccess implements DataAccessControl {
  canRead(userId: string, account: Account): boolean {
    return account.id === userId || this.isAdmin(userId)
  }
  
  canWrite(userId: string, account: Account): boolean {
    return account.id === userId
  }
  
  canDelete(userId: string, account: Account): boolean {
    return account.id === userId
  }
}
```

## Conclusion

本数据模型设计提供了完整的实体定义、关系映射、验证规则和状态管理方案。通过 TypeScript 类型系统和 Zod 运行时验证确保数据完整性，Repository 模式提供清晰的数据访问接口，状态机管理复杂的状态转换逻辑。所有设计都考虑了性能优化、数据安全和未来扩展性。
