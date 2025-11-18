# 🚀 快速启动指南

## ✅ 前置检查

### 1. 检查 Teleflow Python CLI
```bash
python -m teleflow --version
```

如果失败，安装 Teleflow：
```bash
cd ..
pip install -e .
```

### 2. 准备配置文件
确保有一个 `config.yaml` 在项目根目录或指定路径。

示例配置：
```yaml
version: "1.0"
accounts:
  - name: test-account
    monitor_chats:
      - "Saved Messages"
    rules:
      - keywords: ["hello"]
        reply_text: "Hi there!"
```

## 🛠️ 安装依赖

```bash
npm install
```

## 🎯 开发模式

启动 Vite 开发服务器 + Electron：
```bash
npm run dev
```

这会：
1. 启动 Vite dev server (http://localhost:5173)
2. 自动打开 Electron 窗口
3. 启用热更新

## 📦 构建生产版本

```bash
npm run build
```

生成的文件在 `release/` 目录。

## 🐛 常见问题

### Q: npm install 失败
**A**: 确保 Node.js 版本 >= 18

### Q: Electron 启动但是白屏
**A**: 检查浏览器控制台（自动打开 DevTools），查看错误

### Q: 点击"启动"按钮没反应
**A**: 
1. 检查 Electron 主进程日志（终端输出）
2. 确认 Python CLI 可用：`python -m teleflow --version`
3. 确认配置文件路径正确

### Q: TypeScript 错误
**A**: 安装依赖后错误会消失：`npm install`

## 📁 项目结构

```
teleflow-desktop/
├── electron/              Electron 主进程
│   ├── main.ts           窗口管理 + 进程管理
│   └── preload.ts        IPC API 暴露
├── src/                  React 前端
│   ├── App.tsx          主应用组件
│   ├── main.tsx         React 入口
│   └── index.css        全局样式
├── package.json         依赖配置
└── vite.config.ts       构建配置
```

## 🎨 UI 功能

当前 Demo UI 包含：
- ✅ 账号列表显示
- ✅ 启动/停止按钮
- ✅ 实时日志查看

## 🔧 开发技巧

### 查看主进程日志
主进程日志输出在运行 `npm run dev` 的终端。

### 查看渲染进程日志
开发模式下 DevTools 自动打开，查看 Console 标签。

### 修改代码后
- **前端代码**: 自动热更新
- **主进程代码**: 需要重启 `npm run dev`

## 🚧 下一步

### 功能增强
1. 添加配置编辑器
2. 添加规则编辑器
3. 美化 UI（使用 shadcn/ui 组件）
4. 添加系统托盘支持
5. 添加自动更新功能

### 组件迁移
从 `telegram-web-auto-reply` 项目迁移：
- Button, Input, Dialog 等基础组件
- AccountList, ConfigEditor 等业务组件

## 📞 获取帮助

- 查看 `README.md` 了解详细 API 文档
- 查看 `../docs/ui-integration-plan.md` 了解集成方案
- 检查 Electron 日志和浏览器控制台
