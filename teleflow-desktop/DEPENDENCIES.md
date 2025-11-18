# 依赖安装指南

## 📦 核心依赖

### 已安装的依赖

以下依赖应该已经在项目中：

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "zustand": "^4.4.0",
    "lucide-react": "^0.290.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "electron": "^27.0.0",
    "tailwindcss": "^3.3.0"
  }
}
```

---

## 🚀 Phase 7 新增依赖

### 1. Playwright 依赖

```bash
# 安装 Playwright
npm install playwright

# 安装类型定义
npm install -D @types/playwright

# 下载浏览器（首次安装）
npx playwright install chromium
```

**说明**: Playwright 用于浏览器自动化和 Telegram Web 集成。

---

### 2. 测试依赖

```bash
# 安装 Vitest 测试框架
npm install -D vitest jsdom

# 安装 React Testing Library
npm install -D @testing-library/react
npm install -D @testing-library/jest-dom
npm install -D @testing-library/user-event

# 安装 Vitest UI 和覆盖率工具
npm install -D @vitest/ui
npm install -D @vitest/coverage-v8
```

**说明**: 这些包用于前端单元测试和集成测试。

---

### 3. 一键安装所有新依赖

```bash
# 复制下面的命令一次性安装所有依赖
npm install playwright && \
npm install -D @types/playwright \
               vitest \
               jsdom \
               @testing-library/react \
               @testing-library/jest-dom \
               @testing-library/user-event \
               @vitest/ui \
               @vitest/coverage-v8
```

---

## 📝 package.json 更新

### 添加测试脚本

在 `package.json` 的 `scripts` 部分添加：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "electron:dev": "electron .",
    "electron:build": "electron-builder",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest --watch"
  }
}
```

---

## 🔧 配置验证

### 验证 Playwright 安装

```bash
# 检查 Playwright 版本
npx playwright --version

# 列出已安装的浏览器
npx playwright list
```

### 验证测试配置

```bash
# 运行测试（应该能找到测试文件）
npm run test

# 查看测试 UI
npm run test:ui
```

---

## 📦 完整依赖列表

### 生产依赖

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "zustand": "^4.4.0",
    "lucide-react": "^0.290.0",
    "playwright": "^1.40.0"
  }
}
```

### 开发依赖

```json
{
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/playwright": "^1.40.0",
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/react": "^14.1.2",
    "@testing-library/user-event": "^14.5.1",
    "@vitejs/plugin-react": "^4.2.0",
    "@vitest/coverage-v8": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "autoprefixer": "^10.4.16",
    "electron": "^27.0.0",
    "electron-builder": "^24.9.0",
    "jsdom": "^23.0.1",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.3.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

---

## ⚠️ 常见问题

### 问题 1: Playwright 浏览器未安装

**错误**:
```
Error: Executable doesn't exist at ...
```

**解决方案**:
```bash
npx playwright install chromium
```

### 问题 2: 测试找不到模块

**错误**:
```
Cannot find module 'vitest'
```

**解决方案**:
```bash
npm install -D vitest jsdom
```

### 问题 3: TypeScript 类型错误

**错误**:
```
找不到模块"playwright"或其相应的类型声明
```

**解决方案**:
```bash
npm install -D @types/playwright
```

### 问题 4: 测试环境配置错误

**错误**:
```
ReferenceError: document is not defined
```

**解决方案**:
确保 `vitest.config.ts` 中配置了 `environment: 'jsdom'`

---

## 🚀 安装后验证

### 1. 检查依赖安装

```bash
# 查看已安装的包
npm list playwright
npm list vitest
npm list @testing-library/react
```

### 2. 运行测试检查

```bash
# 应该能运行测试
npm run test

# 应该能看到测试 UI
npm run test:ui
```

### 3. 检查 TypeScript 编译

```bash
# 应该没有依赖相关的类型错误
npm run tsc --noEmit
```

---

## 📊 依赖大小估计

| 包 | 大小 |
|---|------|
| playwright | ~200MB (含浏览器) |
| vitest + jsdom | ~15MB |
| @testing-library/react | ~5MB |
| 其他测试工具 | ~10MB |
| **总计** | **~230MB** |

---

## 💡 开发建议

### 1. 使用 yarn 或 pnpm（可选）

如果遇到依赖安装问题，可以尝试使用其他包管理器：

```bash
# 使用 yarn
yarn add playwright
yarn add -D vitest jsdom @testing-library/react

# 使用 pnpm
pnpm add playwright
pnpm add -D vitest jsdom @testing-library/react
```

### 2. 锁定依赖版本

建议在 `package.json` 中锁定主要依赖的版本：

```json
{
  "dependencies": {
    "playwright": "1.40.1"
  },
  "devDependencies": {
    "vitest": "1.0.4"
  }
}
```

### 3. 定期更新依赖

```bash
# 检查过时的包
npm outdated

# 更新所有依赖到最新版本
npm update

# 更新到最新主版本（谨慎使用）
npx npm-check-updates -u
npm install
```

---

## ✅ 完成检查清单

安装完成后，确认以下内容：

- [ ] `npm list playwright` 显示已安装
- [ ] `npx playwright --version` 正常显示版本
- [ ] `npm run test` 能运行测试
- [ ] `npm run test:ui` 能打开测试 UI
- [ ] TypeScript 编译无依赖相关错误
- [ ] `node_modules/playwright` 目录存在
- [ ] `.playwright` 目录存在（浏览器缓存）

---

## 📞 获取帮助

如果遇到依赖安装问题：

1. 删除 `node_modules` 和 `package-lock.json`
2. 清理 npm 缓存: `npm cache clean --force`
3. 重新安装: `npm install`
4. 查看详细日志: `npm install --verbose`

---

**安装完成后，就可以开始使用 Playwright 自动化和运行测试了！** 🎉
