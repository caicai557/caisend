# Teleflow 配置文件参考

## 配置文件格式

Teleflow 使用 YAML 格式的配置文件，支持以下顶层字段：

```yaml
version: "1.0"
accounts: [...]
default_account: "primary"
global_rules: [...]
logging: {...}
browser: {...}
runtime: {...}
description: "可选描述"
```

## 顶层配置

### version

- **类型**: `string`
- **必填**: 否
- **默认值**: `"1.0"`
- **说明**: 配置文件版本号

### accounts

- **类型**: `list[Account]`
- **必填**: 是
- **说明**: 账号配置列表，至少需要一个账号

### default_account

- **类型**: `string`
- **必填**: 否
- **说明**: 默认账号名称，必须存在于 `accounts` 列表中

### global_rules

- **类型**: `list[Rule]`
- **必填**: 否
- **默认值**: `[]`
- **说明**: 全局规则列表，可被账号特定规则覆盖

### description

- **类型**: `string`
- **必填**: 否
- **说明**: 配置文件描述信息

## Account（账号配置）

```yaml
accounts:
  - name: "primary"
    browser_data_dir: "./browser_data/primary"
    monitor_chats:
      - "@friend"
    rules: [...]
    group_invites: [...]
```

### name

- **类型**: `string`
- **必填**: 是
- **约束**: 唯一，长度 1-50 字符
- **说明**: 账号名称

### browser_data_dir

- **类型**: `string` (路径)
- **必填**: 否
- **默认值**: `./browser_data/{name}`
- **说明**: 浏览器数据目录，用于保存会话

### monitor_chats

- **类型**: `list[string]`
- **必填**: 否
- **默认值**: `[]`
- **说明**: 监控的聊天列表（用户名或聊天 ID）

### rules

- **类型**: `list[Rule]`
- **必填**: 否
- **默认值**: `[]`
- **说明**: 账号特定规则列表

### group_invites

- **类型**: `list[string | GroupInvite]`
- **必填**: 否
- **默认值**: `[]`
- **说明**: 群组邀请链接列表（v1.1+ 功能）

## Rule（规则配置）

```yaml
rules:
  - keywords:
      - "hello"
      - "*meeting*"
    reply_text: "Hello! How are you?"
    fixed_delay: 2
    random_delay_max: 3
    case_sensitive: false
    enabled: true
    description: "问候语回复"
```

### keywords

- **类型**: `list[string]`
- **必填**: 是
- **约束**: 至少一个关键词
- **说明**: 关键词列表，支持通配符（`*`、`?`）

### reply_text

- **类型**: `string`
- **必填**: 是
- **说明**: 回复文本，支持模板变量（如 `{ocr_result}`）

### fixed_delay

- **类型**: `number`
- **必填**: 否
- **默认值**: `0`
- **约束**: `>= 0`
- **说明**: 固定延时（秒）

### random_delay_max

- **类型**: `number`
- **必填**: 否
- **默认值**: `0`
- **约束**: `>= 0`
- **说明**: 随机延时上限（秒），实际延时为 `[0, random_delay_max]`

### case_sensitive

- **类型**: `boolean`
- **必填**: 否
- **默认值**: `false`
- **说明**: 是否区分大小写

### enabled

- **类型**: `boolean`
- **必填**: 否
- **默认值**: `true`
- **说明**: 是否启用该规则

### use_regex

- **类型**: `boolean`
- **必填**: 否
- **默认值**: `false`
- **说明**: 是否使用正则表达式（v1.3+ 功能，当前版本保留字段）

### next_id

- **类型**: `string`
- **必填**: 否
- **说明**: 下一个规则 ID（状态机功能，v2.0+ 保留字段）

### description (规则)

- **类型**: `string`
- **必填**: 否
- **说明**: 规则描述信息

## GroupInvite（群组邀请）

```yaml
group_invites:
  - url: "https://t.me/+xxxxx"
    welcome_message: "Hello everyone!"
    auto_join: true
```

### url

- **类型**: `string`
- **必填**: 是
- **格式**: Telegram 群组邀请链接
- **说明**: 群组邀请链接

### welcome_message

- **类型**: `string`
- **必填**: 否
- **说明**: 加入群组后发送的欢迎消息

### auto_join

- **类型**: `boolean`
- **必填**: 否
- **默认值**: `true`
- **说明**: 是否自动加入群组

## Logging（日志配置）

```yaml
logging:
  level: "INFO"
  file: "./logs/teleflow.log"
  max_bytes: 10485760
  backup_count: 5
```

### level

- **类型**: `string`
- **必填**: 否
- **默认值**: `"INFO"`
- **可选值**: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`
- **说明**: 日志级别

### file

- **类型**: `string` (路径)
- **必填**: 否
- **默认值**: `"./logs/teleflow.log"`
- **说明**: 日志文件路径

### max_bytes

- **类型**: `integer`
- **必填**: 否
- **默认值**: `10485760` (10MB)
- **说明**: 单个日志文件最大大小（字节）

### backup_count

- **类型**: `integer`
- **必填**: 否
- **默认值**: `5`
- **说明**: 保留的日志文件备份数量

## Browser（浏览器配置）

```yaml
browser:
  headless: true
  timeout: 30
  user_agent: null
```

### headless

- **类型**: `boolean`
- **必填**: 否
- **默认值**: `true`
- **说明**: 是否使用无头模式

### timeout

- **类型**: `number`
- **必填**: 否
- **默认值**: `30`
- **约束**: `> 0`
- **说明**: 页面操作超时时间（秒）

### user_agent

- **类型**: `string`
- **必填**: 否
- **默认值**: `null` (使用默认 User-Agent)
- **说明**: 自定义 User-Agent

## Runtime（运行时配置）

```yaml
runtime:
  check_interval: 2.0
  debug: false
  random_seed: null
```

### check_interval

- **类型**: `number`
- **必填**: 否
- **默认值**: `2.0`
- **约束**: `> 0`
- **说明**: 消息检查间隔（秒）

### debug

- **类型**: `boolean`
- **必填**: 否
- **默认值**: `false`
- **说明**: 是否启用调试模式

### random_seed

- **类型**: `integer`
- **必填**: 否
- **默认值**: `null`
- **说明**: 随机种子，用于测试和可重现的延时计算

## 完整配置示例

```yaml
version: "1.0"
description: "Teleflow 生产环境配置"

accounts:
  - name: primary
    browser_data_dir: ./browser_data/primary
    monitor_chats:
      - "@friend1"
      - "@friend2"
    rules:
      - keywords:
          - "hello"
          - "hi"
        reply_text: "Hello! How are you?"
        fixed_delay: 2
        random_delay_max: 3
        case_sensitive: false
        enabled: true
        description: "问候语回复"
      
      - keywords:
          - "*meeting*"
        reply_text: "I'll join the meeting soon."
        fixed_delay: 1
        random_delay_max: 2
        case_sensitive: false
        enabled: true
        description: "会议相关回复"
    
    group_invites:
      - url: "https://t.me/+xxxxx"
        welcome_message: "Hello everyone!"
        auto_join: true

default_account: primary

global_rules:
  - keywords:
      - "urgent"
    reply_text: "I'll respond ASAP!"
    fixed_delay: 0
    random_delay_max: 1

logging:
  level: INFO
  file: ./logs/teleflow.log
  max_bytes: 10485760
  backup_count: 5

browser:
  headless: true
  timeout: 30

runtime:
  check_interval: 2.0
  debug: false
```

## 配置验证

使用以下命令验证配置文件：

```bash
teleflow validate-config --config config.yaml
```

## 配置最佳实践

1. **安全性**：不要在配置文件中存储敏感信息（如密码、API 密钥）
2. **备份**：定期备份 `browser_data/` 目录以保存会话
3. **延时设置**：建议 `fixed_delay >= 1` 以避免被检测为机器人
4. **监控范围**：避免监控过多聊天，建议每个账号不超过 10 个
5. **规则优先级**：规则按列表顺序匹配，将高优先级规则放在前面
6. **日志级别**：生产环境使用 `INFO`，调试时使用 `DEBUG`

## 常见配置错误

### 错误 1：账号名称重复

```yaml
accounts:
  - name: primary  # ❌ 重复
  - name: primary  # ❌ 重复
```

### 错误 2：default_account 不存在

```yaml
accounts:
  - name: account1
default_account: account2  # ❌ account2 不存在
```

### 错误 3：规则缺少必填字段

```yaml
rules:
  - keywords: ["hello"]
    # ❌ 缺少 reply_text
```

### 错误 4：延时为负数

```yaml
rules:
  - keywords: ["hello"]
    reply_text: "Hi"
    fixed_delay: -1  # ❌ 不能为负数
```

## 更多资源

- [用户使用手册](user-guide.md)
- [开发者指南](development.md)
