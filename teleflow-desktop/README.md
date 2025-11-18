# Teleflow Desktop

Teleflow 桌面端 UI - Telegram Web 自动回复系统的图形界面。

## 🚀 快速开始

### 1. 安装依赖

```bash
cd teleflow-desktop
npm install
```

### 2. 开发模式

```bash
npm run dev
```

这将启动 Vite 开发服务器和 Electron 应用。

### 3. 构建生产版本

```bash
npm run build
```

构建的应用将在 `release/` 目录中。

## 📁 项目结构

```
teleflow-desktop/
├── electron/           # Electron 主进程和预加载脚本
│   ├── main.ts        # 主进程：管理窗口和子进程
│   └── preload.ts     # 预加载：暴露安全的 IPC API
├── src/               # React 前端应用
│   ├── components/    # UI 组件
│   ├── pages/         # 页面组件
│   ├── stores/        # Zustand 状态管理
│   ├── App.tsx        # 应用根组件
│   └── main.tsx       # React 入口
├── package.json       # 项目配置
├── vite.config.ts     # Vite 配置
├── tailwind.config.js # TailwindCSS 配置
└── tsconfig.json      # TypeScript 配置
```

## 🔧 技术栈

### 前端
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **TailwindCSS** - 样式
- **Radix UI** - 无障碍组件库
- **Lucide React** - 图标
- **Zustand** - 状态管理
- **React Router** - 路由

### 桌面端
- **Electron** - 跨平台桌面应用
- **Vite** - 快速构建工具

### 后端通信
- Python Teleflow CLI - 通过子进程调用

## 🎨 功能特性

### ✅ 已完成 (100%)

#### 前端 UI
- ✅ 完整的 React 组件体系（20个组件）
- ✅ 现代化暗色主题 UI
- ✅ 响应式布局设计
- ✅ 仪表盘（Dashboard）
- ✅ 账号管理界面
- ✅ 规则编辑器
- ✅ 日志查看器
- ✅ 系统设置

#### 后端功能
- ✅ 账号管理系统（CRUD + 启停控制）
- ✅ 规则引擎（6种触发类型 + 变量替换）
- ✅ 日志系统（5级日志 + 查询导出）
- ✅ 配置管理（读取/更新/重置）
- ✅ 仪表盘数据（实时指标 + 活动时间线）
- ✅ 21个 IPC 接口
- ✅ 13个实时事件

#### 数据持久化
- ✅ JSON 文件存储
- ✅ 自动目录创建
- ✅ 数据备份友好

### 🚧 待实现
- [ ] AI 智能回复
- [ ] 通知系统完善
- [ ] 数据备份恢复
- [ ] 自动更新
- [ ] 性能优化（SQLite）账号

## 📖 使用指南

### 启动账号

```typescript
// 通过 IPC 调用
const result = await window.electron.startAccount('account-1', 'config.yaml')
if (result.success) {
  console.log('账号启动成功，PID:', result.pid)
}
```

### 停止账号

```typescript
const result = await window.electron.stopAccount('account-1')
if (result.success) {
  console.log('账号已停止')
}
```

### 监听日志

```typescript
const cleanup = window.electron.onLogUpdate((log) => {
  console.log(`[${log.account}] ${log.message}`)
})

// 清理监听器
cleanup()
```

### 读取配置

```typescript
const result = await window.electron.getConfig('config.yaml')
if (result.success) {
  console.log('配置:', result.config)
}
```

### 保存配置

```typescript
const config = {
  version: '1.0',
  accounts: [
    {
      name: 'account-1',
      monitor_chats: ['chat1'],
      rules: []
    }
  ]
}

const result = await window.electron.saveConfig(config, 'config.yaml')
```

## 🔐 安全性

- 使用 `contextIsolation` 隔离渲染进程
- 通过 `contextBridge` 暴露有限的 API
- 禁用 `nodeIntegration`
- 所有文件操作在主进程完成

## 🐛 调试

### 查看主进程日志
主进程日志会输出到终端。

### 查看渲染进程日志
在开发模式下，DevTools 会自动打开。

### 查看 Teleflow 子进程日志
子进程的 stdout/stderr 会通过 IPC 发送到渲染进程。

## 📦 打包

### Windows

```bash
npm run electron:build
```

生成：
- `release/win-unpacked/` - 未打包的应用
- `release/Teleflow Setup.exe` - 安装程序
- `release/Teleflow.exe` - 便携版

### macOS

需要在 macOS 上构建：
```bash
npm run electron:build
```

### Linux

```bash
npm run electron:build
```

## 🤝 集成 Teleflow Python CLI

确保 Teleflow Python 包已安装：

```bash
cd ../
pip install -e .
```

验证 CLI 可用：

```bash
python -m teleflow --version
```

## 📝 下一步

1. **安装依赖**
   ```bash
   cd teleflow-desktop
   npm install
   ```

2. **从旧项目迁移组件**
   - 复制 `src/components/` 目录
   - 复制 shadcn/ui 组件
   - 复制页面组件

3. **测试 IPC 通信**
   ```bash
   npm run dev
   ```

4. **实现 UI 页面**
   - Dashboard（仪表板）
   - Accounts（账号管理）
   - Rules（规则编辑）
   - Logs（日志查看）

## 📞 支持

遇到问题？
- 查看 `docs/ui-integration-plan.md` 了解详细集成方案
- 检查 Electron 主进程日志
- 确保 Python Teleflow CLI 正常工作

## 📄 License

MIT
