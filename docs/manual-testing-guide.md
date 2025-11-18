# Teleflow 端到端手动测试指南

本指南提供完整的手动测试流程，用于验证 Teleflow 在实际使用场景中的功能。

## 测试前准备

### 环境要求

- Python 3.11+ 已安装
- Playwright Chromium 已安装
- 至少一个 Telegram 账号（用于测试）
- 测试用的 Telegram 联系人或群组

### 安装验证

```bash
# 1. 验证 Python 版本
python --version  # 应显示 3.11 或更高

# 2. 验证 Teleflow 安装
teleflow --version

# 3. 验证 Playwright 安装
playwright --version
```

## 测试场景 1: 首次登录与配置

### 目标

验证首次使用时的登录流程和配置加载。

### 步骤

1. **创建测试配置文件** `test-config.yaml`：

```yaml
version: "1.0"
description: "手动测试配置"

accounts:
  - name: "test_account"
    browser_data_dir: "./browser_data/test_account"
    monitor_chats:
      - "@test_contact"  # 替换为实际联系人用户名
    rules:
      - keywords: ["测试", "test"]
        reply_text: "收到测试消息！"
        fixed_delay: 2
        random_delay_max: 3
        description: "测试回复规则"

logging:
  level: "INFO"
  file: "./logs/test.log"

browser:
  headless: false  # 显示浏览器
  timeout: 30

runtime:
  debug: true
  check_interval: 2.0
```

2. **验证配置文件**：

```bash
teleflow validate-config --config test-config.yaml
```

**预期结果**: 显示 "配置文件验证通过" 或类似成功消息。

3. **首次运行（显示浏览器）**：

```bash
teleflow run --config test-config.yaml --show-browser
```

**预期结果**:

- 浏览器窗口打开
- 自动导航到 Telegram Web (<https://web.telegram.org>)
- 显示登录界面

4. **完成 Telegram 登录**：

- 输入手机号码
- 输入验证码
- 完成登录流程

**预期结果**: 成功登录到 Telegram Web，显示聊天列表。

5. **观察日志输出**：

```bash
# 在另一个终端查看日志
tail -f ./logs/test.log
```

**预期结果**: 日志显示初始化成功、开始监控等信息。

6. **停止运行**：

按 `Ctrl+C` 停止程序。

**预期结果**: 程序优雅退出，浏览器关闭。

### 验收标准

- ✅ 配置文件验证通过
- ✅ 浏览器成功启动
- ✅ Telegram 登录成功
- ✅ 日志正常输出
- ✅ 程序可正常停止

---

## 测试场景 2: 自动已读功能

### 目标

验证检测新消息并自动标记为已读的功能。

### 步骤

1. **启动程序（后台模式）**：

```bash
teleflow run --config test-config.yaml
```

2. **发送测试消息**：

使用另一个 Telegram 账号向测试账号发送消息：

- 消息内容: "你好"

3. **观察日志**：

```bash
tail -f ./logs/test.log
```

**预期日志输出**:

```
[INFO] 检测到新消息
[INFO] 获取到最新消息: 你好
[INFO] 标记消息为已读
```

4. **验证 Telegram 界面**：

在发送消息的账号上，检查消息状态。

**预期结果**: 消息显示为"已读"（双勾变蓝）。

### 验收标准

- ✅ 新消息被检测到
- ✅ 消息自动标记为已读
- ✅ 日志记录完整

---

## 测试场景 3: 关键词自动回复

### 目标

验证关键词匹配和自动回复功能。

### 步骤

1. **确保程序运行中**：

```bash
teleflow run --config test-config.yaml
```

2. **发送包含关键词的消息**：

使用另一个账号发送消息：

- 消息内容: "测试"

3. **观察日志**：

**预期日志输出**:

```
[INFO] 检测到新消息
[INFO] 获取到最新消息: 测试
[INFO] 匹配到规则: 测试回复规则
[INFO] 关键词: 测试
[INFO] 延时: 2.5 秒
[INFO] 发送回复: 收到测试消息！
```

4. **验证回复**：

在发送消息的账号上，应该收到自动回复。

**预期结果**:

- 收到回复消息 "收到测试消息！"
- 延时约 2-5 秒（固定 2 秒 + 随机 0-3 秒）

### 验收标准

- ✅ 关键词匹配成功
- ✅ 自动回复发送成功
- ✅ 延时控制正常
- ✅ 回复内容正确

---

## 测试场景 4: 通配符匹配

### 目标

验证通配符 `*` 和 `?` 的匹配功能。

### 步骤

1. **更新配置文件** 添加通配符规则：

```yaml
rules:
  - keywords: ["*会议*", "*meeting*"]
    reply_text: "我会参加会议。"
    fixed_delay: 1
    random_delay_max: 2
  - keywords: ["你好?"]
    reply_text: "你好！"
    fixed_delay: 1
    random_delay_max: 1
```

2. **重启程序**：

```bash
# 停止现有进程
Ctrl+C

# 重新启动
teleflow run --config test-config.yaml
```

3. **测试通配符 `*`**：

发送消息: "明天的会议几点开始？"

**预期结果**: 收到回复 "我会参加会议。"

4. **测试通配符 `?`**：

发送消息: "你好啊"

**预期结果**: 收到回复 "你好！"

### 验收标准

- ✅ `*` 通配符匹配成功
- ✅ `?` 通配符匹配成功
- ✅ 回复内容正确

---

## 测试场景 5: 多规则优先级

### 目标

验证多个规则按顺序匹配，返回第一个匹配的规则。

### 步骤

1. **更新配置文件** 添加多个规则：

```yaml
rules:
  - keywords: ["紧急"]
    reply_text: "我会立即处理！"
    fixed_delay: 0
    random_delay_max: 1
    description: "紧急规则（高优先级）"
  - keywords: ["*紧急*"]
    reply_text: "我会尽快处理。"
    fixed_delay: 2
    random_delay_max: 2
    description: "紧急通配符（低优先级）"
```

2. **重启程序**。

3. **测试精确匹配**：

发送消息: "紧急"

**预期结果**: 收到回复 "我会立即处理！"（第一个规则）

4. **测试通配符匹配**：

发送消息: "这是紧急情况"

**预期结果**: 收到回复 "我会尽快处理。"（第二个规则）

### 验收标准

- ✅ 规则按顺序匹配
- ✅ 精确匹配优先于通配符
- ✅ 只触发第一个匹配的规则

---

## 测试场景 6: 错误处理与恢复

### 目标

验证程序在网络中断或异常情况下的错误处理能力。

### 步骤

1. **启动程序**。

2. **模拟网络中断**：

- 断开网络连接
- 等待 10 秒

3. **观察日志**：

**预期日志输出**:

```
[ERROR] 运行循环发生错误 (连续错误 1): ...
[ERROR] 运行循环发生错误 (连续错误 2): ...
```

4. **恢复网络连接**。

5. **观察恢复**：

**预期日志输出**:

```
[INFO] 重置错误计数
[INFO] 继续监控...
```

### 验收标准

- ✅ 错误被正确捕获
- ✅ 程序不崩溃
- ✅ 网络恢复后自动继续运行
- ✅ 错误计数正确重置

---

## 测试场景 7: 多账号隔离（v1.1+）

### 目标

验证多账号模式下的进程隔离。

### 步骤

1. **创建两个账号配置**：

```yaml
version: "1.0"
accounts:
  - name: "account1"
    browser_data_dir: "./browser_data/account1"
    monitor_chats: ["@contact1"]
    rules:
      - keywords: ["账号1"]
        reply_text: "这是账号1的回复"
  - name: "account2"
    browser_data_dir: "./browser_data/account2"
    monitor_chats: ["@contact2"]
    rules:
      - keywords: ["账号2"]
        reply_text: "这是账号2的回复"
```

2. **启动第一个账号**：

```bash
teleflow run --config multi-account.yaml --account account1
```

3. **启动第二个账号**（新终端）：

```bash
teleflow run --config multi-account.yaml --account account2
```

4. **验证隔离**：

- 检查两个浏览器数据目录是否独立
- 向两个账号分别发送测试消息
- 验证各自的回复规则

### 验收标准

- ✅ 两个进程独立运行
- ✅ 浏览器数据目录隔离
- ✅ 规则互不干扰
- ✅ 可独立停止每个进程

---

## 测试场景 8: 性能与稳定性

### 目标

验证长时间运行的稳定性和性能。

### 步骤

1. **启动程序**。

2. **运行 1 小时**：

- 每 5 分钟发送一条测试消息
- 观察内存和 CPU 使用情况

3. **监控指标**：

```bash
# Windows
tasklist | findstr python

# Linux/macOS
ps aux | grep python
```

4. **检查日志文件大小**：

```bash
ls -lh ./logs/test.log
```

### 验收标准

- ✅ 程序持续运行无崩溃
- ✅ 内存使用稳定（无内存泄漏）
- ✅ CPU 使用率合理（<10%）
- ✅ 所有消息正常处理

---

## 测试场景 9: 配置热重载（未实现）

### 目标

验证修改配置文件后的行为（当前需要重启）。

### 步骤

1. **启动程序**。

2. **修改配置文件**：

- 更改回复文本
- 保存文件

3. **当前行为**：

需要手动重启程序才能生效。

4. **未来改进**：

实现配置文件监听和热重载。

---

## 故障排查清单

### 问题 1: 浏览器无法启动

**症状**: 程序报错 "Browser launch failed"

**解决方案**:

```bash
# 重新安装 Playwright
playwright install chromium --force

# 检查浏览器数据目录权限
ls -la ./browser_data/
```

### 问题 2: 无法检测到新消息

**症状**: 日志显示 "未检测到新消息"

**解决方案**:

- 检查 Telegram Web 是否正常加载
- 增加 `check_interval` 配置
- 检查选择器是否过时（查看 `telegram_web/selectors.py`）

### 问题 3: 回复发送失败

**症状**: 日志显示 "发送消息失败"

**解决方案**:

- 检查网络连接
- 增加 `max_retry_count` 配置
- 手动在浏览器中测试发送消息

### 问题 4: 登录状态丢失

**症状**: 每次启动都需要重新登录

**解决方案**:

- 确保 `browser_data_dir` 配置正确
- 检查目录权限
- 不要删除浏览器数据目录

---

## 测试报告模板

完成测试后，填写以下报告：

```
测试日期: ____________________
测试人员: ____________________
Teleflow 版本: ____________________

测试结果汇总:
- 场景 1 (首次登录): ✅ / ❌
- 场景 2 (自动已读): ✅ / ❌
- 场景 3 (关键词回复): ✅ / ❌
- 场景 4 (通配符匹配): ✅ / ❌
- 场景 5 (规则优先级): ✅ / ❌
- 场景 6 (错误处理): ✅ / ❌
- 场景 7 (多账号隔离): ✅ / ❌
- 场景 8 (性能稳定性): ✅ / ❌

发现的问题:
1. ____________________
2. ____________________

改进建议:
1. ____________________
2. ____________________
```

---

## 自动化测试补充

虽然本指南专注于手动测试，但以下场景可以通过自动化测试覆盖：

- ✅ 配置文件验证（单元测试）
- ✅ 规则匹配逻辑（单元测试）
- ✅ 延时计算（单元测试）
- ✅ 组件初始化（集成测试）
- ❌ Telegram Web 交互（需要真实环境）
- ❌ 网络中断恢复（需要模拟环境）

---

## 参考资料

- [用户使用手册](user-guide.md)
- [配置文件参考](config-reference.md)
- [开发者指南](development.md)
- [Telegram Web](https://web.telegram.org)
