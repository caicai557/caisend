# Teleflow - Telegram Web 助手

一个基于 Playwright 的 Telegram Web 自动化助手，支持单账号、单聊天的自动已读和关键词回复功能。

## 🚀 快速开始

### 环境要求

- Python 3.11+
- Windows 操作系统
- 现代浏览器（Chromium/Chrome）

### 安装

```bash
# 克隆项目
git clone <repository-url>
cd teleflow

# 安装依赖
pip install -e .

# 安装 Playwright 浏览器
playwright install chromium
```

### 基本使用

```bash
# 查看版本
python -m teleflow.cli --version

# 运行（需要先配置 config.yaml）
python -m teleflow.cli run --config config.yaml
```

## 📋 功能特性

### MVP 功能 (v1.0)

- ✅ **单账号管理**：支持配置一个 Telegram 账号
- ✅ **单聊天监控**：监控指定私聊对象的新消息
- ✅ **自动已读**：检测到新消息后自动标记为已读
- ✅ **关键词回复**：基于字面量和通配符匹配，自动回复预设文本
- ✅ **延时控制**：支持固定延时 + 随机延时，模拟真人响应
- ✅ **YAML 配置**：所有行为通过配置文件定义
- ✅ **命令行界面**：提供简洁的 CLI 操作

### 扩展功能 (v1.1+)

- 🔄 多账号并行运行
- 🔄 群组消息监控和回复
- 🔄 OCR 图片识别
- 🔄 桌面端管理界面

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
