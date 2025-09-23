# 智能客服辅助系统 - 完整使用指南

## 系统概述

智能客服辅助系统通过CDP（Chrome DevTools Protocol）监控易翻译.exe中的Telegram消息，实时提供智能回复推荐，并通过常驻面板支持一键粘贴。

## 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  易翻译.exe     │    │  抓取服务        │    │  推荐服务        │
│  (CDP调试模式)  │───▶│  (端口 7799)     │───▶│  (端口 7788)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                               │                       
                               ▼ WebSocket推送          
                      ┌─────────────────┐              
                      │  UI常驻面板     │              
                      │  (一键粘贴)     │              
                      └─────────────────┘              
```

## 启动顺序

### 1. 启动推荐服务
```bash
cd C:\dev\reply-recosvc
npm run dev
```
服务将在 `http://127.0.0.1:7788` 启动

### 2. 启动消息抓取服务
```bash
cd C:\dev\chat-capture
.\start-etrans.ps1
```

**支持的启动参数：**
- `-EtransPath "路径"` - 指定易翻译.exe路径（首次指定会保存到配置文件）
- `-UserDataDir "目录"` - 指定Chromium用户数据目录
- `-ExtraArgs "参数"` - 额外启动参数
- `-DebugPort 端口` - 调试端口（默认9222）
- `-QuickCheck` - 快速检查模式
- `-Force` - 强制启动

**示例：**
```bash
# 首次指定路径
.\start-etrans.ps1 -EtransPath "C:\Program Files\易翻译\易翻译.exe" -UserDataDir "C:\temp\etrans-debug"

# 后续启动（会自动读取配置）
.\start-etrans.ps1

# 快速检查系统状态
.\start-etrans.ps1 -QuickCheck
```

### 3. 启动UI常驻面板
```bash
cd C:\dev\quickreply-min
python -m quickreply
```

## 功能特性

### 抓取服务功能
- ✅ **事件驱动监控**：基于CDP `consoleAPICalled` 事件实时捕获
- ✅ **轮询兜底**：2秒轮询确保消息不丢失
- ✅ **WebSocket推送**：实时推送消息和推荐到UI
- ✅ **JSONL日志**：本地日志记录在 `logs/capture-YYYYMMDD.jsonl`
- ✅ **智能重试**：指数退避重试机制，最多重试5次
- ✅ **消息去重**：基于TTL的消息去重，避免重复处理

### UI面板功能
- ✅ **常驻面板**：自动吸附到目标窗口，支持窗口关键词识别
- ✅ **实时推荐**：WebSocket订阅实时推荐更新
- ✅ **一键粘贴**：双击推荐项自动复制并粘贴到输入框
- ✅ **智能显示**：仅在目标应用激活时显示面板

### 启动脚本功能
- ✅ **路径持久化**：自动保存易翻译.exe路径到配置文件
- ✅ **参数管理**：支持额外启动参数配置
- ✅ **智能检测**：自动检测进程、端口、目标页面状态
- ✅ **错误诊断**：详细的故障排除指导

## 配置文件

### 启动脚本配置
- `chat-capture/config/etrans-path.txt` - 易翻译.exe路径
- `chat-capture/config/etrans-args.txt` - 额外启动参数

### UI面板配置
- `quickreply-min/settings.json` - UI配置
```json
{
  "top_k": 5,
  "hotkey_show": "alt+`",
  "hotkey_reload": "ctrl+alt+r", 
  "hotkey_toggle_send": "ctrl+alt+enter",
  "target_keywords": ["易翻译", "微信", "QQ", "企业微信", "WeChat", "Telegram"]
}
```

## 日志与监控

### 抓取服务日志
- **JSONL格式**：`chat-capture/logs/capture-YYYYMMDD.jsonl`
- **事件类型**：
  - `message_in` - 收到新消息
  - `recommendations` - 生成推荐
  - `ingest_error` - 推荐服务调用失败
  - `recommend_error` - 推荐生成失败
  - `retry_enqueue/success/failed/abandoned` - 重试状态

### WebSocket端口
- **7799** - 抓取服务WebSocket推送端口
- **7788** - 推荐服务HTTP API端口

## 故障排除

### 1. 易翻译.exe未启动
```
❌ 未发现易翻译进程
解决：确保易翻译.exe正在运行，或让脚本自动启动
```

### 2. 调试端口不可用
```
❌ 未发现调试端口（9222-9333）
解决：重启易翻译.exe，确保以调试模式启动
```

### 3. WebSocket连接失败
```
[WS客户端] 连接错误
解决：确保抓取服务已启动且端口7799可用
```

### 4. 推荐服务不可用
```
❌ 推荐服务未启动
解决：cd C:\dev\reply-recosvc && npm run dev
```

### 5. UI面板不显示
```
解决：检查target_keywords配置，确保包含当前窗口标题关键词
```

## 开发调试

### 查看WebSocket消息
```bash
# 测试WebSocket连接
cd C:\dev\quickreply-min
python -c "
from quickreply.ws_client import WsClient
import time
client = WsClient('ws://127.0.0.1:7799', lambda x: print(f'收到: {x}'))
time.sleep(10)
client.stop()
"
```

### 查看日志
```bash
# 实时查看抓取日志
Get-Content "C:\dev\chat-capture\logs\capture-$(Get-Date -Format 'yyyyMMdd').jsonl" -Wait -Tail 10
```

### 手动测试推荐
```bash
# 测试推荐API
curl -X POST http://127.0.0.1:7788/recommend \
  -H "Content-Type: application/json" \
  -d '{"text":"订单查询A123"}'
```

## 性能特性

- **事件驱动**：毫秒级消息捕获响应
- **智能去重**：避免重复处理相同消息
- **内存管理**：TTL自动清理过期数据
- **网络容错**：自动重连和重试机制
- **异步处理**：非阻塞UI更新和网络请求

## 扩展说明

系统采用模块化设计，支持：
- 添加更多聊天应用支持
- 自定义推荐算法
- 扩展UI交互方式
- 集成更多AI服务

所有核心功能已完成并通过验收测试！
