# ConfigManager 统一配置管理指南

## 概述

ConfigManager 解决了原有配置分散和冲突问题，提供统一的配置管理入口，支持环境变量覆盖和旧配置迁移。

## 解决的问题

**原问题:**
- `settings.json` (用户级) 与 `quickreply.config.json` (应用级) 配置分散
- 无统一优先级和覆盖机制
- 部署环境配置调整困难
- 配置格式不一致，难以维护

**新方案:**
- 统一 `config.json` 作为权威配置源
- 环境变量 `QR_*` 支持动态覆盖
- 自动迁移旧配置格式
- 严格的配置校验和错误提示

## 配置结构

### 统一配置文件 `config.json`

```json
{
  "user": {
    "theme": "dark",
    "top_k": 5,
    "target_keywords": ["易翻译", "微信", "QQ", "企业微信", "WeChat", "Telegram"],
    "hotkeys": {
      "show": "alt+`",
      "reload": "ctrl+alt+r",
      "toggle_send": "ctrl+alt+enter"
    }
  },
  "app": {
    "api_endpoints": {
      "ws": "ws://127.0.0.1:7799",
      "recommend": "http://127.0.0.1:7788/recommend",
      "ingest": "http://127.0.0.1:7788/ingest"
    },
    "security": {
      "token": "",
      "allow_origins": ["*"],
      "timeout": 10
    }
  },
  "cdp": {
    "host": "127.0.0.1",
    "port": null,
    "range": "9222-9333",
    "timeout": 0.5,
    "max_workers": 24
  }
}
```

### 配置优先级

1. **默认值** - 代码中的默认配置
2. **config.json** - 主配置文件
3. **旧配置迁移** - 自动从 `settings.json`/`quickreply.config.json` 迁移
4. **环境变量** - `QR_*` 前缀环境变量（最高优先级）

## 环境变量覆盖

### 支持的环境变量

| 环境变量 | 配置路径 | 类型 | 示例 |
|---------|---------|------|------|
| `QR_THEME` | user.theme | string | `QR_THEME=light` |
| `QR_TOP_K` | user.top_k | int | `QR_TOP_K=10` |
| `QR_HK_SHOW` | user.hotkeys.show | string | `QR_HK_SHOW=ctrl+space` |
| `QR_HK_RELOAD` | user.hotkeys.reload | string | `QR_HK_RELOAD=f5` |
| `QR_HK_TOGGLE_SEND` | user.hotkeys.toggle_send | string | `QR_HK_TOGGLE_SEND=ctrl+enter` |
| `QR_WS_URL` | app.api_endpoints.ws | string | `QR_WS_URL=ws://localhost:8800` |
| `QR_RECOMMEND_URL` | app.api_endpoints.recommend | string | `QR_RECOMMEND_URL=http://api.example.com/recommend` |
| `QR_INGEST_URL` | app.api_endpoints.ingest | string | `QR_INGEST_URL=http://api.example.com/ingest` |
| `QR_TOKEN` | app.security.token | string | `QR_TOKEN=your-api-token` |
| `QR_TIMEOUT` | app.security.timeout | int | `QR_TIMEOUT=30` |
| `QR_CDP_HOST` | cdp.host | string | `QR_CDP_HOST=192.168.1.100` |
| `QR_CDP_PORT` | cdp.port | int | `QR_CDP_PORT=9223` |
| `QR_CDP_RANGE` | cdp.range | string | `QR_CDP_RANGE=9300-9310` |
| `QR_CDP_TIMEOUT` | cdp.timeout | float | `QR_CDP_TIMEOUT=1.0` |
| `QR_CDP_MAX_WORKERS` | cdp.max_workers | int | `QR_CDP_MAX_WORKERS=16` |

### 使用示例

**Windows (PowerShell):**
```powershell
$env:QR_TOP_K = "10"
$env:QR_WS_URL = "ws://127.0.0.1:8800"
$env:QR_CDP_PORT = "9223"
python -m quickreply
```

**Linux/macOS:**
```bash
export QR_TOP_K=10
export QR_WS_URL="ws://127.0.0.1:8800"
export QR_CDP_PORT=9223
python -m quickreply
```

## API 使用

### 基本用法

```python
from quickreply.config_manager import ConfigManager

# 创建配置管理器
cm = ConfigManager()

# 加载配置
config = cm.load()

# 校验配置
cm.validate(config)

# 获取类型化配置对象
user_config = cm.get_user_config()
app_config = cm.get_app_config()
cdp_config = cm.get_cdp_config()
```

### 在应用中使用

```python
def run():
    # 替换原有的 load_settings
    config_manager = ConfigManager()
    
    try:
        config = config_manager.load()
        config_manager.validate(config)
    except Exception as e:
        print(f"配置错误: {e}")
        return
    
    # 获取配置
    user_config = config_manager.get_user_config()
    app_config = config_manager.get_app_config()
    
    # 使用配置
    ws_client = WsClient(app_config.api_endpoints["ws"], on_recos)
    # ...
```

### 抓取服务中使用 (Node.js)

```javascript
import { readFileSync } from 'fs';
import { join } from 'path';

function loadAppConfig() {
  const defaults = {
    apiEndpoints: {
      recommend: 'http://127.0.0.1:7788/recommend',
      ingest: 'http://127.0.0.1:7788/ingest'
    },
    wsPort: 7799
  };

  try {
    const configPath = join(process.cwd(), '..', 'quickreply-min', 'config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    const appConfig = config.app || {};
    
    return {
      apiEndpoints: {
        recommend: process.env.QR_RECOMMEND_URL || appConfig.api_endpoints?.recommend || defaults.apiEndpoints.recommend,
        ingest: process.env.QR_INGEST_URL || appConfig.api_endpoints?.ingest || defaults.apiEndpoints.ingest
      },
      wsPort: parseInt(process.env.QR_WS_PORT) || 7799
    };
  } catch (e) {
    // 使用默认配置和环境变量
    return defaults;
  }
}
```

## 配置校验

### 自动校验

ConfigManager 会自动校验以下内容：

- **必需字段存在性**: 确保所有必需的配置项都存在
- **类型正确性**: 检查数据类型是否符合预期
- **格式有效性**: 验证特殊格式（如 CDP 端口范围）
- **API 端点完整性**: 确保所有必需的 API 端点都已配置

### 校验错误示例

```python
# 类型错误
config = {"user": {"top_k": "not_a_number"}}
# 抛出: TypeError: 配置类型错误: user.top_k 期望 int, 实际 str

# 缺失字段
config = {"user": {}}
# 抛出: ValueError: 配置缺失: user.hotkeys

# 格式错误
config = {"cdp": {"range": "invalid-format"}}
# 抛出: ValueError: CDP端口范围格式错误: invalid-format (期望格式: '9222-9333')
```

## 旧配置迁移

ConfigManager 自动迁移旧配置格式：

### settings.json 迁移

```json
// 旧格式
{
  "top_k": 8,
  "hotkey_show": "alt+q",
  "hotkey_reload": "ctrl+f5",
  "target_keywords": ["test1", "test2"]
}

// 自动转换为
{
  "user": {
    "top_k": 8,
    "hotkeys": {
      "show": "alt+q",
      "reload": "ctrl+f5"
    },
    "target_keywords": ["test1", "test2"]
  }
}
```

### quickreply.config.json 迁移

应用级配置（如窗口尺寸）保留在原位置，未来可逐步迁移。

## 部署和运维

### 开发环境

```bash
# 使用默认配置
python -m quickreply

# 临时覆盖配置
QR_TOP_K=10 QR_THEME=light python -m quickreply
```

### 生产环境

```bash
# 设置生产环境变量
export QR_WS_URL="ws://prod-server:7799"
export QR_RECOMMEND_URL="http://prod-api:7788/recommend"
export QR_INGEST_URL="http://prod-api:7788/ingest"
export QR_TOKEN="production-token"

# 启动服务
python -m quickreply
```

### Docker 部署

```dockerfile
ENV QR_WS_URL=ws://backend:7799
ENV QR_RECOMMEND_URL=http://backend:7788/recommend
ENV QR_INGEST_URL=http://backend:7788/ingest
ENV QR_TOKEN=docker-token
```

## 测试

运行完整的配置管理测试：

```bash
cd C:\dev\quickreply-min
python test_integration.py
```

测试包括：
- ✅ ConfigManager 基本功能
- ✅ 环境变量覆盖
- ✅ 配置校验
- ✅ 旧配置迁移
- ✅ 服务健康状态

## 故障排除

### 常见问题

**1. 配置文件不存在**
```
[ConfigManager] 加载配置文件失败 config.json: [Errno 2] No such file or directory
```
**解决**: 创建 `config.json` 或使用环境变量

**2. 配置格式错误**
```
配置类型错误: user.top_k 期望 int, 实际 str
```
**解决**: 检查配置文件中的数据类型

**3. 环境变量类型错误**
```
[ConfigManager] 环境变量类型转换失败 QR_TOP_K=abc
```
**解决**: 确保环境变量值符合预期类型

### 调试技巧

```python
# 查看完整配置
cm = ConfigManager()
config = cm.load()
print(json.dumps(config, indent=2, ensure_ascii=False))

# 查看环境变量覆盖
import os
qr_vars = {k: v for k, v in os.environ.items() if k.startswith('QR_')}
print("QR环境变量:", qr_vars)
```

## 最佳实践

1. **配置分层**: 使用 `config.json` 作为基准，环境变量用于部署时覆盖
2. **敏感信息**: 通过环境变量传递 token 等敏感信息
3. **版本控制**: `config.json` 可入版本控制，环境变量配置不入库
4. **测试覆盖**: 为配置变更编写测试，确保兼容性
5. **文档同步**: 配置变更时及时更新文档

通过 ConfigManager，系统实现了统一、灵活、可审计的配置管理，支持从开发到生产的全生命周期配置需求。
