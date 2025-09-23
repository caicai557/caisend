# 话术管理工具集使用指南

本项目提供了独立的工具集，无需修改主应用即可使用所有新功能。

## 🛠️ 工具概览

| 工具 | 功能 | 使用场景 |
|-----|------|---------|
| `phrase_tools.py` | 话术管理 | 批量导入、UI管理、统计查看 |
| `ws_monitor.py` | WS连接监控 | 测试连接健壮性、监控状态 |
| `import_phrases.py` | 批量导入 | 快速导入话术数据 |

## 📦 快速开始

### 1. 批量导入话术

```bash
# 导入所有示例文件
python phrase_tools.py import --all

# 导入特定格式文件
python phrase_tools.py import --json your_phrases.json
python phrase_tools.py import --csv your_phrases.csv
python phrase_tools.py import --txt your_phrases.txt

# 查看导入结果
python phrase_tools.py stats
```

### 2. 打开话术管理界面

```bash
# 启动图形界面
python phrase_tools.py ui
```

界面功能：
- ✅ 批量导入 (JSON/CSV/TXT)
- ✅ 搜索和筛选
- ✅ 分类管理
- ✅ 使用统计
- ✅ 导出功能

### 3. 监控WebSocket连接

```bash
# 基本监控
python ws_monitor.py --url ws://localhost:8765

# 测试重连机制
python ws_monitor.py --url ws://localhost:8765 --test-reconnect
```

## 📊 话术数据格式

### JSON格式 (`sample_phrases.json`)
```json
{
  "phrases": [
    {
      "template": "您好，有什么可以帮助您的吗？",
      "category": "greeting",
      "tags": ["客服", "问候"]
    }
  ]
}
```

### CSV格式 (`sample_phrases.csv`)
```csv
template,category,tags
"您好，有什么可以帮助您的吗？",greeting,"客服,问候"
"感谢您的耐心等待",service,"客服,感谢"
```

### 文本格式 (`sample_phrases.txt`)
```
您好，有什么可以帮助您的吗？
感谢您的耐心等待
请问还有其他问题吗？
```

## 🔧 高级用法

### 自定义数据库路径
```bash
python phrase_tools.py --db-path /path/to/custom.db stats
python phrase_tools.py --db-path /path/to/custom.db import --all
```

### 批量操作脚本
```bash
# 创建批量导入脚本
cat > batch_import.sh << 'EOF'
#!/bin/bash
echo "开始批量导入..."
python phrase_tools.py import --json data/phrases_1.json
python phrase_tools.py import --csv data/phrases_2.csv  
python phrase_tools.py import --txt data/phrases_3.txt
python phrase_tools.py stats
echo "导入完成！"
EOF

chmod +x batch_import.sh
./batch_import.sh
```

## 📈 性能监控

### WebSocket连接状态
```bash
python ws_monitor.py --url ws://your-server:8765
```

输出示例：
```
🚀 启动WS监控器...
📡 连接地址: ws://localhost:8765
============================================================
[14:30:15] 🟡 状态变更: CONNECTING
[14:30:16] 🟢 状态变更: CONNECTED
📨 收到推荐: 3 条
  1. 您好，有什么可以帮助您的吗？...
  2. 感谢您的耐心等待...
  3. 请问还有其他问题吗？...
📊 统计 - 连接时长: 30s, 失败次数: 0, 重连次数: 0
```

### 话术库统计
```bash
python phrase_tools.py stats
```

输出示例：
```
📊 话术库统计信息
========================================
总话术数量: 156 条
分类数量: 8 个

📂 分类详情:
  greeting        12 条 (  7.7%)
  service         24 条 ( 15.4%)
  closing         18 条 ( 11.5%)
  technical       32 条 ( 20.5%)
  sales           28 条 ( 17.9%)
  support         22 条 ( 14.1%)
  general         15 条 (  9.6%)
  emergency        5 条 (  3.2%)

📈 平均使用次数: 2.3

🔥 最近使用的话术:
  • 您好，有什么可以帮助您的吗？
  • 感谢您的耐心等待，正在为您处理...
  • 请问还有其他问题需要协助吗？
```

## 🚀 与主应用集成

这些工具完全独立运行，不影响主应用 `quickreply`。

### 推荐工作流程：
1. **初始化**：使用 `phrase_tools.py import --all` 导入示例数据
2. **管理**：使用 `phrase_tools.py ui` 进行日常管理
3. **监控**：使用 `ws_monitor.py` 测试连接稳定性
4. **主应用**：正常运行 `python -m quickreply`

### 数据同步：
- 话术数据存储在 `data/quickreply.db` SQLite数据库中
- 主应用可以通过 `PhraseManager` 类读取这些数据
- 工具修改的数据会自动同步到主应用

## 🔍 故障排除

### 常见问题

**Q: 导入时提示"数据库锁定"**
```bash
# 检查是否有其他进程在使用数据库
lsof data/quickreply.db
# 或者使用不同的数据库路径
python phrase_tools.py --db-path temp.db import --all
```

**Q: UI界面无法启动**
```bash
# 检查tkinter是否可用
python -c "import tkinter; print('tkinter可用')"
# Ubuntu/Debian安装tkinter
sudo apt-get install python3-tk
```

**Q: WebSocket连接失败**
```bash
# 检查服务器是否运行
telnet localhost 8765
# 或使用测试服务器
python ws_monitor.py --url ws://echo.websocket.org
```

## 📝 开发说明

如需扩展功能，请参考：
- `quickreply/phrase_manager.py` - 话术管理核心逻辑
- `quickreply/ws_client.py` - WebSocket客户端实现  
- `quickreply/ui/phrase_manager_ui.py` - 图形界面实现

所有工具都支持 `--help` 参数查看详细用法。
