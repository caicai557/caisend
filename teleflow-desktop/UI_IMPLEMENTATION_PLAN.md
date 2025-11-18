# Teleflow Desktop UI 完整实施计划

## 📋 需要复刻的组件列表

基于现代 Telegram 自动回复管理系统的 UI 设计模式。

### 第1阶段: 基础 UI 组件（shadcn/ui）

#### 1.1 核心组件
- [X] Button (已创建)
- [ ] Card
- [ ] Input
- [ ] Label
- [ ] Badge
- [ ] Switch
- [ ] Tabs
- [ ] Dialog
- [ ] Dropdown Menu
- [ ] Toast/Sonner
- [ ] Textarea
- [ ] Select
- [ ] Checkbox
- [ ] Separator
- [ ] ScrollArea

#### 1.2 表单组件
- [ ] Form (react-hook-form集成)
- [ ] Field Wrapper
- [ ] Error Message
- [ ] Field Description

### 第2阶段: 布局组件

#### 2.1 应用结构
- [ ] **Sidebar** - 侧边栏导航
  ```
  - Dashboard (仪表板)
  - Accounts (账号管理)
  - Rules (规则配置)
  - Groups (群组管理)
  - Logs (日志查看)
  - Settings (设置)
  ```

- [ ] **Header** - 顶部栏
  ```
  - 应用标题
  - 搜索框
  - 用户信息
  - 主题切换
  ```

- [ ] **Main Layout** - 主布局容器

#### 2.2 响应式设计
- [ ] 移动端适配
- [ ] 平板适配
- [ ] 桌面端优化

### 第3阶段: 业务组件

#### 3.1 Dashboard (仪表板)
```tsx
<Dashboard>
  <StatsCard title="总账号" value={3} icon={Users} />
  <StatsCard title="运行中" value={2} icon={Play} trend="+1" />
  <StatsCard title="今日消息" value={156} icon={MessageSquare} />
  <StatsCard title="今日回复" value={48} icon={Send} />
  
  <RecentActivity />
  <QuickActions />
</Dashboard>
```

#### 3.2 Accounts (账号管理)
```tsx
<AccountsPage>
  <AccountsHeader>
    <SearchBar />
    <FilterDropdown />
    <AddAccountButton />
  </AccountsHeader>
  
  <AccountsList>
    <AccountCard
      name="account-1"
      status="running"
      chats={3}
      rules={5}
      actions={[
        { label: "启动", variant: "success" },
        { label: "停止", variant: "destructive" },
        { label: "编辑", variant: "outline" },
        { label: "删除", variant: "ghost" }
      ]}
    />
  </AccountsList>
</AccountsPage>
```

**AccountCard 详细设计**:
```
┌────────────────────────────────────────┐
│ 🟢 account-1          [···]            │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                         │
│ 📊 状态: 运行中 | PID: 12345           │
│ 💬 监控: 3 个聊天                      │
│ 📝 规则: 5 条                          │
│ 📁 数据: ./browser_data/account-1      │
│                                         │
│ [▶️ 启动] [⏹ 停止] [✏️ 编辑] [🗑️ 删除]│
└────────────────────────────────────────┘
```

#### 3.3 Rule Editor (规则编辑器)
```tsx
<RuleEditorDialog>
  <RuleForm>
    <KeywordsInput
      placeholder="输入关键词，用逗号分隔"
      value={["hello", "hi"]}
    />
    
    <ReplyTextarea
      placeholder="输入自动回复内容"
      supportVariables={["{ocr_result}", "{chat_name}"]}
    />
    
    <DelaySettings>
      <NumberInput label="固定延时" suffix="秒" />
      <NumberInput label="随机延时" suffix="秒" />
    </DelaySettings>
    
    <SwitchField label="区分大小写" />
    <SwitchField label="启用规则" defaultChecked />
  </RuleForm>
</RuleEditorDialog>
```

#### 3.4 Config Editor (配置编辑器)
```tsx
<ConfigEditor>
  <Tabs defaultValue="basic">
    <TabsList>
      <TabsTrigger value="basic">基本信息</TabsTrigger>
      <TabsTrigger value="chats">监控聊天</TabsTrigger>
      <TabsTrigger value="rules">规则列表</TabsTrigger>
      <TabsTrigger value="groups">群组配置</TabsTrigger>
      <TabsTrigger value="advanced">高级选项</TabsTrigger>
    </Tabs>
    
    <TabsContent value="basic">
      <AccountNameInput />
      <BrowserDataDirInput />
    </TabsContent>
    
    <TabsContent value="chats">
      <MonitorChatsList
        items={["Saved Messages", "Customer Support"]}
        onAdd={handleAddChat}
        onRemove={handleRemoveChat}
      />
    </TabsContent>
    
    <TabsContent value="rules">
      <RulesList
        rules={rules}
        onEdit={handleEditRule}
        onDelete={handleDeleteRule}
        onReorder={handleReorderRules}
      />
    </TabsContent>
  </Tabs>
</ConfigEditor>
```

#### 3.5 Logs Viewer (日志查看器)
```tsx
<LogsViewer>
  <LogsHeader>
    <AccountFilter accounts={accounts} />
    <LevelFilter levels={["INFO", "WARNING", "ERROR"]} />
    <SearchInput placeholder="搜索日志..." />
    <ClearButton />
    <ExportButton />
  </LogsHeader>
  
  <LogsContent>
    <VirtualizedList>
      <LogEntry
        timestamp="2025-11-16 23:15:01"
        account="account-1"
        level="INFO"
        message="检测到新消息: hello"
      />
      <LogEntry
        timestamp="2025-11-16 23:15:03"
        account="account-1"
        level="INFO"
        message="匹配到规则: ['hello', 'hi']"
      />
    </VirtualizedList>
  </LogsContent>
  
  <LogsFooter>
    <AutoScrollToggle />
    <LogCount />
  </LogsFooter>
</LogsViewer>
```

#### 3.6 Group Manager (群组管理)
```tsx
<GroupManager>
  <GroupsList>
    <GroupCard
      inviteLink="https://t.me/+xxx"
      welcomeMessage="Hello everyone!"
      enabled={true}
      joined={true}
      onEdit={handleEdit}
      onToggle={handleToggle}
      onTest={handleTest}
    />
  </GroupsList>
  
  <AddGroupButton />
</GroupManager>
```

### 第4阶段: 状态管理 (Zustand)

#### 4.1 Store 结构
```tsx
// stores/useAccountStore.ts
interface AccountStore {
  accounts: Account[]
  loadAccounts: () => Promise<void>
  startAccount: (name: string) => Promise<void>
  stopAccount: (name: string) => Promise<void>
  updateAccount: (name: string, data: Partial<Account>) => Promise<void>
  deleteAccount: (name: string) => Promise<void>
}

// stores/useLogStore.ts
interface LogStore {
  logs: LogEntry[]
  addLog: (log: LogEntry) => void
  clearLogs: () => void
  filterLogs: (filters: LogFilters) => LogEntry[]
}

// stores/useConfigStore.ts
interface ConfigStore {
  config: TeleflowConfig | null
  loadConfig: () => Promise<void>
  saveConfig: (config: TeleflowConfig) => Promise<void>
  validateConfig: () => Promise<boolean>
}
```

### 第5阶段: 功能增强

#### 5.1 实时更新
- [ ] WebSocket/IPC 事件监听
- [ ] 账号状态实时同步
- [ ] 日志实时流式显示
- [ ] 进程状态监控

#### 5.2 用户体验
- [ ] Loading 状态
- [ ] Error Boundary
- [ ] Toast 通知
- [ ] 确认对话框
- [ ] 键盘快捷键

#### 5.3 高级功能
- [ ] 配置导入/导出
- [ ] 批量操作
- [ ] 规则模板
- [ ] 数据备份
- [ ] 系统托盘

### 第6阶段: 样式和主题

#### 6.1 设计系统
```css
/* 颜色主题 */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... */
}
```

#### 6.2 动画效果
- [ ] Fade in/out
- [ ] Slide animations
- [ ] Loading spinners
- [ ] Hover effects
- [ ] Transition effects

### 第7阶段: 测试和优化

#### 7.1 单元测试
- [ ] 组件测试
- [ ] Store 测试
- [ ] Utils 测试

#### 7.2 集成测试
- [ ] IPC 通信测试
- [ ] 流程测试

#### 7.3 性能优化
- [ ] 虚拟列表（日志）
- [ ] 懒加载
- [ ] Memo 优化
- [ ] 防抖节流

## 🎨 设计规范

### 颜色
- **Primary**: 蓝色 (#3B82F6) - 主操作
- **Success**: 绿色 (#10B981) - 成功/运行中
- **Warning**: 黄色 (#F59E0B) - 警告
- **Destructive**: 红色 (#EF4444) - 危险操作
- **Muted**: 灰色 (#6B7280) - 次要信息

### 间距
- **xs**: 4px
- **sm**: 8px
- **md**: 16px
- **lg**: 24px
- **xl**: 32px

### 圆角
- **sm**: 4px
- **md**: 8px
- **lg**: 12px
- **full**: 9999px

### 字体
- **标题**: font-bold text-lg/xl/2xl
- **正文**: font-normal text-sm/base
- **辅助**: font-normal text-xs text-muted-foreground

## 📊 实施优先级

### P0 - 核心功能（本周完成）
1. ✅ Button, Card, Input 基础组件
2. ✅ Sidebar + Layout 布局
3. ✅ AccountsList + AccountCard
4. ✅ 账号启动/停止功能
5. ✅ 实时日志查看

### P1 - 重要功能（下周完成）
1. Rule Editor 规则编辑器
2. Config Editor 配置编辑器
3. Toast 通知系统
4. 状态管理优化

### P2 - 增强功能（后续完成）
1. Dashboard 仪表板
2. Group Manager 群组管理
3. 主题切换
4. 系统托盘

## 🔧 开发工具

### 推荐 VS Code 插件
- Tailwind CSS IntelliSense
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint

### 有用的命令
```bash
# 添加 shadcn/ui 组件
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input

# 开发模式
npm run dev

# 构建
npm run build

# Type check
npm run type-check
```

## 📝 下一步行动

1. **立即执行**:
   ```bash
   cd teleflow-desktop
   npm run dev
   ```

2. **创建组件**:
   - 按照上述清单逐个创建组件
   - 优先创建 P0 组件

3. **测试验证**:
   - 每个组件创建后立即测试
   - 验证 IPC 通信
   - 确保功能正常

4. **迭代优化**:
   - 收集用户反馈
   - 优化用户体验
   - 修复 bug

---

**最后更新**: 2025-11-16 23:15 UTC+05:00
**状态**: 📋 规划完成，准备实施
