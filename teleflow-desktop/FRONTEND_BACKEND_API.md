# 前后端 API 接口文档

## 📡 IPC 通信协议

### 基础约定

- 所有 IPC 调用使用 `channel:action` 格式
- 请求参数统一使用对象格式
- 响应统一包含 `success` 和 `error` 字段

---

## 🔐 账号管理 API

### 1. 获取账号列表

**Channel**: `account:list`

**请求**: 无参数

**响应**:
```typescript
{
  success: boolean
  accounts: Account[]
  error?: string
}
```

### 2. 获取单个账号

**Channel**: `account:get`

**请求**:
```typescript
{
  accountId: string
}
```

**响应**:
```typescript
{
  success: boolean
  account: Account
  error?: string
}
```

### 3. 创建账号

**Channel**: `account:create`

**请求**:
```typescript
{
  name: string
  phone: string
  config: AccountConfig
}
```

**响应**:
```typescript
{
  success: boolean
  account: Account
  error?: string
}
```

### 4. 更新账号

**Channel**: `account:update`

**请求**:
```typescript
{
  accountId: string
  name?: string
  phone?: string
  enabled?: boolean
  config?: Partial<AccountConfig>
}
```

**响应**:
```typescript
{
  success: boolean
  account: Account
  error?: string
}
```

### 5. 删除账号

**Channel**: `account:delete`

**请求**:
```typescript
{
  accountId: string
}
```

**响应**:
```typescript
{
  success: boolean
  error?: string
}
```

### 6. 启动账号

**Channel**: `account:start`

**请求**:
```typescript
{
  accountId: string
}
```

**响应**:
```typescript
{
  success: boolean
  error?: string
}
```

### 7. 停止账号

**Channel**: `account:stop`

**请求**:
```typescript
{
  accountId: string
}
```

**响应**:
```typescript
{
  success: boolean
  error?: string
}
```

### 8. 账号状态变化事件

**Channel**: `account:status-changed`

**数据**:
```typescript
{
  accountId: string
  status: AccountStatus
  timestamp: string
}
```

---

## 📋 规则管理 API

### 1. 获取规则列表

**Channel**: `rule:list`

**请求**:
```typescript
{
  accountId: string
}
```

**响应**:
```typescript
{
  success: boolean
  rules: Rule[]
  error?: string
}
```

### 2. 创建规则

**Channel**: `rule:create`

**请求**:
```typescript
{
  accountId: string
  name: string
  enabled: boolean
  priority: number
  trigger: {
    type: TriggerType
    pattern?: string
    matchMode?: MatchMode
    caseSensitive?: boolean
  }
  response: {
    type: ResponseType
    content?: string
    delay?: number
  }
  limits?: {
    maxPerDay?: number
    cooldown?: number
  }
}
```

**响应**:
```typescript
{
  success: boolean
  rule: Rule
  error?: string
}
```

### 3. 更新规则

**Channel**: `rule:update`

**请求**:
```typescript
{
  ruleId: string
  // ... 可选的规则字段
}
```

**响应**:
```typescript
{
  success: boolean
  rule: Rule
  error?: string
}
```

### 4. 删除规则

**Channel**: `rule:delete`

**请求**:
```typescript
{
  ruleId: string
}
```

**响应**:
```typescript
{
  success: boolean
  error?: string
}
```

### 5. 切换规则状态

**Channel**: `rule:toggle`

**请求**:
```typescript
{
  ruleId: string
  enabled: boolean
}
```

**响应**:
```typescript
{
  success: boolean
  rule: Rule
  error?: string
}
```

### 6. 测试规则

**Channel**: `rule:test`

**请求**:
```typescript
{
  ruleId: string
  testMessage: string
  variables?: Partial<VariableMap>
}
```

**响应**:
```typescript
{
  success: boolean
  result: RuleExecutionResult
  error?: string
}
```

### 7. 规则触发事件

**Channel**: `rule:triggered`

**数据**:
```typescript
{
  ruleId: string
  matched: boolean
  response?: string
  action: ResponseType
  timestamp: string
}
```

---

## 📝 日志管理 API

### 1. 查询日志

**Channel**: `log:query`

**请求**:
```typescript
{
  accountIds?: string[]
  levels?: LogLevel[]
  startTime?: string
  endTime?: string
  keyword?: string
  page?: number
  pageSize?: number
}
```

**响应**:
```typescript
{
  success: boolean
  data: {
    logs: LogEntry[]
    total: number
    page: number
    pageSize: number
  }
  error?: string
}
```

### 2. 导出日志

**Channel**: `log:export`

**请求**:
```typescript
{
  accountIds?: string[]
  levels?: LogLevel[]
  startTime?: string
  endTime?: string
  format: 'json' | 'csv' | 'txt'
  outputPath?: string
}
```

**响应**:
```typescript
{
  success: boolean
  filePath: string
  error?: string
}
```

### 3. 清理日志

**Channel**: `log:clear`

**请求**:
```typescript
{
  accountIds?: string[]
  beforeDate?: string
}
```

**响应**:
```typescript
{
  success: boolean
  deletedCount: number
  error?: string
}
```

### 4. 新日志事件

**Channel**: `log:new`

**数据**:
```typescript
{
  log: LogEntry
}
```

---

## ⚙️ 配置管理 API

### 1. 获取配置

**Channel**: `config:get`

**请求**: 无参数

**响应**:
```typescript
{
  success: boolean
  config: SystemConfig
  error?: string
}
```

### 2. 更新配置

**Channel**: `config:update`

**请求**:
```typescript
{
  global?: Partial<GlobalSettings>
  playwright?: Partial<PlaywrightConfig>
  backend?: Partial<BackendConfig>
}
```

**响应**:
```typescript
{
  success: boolean
  config: SystemConfig
  error?: string
}
```

### 3. 重置配置

**Channel**: `config:reset`

**请求**: 无参数

**响应**:
```typescript
{
  success: boolean
  config: SystemConfig
  error?: string
}
```

### 4. 打开路径

**Channel**: `system:openPath`

**请求**:
```typescript
{
  path: string
}
```

**响应**:
```typescript
{
  success: boolean
  error?: string
}
```

---

## 📊 仪表盘数据 API

### 1. 获取仪表盘数据

**Channel**: `dashboard:getData`

**请求**: 无参数

**响应**:
```typescript
{
  success: boolean
  data: {
    metrics: DashboardMetrics
    activities: ActivityTimelineItem[]
  }
  error?: string
}
```

### 2. 仪表盘数据更新事件

**Channel**: `dashboard:updated`

**数据**:
```typescript
{
  metrics: DashboardMetrics
  timestamp: string
}
```

---

## 🔄 实时事件

### 账号相关
- `account:status-changed` - 账号状态变化
- `account:stats-updated` - 账号统计更新

### 规则相关
- `rule:triggered` - 规则触发
- `rule:error` - 规则执行错误

### 日志相关
- `log:new` - 新日志产生

### 系统相关
- `system:error` - 系统错误
- `dashboard:updated` - 仪表盘数据更新

---

## 🛠️ 实现建议

### 后端实现要点

1. **IPC 处理器注册**
```typescript
// electron/main.ts
ipcMain.handle('account:list', async () => {
  try {
    const accounts = await accountManager.getAll()
    return { success: true, accounts }
  } catch (error) {
    return { success: false, error: error.message }
  }
})
```

2. **事件发送**
```typescript
// 状态变化时
mainWindow.webContents.send('account:status-changed', {
  accountId,
  status,
  timestamp: new Date().toISOString()
})
```

3. **错误处理**
- 统一错误格式
- 详细错误信息
- 错误日志记录

### 前端实现要点

1. **服务层封装**
- 已实现：`accountService`, `logService`, `configService`, `ruleService`
- 统一错误处理
- 类型安全

2. **事件监听**
```typescript
// 组件挂载时
useEffect(() => {
  const unsubscribe = accountService.onStatusChanged((data) => {
    // 更新状态
  })
  return unsubscribe
}, [])
```

3. **状态管理**
- 使用 Zustand stores
- 响应式更新
- 持久化配置

---

## 📦 数据持久化

### 建议方案

1. **配置文件**: `config/config.yaml`
2. **账号数据**: `data/accounts/*.json`
3. **规则数据**: `data/accounts/{accountId}/rules.json`
4. **日志文件**: `logs/*.log`

### 文件结构
```
项目根目录/
├── config/
│   └── config.yaml
├── data/
│   └── accounts/
│       ├── account-1/
│       │   ├── profile/
│       │   ├── rules.json
│       │   └── stats.json
│       └── account-2/
│           └── ...
└── logs/
    ├── system.log
    ├── account-1.log
    └── account-2.log
```

---

## 🔐 安全考虑

1. **敏感数据加密**
   - 账号密码
   - API 密钥
   - 会话 Cookie

2. **路径验证**
   - 防止路径遍历
   - 验证文件权限

3. **输入验证**
   - 参数类型检查
   - 正则表达式验证
   - SQL 注入防护

---

## 🚀 集成步骤

### Phase 5: 后端 IPC 实现

1. ✅ 创建 IPC 处理器
2. ✅ 实现账号管理逻辑
3. ✅ 实现规则引擎
4. ✅ 实现日志系统
5. ✅ 实现配置管理

### Phase 6: 前后端联调

1. ⏳ 测试账号 CRUD
2. ⏳ 测试规则匹配
3. ⏳ 测试日志记录
4. ⏳ 测试实时事件
5. ⏳ 性能优化

### Phase 7: 完善功能

1. ⏳ 错误处理完善
2. ⏳ 加载状态优化
3. ⏳ 离线支持
4. ⏳ 数据备份恢复

---

**注意**: 本文档定义了前后端通信的完整接口规范，请严格按照此规范实现。
