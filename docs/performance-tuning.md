# Teleflow 性能优化指南

本指南提供性能调优建议和最佳实践配置，帮助您根据实际使用场景优化 Teleflow 的性能。

## 性能指标基准

### 默认配置性能

```yaml
runtime:
  check_interval: 2.0  # 每 2 秒检查一次
  max_retry_count: 3   # 最多重试 3 次

browser:
  headless: true       # 后台运行
  timeout: 30          # 30 秒超时
```

**性能表现**:
- CPU 使用率: 5-10%
- 内存占用: 150-200 MB
- 响应延迟: 2-5 秒
- 适用场景: 一般使用

---

## 优化场景 1: 低延迟响应

### 目标

最小化消息检测和回复的延迟时间。

### 推荐配置

```yaml
runtime:
  check_interval: 1.0  # 每秒检查一次
  max_retry_count: 2   # 减少重试次数

browser:
  headless: true
  timeout: 15          # 减少超时时间

rules:
  - keywords: ["紧急"]
    reply_text: "立即处理"
    fixed_delay: 0     # 无固定延时
    random_delay_max: 1 # 最多 1 秒随机延时
```

**性能影响**:
- CPU 使用率: 10-15% ⬆️
- 内存占用: 150-200 MB ➡️
- 响应延迟: 1-2 秒 ⬇️
- 网络请求频率: 2x ⬆️

**适用场景**:
- 客服自动回复
- 紧急消息处理
- 实时监控需求

**注意事项**:
- 增加 CPU 和网络负载
- 可能更快触发 Telegram 限流
- 建议配合 headless 模式使用

---

## 优化场景 2: 低资源占用

### 目标

最小化 CPU 和内存使用，适合长时间后台运行。

### 推荐配置

```yaml
runtime:
  check_interval: 5.0  # 每 5 秒检查一次
  max_retry_count: 2   # 减少重试

browser:
  headless: true       # 必须后台运行
  timeout: 60          # 增加超时容忍度

logging:
  level: "WARNING"     # 减少日志输出
  file: "./logs/teleflow.log"
  max_size: "10MB"     # 限制日志文件大小
```

**性能影响**:
- CPU 使用率: 2-5% ⬇️
- 内存占用: 120-150 MB ⬇️
- 响应延迟: 5-10 秒 ⬆️
- 网络请求频率: 0.5x ⬇️

**适用场景**:
- 低配置服务器
- 多账号并行运行
- 非紧急消息监控

**注意事项**:
- 响应延迟增加
- 可能错过短时间内的多条消息
- 建议定期检查日志文件大小

---

## 优化场景 3: 高并发多账号

### 目标

同时运行多个账号，优化资源分配。

### 推荐配置

```yaml
version: "1.0"

accounts:
  - name: "account1"
    browser_data_dir: "./browser_data/account1"
    monitor_chats: ["@user1"]
  - name: "account2"
    browser_data_dir: "./browser_data/account2"
    monitor_chats: ["@user2"]
  - name: "account3"
    browser_data_dir: "./browser_data/account3"
    monitor_chats: ["@user3"]

runtime:
  check_interval: 3.0  # 平衡检查频率
  max_retry_count: 2

browser:
  headless: true       # 必须后台运行
  timeout: 30

logging:
  level: "INFO"
  file: "./logs/{account_name}.log"  # 每账号独立日志
```

**启动方式**:

```bash
# 启动多个进程
teleflow run --config config.yaml --account account1 &
teleflow run --config config.yaml --account account2 &
teleflow run --config config.yaml --account account3 &
```

**性能影响** (每个进程):
- CPU 使用率: 5-8%
- 内存占用: 150-180 MB
- 总资源: CPU 15-24%, 内存 450-540 MB

**适用场景**:
- 企业客服系统
- 多账号管理
- 分布式部署

**注意事项**:
- 确保系统有足够资源
- 监控每个进程的状态
- 使用进程管理工具（如 systemd, supervisor）

---

## 优化场景 4: 网络不稳定环境

### 目标

在网络不稳定时保持稳定运行。

### 推荐配置

```yaml
runtime:
  check_interval: 3.0
  max_retry_count: 5   # 增加重试次数

browser:
  headless: true
  timeout: 60          # 增加超时时间

# 在 runner.py 中配置
max_consecutive_errors: 10  # 增加错误容忍度
```

**性能影响**:
- 响应延迟: 可能增加
- 稳定性: 显著提升 ⬆️
- 错误恢复: 更快 ⬆️

**适用场景**:
- 移动网络环境
- VPN 连接
- 不稳定的网络环境

**注意事项**:
- 增加超时可能导致响应变慢
- 监控错误日志
- 考虑使用网络代理

---

## 性能监控

### 系统资源监控

**Windows**:

```powershell
# 查看进程资源使用
Get-Process python | Select-Object CPU, PM, ProcessName

# 持续监控
while ($true) {
    Get-Process python | Select-Object CPU, PM, ProcessName
    Start-Sleep -Seconds 5
}
```

**Linux/macOS**:

```bash
# 查看进程资源使用
ps aux | grep python

# 使用 top 监控
top -p $(pgrep -f teleflow)

# 使用 htop（更友好）
htop -p $(pgrep -f teleflow)
```

### 日志监控

```bash
# 实时查看日志
tail -f ./logs/teleflow.log

# 查看错误日志
grep ERROR ./logs/teleflow.log

# 统计错误数量
grep -c ERROR ./logs/teleflow.log
```

### 性能指标收集

创建监控脚本 `monitor.py`:

```python
import psutil
import time
import logging

logging.basicConfig(
    filename='./logs/performance.log',
    level=logging.INFO,
    format='%(asctime)s - %(message)s'
)

def monitor_process(process_name="python"):
    """监控进程性能"""
    for proc in psutil.process_iter(['name', 'cpu_percent', 'memory_info']):
        if process_name in proc.info['name']:
            cpu = proc.info['cpu_percent']
            mem = proc.info['memory_info'].rss / 1024 / 1024  # MB
            logging.info(f"CPU: {cpu}%, Memory: {mem:.2f}MB")

if __name__ == "__main__":
    while True:
        monitor_process()
        time.sleep(60)  # 每分钟记录一次
```

---

## 性能优化清单

### ✅ 必做优化

- [ ] 启用 headless 模式（生产环境）
- [ ] 根据需求调整 `check_interval`
- [ ] 配置合理的日志级别
- [ ] 限制日志文件大小
- [ ] 使用独立的浏览器数据目录

### 🔧 可选优化

- [ ] 调整超时时间
- [ ] 优化规则匹配顺序（常用规则放前面）
- [ ] 减少不必要的日志输出
- [ ] 使用 SSD 存储浏览器数据
- [ ] 配置系统级资源限制

### 📊 监控建议

- [ ] 定期检查 CPU 和内存使用
- [ ] 监控日志文件大小
- [ ] 统计错误率和重试次数
- [ ] 记录响应延迟
- [ ] 设置资源告警阈值

---

## 常见性能问题

### 问题 1: CPU 使用率过高

**症状**: CPU 持续 > 20%

**可能原因**:
- `check_interval` 设置过小
- 浏览器未使用 headless 模式
- 规则匹配过于复杂

**解决方案**:
```yaml
runtime:
  check_interval: 3.0  # 增加检查间隔

browser:
  headless: true       # 启用 headless
```

### 问题 2: 内存占用持续增长

**症状**: 内存使用随时间增长，不释放

**可能原因**:
- 日志文件未轮转
- 浏览器缓存积累
- 内存泄漏

**解决方案**:
```yaml
logging:
  max_size: "10MB"     # 限制日志大小
  backup_count: 3      # 保留 3 个备份

# 定期重启程序（使用 cron 或 systemd timer）
```

### 问题 3: 响应延迟过大

**症状**: 消息回复延迟 > 10 秒

**可能原因**:
- `check_interval` 设置过大
- 网络延迟
- 超时设置过长

**解决方案**:
```yaml
runtime:
  check_interval: 1.5  # 减少检查间隔

browser:
  timeout: 20          # 减少超时时间
```

### 问题 4: 频繁触发 Telegram 限流

**症状**: 日志显示请求被限制

**可能原因**:
- 检查频率过高
- 短时间内发送大量消息

**解决方案**:
```yaml
runtime:
  check_interval: 3.0  # 增加检查间隔

rules:
  - keywords: ["hello"]
    fixed_delay: 3     # 增加回复延时
    random_delay_max: 5
```

---

## 生产环境推荐配置

### 标准配置（推荐）

```yaml
version: "1.0"
description: "生产环境标准配置"

accounts:
  - name: "production_account"
    browser_data_dir: "/var/lib/teleflow/browser_data"
    monitor_chats:
      - "@customer_support"
    rules:
      - keywords: ["帮助", "help"]
        reply_text: "您好！我是自动客服，请问有什么可以帮您？"
        fixed_delay: 2
        random_delay_max: 3

logging:
  level: "INFO"
  file: "/var/log/teleflow/production.log"
  max_size: "50MB"
  backup_count: 5

browser:
  headless: true
  timeout: 30

runtime:
  debug: false
  check_interval: 2.5
  max_retry_count: 3
```

### 高性能配置

```yaml
runtime:
  check_interval: 1.0  # 快速响应
  max_retry_count: 2

browser:
  headless: true
  timeout: 15

logging:
  level: "WARNING"     # 减少日志
```

### 低资源配置

```yaml
runtime:
  check_interval: 5.0  # 降低频率
  max_retry_count: 2

browser:
  headless: true
  timeout: 60

logging:
  level: "ERROR"       # 仅记录错误
```

---

## 性能测试

### 基准测试脚本

创建 `benchmark.py`:

```python
import asyncio
import time
from teleflow.models.account import Account
from teleflow.models.config import RuntimeConfig
from teleflow.rules.engine import RuleEngine
from teleflow.models.rule import Rule

async def benchmark_rule_matching():
    """测试规则匹配性能"""
    account = Account(
        name="test",
        monitor_chats=[],
        rules=[
            Rule(keywords=["hello"], reply_text="Hi", fixed_delay=0, random_delay_max=0)
            for _ in range(100)  # 100 条规则
        ]
    )
    
    engine = RuleEngine(account)
    
    # 测试 1000 次匹配
    start = time.time()
    for _ in range(1000):
        engine.process_message("hello world")
    end = time.time()
    
    print(f"1000 次匹配耗时: {end - start:.2f} 秒")
    print(f"平均每次: {(end - start) / 1000 * 1000:.2f} 毫秒")

if __name__ == "__main__":
    asyncio.run(benchmark_rule_matching())
```

运行测试:

```bash
python benchmark.py
```

**预期结果**: 每次匹配 < 1 毫秒

---

## 扩展性建议

### 水平扩展

对于大规模部署，考虑：

1. **多服务器部署**
   - 每台服务器运行不同账号
   - 使用负载均衡分配请求

2. **容器化部署**
   ```dockerfile
   FROM python:3.11-slim
   WORKDIR /app
   COPY . .
   RUN pip install -e .
   CMD ["teleflow", "run", "--config", "/config/config.yaml"]
   ```

3. **进程管理**
   - 使用 systemd 管理服务
   - 配置自动重启
   - 设置资源限制

### 监控告警

集成监控系统：
- Prometheus + Grafana
- ELK Stack (日志分析)
- 自定义告警脚本

---

## 总结

### 性能优化原则

1. **根据场景选择配置**：不同场景有不同的优化目标
2. **监控先行**：先监控，再优化
3. **逐步调整**：小步快跑，避免过度优化
4. **测试验证**：每次调整后验证效果

### 配置速查表

| 场景 | check_interval | headless | timeout | 适用 |
|------|---------------|----------|---------|------|
| 低延迟 | 1.0 | true | 15 | 客服 |
| 标准 | 2.5 | true | 30 | 一般 |
| 低资源 | 5.0 | true | 60 | 后台 |
| 多账号 | 3.0 | true | 30 | 并发 |

### 参考资料

- [用户使用手册](user-guide.md)
- [配置文件参考](config-reference.md)
- [开发者指南](development.md)
- [手动测试指南](manual-testing-guide.md)
