# Teleflow 用户使用手册

## 简介

Teleflow 是一个基于 Telegram Web 的自动回复助手，支持关键词匹配、延时回复、自动已读等功能。

## 安装步骤

### 1. 环境要求

- Python 3.11+
- Windows / macOS / Linux
- Playwright 浏览器驱动（自动安装）

### 2. 安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd xiaohao

# 安装 Python 依赖
pip install -e .

# 安装 Playwright 浏览器
playwright install chromium
```

### 3. 验证安装

```bash
python -m teleflow --version
```

## 配置说明

### 配置文件结构

创建 `config.yaml` 文件：

```yaml
version: "1.0"

# 账号配置
accounts:
  - name: primary
    browser_data_dir: ./browser_data/primary
    monitor_chats:
      - "@friend_username"
    rules:
      - keywords:
          - "hello"
          - "hi"
        reply_text: "Hello! How are you?"
        fixed_delay: 2
        random_delay_max: 3
        case_sensitive: false

# 默认账号
default_account: primary

# 日志配置
logging:
  level: INFO
  file: ./logs/teleflow.log

# 浏览器配置
browser:
  headless: true
  timeout: 30

# 运行时配置
runtime:
  check_interval: 2.0
  debug: false
```

### 配置项说明

#### 账号配置（accounts）

- `name`: 账号名称（必填，唯一）
- `browser_data_dir`: 浏览器数据目录（可选，默认 `./browser_data/{name}`）
- `monitor_chats`: 监控的聊天列表（用户名或聊天 ID）
- `rules`: 关键词回复规则列表

#### 规则配置（rules）

- `keywords`: 关键词列表，支持通配符（`*`、`?`）
- `reply_text`: 回复文本
- `fixed_delay`: 固定延时（秒）
- `random_delay_max`: 随机延时上限（秒）
- `case_sensitive`: 是否区分大小写（默认 false）
- `enabled`: 是否启用（默认 true）

#### 通配符支持

- `*`: 匹配任意字符
- `?`: 匹配单个字符

示例：

```yaml
keywords:
  - "*meeting*"  # 匹配包含 "meeting" 的消息
  - "schedule?"  # 匹配 "schedule1", "scheduleA" 等
```

## 使用指南

### 1. 验证配置

```bash
teleflow validate-config --config config.yaml
```

### 2. 首次登录

```bash
# 显示浏览器界面进行登录
teleflow run --config config.yaml --show-browser
```

- 在浏览器中输入手机号和验证码
- 登录成功后会话将保存到 `browser_data/` 目录
- 后续运行无需重复登录

### 3. 后台运行

```bash
# 无头模式运行
teleflow run --config config.yaml
```

### 4. 调试模式

```bash
# 启用调试日志
teleflow run --config config.yaml --debug
```

### 5. 多账号支持（v1.1+）

```yaml
accounts:
  - name: account1
    monitor_chats: ["@user1"]
    rules: [...]
  - name: account2
    monitor_chats: ["@user2"]
    rules: [...]
```

指定账号运行：

```bash
teleflow run --config config.yaml --account account1
```

## 常见问题

### Q1: 如何处理登录失效？

**A**: 删除 `browser_data/` 目录，重新运行 `--show-browser` 登录。

### Q2: 如何调整回复延时？

**A**: 修改规则中的 `fixed_delay` 和 `random_delay_max`：

- 总延时 = `fixed_delay` + random(0, `random_delay_max`)

### Q3: 支持正则表达式吗？

**A**: 当前版本仅支持通配符（`*`、`?`），正则表达式将在 v1.3+ 版本支持。

### Q4: 如何监控多个聊天？

**A**: 在 `monitor_chats` 中添加多个用户名：

```yaml
monitor_chats:
  - "@user1"
  - "@user2"
  - "@group_name"
```

### Q5: 如何停止运行？

**A**: 按 `Ctrl+C` 优雅退出，程序会自动关闭浏览器。

### Q6: 日志文件在哪里？

**A**: 默认位置 `./logs/teleflow.log`，可在配置文件中修改。

### Q7: 如何提升覆盖率？

**A**: 当前测试覆盖率约 28%，主要未覆盖模块为 Playwright 相关功能（需实际浏览器环境）。可通过集成测试补充。

## 故障排除

### 浏览器启动失败

```bash
# 重新安装 Playwright 浏览器
playwright install chromium --force
```

### 选择器失效

Telegram Web 界面可能更新，导致选择器失效。查看 `src/teleflow/telegram_web/selectors.py` 中的回退选择器。

### 内存占用过高

- 减少 `check_interval` 轮询频率
- 启用 `headless` 模式
- 定期重启进程

## 高级功能

### 群组支持（v1.1+）

```yaml
accounts:
  - name: primary
    group_invites:
      - url: "https://t.me/+xxxxx"
        welcome_message: "Hello everyone!"
```

### OCR 识别（v1.2+）

```yaml
rules:
  - keywords: ["*screenshot*"]
    reply_text: "识别结果: {ocr_result}"
```

## 更多资源

- [配置文件参考](config-reference.md)
- [开发者指南](development.md)
- [GitHub Issues](https://github.com/your-repo/issues)
