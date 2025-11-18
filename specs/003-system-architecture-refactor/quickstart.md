# Quick Start Guide: TeleFlow Desktop

**Version**: 1.0.0  
**Last Updated**: 2025-11-18

## Prerequisites

### System Requirements

- **OS**: Windows 10+ (64-bit)
- **RAM**: 最少 4GB，推荐 8GB
- **Storage**: 500MB 可用空间
- **Network**: 稳定的互联网连接

### Development Environment

- **Node.js**: v20.0.0 或更高版本
- **npm/pnpm**: 最新版本
- **Git**: 用于版本控制
- **VS Code**: 推荐的 IDE

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/your-org/teleflow-desktop.git
cd teleflow-desktop
```

### 2. Install Dependencies

```bash
# 使用 pnpm (推荐)
pnpm install

# 或使用 npm
npm install
```

### 3. Environment Setup

创建 `.env` 文件：

```env
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_PATH=./data/teleflow.db
DATABASE_BACKUP_PATH=./data/backups

# Translation APIs (optional)
GOOGLE_TRANSLATE_API_KEY=your_key_here
DEEPL_API_KEY=your_key_here
BAIDU_APP_ID=your_app_id
BAIDU_SECRET_KEY=your_secret_key

# Logging
LOG_LEVEL=debug
LOG_PATH=./logs

# Security
ENCRYPTION_KEY=generate_a_secure_key_here
```

### 4. Database Initialization

```bash
# Run migrations
npm run db:migrate

# Seed with sample data (optional)
npm run db:seed
```

## Development

### Start Development Server

```bash
# Start both electron and react dev servers
npm run dev

# Or start them separately
npm run dev:electron  # Terminal 1
npm run dev:react     # Terminal 2
```

### Project Structure Overview

```
teleflow-desktop/
├── electron/          # Main process (backend)
├── src/              # Renderer process (frontend)
├── shared/           # Shared code between processes
├── database/         # Database schemas and migrations
├── engines/          # Core business logic engines
└── config/           # Configuration files
```

## First Run

### 1. Launch Application

启动应用后，您将看到欢迎界面：

```typescript
// 应用会自动创建必要的目录和数据库
const initApp = async () => {
  await createDataDirectories()
  await initializeDatabase()
  await loadConfiguration()
  showWelcomeWindow()
}
```

### 2. Add First Account

点击 "添加账号" 按钮：

1. 输入账号名称（用于标识）
2. 点击 "连接 Telegram"
3. 在弹出的浏览器窗口中登录 Telegram Web
4. 完成验证后，账号会自动保存

### 3. Configure First Rule

创建简单的自动回复规则：

```yaml
# config/rules.yaml 示例
rules:
  - name: "欢迎消息"
    enabled: true
    conditions:
      - type: keyword
        value: ["你好", "hello", "hi"]
        caseSensitive: false
    actions:
      - type: reply
        params:
          text: "您好！有什么可以帮助您的吗？"
          delay: 2000        # 延迟 2 秒
          randomDelay: 3000  # 额外随机延迟 0-3 秒
```

### 4. Test Basic Features

测试核心功能：

- **消息接收**: 发送测试消息到配置的账号
- **自动回复**: 发送包含关键词的消息
- **翻译功能**: 发送外语消息测试翻译
- **会话管理**: 查看会话列表和未读计数

## Configuration

### Basic Configuration

```yaml
# config/default.yaml
app:
  name: TeleFlow Desktop
  version: 1.0.0
  language: zh-CN
  theme: light

account:
  maxAccounts: 10
  sessionTimeout: 86400  # 24 hours
  autoReconnect: true

message:
  maxHistoryDays: 30
  batchSize: 50
  processingDelay: 100

translation:
  defaultEngine: google
  targetLanguage: zh-CN
  cacheEnabled: true
  cacheTTL: 604800  # 7 days

automation:
  maxRules: 100
  maxActionsPerRule: 10
  defaultDelay: 1000
  maxDelay: 60000
```

### Advanced Configuration

```yaml
# 性能优化配置
performance:
  messageQueueSize: 1000
  workerThreads: 4
  dbConnectionPool: 5
  cacheSize: 100MB

# 安全配置
security:
  encryptionEnabled: true
  encryptionAlgorithm: aes-256-gcm
  sessionValidation: true
  maxLoginAttempts: 5

# 日志配置
logging:
  level: info
  maxFiles: 30
  maxSize: 10MB
  compress: true
```

## API Usage Examples

### Account Management

```typescript
// Create account
const account = await ipcRenderer.invoke('account:create', {
  name: 'My Account',
  phone: '+1234567890'
})

// List accounts
const accounts = await ipcRenderer.invoke('account:list')

// Switch account
await ipcRenderer.invoke('account:switch', accountId)
```

### Message Operations

```typescript
// Send message
const message = await ipcRenderer.invoke('message:send', {
  accountId,
  chatId,
  content: 'Hello, world!',
  translate: true,
  targetLanguage: 'en'
})

// Get messages
const messages = await ipcRenderer.invoke('message:list', {
  accountId,
  chatId,
  limit: 50
})

// Translate message
const translation = await ipcRenderer.invoke('message:translate', {
  text: '你好世界',
  targetLang: 'en'
})
```

### Rule Management

```typescript
// Create rule
const rule = await ipcRenderer.invoke('rule:create', {
  name: 'Auto Reply',
  conditions: [{
    type: 'keyword',
    operator: 'contains',
    value: 'help'
  }],
  actions: [{
    type: 'reply',
    params: {
      text: 'How can I help you?'
    }
  }]
})

// Toggle rule
await ipcRenderer.invoke('rule:toggle', {
  ruleId,
  enabled: true
})
```

## Testing

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run with coverage
npm run test:coverage

# Run specific test file
npm run test:unit -- AccountManager.test.ts
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration

# Test specific module
npm run test:integration -- --grep "Translation"
```

### E2E Tests

```bash
# Run E2E tests (requires built app)
npm run build
npm run test:e2e

# Run in headed mode for debugging
npm run test:e2e -- --headed
```

## Building & Distribution

### Build for Production

```bash
# Build for current platform
npm run build

# Build for specific platform
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

### Package Application

```bash
# Create installer
npm run dist

# Output will be in dist/ directory:
# - Windows: TeleFlow-Desktop-Setup-1.0.0.exe
# - macOS: TeleFlow-Desktop-1.0.0.dmg
# - Linux: TeleFlow-Desktop-1.0.0.AppImage
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Error

```bash
# Reset database
npm run db:reset

# Check database integrity
npm run db:check
```

#### 2. Account Session Expired

```javascript
// Force reconnect
await accountManager.reconnect(accountId)

// Clear session and re-login
await accountManager.clearSession(accountId)
await accountManager.login(accountId)
```

#### 3. Translation API Errors

```javascript
// Check API status
const status = await translationManager.checkEngineStatus('google')

// Switch to backup engine
translationManager.setPreferredEngine('deepl')
```

#### 4. High Memory Usage

```javascript
// Clear caches
await cacheManager.clear()

// Reduce message history
await messageRepository.pruneOldMessages(30) // Keep 30 days
```

### Debug Mode

启用调试模式获取详细日志：

```bash
# Windows
set DEBUG=teleflow:* && npm run dev

# macOS/Linux
DEBUG=teleflow:* npm run dev
```

### Log Files Location

- Windows: `%APPDATA%/teleflow-desktop/logs/`
- macOS: `~/Library/Logs/teleflow-desktop/`
- Linux: `~/.config/teleflow-desktop/logs/`

## Performance Optimization

### 1. Database Optimization

```sql
-- Create indexes for better query performance
CREATE INDEX idx_messages_chat ON messages(account_id, chat_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX idx_rules_priority ON rules(enabled, priority DESC);
```

### 2. Memory Management

```javascript
// Enable garbage collection monitoring
if (process.env.NODE_ENV === 'development') {
  require('v8').setFlagsFromString('--expose-gc')
  global.gc()
}

// Set memory limits
app.commandLine.appendSwitch('--max-old-space-size', '2048')
```

### 3. Message Processing Optimization

```javascript
// Use batch processing
const batchProcessor = new BatchProcessor({
  batchSize: 100,
  flushInterval: 1000,
  processor: async (messages) => {
    await processMessages(messages)
  }
})
```

## Security Best Practices

### 1. Credential Storage

```javascript
// Use Electron's safeStorage API
const { safeStorage } = require('electron')

// Encrypt sensitive data
const encrypted = safeStorage.encryptString('sensitive-data')
const decrypted = safeStorage.decryptString(encrypted)
```

### 2. Content Security Policy

```html
<!-- In index.html -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self'; 
               style-src 'self' 'unsafe-inline';">
```

### 3. IPC Security

```javascript
// Main process: validate all IPC inputs
ipcMain.handle('account:create', async (event, data) => {
  // Validate input
  const validated = await accountSchema.parseAsync(data)
  
  // Check permissions
  if (!canCreateAccount(event.sender)) {
    throw new Error('Permission denied')
  }
  
  return await createAccount(validated)
})
```

## Getting Help

### Resources

- **Documentation**: [https://docs.teleflow.dev](https://docs.teleflow.dev)
- **API Reference**: [https://api.teleflow.dev](https://api.teleflow.dev)
- **GitHub Issues**: [https://github.com/your-org/teleflow-desktop/issues](https://github.com/your-org/teleflow-desktop/issues)
- **Discord Community**: [https://discord.gg/teleflow](https://discord.gg/teleflow)

### Support Channels

- **Email**: support@teleflow.dev
- **Forum**: [https://forum.teleflow.dev](https://forum.teleflow.dev)
- **Stack Overflow**: Tag questions with `teleflow-desktop`

## Contributing

We welcome contributions! See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

## License

TeleFlow Desktop is licensed under the MIT License. See [LICENSE](../../LICENSE) for details.

---

**Happy automating with TeleFlow Desktop! 🚀**
