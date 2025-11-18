# Desktop UI 集成方案

## 📋 概述

将现有的 Electron + React UI (`telegram-web-auto-reply`) 集成到 Teleflow 项目中。

## 🔍 现有 UI 技术栈分析

根据 `telegram-web-auto-reply` 项目：

### 前端技术栈
- **框架**: React 18.2 + React Router 6.21
- **构建工具**: Vite (从 index.html 可以看出)
- **UI 库**: 
  - Radix UI 组件库（Dialog, Tabs, Switch, Toast 等）
  - shadcn/ui 设计系统
  - Lucide React 图标
- **样式**: TailwindCSS + tailwindcss-animate
- **状态管理**: Zustand 4.4
- **表单验证**: Zod 3.25
- **HTTP 客户端**: Axios 1.12

### 后端技术栈
- **运行时**: Electron
- **数据库**: better-sqlite3 12.4
- **配置验证**: Joi 17.13
- **文件操作**: fs-extra 11.3
- **更新**: electron-updater 6.6
- **监控**: OpenTelemetry + prom-client

## 🎯 集成方案

### 方案 A: 独立 Electron 应用 (推荐)

**架构**:
```
teleflow-desktop/          # 新的 Electron 应用
├── package.json          # 复制并修改依赖
├── electron/
│   ├── main/             # Electron 主进程
│   │   ├── index.ts      # 应用入口
│   │   ├── ipc-handlers.ts  # IPC 通信
│   │   └── process-manager.ts  # 管理 teleflow 子进程
│   └── preload/
│       └── index.ts      # 预加载脚本
├── src/                  # React 前端
│   ├── components/       # 从旧项目迁移
│   │   ├── AccountList.tsx
│   │   ├── ConfigEditor.tsx
│   │   ├── RuleEditor.tsx
│   │   └── LogViewer.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Accounts.tsx
│   │   └── Settings.tsx
│   ├── stores/           # Zustand 状态管理
│   ├── services/         # API 调用
│   └── App.tsx
└── vite.config.ts
```

**通信方式**:
```typescript
// Electron IPC 调用 Python CLI
ipcMain.handle('start-account', async (event, accountName) => {
  const process = spawn('python', ['-m', 'teleflow', 'run', '--account', accountName])
  // 管理进程生命周期
})

ipcMain.handle('get-config', async () => {
  // 读取 YAML 配置文件
  return yaml.load(fs.readFileSync('config.yaml'))
})
```

### 方案 B: Web UI + FastAPI (备选)

如果不想使用 Electron，可以创建一个 FastAPI 后端：

```python
# src/teleflow/api/server.py
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

app = FastAPI()

@app.post("/api/accounts/start")
async def start_account(account_name: str):
    # 启动 AccountRunner
    pass

@app.get("/api/accounts/status")
async def get_status():
    # 返回账号状态
    pass
```

## 📦 迁移清单

### Phase 1: 项目初始化 ✅

- [ ] 创建 `teleflow-desktop/` 目录
- [ ] 复制 `package.json` 并更新依赖
- [ ] 复制 `vite.config.ts` 和 TypeScript 配置
- [ ] 复制 `tailwind.config.js` 和 PostCSS 配置
- [ ] 设置 Electron 主进程入口

### Phase 2: 组件迁移 ✅

从 `telegram-web-auto-reply` 迁移以下组件：

**基础组件** (shadcn/ui):
- [ ] Button
- [ ] Input
- [ ] Label
- [ ] Switch
- [ ] Tabs
- [ ] Dialog
- [ ] Toast
- [ ] DropdownMenu
- [ ] Select

**业务组件**:
- [ ] AccountList - 账号列表组件
- [ ] AccountCard - 账号卡片
- [ ] ConfigEditor - 配置编辑器
- [ ] RuleEditor - 规则编辑表单
- [ ] LogViewer - 日志查看器
- [ ] StatusIndicator - 状态指示器

### Phase 3: 状态管理 ✅

```typescript
// src/stores/accountStore.ts
import { create } from 'zustand'

interface AccountState {
  accounts: Account[]
  loadAccounts: () => Promise<void>
  startAccount: (name: string) => Promise<void>
  stopAccount: (name: string) => Promise<void>
}

export const useAccountStore = create<AccountState>((set) => ({
  accounts: [],
  loadAccounts: async () => {
    const accounts = await window.electron.getConfig()
    set({ accounts })
  },
  // ...
}))
```

### Phase 4: IPC 通信 ✅

```typescript
// electron/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  // 配置操作
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  
  // 进程控制
  startAccount: (name) => ipcRenderer.invoke('start-account', name),
  stopAccount: (name) => ipcRenderer.invoke('stop-account', name),
  getAccountStatus: (name) => ipcRenderer.invoke('get-account-status', name),
  
  // 日志
  watchLogs: (callback) => {
    ipcRenderer.on('log-update', (_, log) => callback(log))
  }
})
```

### Phase 5: 进程管理 ✅

```typescript
// electron/main/process-manager.ts
import { spawn, ChildProcess } from 'child_process'

class ProcessManager {
  private processes = new Map<string, ChildProcess>()
  
  async startAccount(accountName: string) {
    const proc = spawn('python', [
      '-m', 'teleflow', 'run',
      '--account', accountName,
      '--config', 'config.yaml'
    ])
    
    proc.stdout?.on('data', (data) => {
      // 发送日志到渲染进程
      mainWindow.webContents.send('log-update', {
        account: accountName,
        message: data.toString()
      })
    })
    
    this.processes.set(accountName, proc)
  }
  
  async stopAccount(accountName: string) {
    const proc = this.processes.get(accountName)
    if (proc) {
      proc.kill('SIGTERM')
      this.processes.delete(accountName)
    }
  }
}
```

## 🎨 UI 页面设计

### 1. Dashboard (仪表板)
```
┌─────────────────────────────────────────┐
│ Telegram Web 自动回复系统                │
├─────────────────────────────────────────┤
│  账号概览                                │
│  ┌──────┐ ┌──────┐ ┌──────┐            │
│  │ 账号1 │ │ 账号2 │ │ 账号3 │            │
│  │ 运行中│ │ 已停止│ │ 运行中│            │
│  └──────┘ └──────┘ └──────┘            │
│                                         │
│  系统状态                                │
│  • 总消息处理: 1,234                     │
│  • 今日回复: 56                          │
│  • 活跃账号: 2/3                         │
└─────────────────────────────────────────┘
```

### 2. Accounts (账号管理)
```
┌─────────────────────────────────────────┐
│ ☰ 账号列表                [+ 新增账号]    │
├─────────────────────────────────────────┤
│ ┌───────────────────────────────────┐  │
│ │ account-1               [▶️ 启动]  │  │
│ │ 状态: 运行中                        │  │
│ │ 监控: 3 个聊天                      │  │
│ │ 规则: 5 条                         │  │
│ │ [编辑] [停止] [删除]                │  │
│ └───────────────────────────────────┘  │
│                                         │
│ ┌───────────────────────────────────┐  │
│ │ account-2               [▶️ 启动]  │  │
│ │ 状态: 已停止                        │  │
│ │ ...                                │  │
│ └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 3. Rules (规则编辑)
```
┌─────────────────────────────────────────┐
│ 规则配置 - account-1                     │
├─────────────────────────────────────────┤
│ 规则 #1                    [✓ 启用]     │
│ ┌───────────────────────────────────┐  │
│ │ 关键词: hello, hi                  │  │
│ │ 回复内容: Hello! How are you?      │  │
│ │ 固定延时: 2 秒                     │  │
│ │ 随机延时: 0-3 秒                   │  │
│ │ 大小写敏感: ☐                      │  │
│ │ [保存] [删除]                      │  │
│ └───────────────────────────────────┘  │
│                                         │
│ [+ 添加规则]                            │
└─────────────────────────────────────────┘
```

### 4. Logs (日志查看)
```
┌─────────────────────────────────────────┐
│ 实时日志                [清空] [导出]     │
├─────────────────────────────────────────┤
│ [account-1] 2025-11-16 23:00:01        │
│ INFO: 开始运行账号: account-1            │
│                                         │
│ [account-1] 2025-11-16 23:00:05        │
│ INFO: 检测到新消息: hello                │
│                                         │
│ [account-1] 2025-11-16 23:00:07        │
│ INFO: 匹配到规则: ['hello', 'hi']       │
│                                         │
│ [account-1] 2025-11-16 23:00:10        │
│ INFO: 成功发送回复: Hello! How are you? │
└─────────────────────────────────────────┘
```

## 🚀 快速开始指南

### 1. 创建 Electron 项目

```bash
# 在 teleflow 根目录
mkdir teleflow-desktop
cd teleflow-desktop

# 初始化
npm init -y

# 安装依赖（从旧项目复制）
npm install react react-dom react-router-dom
npm install @radix-ui/react-dialog @radix-ui/react-tabs
npm install lucide-react clsx tailwind-merge
npm install zustand axios zod
npm install -D electron vite @vitejs/plugin-react
npm install -D typescript @types/react @types/node
npm install -D tailwindcss postcss autoprefixer
```

### 2. 项目结构

```bash
teleflow-desktop/
├── electron.vite.config.ts  # Electron Vite 配置
├── package.json
├── tsconfig.json
├── electron/
│   ├── main.ts              # 主进程
│   └── preload.ts           # 预加载
└── src/
    ├── main.tsx             # React 入口
    ├── App.tsx
    └── components/
```

### 3. 关键配置

**package.json**:
```json
{
  "name": "teleflow-desktop",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build && electron-builder",
    "preview": "vite preview"
  }
}
```

## 📝 TODO 清单

### 立即执行
- [X] 分析现有 UI 项目结构
- [ ] 创建 `teleflow-desktop/` 目录
- [ ] 设置 package.json 和依赖
- [ ] 配置 Vite + Electron
- [ ] 创建主进程和预加载脚本

### 组件开发
- [ ] 迁移 shadcn/ui 组件
- [ ] 实现 AccountList 组件
- [ ] 实现 ConfigEditor 组件
- [ ] 实现 LogViewer 组件

### 集成测试
- [ ] 测试 Electron 启动
- [ ] 测试 IPC 通信
- [ ] 测试进程管理
- [ ] 测试配置读写

## 💡 最佳实践

1. **进程隔离**: Electron 主进程不直接操作 Python，使用子进程
2. **状态同步**: 使用 Zustand 管理前端状态，定期轮询后端状态
3. **错误处理**: 所有 IPC 调用都要 try-catch
4. **日志管理**: 实时日志使用 WebSocket 或 IPC 事件
5. **配置验证**: 保存前使用 Zod 验证配置格式

## 🎯 下一步

选择一个方案开始实施：

**快速方案** (推荐):
1. 复制整个 `telegram-web-auto-reply` 项目
2. 重命名为 `teleflow-desktop`
3. 修改 IPC 调用以适配 teleflow Python CLI
4. 更新组件以匹配新的配置格式

**从零开始**:
1. 创建新的 Electron + Vite 项目
2. 逐个迁移需要的组件
3. 实现进程管理逻辑
4. 实现配置编辑功能
