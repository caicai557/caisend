# Implementation Plan: Telegram Web 助手

**Branch**: `001-telegram-web-assistant` | **Date**: 2025-01-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-telegram-web-assistant/spec.md`

## Summary

本项目通过 Playwright 自动化 Telegram Web，为 Windows 用户提供命令行界面的自动化消息管理助手。

**MVP 核心功能**（v1.0）：

- 单账号管理：支持配置一个 Telegram 账号，通过 CLI 启动运行
- 单聊天监控：监控一个私聊对象的新消息
- 自动已读：检测到新消息后，自动滚动并标记为已读
- 单节点关键词自动回复：基于字面量关键词 + 通配符（`*`、`?`）匹配规则，自动回复预设文本
- 延时配置：支持固定延时 + 随机延时，模拟真人响应速度
- YAML 配置驱动：所有行为通过 YAML 配置文件定义
- 命令行界面：提供 `teleflow run` 等 CLI 命令

**技术路径**：

- 使用 Playwright（Python）驱动 Telegram Web 页面自动化
- 使用 Pydantic 进行配置验证和数据模型定义
- 使用 pyyaml 解析 YAML 配置文件
- 采用单体应用架构，模块化设计

## Technical Context

**Language/Version**: Python 3.11+
**Primary Dependencies**:

- Playwright（浏览器自动化）
- pyyaml（YAML 配置解析）
- Pydantic（数据模型与配置验证）
- click（命令行界面）

**Storage**: 本地文件系统（浏览器数据目录、配置文件、日志文件）
**Testing**: pytest（单元测试 + 集成测试）
**Target Platform**: Windows 10/11
**Project Type**: Single（单体应用，命令行工具）
**Performance Goals**:

- 轮询间隔 2-3 秒
- 已读标记响应时间 < 2 秒（不包括网络延时）
- 延时计算和回复发送总耗时 < 配置延时 + 1 秒

**Constraints**:

- 单账号 + 单聊天（MVP）
- 仅支持字面量关键词 + 通配符匹配
- 不使用 Telegram 官方 API
- 连续运行 24 小时不崩溃
- 浏览器数据和日志仅本地存储

**Scale/Scope**:

- MVP: 1 个账号，1 个聊天，10-20 条规则
- v1.1+: 多个账号（一账号一进程），多个聊天

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ 已遵守的原则

| 原则 | 检查项 | 状态 |
|------|--------|------|
| 一、代码与工程质量 | 使用 Python 类型提示（Type Hints） | ✅ 已规划 |
| 一、代码与工程质量 | 遵循 PEP 8 规范，使用 black/ruff 自动格式化 | ✅ 已规划 |
| 一、代码与工程质量 | 关键逻辑（规则匹配、延时计算）具备单元测试 | ✅ 已规划 |
| 二、架构风格 | 单代码库，单体应用架构 | ✅ 已遵守 |
| 二、架构风格 | MVP 严格定义为单账号 + 单聊天 + CLI | ✅ 已遵守 |
| 二、架构风格 | 避免过度设计（不实现多节点流程引擎、桌面 UI、OCR） | ✅ 已遵守 |
| 三、平台与技术约束 | Windows + Python 3.11+ | ✅ 已遵守 |
| 三、平台与技术约束 | 使用 Playwright 控制 Telegram Web | ✅ 已遵守 |
| 三、平台与技术约束 | 唯一使用 YAML 格式配置 | ✅ 已遵守 |
| 四、功能边界与重点 | MVP 核心能力仅7项（单账号、单聊天、自动已读、单节点关键词回复、延时、YAML配置、CLI） | ✅ 已遵守 |
| 五、配置驱动与扩展性 | 所有行为通过 YAML 配置文件定义 | ✅ 已遵守 |

### ⚠️ 需要在实现中注意的原则

| 原则 | 注意事项 |
|------|----------|
| 二、实现纪律 | 禁止提前实现 v1.1+ 功能（多账号、桌面UI、OCR） |
| 二、实现纪律 | 配置文件结构保持最简，不引入复杂嵌套或预留字段 |
| 五、MVP 扩展预留 | 规则数据模型应保持可扩展性（字段命名抽象），但不实现多节点流程逻辑 |

## Project Structure

### Documentation (this feature)

```text
specs/001-telegram-web-assistant/
├── spec.md              # 功能规格说明书
├── plan.md              # 本文件（技术实施方案）
├── tasks.md             # 任务清单（已生成）
└── checklists/          # 质量检查清单
    └── requirements.md  # 规格质量检查清单
```

### Source Code (repository root)

```text
src/teleflow/
├── __init__.py
├── config/              # 配置模块
│   ├── __init__.py
│   ├── schema.py        # Pydantic 配置模型定义
│   ├── loader.py        # YAML 配置加载器
│   └── validator.py     # 配置校验器
├── models/              # 数据模型
│   ├── __init__.py
│   ├── account.py       # Account 模型
│   ├── chat.py          # Chat 模型
│   ├── rule.py          # KeywordRule 模型
│   └── message.py       # Message 模型
├── engine/              # 规则引擎
│   ├── __init__.py
│   ├── matcher.py       # RuleMatcher（规则匹配器）
│   └── delay.py         # DelayCalculator（延时计算器）
├── telegram_web/        # Telegram Web 集成
│   ├── __init__.py
│   ├── browser.py       # BrowserManager（浏览器管理）
│   ├── navigator.py     # ChatNavigator（聊天导航）
│   ├── monitor.py       # MessageMonitor（消息监控）
│   └── actions.py       # MessageActions（消息操作）
├── runtime/             # 运行时
│   ├── __init__.py
│   └── runner.py        # 主循环和账号执行
├── cli/                 # 命令行接口
│   ├── __init__.py
│   └── main.py          # CLI 入口点
└── logging/             # 日志配置
    ├── __init__.py
    └── setup.py         # 日志初始化

tests/
├── unit/                # 单元测试
│   ├── test_matcher.py
│   ├── test_delay.py
│   ├── test_config.py
│   └── test_models.py
├── integration/         # 集成测试
│   ├── test_telegram_web.py
│   └── test_runtime.py
└── fixtures/            # 测试夹具
    └── sample_config.yaml

docs/                    # 文档
├── user-guide.md        # 用户指南
├── config-reference.md  # 配置参考
└── development.md       # 开发者指南

browser_data/            # 浏览器数据目录（gitignore）
└── {account_name}/      # 每个账号独立数据目录

logs/                    # 日志文件（gitignore）
└── teleflow.log

pyproject.toml           # 项目元数据和依赖
README.md                # 项目说明
.gitignore
mypy.ini                 # mypy 配置
pytest.ini               # pytest 配置
```

**Structure Decision**: 选择单体应用架构（Option 1），采用模块化设计。所有代码集中在 `src/teleflow/` 目录下，按职责划分为配置、数据模型、规则引擎、Telegram Web 集成、CLI 运行时和日志模块。测试代码放在 `tests/` 目录，按单元测试和集成测试分类。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**无复杂度违规**：本项目严格遵守宪法的 MVP 优先和避免过度设计原则，不引入不必要的复杂度。

---

## 详细技术设计

### 1. 配置管理

#### MVP 配置文件结构

```yaml
# config.yaml - MVP 最小配置示例
account:
  name: "my_account"                          # 账号名称
  browser_data_dir: "./browser_data/my_account"  # 浏览器数据目录（可选）

chat:
  identifier: "@friend_username"              # 聊天对象（用户名或聊天名称）

rules:
  - keywords: ["你好", "hello"]              # 关键词列表
    reply_text: "你好！有什么可以帮助你的吗？"   # 回复文本
    fixed_delay: 2.0                         # 固定延时（秒）
    random_delay_max: 3.0                    # 随机延时上限（秒）
    case_sensitive: false                    # 是否区分大小写（默认false）

  - keywords: ["*帮助*", "*help*"]           # 支持通配符
    reply_text: "请告诉我您需要什么帮助？"
    fixed_delay: 1.5
    random_delay_max: 2.0
```

**扩展性预留**（v1.1+ 设计考虑）：

- `account` 字段可扩展为 `accounts` 列表
- `chat` 字段可扩展为 `chats` 列表
- 规则模型保持字段命名抽象，便于未来扩展

### 2. 规则引擎设计

#### 单节点模式（MVP）

**设计原则**：

- **当前版本仅实现基于单条规则的决策逻辑**：匹配 → 延时 → 回复
- **规则数据模型的扩展性设计**：
  - 使用通用字段命名（如 `id`、`condition`、`action`），使规则可以在未来自然扩展为"节点"
  - 保留可选的扩展字段（如 `next_id`、`next_node`），当前版本可以不使用
  - 避免在 MVP 中引入节点跳转、状态机、环检测等复杂逻辑
- **不在当前版本实现**：多节点流程引擎的具体设计（节点图、状态持久化方案等）仅在未来规划中说明

**数据模型字段映射**（抽象字段 → 配置字段）：

- `id` → `rule_id`（规则唯一标识符）
- `condition` → `keywords`（关键词匹配条件，支持字面量 + 通配符）
- `action` → `reply_text`（回复文本）、`fixed_delay`（固定延时）、`random_delay_max`（随机延时上限）
- 扩展字段：`next_id`（预留，v2.0 多节点流程）、`case_sensitive`（区分大小写）、`use_regex`（预留，v1.3+ 正则表达式）

#### 规则匹配器（RuleMatcher）

**职责**：

- 遍历规则列表，返回第一个匹配的规则
- 支持字面量关键词匹配
- 支持通配符 `*`（匹配任意字符）和 `?`（匹配单个字符）
- 支持区分大小写/不区分大小写

**接口设计**：

```python
class RuleMatcher:
    def match(self, message_text: str) -> Optional[KeywordRuleConfig]:
        """匹配消息文本，返回第一个匹配的规则"""
        pass
```

**扩展性预留**：

- `RuleMatcher` 接口设计允许未来替换为节点执行引擎
- `KeywordRuleConfig` 可保留可选字段（`node_id`、`next_node`），当前版本不使用
- 匹配逻辑可扩展为支持正则表达式（v1.3+）

#### 延时计算器（DelayCalculator）

**职责**：

- 计算回复延时时间
- 公式：`fixed_delay + random(0, random_delay_max)`

**接口设计**：

```python
class DelayCalculator:
    def calculate_delay(self, rule: KeywordRuleConfig) -> float:
        """计算延时时间（秒）"""
        pass
```

---

### 3. 错误处理策略

#### Playwright 超时逻辑

**策略**：

- 所有 Playwright 操作设置合理的超时时间（默认 5 秒）
- 超时后记录错误日志，不中断主循环
- 关键操作（如页面导航）重试 3 次，间隔 5 秒

**实现示例**：

```python
def navigate_to_chat(self, chat_identifier: str, max_retries: int = 3) -> bool:
    for attempt in range(max_retries):
        try:
            search_box = self.page.locator('input[placeholder*="Search"]')
            search_box.fill(chat_identifier, timeout=5000)
            first_result = self.page.locator('.chat-list-item').first
            first_result.click(timeout=5000)
            return True
        except PlaywrightTimeout:
            logger.warning(f"导航超时，重试 {attempt+1}/{max_retries}")
            time.sleep(5)
    return False
```

#### 登录失效处理

**检测机制**：

- 检测页面是否包含登录提示元素（如"Enter phone number"）
- 检测是否需要重新输入验证码

**处理流程**：

1. 检测到登录失效
2. 记录 ERROR 级别日志
3. 停止运行（退出主循环）
4. 输出提示信息："会话已过期，请重新登录。运行 `teleflow run --show-browser` 手动登录"

**实现示例**：

```python
def check_login_status(self) -> bool:
    try:
        login_prompt = self.page.locator('input[placeholder*="phone"]')
        if login_prompt.is_visible(timeout=2000):
            return False
        return True
    except PlaywrightTimeout:
        return True  # 没有登录提示，认为已登录
```

#### 网络错误降级模式

**网络错误分类**：

- **页面加载失败**：重试 3 次，间隔 5 秒，仍失败则跳过当前轮询
- **消息发送失败**：重试 2 次，间隔 3 秒，仍失败则记录错误并跳过
- **持续网络错误**（连续 5 次轮询失败）：降级为每 10 秒轮询一次，直到网络恢复

**降级模式实现**：

```python
class AdaptivePolling:
    def __init__(self, normal_interval: float = 2.5, fallback_interval: float = 10.0):
        self.normal_interval = normal_interval
        self.fallback_interval = fallback_interval
        self.consecutive_failures = 0
        self.is_fallback_mode = False

    def on_success(self):
        self.consecutive_failures = 0
        if self.is_fallback_mode:
            logger.info("网络恢复，切换回正常轮询间隔")
            self.is_fallback_mode = False

    def on_failure(self):
        self.consecutive_failures += 1
        if self.consecutive_failures >= 5 and not self.is_fallback_mode:
            logger.warning("检测到持续网络错误，切换到降级模式（10秒轮询）")
            self.is_fallback_mode = True

    def get_interval(self) -> float:
        return self.fallback_interval if self.is_fallback_mode else self.normal_interval
```

#### Telegram Web 结构变化处理

**选择器回退机制**：

- 为关键元素定义多个候选选择器
- 按优先级尝试，第一个成功则使用
- 所有候选选择器均失败时，记录 CRITICAL 错误并停止运行

**选择器配置**：

```python
SELECTORS = {
    "message_content": [
        ".message-content",           # 主选择器
        ".message-text",              # 备用选择器 1
        "[data-content='message']",  # 备用选择器 2
    ],
    "send_button": [
        "button[aria-label='Send']",
        ".send-button",
        "button.btn-send",
    ],
}

def try_locate(self, element_name: str):
    for selector in SELECTORS.get(element_name, []):
        try:
            element = self.page.locator(selector)
            if element.is_visible(timeout=2000):
                logger.debug(f"使用选择器：{selector}")
                return element
        except PlaywrightTimeout:
            continue

    logger.critical(f"无法定位元素：{element_name}，所有候选选择器均失败")
    raise RuntimeError(f"页面结构变化，无法定位元素：{element_name}")
```

**紧急响应流程**：

1. 记录详细错误日志（包括页面截图）
2. 停止运行，避免无效操作
3. 提示用户更新选择器配置或等待项目更新

---

### 4. 部署指南（简单版）

#### 环境要求

- **操作系统**：Windows 10/11
- **Python 版本**：3.11 或更高
- **磁盘空间**：至少 500MB（包括浏览器和依赖）
- **网络**：能够访问 Telegram Web（<https://web.telegram.org）>

#### 安装步骤

**步骤 1：安装 Python**

1. 访问 <https://www.python.org/downloads/>
2. 下载 Python 3.11+ 安装程序
3. 运行安装程序，勾选 "Add Python to PATH"
4. 验证安装：

```powershell
python --version  # 应显示 Python 3.11.x
```

**步骤 2：克隆项目（或下载源代码）**

```powershell
git clone https://github.com/your-org/teleflow.git
cd teleflow
```

**步骤 3：安装依赖**

```powershell
# 安装 Python 依赖
pip install -e .

# 安装 Playwright 浏览器
playwright install chromium
```

**步骤 4：准备 YAML 配置文件**

创建 `config.yaml` 文件：

```yaml
account:
  name: "my_telegram_account"

chat:
  identifier: "@friend_username"  # 替换为实际的用户名或聊天名称

rules:
  - keywords: ["你好", "hello"]
    reply_text: "你好！我是自动回复助手。"
    fixed_delay: 2.0
    random_delay_max: 3.0
    case_sensitive: false
```

**步骤 5：首次登录**

```powershell
# 首次运行时，需要手动登录 Telegram Web
teleflow run --show-browser --config config.yaml
```

操作：

1. 在打开的浏览器窗口中，输入手机号并完成登录
2. 登录成功后，关闭浏览器窗口
3. 浏览器会话已保存到 `./browser_data/my_telegram_account/`

**步骤 6：后台运行**

```powershell
# 后台无头模式运行（推荐）
teleflow run --config config.yaml

# 或者带调试信息运行
teleflow run --config config.yaml --debug
```

#### 验证运行

1. 打开 Telegram（手机或桌面客户端）
2. 向配置的聊天对象发送消息 "你好"
3. 等待 2-5 秒（延时）
4. 查看是否收到自动回复 "你好！我是自动回复助手。"

#### 常见问题

**Q: 提示 "playwright not found"**

```powershell
# 重新安装 Playwright
pip install playwright
playwright install chromium
```

**Q: 提示 "会话已过期"**

```powershell
# 重新登录
teleflow run --show-browser --config config.yaml
```

**Q: 如何停止运行？**

```powershell
# 在终端按 Ctrl+C
```

**Q: 如何查看日志？**

```powershell
# 查看日志文件
type logs\teleflow.log

# 或者使用调试模式运行
teleflow run --config config.yaml --debug
```

---

### 5. 扩展能力（v1.1+）

以下功能为 **v1.1 及以后版本** 的规划，**MVP 阶段不实现**：

#### v1.1 扩展功能

- **多账号独立运行**：支持配置多个账号，一账号一进程模式
- **群组自动加入**：通过邀请链接自动加入群组并发送欢迎消息
- **日志系统完善**：日志按天轮转、结构化输出（JSON Lines）

#### v1.2 扩展功能

- **OCR 数字识别**：使用 Tesseract OCR 识别图片中的数字（验证码、订单号）
- **桌面端 UI 基础版**：Electron/PyQt 图形界面，只读监控账号状态和日志

#### v1.3+ 扩展功能

- **桌面端 UI 完整版**：配置编辑、账号管理、实时监控
- **正则表达式支持**：高级关键词匹配
- **发送者过滤、时间窗口等高级匹配条件**

#### v2.0 扩展功能（需求明确后再实现）

- **多节点流程引擎**：支持复杂对话流程（多轮问答、条件分支、状态记忆）
- **状态持久化与流程跳转**
- **跨平台支持**（macOS、Linux）

---

## 总结与下一步

### 技术方案总结

本技术方案严格遵守宪法的 MVP 优先和避免过度设计原则，聚焦核心功能：

- ✅ 单账号 + 单聊天
- ✅ 单节点关键词自动回复（字面量 + 通配符）
- ✅ 自动已读标记
- ✅ 固定延时 + 随机延时
- ✅ YAML 配置驱动
- ✅ 命令行界面
- ✅ 完善的错误处理策略
- ✅ 简单的部署指南

### 下一步行动

1. **立即开始**：执行 tasks.md 中的阶段 1-4（MVP 核心路径）
2. **验收标准**：
   - 可通过 CLI 启动单个账号
   - 可监控一个私聊，自动标记为已读
   - 收到关键词消息后，在延时后自动回复
   - 单元测试覆盖率 >= 80%
3. **扩展规划**：MVP 稳定后，按版本路线图逐步添加扩展功能

---

**技术方案版本**: 1.0
**创建日期**: 2025-01-16
**对应规格**: spec.md v1.0
**对应宪法**: constitution.md v2.0.1
