# Telegram web A Workflow Assistant - MVP1 设计文档

## 一、项目定位

**目标**：为 Telegram web A 用户提供一个**流程化话术控制台**，复刻并优化 PoSend 的核心功能。

**核心价值**：

- 按流程组织话术（而非简单分类）
- 支持流程节点状态驱动（自动展开相关话术）
- 多账号管理
- 侧边栏吸附（非焦点隐藏）

**与 PoSend 的区别**：

| 功能 | PoSend | Telegram web A Workflow Assistant |
|------|--------|------------------------------|
| 话术组织 | 分类/文件夹 | **流程节点** |
| 节点状态 | 无 | **自动展开当前节点** |
| 集成方式 | Win32 API | **CDP (Chrome DevTools Protocol)** |
| 平台 | Windows 桌面 | **Web / Electron** |
| 账号管理 | 标签筛选 | **多 Target 切换** |

---

## 二、UI 设计

### 2.1 整体布局（侧边栏模式）

```text
┌─────────────────────────────────────────┐
│  Telegram web A Workflow Assistant             │
├─────────────────────────────────────────┤
│  [▼ 账号: @user1] [▼ 流程: 客户开发]    │ ← 顶部：折叠式选择器
├─────────────────────────────────────────┤
│                                          │
│  ● 当前节点：询价阶段                   │ ← 状态指示器
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━       │
│                                          │
│  话术 1: 您好，请问需要什么帮助？  ●     │ ← 话术列表
│  话术 2: 我们的产品优势包括...     ●     │   （可滚动）
│  话术 3: 价格请参考附件报价单            │   （颜色标记）
│  话术 4: 感谢您的咨询！                  │
│                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━       │
│  [← 上一步]     [跳过]     [下一步 →]    │ ← 流程控制
└─────────────────────────────────────────┘
```

**布局要点**：

- **宽度**：300-400px（参考 PoSend）
- **高度**：自适应屏幕（最小 400px）
- **位置**：默认吸附到屏幕右侧（可拖动）
- **层级**：Topmost（但不抢焦点）

---

### 2.2 组件详细设计

#### 2.2.1 顶部选择器（CollapsibleHeader）

```tsx
<CollapsibleHeader>
  <Dropdown label="账号" value="@user1">
    <Option value="@user1">账号 1 (@user1)</Option>
    <Option value="@user2">账号 2 (@user2)</Option>
  </Dropdown>

  <Dropdown label="流程" value="customer-dev">
    <Option value="customer-dev">客户开发流程</Option>
    <Option value="after-sales">售后服务流程</Option>
  </Dropdown>
</CollapsibleHeader>
```

**交互**：

- 点击展开下拉菜单
- 选择后自动更新话术列表
- 支持键盘导航（Tab + Enter）

**状态管理**：

```typescript
interface AppState {
  currentAccount: string;    // 当前账号 ID
  currentFlow: string;        // 当前流程 ID
  currentNode: string;        // 当前节点 ID
}
```

---

#### 2.2.2 节点状态指示器（NodeIndicator）

```tsx
<NodeIndicator>
  <StatusDot color="green" />
  <NodeLabel>当前节点：询价阶段</NodeLabel>
</NodeIndicator>
```

**状态类型**：

- 🟢 **进行中**（当前节点）
- 🟡 **等待判定**（需要用户输入）
- 🔴 **已超时**（可选，MVP2）
- ⚪ **已完成**（历史节点）

---

#### 2.2.3 话术列表（ScriptList）

```tsx
<ScriptList>
  {scripts.map(script => (
    <ScriptItem
      key={script.id}
      script={script}
      color={script.color}
      onDoubleClick={() => handleSendScript(script)}
    />
  ))}
</ScriptList>
```

**样式**：

```css
.script-item {
  padding: 12px 16px;
  border-left: 4px solid transparent;
  cursor: pointer;
  transition: background 0.2s;
}

.script-item:hover {
  background: #f0f0f0;
}

.script-item.color-red {
  border-left-color: #f5222d;
}

.script-item.color-purple {
  border-left-color: #722ed1;
}

.script-item.color-green {
  border-left-color: #52c41a;
}
```

**交互**：

- **单击**：选中（高亮）
- **双击**：复制到剪贴板并提示用户粘贴
- **右键**：显示上下文菜单（编辑、删除、标记）

---

#### 2.2.4 流程控制按钮（FlowControls）

```tsx
<FlowControls>
  <Button onClick={handlePrev} disabled={!hasPrev}>
    ← 上一步
  </Button>

  <Button onClick={handleSkip} variant="secondary">
    跳过
  </Button>

  <Button onClick={handleNext} disabled={!hasNext}>
    下一步 →
  </Button>
</FlowControls>
```

**逻辑**：

```typescript
function handleNext() {
  const nextNode = flowEngine.getNextNode(currentNode);
  if (nextNode) {
    setCurrentNode(nextNode.id);
    loadScriptsForNode(nextNode.id);
  }
}

function handleSkip() {
  // 跳过当前节点，直接进入下一个
  const nextNode = flowEngine.skipNode(currentNode);
  setCurrentNode(nextNode.id);
}
```

---

### 2.3 节点自动展开逻辑

**需求回顾**：
> 节点判定下不成功有很多话术，判定成功下一句，根据当前节点自动展开

**实现方案**：

#### 场景 1：节点判定成功 → 自动进入下一节点

```typescript
// 流程定义示例
const flow = {
  id: 'customer-dev',
  nodes: [
    {
      id: 'greeting',
      label: '问候语',
      scripts: ['script-1'],
      nextNode: 'inquiry',         // 成功后自动进入
      condition: 'auto'             // 自动判定（发送任意话术即成功）
    },
    {
      id: 'inquiry',
      label: '询价阶段',
      scripts: ['script-2', 'script-3', 'script-4'],
      nextNode: 'quotation',
      condition: 'manual'           // 手动判定（点击"下一步"）
    }
  ]
};
```

**自动推进逻辑**：

```typescript
async function onScriptSent(script: Script) {
  const currentNode = flowEngine.getCurrentNode();

  if (currentNode.condition === 'auto') {
    // 自动判定成功，进入下一节点
    await delay(500); // 延迟 500ms，让用户看到发送效果
    const nextNode = flowEngine.getNextNode(currentNode.id);
    setCurrentNode(nextNode.id);
    loadScriptsForNode(nextNode.id);

    // 提示用户
    showToast(`已自动进入：${nextNode.label}`);
  }
}
```

---

#### 场景 2：节点判定失败 → 展开多个备选话术

```typescript
const flow = {
  nodes: [
    {
      id: 'objection-handling',
      label: '异议处理',
      scripts: [
        'script-price-too-high',
        'script-not-interested',
        'script-need-time-to-think',
        'script-compare-with-competitor'
      ],
      nextNode: 'closing',
      condition: 'choice'  // 用户选择某个话术后判定成功
    }
  ]
};
```

**展开逻辑**：

```typescript
// 当前节点的所有话术默认全部展开
function loadScriptsForNode(nodeId: string) {
  const node = flowEngine.getNode(nodeId);
  const scripts = node.scripts.map(id => scriptLibrary.getScript(id));

  // 全部展开显示
  setScripts(scripts);
  setExpandAll(true);  // 不需要手动点击展开
}
```

---

#### 场景 3：基于消息内容自动判定（MVP2）

```typescript
// 示例：检测到对方回复"价格太高"，自动切换到异议处理节点
async function onMessageReceived(message: Message) {
  if (message.isOut) return; // 只处理入站消息

  const currentNode = flowEngine.getCurrentNode();
  const matchedNode = flowEngine.matchNodeByMessage(message.text);

  if (matchedNode && matchedNode.id !== currentNode.id) {
    setCurrentNode(matchedNode.id);
    loadScriptsForNode(matchedNode.id);
    showToast(`检测到：${matchedNode.label}，已自动切换`);
  }
}
```

---

## 三、数据模型

### 3.1 核心类型定义

```typescript
// Account - 账号
interface Account {
  id: string;              // 账号 ID（从 CDP target 提取）
  username: string;        // @username
  targetId: string;        // CDP target ID
  cdpClient?: any;         // CDP 客户端实例
}

// Flow - 流程
interface Flow {
  id: string;
  label: string;
  description?: string;
  nodes: FlowNode[];
  startNode: string;       // 起始节点 ID
}

// FlowNode - 流程节点
interface FlowNode {
  id: string;
  label: string;
  scripts: string[];       // 关联的话术 ID 数组
  nextNode?: string;       // 下一个节点 ID
  condition: 'auto' | 'manual' | 'choice' | 'message-match';
  messagePattern?: string; // 消息匹配模式（正则）
  position?: number;       // 排序位置
}

// Script - 话术
interface Script {
  id: string;
  label: string;           // 显示标题
  content: ScriptContent[];// 富文本内容
  color?: 'red' | 'purple' | 'green' | 'blue';
  tags?: string[];         // 标签（可选）
  position?: number;       // 排序
}

interface ScriptContent {
  type: 'text' | 'image';
  value: string;           // 文本内容或图片 URL
}

// Session - 会话状态
interface Session {
  accountId: string;
  chatId: string;
  flowId: string;
  currentNode: string;
  history: string[];       // 历史节点 ID
  createdAt: number;
  updatedAt: number;
}
```

---

### 3.2 配置文件结构

#### accounts.json

```json
{
  "accounts": [
    {
      "id": "account-1",
      "username": "@user1",
      "targetId": "CDP_TARGET_ID_1"
    }
  ]
}
```

#### flows/customer-dev.json

```json
{
  "id": "customer-dev",
  "label": "客户开发流程",
  "description": "从初次接触到成交的标准流程",
  "startNode": "greeting",
  "nodes": [
    {
      "id": "greeting",
      "label": "问候语",
      "scripts": ["script-greeting-1", "script-greeting-2"],
      "nextNode": "inquiry",
      "condition": "auto"
    },
    {
      "id": "inquiry",
      "label": "询价阶段",
      "scripts": ["script-inquiry-1", "script-inquiry-2", "script-inquiry-3"],
      "nextNode": "quotation",
      "condition": "manual"
    },
    {
      "id": "quotation",
      "label": "报价",
      "scripts": ["script-quotation-1"],
      "nextNode": "objection",
      "condition": "auto"
    },
    {
      "id": "objection",
      "label": "异议处理",
      "scripts": [
        "script-objection-price",
        "script-objection-quality",
        "script-objection-timing"
      ],
      "nextNode": "closing",
      "condition": "choice"
    },
    {
      "id": "closing",
      "label": "成交",
      "scripts": ["script-closing-1", "script-closing-2"],
      "nextNode": null,
      "condition": "manual"
    }
  ]
}
```

#### scripts/demo-scripts.json

```json
{
  "scripts": [
    {
      "id": "script-greeting-1",
      "label": "标准问候",
      "content": [
        {
          "type": "text",
          "value": "您好，请问需要什么帮助？"
        }
      ],
      "color": "green",
      "position": 1
    },
    {
      "id": "script-objection-price",
      "label": "价格异议处理",
      "content": [
        {
          "type": "text",
          "value": "我理解您对价格的关注。我们的产品在同类中性价比是非常高的，而且质量有保障。我可以为您详细说明一下我们的优势..."
        }
      ],
      "color": "red",
      "position": 1
    }
  ]
}
```

---

## 四、核心模块设计

### 4.1 FlowEngine - 流程引擎

```typescript
export class FlowEngine {
  private flows: Map<string, Flow>;
  private currentFlow: Flow | null = null;
  private currentNode: FlowNode | null = null;

  constructor(flows: Flow[]) {
    this.flows = new Map(flows.map(f => [f.id, f]));
  }

  // 加载流程
  loadFlow(flowId: string): void {
    const flow = this.flows.get(flowId);
    if (!flow) throw new Error(`Flow not found: ${flowId}`);

    this.currentFlow = flow;
    this.currentNode = flow.nodes.find(n => n.id === flow.startNode) || null;
  }

  // 获取当前节点
  getCurrentNode(): FlowNode | null {
    return this.currentNode;
  }

  // 获取下一个节点
  getNextNode(): FlowNode | null {
    if (!this.currentNode || !this.currentNode.nextNode) return null;
    return this.currentFlow?.nodes.find(n => n.id === this.currentNode!.nextNode) || null;
  }

  // 前进到下一节点
  moveToNext(): boolean {
    const next = this.getNextNode();
    if (next) {
      this.currentNode = next;
      return true;
    }
    return false;
  }

  // 跳过当前节点
  skipNode(): FlowNode | null {
    this.moveToNext();
    return this.currentNode;
  }

  // 基于消息匹配节点（MVP2）
  matchNodeByMessage(message: string): FlowNode | null {
    if (!this.currentFlow) return null;

    for (const node of this.currentFlow.nodes) {
      if (node.messagePattern) {
        const regex = new RegExp(node.messagePattern, 'i');
        if (regex.test(message)) {
          return node;
        }
      }
    }
    return null;
  }
}
```

---

### 4.2 ScriptLibrary - 话术库

```typescript
export class ScriptLibrary {
  private scripts: Map<string, Script>;

  constructor(scripts: Script[]) {
    this.scripts = new Map(scripts.map(s => [s.id, s]));
  }

  getScript(id: string): Script | null {
    return this.scripts.get(id) || null;
  }

  getScriptsByIds(ids: string[]): Script[] {
    return ids.map(id => this.getScript(id)).filter(Boolean) as Script[];
  }

  searchScripts(query: string): Script[] {
    const results: Script[] = [];
    for (const script of this.scripts.values()) {
      const text = script.content.map(c => c.value).join(' ');
      if (text.includes(query)) {
        results.push(script);
      }
    }
    return results;
  }
}
```

---

### 4.3 SessionManager - 会话管理

```typescript
export class SessionManager {
  private sessions: Map<string, Session>;

  constructor() {
    this.sessions = new Map();
  }

  // 获取或创建会话
  getOrCreateSession(accountId: string, chatId: string, flowId: string): Session {
    const key = `${accountId}-${chatId}`;
    if (!this.sessions.has(key)) {
      this.sessions.set(key, {
        accountId,
        chatId,
        flowId,
        currentNode: '',
        history: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
    return this.sessions.get(key)!;
  }

  // 更新会话节点
  updateNode(accountId: string, chatId: string, nodeId: string): void {
    const session = this.getOrCreateSession(accountId, chatId, '');
    session.history.push(session.currentNode);
    session.currentNode = nodeId;
    session.updatedAt = Date.now();
  }

  // 保存到 localStorage
  save(): void {
    const data = Array.from(this.sessions.entries());
    localStorage.setItem('sessions', JSON.stringify(data));
  }

  // 从 localStorage 加载
  load(): void {
    const data = localStorage.getItem('sessions');
    if (data) {
      this.sessions = new Map(JSON.parse(data));
    }
  }
}
```

---

### 4.4 CDPBridge - CDP 桥接（Adapter）

```typescript
// MVP1 阶段：仅提供接口定义，实现为 stub
export interface ICDPBridge {
  connect(): Promise<void>;
  listAccounts(): Promise<Account[]>;
  onMessageReceived(callback: (msg: Message) => void): void;
  sendScript(script: Script): Promise<boolean>;
}

// Stub 实现（MVP1）
export class CDPBridgeStub implements ICDPBridge {
  async connect(): Promise<void> {
    console.log('[CDPBridge] Stub: connect()');
  }

  async listAccounts(): Promise<Account[]> {
    return [
      { id: 'account-1', username: '@demo1', targetId: 'target-1' },
      { id: 'account-2', username: '@demo2', targetId: 'target-2' }
    ];
  }

  onMessageReceived(callback: (msg: Message) => void): void {
    console.log('[CDPBridge] Stub: onMessageReceived()');
  }

  async sendScript(script: Script): Promise<boolean> {
    const text = script.content.map(c => c.value).join('\n');
    await navigator.clipboard.writeText(text);
    console.log('[CDPBridge] Stub: 已复制到剪贴板:', text);
    return true;
  }
}
```

---

## 五、MVP1 实施计划

### 5.1 技术栈

**前端**：

- React 18 + TypeScript
- Vite（构建工具）
- Ant Design（UI 组件库）
- Zustand（状态管理）

**可选（MVP2）**：

- Electron（桌面端封装）
- chrome-remote-interface（CDP 客户端）

---

### 5.2 目录结构

```text
Telegram web A-flow/
├── config/                      # 配置文件
│   ├── accounts.json
│   ├── flows/
│   │   ├── customer-dev.json
│   │   └── after-sales.json
│   └── scripts/
│       └── demo-scripts.json
├── src/
│   ├── core/                    # 核心业务逻辑
│   │   ├── flow-engine/
│   │   │   └── FlowEngine.ts
│   │   ├── script-library/
│   │   │   └── ScriptLibrary.ts
│   │   ├── session-manager/
│   │   │   └── SessionManager.ts
│   │   └── adapters/
│   │       └── cpb-bridge/
│   │           ├── ICDPBridge.ts
│   │           └── CDPBridgeStub.ts
│   ├── types/                   # 类型定义
│   │   ├── account.ts
│   │   ├── flow.ts
│   │   ├── script.ts
│   │   └── session.ts
│   ├── ui/                      # UI 组件
│   │   ├── components/
│   │   │   ├── CollapsibleHeader.tsx
│   │   │   ├── NodeIndicator.tsx
│   │   │   ├── ScriptList.tsx
│   │   │   ├── ScriptItem.tsx
│   │   │   └── FlowControls.tsx
│   │   └── pages/
│   │       └── MainPage.tsx
│   ├── store/                   # 状态管理
│   │   └── useAppStore.ts
│   ├── App.tsx
│   └── main.tsx
├── docs/                        # 文档（已完成）
│   ├── POSEND_ANALYSIS.md
│   ├── Telegram web A_ANALYSIS.md
│   ├── LEGACY_INSIGHTS.md
│   └── MVP1_DESIGN.md
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

### 5.3 分步实施（3-5 天）

#### Day 1：项目初始化 + 数据模型

- [x] 创建 Vite + React + TS 项目
- [x] 定义核心类型（types/）
- [x] 创建 Demo 配置文件（config/）
- [ ] 编写 FlowEngine、ScriptLibrary、SessionManager

#### Day 2：UI 框架搭建

- [ ] 搭建 MainPage 布局
- [ ] 实现 CollapsibleHeader（账号/流程选择）
- [ ] 实现 ScriptList（话术列表）
- [ ] 实现 FlowControls（上一步/下一步）

#### Day 3：业务逻辑集成

- [ ] 连接 FlowEngine 到 UI
- [ ] 实现节点自动展开逻辑
- [ ] 实现双击复制到剪贴板
- [ ] 添加 Toast 提示

#### Day 4：样式优化 + 测试

- [ ] 侧边栏样式调整
- [ ] 颜色标记
- [ ] 响应式布局
- [ ] 手动测试流程切换

#### Day 5：文档 + 演示

- [ ] 编写 README
- [ ] 录制演示视频
- [ ] 准备 Demo 数据

---

### 5.4 验证命令

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 类型检查
npx tsc --noEmit

# 构建
npm run build
```

---

## 六、后续版本规划

### MVP2（1-2 周）

- [ ] 真实 CDP 集成（替换 Stub）
- [ ] 消息监听 + 自动推荐
- [ ] 会话切换自动保存状态
- [ ] 窗口吸附功能

### MVP3（2-4 周）

- [ ] 基于消息内容自动判定节点
- [ ] 流程可视化编辑器
- [ ] 话术库在线编辑
- [ ] 数据统计与分析

---

## 七、总结

### 核心特性

1. ✅ **侧边栏 UI**：复刻 PoSend 风格，侧边吸附
2. ✅ **流程化组织**：按节点组织话术，而非简单分类
3. ✅ **节点自动展开**：根据当前状态展开相关话术
4. ✅ **多账号管理**：支持切换 Telegram web A 的多个账号
5. ⏸️ **剪贴板注入**：MVP1 提示用户粘贴，MVP2 自动发送

### 技术亮点

- **数据驱动**：流程、节点、话术全部配置化
- **状态管理**：使用 Zustand 管理全局状态
- **适配器模式**：CDP 桥接层抽象，便于替换实现
- **类型安全**：TypeScript 严格类型检查

### MVP1 交付物

1. 可运行的 Web 应用（侧边栏 UI）
2. 流程引擎（支持自动/手动推进）
3. 话术库（支持颜色标记）
4. Demo 配置（客户开发流程 + 10+ 话术）
5. 完整文档（4 份调研报告 + 1 份设计文档）
