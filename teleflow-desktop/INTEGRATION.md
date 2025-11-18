# Teleflow Desktop - 后端集成指南

**版本**: v1.0  
**更新时间**: 2025-11-17

---

## 📋 概述

Teleflow Desktop 是 Telegram Web 助手的桌面管理界面，通过 Electron 与 Python 后端进程通信。

### 架构

```
┌─────────────────────┐
│  Teleflow Desktop   │  ← Electron + React 前端
│   (本项目)          │
└──────────┬──────────┘
           │ IPC 通信
           ↓
┌─────────────────────┐
│  Teleflow Backend   │  ← Python 后端进程
│  (teleflow.cli)     │
└─────────────────────┘
           ↓
┌─────────────────────┐
│  Telegram Web       │  ← Playwright 自动化
│  (telegram.org)     │
└─────────────────────┘
```

---

## 🚀 快速开始

### 1. 前提条件

```bash
# Python 环境 (后端)
python >= 3.11
pip install -r requirements.txt

# Node.js 环境 (前端)
node >= 18.0.0
npm install
```

### 2. 启动开发模式

```bash
# 终端 1: 启动前端开发服务器
cd teleflow-desktop
npm run dev

# 前端会自动启动，并能够调用后端进程
```

### 3. 打包应用

```bash
# 打包 Electron 应用
npm run build
npm run electron:build
```

---

## 🔌 IPC 接口说明

### 前端调用后端

#### 1. **获取配置** `getConfig`

```typescript
const result = await window.electron.getConfig(configPath?)
// 返回: { success: boolean, config?: any, error?: string }
```

#### 2. **保存配置** `saveConfig`

```typescript
const result = await window.electron.saveConfig(config, configPath?)
// 返回: { success: boolean, path?: string, error?: string }
```

#### 3. **验证配置** `validateConfig`

```typescript
const result = await window.electron.validateConfig(configPath?)
// 返回: { success: boolean, message?: string, error?: string }
```

#### 4. **启动账号** `startAccount`

```typescript
const result = await window.electron.startAccount(accountName, configPath?)
// 返回: { success: boolean, pid?: number, error?: string }
```

#### 5. **停止账号** `stopAccount`

```typescript
const result = await window.electron.stopAccount(accountName)
// 返回: { success: boolean, message?: string, error?: string }
```

#### 6. **查询账号状态** `getAccountStatus`

```typescript
const status = await window.electron.getAccountStatus(accountName)
// 返回: { 
//   running: boolean, 
//   status: 'starting' | 'running' | 'stopping' | 'stopped',
//   pid?: number,
//   startTime?: Date,
//   configPath?: string
// }
```

### 后端推送事件

#### 1. **日志更新** `onLogUpdate`

```typescript
const cleanup = window.electron.onLogUpdate((log) => {
  console.log(log.message)
  // log: {
  //   account: string,
  //   message: string,
  //   timestamp: string,
  //   level: 'info' | 'error' | 'warning'
  // }
})

// 组件卸载时清理
useEffect(() => {
  return cleanup
}, [])
```

#### 2. **账号状态变化** `onAccountStatusChanged`

```typescript
const cleanup = window.electron.onAccountStatusChanged((status) => {
  console.log(`账号 ${status.account} 状态: ${status.status}`)
  // status: {
  //   account: string,
  //   status: 'running' | 'stopped',
  //   pid?: number,
  //   exitCode?: number,
  //   signal?: string
  // }
})
```

---

## 📝 配置文件格式

### 示例 `config.yaml`

```yaml
accounts:
  - name: my-account
    browser_data_dir: ./browser_data/my-account
    monitor_chats:
      - Saved Messages
      - @username
    rules:
      - keywords:
          - hello
          - hi
        reply_text: "你好！很高兴见到你。"
        fixed_delay_seconds: 3
        random_delay_max_seconds: 5
        case_sensitive: false
      
      - keywords:
          - help
          - 帮助
        reply_text: "我可以帮你什么？"
        fixed_delay_seconds: 2
        random_delay_max_seconds: 3

  - name: test-account
    monitor_chats:
      - TestChat
    rules:
      - keywords:
          - test
        reply_text: "测试回复"
        fixed_delay_seconds: 1
        random_delay_max_seconds: 2
```

### 配置字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 账号名称，必须唯一 |
| `browser_data_dir` | string | ❌ | 浏览器数据目录，默认 `./browser_data/{name}` |
| `monitor_chats` | string[] | ✅ | 监控的聊天列表 |
| `rules` | Rule[] | ✅ | 关键词回复规则 |

#### Rule 字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `keywords` | string[] | ✅ | 关键词列表，支持通配符 `*` 和 `?` |
| `reply_text` | string | ✅ | 回复内容 |
| `fixed_delay_seconds` | number | ✅ | 固定延时（秒） |
| `random_delay_max_seconds` | number | ✅ | 随机延时上限（秒） |
| `case_sensitive` | boolean | ❌ | 是否区分大小写，默认 false |

---

## 🛠️ 后端命令行接口

### Python 模块调用

```bash
# 启动账号（后台运行）
python -m teleflow.cli run --account my-account --config config.yaml

# 验证配置文件
python -m teleflow.cli validate-config --config config.yaml

# 查看版本
python -m teleflow.cli --version
```

### 后端启动参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `--account` | 账号名称 | `--account my-account` |
| `--config` | 配置文件路径 | `--config ./config.yaml` |
| `--debug` | 启用调试模式 | `--debug` |
| `--show-browser` | 显示浏览器窗口 | `--show-browser` |
| `--random-seed` | 设置随机数种子 | `--random-seed 42` |

---

## 🔧 开发调试

### 查看 Electron 日志

```bash
# 启动开发模式（自动打开 DevTools）
npm run dev

# 查看主进程日志
# 输出在终端中，包含 Python 子进程的 stdout/stderr
```

### 查看 Python 后端日志

```bash
# 后端日志输出到：
# - 控制台（实时显示）
# - logs/ 目录（文件保存）

# 启用详细日志
python -m teleflow.cli run --account test --debug
```

### 测试 IPC 通信

在 React DevTools Console 中测试：

```javascript
// 测试获取配置
const config = await window.electron.getConfig()
console.log(config)

// 测试启动账号
const result = await window.electron.startAccount('my-account')
console.log(result)

// 测试日志监听
window.electron.onLogUpdate((log) => {
  console.log('[LOG]', log.message)
})
```

---

## 📊 进程管理

### 进程生命周期

```
1. UI 点击"启动"按钮
   ↓
2. Electron 主进程接收 IPC 请求
   ↓
3. spawn Python 子进程
   ↓
4. Python 启动 Playwright 浏览器
   ↓
5. 开始监控 Telegram Web
   ↓
6. 实时推送日志到 UI
   ↓
7. UI 点击"停止"按钮
   ↓
8. 发送 SIGTERM 信号
   ↓
9. Python 优雅关闭
   ↓
10. 进程退出，清理资源
```

### 进程监控

```typescript
// 实时监控所有账号状态
const allStatus = await window.electron.getAllStatus()
console.log(allStatus)
// {
//   'account1': { running: true, status: 'running', pid: 12345 },
//   'account2': { running: false, status: 'stopped' }
// }
```

---

## 🐛 常见问题

### 1. Python 未找到

**问题**: `未检测到 Python`

**解决**:
```bash
# 安装 Python 3.11+
# Windows: https://python.org/downloads/
# macOS: brew install python@3.11
# Linux: apt install python3.11

# 确认安装
python --version  # 或 python3 --version
```

### 2. 配置文件不存在

**问题**: `配置文件不存在: config.yaml`

**解决**:
```bash
# 创建默认配置
cp config.example.yaml config.yaml

# 或在项目根目录创建 config.yaml
```

### 3. 账号启动失败

**问题**: 点击启动但没有反应

**解决**:
1. 检查终端日志查看错误信息
2. 确认 Python 依赖已安装: `pip install -r requirements.txt`
3. 验证配置文件: `python -m teleflow.cli validate-config`
4. 检查浏览器数据目录权限

### 4. 日志不显示

**问题**: UI 中看不到实时日志

**解决**:
1. 确认 `onLogUpdate` 监听器已注册
2. 检查 Electron 主进程是否正常转发日志
3. 查看浏览器 Console 是否有错误

---

## 📚 相关文档

- [DESIGN_2025.md](./DESIGN_2025.md) - UI 设计文档
- [PHASE2_COMPLETE.md](./PHASE2_COMPLETE.md) - Phase 2 功能文档
- [../specs/001-telegram-web-assistant/spec.md](../specs/001-telegram-web-assistant/spec.md) - 后端需求规格
- [../specs/001-telegram-web-assistant/plan.md](../specs/001-telegram-web-assistant/plan.md) - 后端技术方案

---

## 🎯 下一步

1. ✅ 前后端 IPC 通信完成
2. ✅ 进程管理和日志推送完成
3. ⏳ 实现配置编辑器 UI
4. ⏳ 添加账号管理功能
5. ⏳ 实现性能监控面板

---

**维护者**: AI-Powered Development  
**最后更新**: 2025-11-17  
**状态**: ✅ Production Ready
