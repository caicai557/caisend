# Teleflow 开发者指南

## 项目概述

Teleflow 是一个基于 Telegram Web 的自动回复助手，使用 Python 3.11+ 和 Playwright 实现。

### 技术栈

- **语言**: Python 3.11+
- **Web 自动化**: Playwright (Chromium)
- **数据验证**: Pydantic v2
- **配置格式**: YAML (PyYAML)
- **测试框架**: Pytest + pytest-cov + pytest-asyncio
- **类型检查**: Pyright
- **代码格式**: Black (可选)

## 项目结构

```
xiaohao/
├── src/teleflow/          # 源代码
│   ├── __init__.py
│   ├── __main__.py        # 入口点
│   ├── cli/               # 命令行界面
│   │   ├── main.py        # CLI 主逻辑
│   │   └── __init__.py
│   ├── config/            # 配置管理
│   │   ├── loader.py      # 配置加载器
│   │   ├── validator.py   # 配置验证器
│   │   └── __init__.py
│   ├── models/            # 数据模型
│   │   ├── account.py     # 账号模型
│   │   ├── chat.py        # 聊天模型
│   │   ├── config.py      # 根配置模型
│   │   ├── group.py       # 群组模型
│   │   ├── message.py     # 消息模型
│   │   ├── rule.py        # 规则模型
│   │   └── __init__.py
│   ├── rules/             # 规则引擎
│   │   ├── engine.py      # 规则匹配引擎
│   │   ├── delay.py       # 延时计算器
│   │   └── __init__.py
│   ├── telegram_web/      # Telegram Web 集成
│   │   ├── browser.py     # 浏览器管理
│   │   ├── navigator.py   # 聊天导航
│   │   ├── monitor.py     # 消息监控
│   │   ├── actions.py     # 消息操作
│   │   ├── groups.py      # 群组管理
│   │   ├── selectors.py   # CSS 选择器
│   │   └── __init__.py
│   ├── runtime/           # 运行时
│   │   ├── runner.py      # 账号运行器
│   │   ├── signals.py     # 信号处理
│   │   └── __init__.py
│   └── ocr/               # OCR 模块 (v1.2+)
│       ├── types.py       # OCR 数据类型
│       ├── preprocessor.py # 图片预处理
│       ├── recognizer.py  # 数字识别
│       └── __init__.py
├── tests/                 # 测试代码
│   ├── unit/              # 单元测试
│   ├── integration/       # 集成测试
│   ├── fixtures/          # 测试夹具
│   └── __init__.py
├── docs/                  # 文档
│   ├── user-guide.md      # 用户手册
│   ├── config-reference.md # 配置参考
│   └── development.md     # 本文档
├── specs/                 # 规格说明
│   └── 001-telegram-web-assistant/
│       ├── spec.md        # 功能规格
│       ├── plan.md        # 技术方案
│       ├── tasks.md       # 任务清单
│       └── constitution.md # 项目宪法
├── pyproject.toml         # 项目配置
├── pyrightconfig.json     # Pyright 配置
└── README.md              # 项目说明

```

## 开发环境搭建

### 1. 克隆项目

```bash
git clone <repository-url>
cd xiaohao
```

### 2. 创建虚拟环境

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. 安装依赖

```bash
# 开发模式安装
pip install -e ".[dev]"

# 或直接安装
pip install -e .

# 安装 Playwright 浏览器
playwright install chromium
```

### 4. 验证安装

```bash
# 检查版本
python -m teleflow --version

# 运行测试
pytest tests/ -v

# 类型检查
pyright src/
```

## 核心模块说明

### 1. 配置系统 (`config/`)

**ConfigLoader** - 配置加载器
- 从 YAML 文件加载配置
- 支持环境变量替换
- 提供配置验证

**ConfigValidator** - 配置验证器
- 验证配置结构
- 检查字段类型
- 验证业务规则

示例：
```python
from teleflow.config.loader import ConfigLoader

loader = ConfigLoader()
config = loader.load_from_file("config.yaml")
```

### 2. 数据模型 (`models/`)

使用 Pydantic v2 定义数据模型，提供：
- 自动类型验证
- 字段默认值
- 自定义验证器
- JSON 序列化

核心模型：
- `TeleflowConfig`: 根配置
- `Account`: 账号配置
- `Rule`: 关键词规则
- `Chat`: 聊天配置
- `Message`: 消息数据

### 3. 规则引擎 (`rules/`)

**RuleEngine** - 规则匹配引擎
- 支持字面量匹配
- 支持通配符（`*`, `?`）
- 支持大小写敏感配置
- 按顺序返回第一个匹配

**DelayCalculator** - 延时计算器
- 固定延时 + 随机延时
- 支持随机种子（测试用）

示例：
```python
from teleflow.rules.engine import RuleEngine

engine = RuleEngine(account)
result = engine.process_message("hello world")
if result.matched:
    print(f"匹配规则: {result.matched_keyword}")
    print(f"回复: {result.reply_text}")
    print(f"延时: {result.delay}秒")
```

### 4. Telegram Web 集成 (`telegram_web/`)

**BrowserManager** - 浏览器管理
- 启动/关闭 Chromium
- 会话持久化
- Headless 模式支持

**ChatNavigator** - 聊天导航
- 搜索聊天
- 导航到聊天
- 登录状态检测

**MessageMonitor** - 消息监控
- 检测新消息
- 获取消息内容
- 超时处理

**MessageActions** - 消息操作
- 标记已读
- 发送消息
- 选择器回退机制

### 5. 运行时 (`runtime/`)

**AccountRunner** - 账号运行器
- 主循环管理
- 消息监控与处理
- 规则匹配与回复
- 错误处理与降级

## 测试运行

### 运行所有测试

```bash
pytest tests/ -v
```

### 运行特定测试

```bash
# 单元测试
pytest tests/unit/ -v

# 集成测试
pytest tests/integration/ -v

# 特定文件
pytest tests/unit/test_models.py -v
```

### 测试覆盖率

```bash
# 生成覆盖率报告
pytest tests/ --cov=teleflow --cov-report=html

# 查看报告
# 打开 htmlcov/index.html
```

### 异步测试

使用 `pytest-asyncio` 标记异步测试：

```python
import pytest

@pytest.mark.asyncio
async def test_async_function():
    result = await some_async_function()
    assert result is True
```

## 代码规范

### 类型注解

使用 Python 类型注解：

```python
from typing import Optional, List

def process_message(text: str, rules: List[Rule]) -> Optional[str]:
    """处理消息"""
    pass
```

### 文档字符串

使用 Google 风格文档字符串：

```python
def calculate_delay(rule: Rule) -> float:
    """计算延时
    
    Args:
        rule: 规则对象
        
    Returns:
        float: 延时时间（秒）
        
    Raises:
        ValueError: 如果延时参数无效
    """
    pass
```

### 错误处理

优先使用具体的异常类型：

```python
try:
    config = loader.load_from_file(path)
except FileNotFoundError:
    print(f"配置文件不存在: {path}")
except yaml.YAMLError as e:
    print(f"YAML 解析错误: {e}")
```

## 调试技巧

### 1. 启用调试日志

```bash
teleflow run --config config.yaml --debug
```

### 2. 显示浏览器界面

```bash
teleflow run --config config.yaml --show-browser
```

### 3. 使用 Python 调试器

```python
import pdb; pdb.set_trace()
```

### 4. Playwright 调试

```python
# 在代码中添加
await page.pause()  # 暂停并打开 Playwright Inspector
```

## 常见开发任务

### 添加新的配置字段

1. 在 `models/config.py` 中添加字段
2. 更新 `config/validator.py` 验证逻辑
3. 添加单元测试
4. 更新文档

### 添加新的规则类型

1. 在 `models/rule.py` 中扩展 Rule 模型
2. 更新 `rules/engine.py` 匹配逻辑
3. 添加测试用例
4. 更新配置示例

### 添加新的 CLI 命令

1. 在 `cli/main.py` 中添加子命令
2. 实现命令处理函数
3. 添加参数解析
4. 更新帮助文档

## 性能优化

### 1. 减少轮询频率

调整 `runtime.check_interval` 配置：

```yaml
runtime:
  check_interval: 3.0  # 增加到 3 秒
```

### 2. 启用 Headless 模式

```yaml
browser:
  headless: true
```

### 3. 优化选择器

在 `telegram_web/selectors.py` 中使用更具体的选择器。

## 贡献指南

### 提交代码前

1. 运行所有测试
2. 检查类型注解
3. 更新文档
4. 遵循代码规范

### Pull Request 流程

1. Fork 项目
2. 创建功能分支
3. 提交代码
4. 创建 Pull Request
5. 等待代码审查

## 故障排查

### Playwright 安装失败

```bash
# 重新安装
playwright install chromium --force

# 检查版本
playwright --version
```

### 类型检查错误

```bash
# 运行 Pyright
pyright src/

# 忽略特定错误
# type: ignore[import-not-found]
```

### 测试失败

```bash
# 详细输出
pytest tests/ -vv

# 显示打印
pytest tests/ -s

# 停在第一个失败
pytest tests/ -x
```

## 更多资源

- [用户使用手册](user-guide.md)
- [配置文件参考](config-reference.md)
- [Playwright 文档](https://playwright.dev/python/)
- [Pydantic 文档](https://docs.pydantic.dev/)
- [Pytest 文档](https://docs.pytest.org/)

## 联系方式

- GitHub Issues: <repository-url>/issues
- 邮件: your-email@example.com
