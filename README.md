# Teleflow - Telegram Web 助手

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Test Coverage](https://img.shields.io/badge/coverage-28%25-orange.svg)](htmlcov/index.html)

一个基于 Playwright 的 Telegram Web 自动化助手，支持关键词自动回复、自动已读、延时控制等功能。

## ✨ 特性

- 🤖 **智能回复**：支持关键词匹配（字面量 + 通配符）
- ⏱️ **延时控制**：固定延时 + 随机延时，模拟真人响应
- 📖 **自动已读**：检测新消息后自动标记为已读
- 🔧 **配置驱动**：所有行为通过 YAML 配置文件定义
- 🚀 **多账号支持**：一账号一进程，完全隔离（v1.1+）
- 👥 **群组支持**：自动加入群组并回复（v1.1+）
- 📸 **OCR 识别**：识别图片中的数字（v1.2+）

## 🚀 快速开始

### 环境要求

- Python 3.11+
- Windows / macOS / Linux
- Chromium 浏览器（自动安装）

### 安装

```bash
# 克隆项目
git clone <repository-url>
cd xiaohao

# 安装依赖
pip install -e .

# 安装 Playwright 浏览器
playwright install chromium
```

### 首次运行

1. 创建配置文件 `config.yaml`（参考下方示例）
2. 首次登录（显示浏览器）：

```bash
teleflow run --config config.yaml --show-browser
```

3. 在浏览器中完成 Telegram 登录
4. 后续运行（后台模式）：

```bash
teleflow run --config config.yaml
```

## 📋 功能列表

### ✅ MVP 功能 (v1.0)

- **配置系统**：YAML 配置加载与验证
- **数据模型**：Pydantic 数据验证
- **规则引擎**：关键词匹配（字面量 + 通配符 `*`/`?`）
- **延时计算**：固定延时 + 随机延时
- **浏览器管理**：Playwright Chromium 集成
- **消息监控**：定时轮询检测新消息
- **消息操作**：自动已读、发送回复
- **CLI 命令**：`run`, `validate-config`, `--version`

### 🔄 扩展功能 (v1.1+)

- **多账号支持**：一账号一进程模式
- **群组支持**：自动加入群组、发送欢迎消息
- **OCR 识别**：Tesseract 数字识别
- **信号处理**：SIGINT/SIGTERM 优雅退出

### 🚧 计划功能 (v1.2+)

- 桌面端管理界面（Electron + React）
- 正则表达式匹配
- 状态机流程控制
- 性能优化与监控

## ⚙️ 配置文件

创建 `config.yaml` 文件：

```yaml
# 示例配置文件
account:
  name: "test_account"
  browser_data_dir: "./browser_data/test_account"

chat:
  target_username: "target_user"  # 目标聊天用户名

rules:
  - keywords: ["hello", "hi"]
    reply_text: "Hello! How are you?"
    fixed_delay: 2
    random_delay_max: 3
  - keywords: ["*meeting*"]
    reply_text: "I'll join the meeting soon."
    fixed_delay: 1
    random_delay_max: 2

logging:
  level: "INFO"
  file: "./logs/teleflow.log"
```

## 🧪 测试

```bash
# 运行所有测试
pytest

# 运行单元测试
pytest tests/unit/

# 运行集成测试
pytest tests/integration/

# 生成覆盖率报告
pytest --cov=teleflow --cov-report=html
```

## 📁 项目结构

```
teleflow/
├── src/teleflow/           # 源代码
│   ├── config/            # 配置管理
│   ├── models/            # 数据模型
│   ├── engine/            # 规则引擎
│   ├── telegram_web/      # Telegram Web 集成
│   ├── runtime/           # 运行时管理
│   ├── cli/               # 命令行界面
│   └── logging/           # 日志系统
├── tests/                 # 测试代码
├── docs/                  # 文档
├── specs/                 # 规格文档
└── checklists/            # 检查清单
```

## 🛠️ 开发

```bash
# 安装开发依赖
pip install -e ".[dev]"

# 代码格式化
black src/ tests/
isort src/ tests/

# 类型检查
mypy src/teleflow

# 代码检查
flake8 src/ tests/
```

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如有问题，请查看：
- [用户指南](docs/user-guide.md)
- [配置参考](docs/config-reference.md)
- [开发者文档](docs/development.md)
