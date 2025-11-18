# 🚀 Teleflow Desktop - 快速开始指南

## 📋 前提条件

- **Node.js** 18+ 
- **npm** 或 **yarn**
- **Git**
- 操作系统：Windows / macOS / Linux

---

## 🔧 安装与配置

### 步骤 1: 克隆项目（如果需要）

```bash
git clone <repository-url>
cd teleflow-desktop
```

### 步骤 2: 安装基础依赖

```bash
npm install
```

### 步骤 3: 安装 Phase 7 新增依赖

```bash
# Playwright（浏览器自动化）
npm install playwright
npm install -D @types/playwright
npx playwright install chromium

# 测试框架
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitest/ui @vitest/coverage-v8
```

**或者一键安装**:

```bash
npm install playwright && \
npm install -D @types/playwright vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitest/ui @vitest/coverage-v8 && \
npx playwright install chromium
```

---

## 🎬 启动应用

### 开发模式

```bash
# 终端 1: 启动前端开发服务器
npm run dev

# 终端 2: 启动 Electron 应用
npm run electron:dev
```

应用会自动打开，可以：
- 创建账号
- 配置规则
- 查看日志
- 测试功能

---

## 🧪 运行测试

```bash
# 运行所有测试
npm run test

# 查看测试 UI（推荐）
npm run test:ui

# 生成覆盖率报告
npm run test:coverage

# 监听模式（开发时）
npm run test:watch
```

---

## 📦 生产构建

```bash
# 1. 构建前端
npm run build

# 2. 打包 Electron 应用
npm run electron:build
```

打包完成后，可执行文件在 `dist/` 目录。

---

## 🎯 核心功能演示

### 1. 创建账号

1. 点击左侧边栏的 **"添加账号"** 按钮
2. 填写账号信息：
   - 账号名称
   - 手机号
   - 备注
3. 点击 **"创建"**

### 2. 创建规则

1. 点击账号进入详情页
2. 切换到 **"规则"** 标签
3. 点击 **"添加规则"**
4. 配置规则：
   - 规则名称
   - 触发类型（关键词/正则/全部等）
   - 匹配模式
   - 响应内容（支持变量）
   - 触发限制
5. 点击 **"保存"**

### 3. 启动账号

1. 在账号详情页点击 **"启动"** 按钮
2. Playwright 会自动打开浏览器
3. 首次使用需手动登录 Telegram Web
4. 登录后，系统会自动监听消息并匹配规则

### 4. 查看日志

1. 点击左侧导航栏的 **"运行日志"**
2. 可以：
   - 按账号筛选
   - 按日志级别筛选
   - 按关键词搜索
   - 导出日志（JSON/CSV/TXT）
   - 清理日志

### 5. 系统托盘

- 最小化窗口会隐藏到系统托盘
- 右键托盘图标显示菜单：
  - 显示/隐藏窗口
  - 启动/停止所有账号
  - 退出应用
- 双击托盘图标显示窗口

---

## 🔍 功能概览

### 仪表盘
- 关键指标卡片（账号数、回复数、成功率）
- 账号状态列表
- 最近活动时间线

### 账号管理
- 创建/编辑/删除账号
- 启动/停止账号
- 查看账号统计
- 右键菜单快捷操作

### 规则引擎
- 6种触发类型
- 4种匹配模式
- 变量替换系统
- 触发限制控制
- 规则测试功能

### 日志系统
- 5级日志（debug/info/warning/error/critical）
- 实时日志推送
- 多维度查询过滤
- 3种格式导出

### 系统设置
- 主题切换（深色模式）
- 语言设置
- 日志保留天数
- Playwright 配置

---

## 📂 项目结构

```
teleflow-desktop/
├── electron/           # Electron 主进程
│   ├── main.ts        # 主进程入口
│   ├── preload/       # 预加载脚本
│   └── managers/      # 后端管理器 (7个)
│
├── src/               # React 前端
│   ├── types/         # TypeScript 类型
│   ├── store/         # 状态管理
│   ├── services/      # 服务层
│   ├── components/    # UI 组件
│   ├── hooks/         # 自定义 Hooks
│   ├── layouts/       # 布局组件
│   ├── views/         # 视图页面
│   └── tests/         # 测试文件
│
├── vitest.config.ts   # 测试配置
├── package.json       # 依赖配置
└── README.md          # 项目说明
```

---

## 🐛 常见问题

### 1. Playwright 浏览器未安装

**问题**: 启动账号时报错 `Executable doesn't exist`

**解决**:
```bash
npx playwright install chromium
```

### 2. 测试依赖缺失

**问题**: 运行测试时报错 `Cannot find module 'vitest'`

**解决**:
```bash
npm install -D vitest jsdom @testing-library/react
```

### 3. Electron 启动失败

**问题**: `electron:dev` 报错

**解决**:
1. 确保 `npm run dev` 已启动
2. 检查端口是否被占用
3. 删除 `node_modules` 重新安装

### 4. 账号启动后无反应

**问题**: 点击启动但没有打开浏览器

**解决**:
1. 查看日志查看错误信息
2. 确保 Playwright 浏览器已安装
3. 检查系统权限

### 5. DOM 选择器不匹配

**问题**: 无法自动发送消息

**解决**:
- Telegram Web 的 DOM 结构可能变化
- 需要根据实际情况调整 `PlaywrightManager.ts` 中的选择器
- 使用截图功能辅助调试

---

## 📖 深入学习

### 文档索引

| 文档 | 说明 |
|------|------|
| `README.md` | 项目概述 |
| `DEPENDENCIES.md` | 依赖安装详解 |
| `PHASE7_INTEGRATION.md` | Phase 7 功能详解 |
| `PROJECT_STATUS_FINAL.md` | 项目最终状态 |
| `FRONTEND_BACKEND_API.md` | API 接口文档 |

### 开发指南

#### 添加新组件

1. 在 `src/components/` 创建组件文件
2. 在 `src/components/index.ts` 导出
3. 在 `src/components/__tests__/` 添加测试

#### 添加新管理器

1. 在 `electron/managers/` 创建管理器文件
2. 在 `electron/main.ts` 初始化
3. 注册 IPC 处理器

#### 添加新 IPC 接口

1. 在 `electron/main.ts` 添加 `ipcMain.handle`
2. 在 `src/services/` 添加服务方法
3. 更新 `src/vite-env.d.ts` 类型定义

---

## 🎯 使用场景

### 场景 1: 客服自动回复

1. 创建账号（客服账号）
2. 创建规则：
   - 触发类型：关键词
   - 匹配内容：`"退货"` / `"售后"` / `"问题"`
   - 响应：`"您好，请提供您的订单号，我们会尽快处理。"`
3. 启动账号

### 场景 2: 群聊管理

1. 创建账号（管理员账号）
2. 创建规则：
   - 触发类型：提及 (@)
   - 响应：`"@{sender} 您好，我已收到您的消息"`
3. 启动账号

### 场景 3: 关键词监控

1. 创建账号
2. 创建规则：
   - 触发类型：关键词
   - 匹配内容：`"产品名称"`
   - 响应：`"感谢关注我们的产品！"`
   - 限制：每天最多 10 次，冷却时间 1 小时
3. 启动账号

---

## 🚀 下一步

### 立即开始

1. ✅ 安装依赖
2. ✅ 启动应用
3. ✅ 创建第一个账号
4. ✅ 配置第一条规则
5. ✅ 启动账号测试

### 探索更多

- 🔍 查看日志了解运行情况
- 📊 使用仪表盘监控数据
- 🧪 运行测试确保代码质量
- 📖 阅读详细文档深入学习

### 反馈问题

如果遇到问题或有建议：
1. 查看文档目录下的相关文档
2. 检查日志文件
3. 参考 `DEPENDENCIES.md` 排查依赖问题

---

## 🎉 开始使用

**现在您已经了解了 Teleflow Desktop 的基本使用方法！**

执行以下命令开始：

```bash
# 1. 安装所有依赖
npm install
npm install playwright
npx playwright install chromium

# 2. 启动开发服务器
npm run dev

# 3. 启动 Electron（新终端）
npm run electron:dev
```

**祝您使用愉快！** 🚀

---

**需要帮助？查看其他文档获取更多信息。**
