/**
 * 规则相关类型定义
 * 用于自动回复规则配置
 */

// 触发类型
export enum TriggerType {
  KEYWORD = 'keyword',      // 关键词匹配
  REGEX = 'regex',          // 正则表达式
  ALL = 'all',              // 所有消息
  MENTION = 'mention',      // @提及
  PRIVATE = 'private',      // 私聊
  GROUP = 'group'           // 群聊
}

// 响应类型
export enum ResponseType {
  TEXT = 'text',            // 文本回复
  IMAGE = 'image',          // 图片回复
  FILE = 'file',            // 文件回复
  FORWARD = 'forward',      // 转发消息
  IGNORE = 'ignore'         // 忽略消息
}

// 匹配模式
export enum MatchMode {
  EXACT = 'exact',          // 精确匹配
  CONTAINS = 'contains',    // 包含
  STARTS_WITH = 'starts',   // 开头匹配
  ENDS_WITH = 'ends',       // 结尾匹配
  REGEX = 'regex'           // 正则表达式
}

// 规则接口
export interface Rule {
  id: string
  name: string
  enabled: boolean
  priority: number
  
  // 触发条件
  trigger: {
    type: TriggerType
    pattern?: string        // 匹配模式（关键词或正则）
    matchMode?: MatchMode   // 匹配模式
    caseSensitive?: boolean // 大小写敏感
  }
  
  // 响应动作
  response: {
    type: ResponseType
    content?: string        // 回复内容
    delay?: number          // 延迟回复（毫秒）
    template?: string       // 模板变量
    filePath?: string       // 文件路径
  }
  
  // 限制条件
  limits?: {
    maxPerDay?: number      // 每日最大触发次数
    maxPerHour?: number     // 每小时最大触发次数
    cooldown?: number       // 冷却时间（秒）
    timeRange?: {           // 时间范围
      start: string         // HH:mm
      end: string           // HH:mm
    }
  }
  
  // 统计信息
  stats: {
    totalTriggers: number   // 总触发次数
    todayTriggers: number   // 今日触发次数
    lastTriggered?: string  // 最后触发时间
  }
  
  createdAt: string
  updatedAt: string
}

// 聊天配置
export interface ChatConfig {
  id: string
  name: string              // 聊天名称
  type: 'private' | 'group' // 聊天类型
  enabled: boolean          // 是否启用
  rules: string[]           // 关联的规则 ID 列表
  priority: number          // 优先级
}

// 规则创建/更新参数
export interface RuleFormData {
  name: string
  enabled: boolean
  priority: number
  trigger: Rule['trigger']
  response: Rule['response']
  limits?: Rule['limits']
}

// 变量替换映射
export interface VariableMap {
  sender: string            // 发送者名称
  message: string           // 原始消息
  time: string              // 当前时间
  date: string              // 当前日期
  chatName: string          // 聊天名称
  [key: string]: string     // 自定义变量
}

// 规则执行结果
export interface RuleExecutionResult {
  ruleId: string
  matched: boolean
  response?: string
  action: ResponseType
  timestamp: string
  error?: string
}

// 规则测试参数
export interface RuleTestParams {
  ruleId: string
  testMessage: string
  variables?: Partial<VariableMap>
}
