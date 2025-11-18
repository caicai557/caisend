# Telegram Web 元素定位策略设计

## 📊 基于 Traneasy 的定位参考

根据对 Traneasy 的分析，我们总结出以下 Web 定位最佳实践：

### 🎯 核心定位原则

1. **消息 ID 追踪** - 使用唯一标识符
2. **方向区分** - 明确收发消息 (isOut)
3. **多层回退** - 选择器降级机制
4. **DOM 属性优先** - data-* 属性 > class > 结构

---

## 🔍 功能模块定位策略

### 1️⃣ 消息列表定位

#### 当前实现
```python
# src/teleflow/telegram_web/selectors.py
MESSAGE_LIST = [
    ".messages-container",
    ".message-list",
    "[class*='messages']"
]
```

#### 优化建议
```python
MESSAGE_LIST = [
    # 优先：使用 data 属性
    "[data-type='messageList']",
    "[data-testid='message-list']",
    
    # 次选：专用类名
    ".messages-container",
    ".message-list-container",
    ".bubbles-inner",
    
    # 回退：通用模式
    "[class*='messages']",
    "[class*='bubble']",
    ".chat-content"
]
```

### 2️⃣ 单条消息定位

#### 参考 Traneasy 的消息结构
```javascript
// Traneasy 使用的消息对象
{
  "id": "3555",           // 消息唯一ID
  "text": "消息内容",      // 文本内容
  "isOut": true           // true=发出, false=收到
}
```

#### 优化后的选择器设计
```python
# 消息容器（通用）
MESSAGE_ITEM = [
    # 优先：带 ID 的消息
    "[data-message-id]",
    "[data-mid]",
    
    # 次选：消息元素
    ".message",
    ".bubble",
    ".message-container",
    
    # 回退：结构定位
    "[class*='message']",
    "[class*='bubble']"
]

# 收到的消息（incoming）
MESSAGE_INCOMING = [
    ".message.incoming",
    ".message:not(.is-out)",
    "[class*='message-in']",
    "[data-is-out='false']",
    ".bubble.is-in"
]

# 发出的消息（outgoing）
MESSAGE_OUTGOING = [
    ".message.outgoing",
    ".message.is-out",
    "[class*='message-out']",
    "[data-is-out='true']",
    ".bubble.is-out"
]
```

### 3️⃣ 消息输入框定位

#### 当前实现
```python
MESSAGE_INPUT = [
    '[contenteditable="true"]',
    '.input-message-input',
    'div[role="textbox"]'
]
```

#### 优化建议
```python
MESSAGE_INPUT = [
    # 优先：精确定位
    '[data-testid="message-input"]',
    '.input-message-input',
    '#message-input-text',
    
    # 次选：属性匹配
    '[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"].input-field',
    
    # 回退：通用匹配
    '[contenteditable="true"]',
    'div[role="textbox"]',
    '.input-message',
    '[placeholder*="message"]'
]
```

### 4️⃣ 发送按钮定位

```python
SEND_BUTTON = [
    # 优先：专用标识
    '[data-testid="send-button"]',
    'button[aria-label*="Send"]',
    '.btn-send-message',
    
    # 次选：图标识别
    'button svg[class*="send"]',
    'button .icon-send',
    
    # 回退：结构定位
    '.input-message-container button',
    '[class*="send-btn"]',
    'button[title*="Send"]'
]
```

### 5️⃣ 聊天搜索定位

```python
CHAT_SEARCH = [
    # 搜索输入框
    '[data-testid="chat-search"]',
    'input[placeholder*="Search"]',
    '.search-input',
    '#search-input',
    'input[type="search"]',
    
    # 搜索容器
    '.search-container',
    '[class*="search"]'
]
```

### 6️⃣ 聊天项定位

```python
CHAT_ITEM = [
    # 优先：带数据属性
    '[data-peer-id]',
    '[data-dialog-id]',
    
    # 次选：语义化类名
    '.chatlist-chat',
    '.chat-item',
    '.dialog-item',
    
    # 回退：通用匹配
    '[class*="chat-item"]',
    '[class*="dialog"]',
    '.chat'
]

CHAT_TITLE = [
    '.chat-title',
    '.dialog-title',
    '.peer-title',
    '[class*="chat-name"]',
    '[class*="title"]'
]
```

---

## 🎨 功能设计优化

### 💬 快速回复功能设计

参考 Traneasy 的快速回复，我们应该实现：

```python
# src/teleflow/models/quick_reply.py
from pydantic import BaseModel, Field
from typing import Optional, List

class QuickReply(BaseModel):
    """快速回复模板"""
    
    id: str = Field(..., description="模板ID")
    name: str = Field(..., description="模板名称")
    content: str = Field(..., description="回复内容")
    shortcut: Optional[str] = Field(None, description="快捷键，如 '/hello'")
    category: Optional[str] = Field("默认", description="分类")
    tags: List[str] = Field(default_factory=list, description="标签")
    enabled: bool = Field(True, description="是否启用")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "qr001",
                "name": "问候",
                "content": "您好！我是自动回复助手，很高兴为您服务。",
                "shortcut": "/hello",
                "category": "问候语",
                "tags": ["常用", "礼貌"],
                "enabled": True
            }
        }
```

#### 在配置中使用
```yaml
# config.yaml
accounts:
  - name: "my-account"
    quick_replies:
      - id: "qr001"
        name: "问候"
        content: "您好！我是自动回复助手。"
        shortcut: "/hello"
        
      - id: "qr002"
        name: "感谢"
        content: "感谢您的消息，我会尽快回复。"
        shortcut: "/thanks"
```

### 📊 消息统计设计

```python
# src/teleflow/models/stats.py
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Any

@dataclass
class MessageStats:
    """消息统计"""
    
    # 基础计数
    received_count: int = 0
    sent_count: int = 0
    auto_reply_count: int = 0
    manual_reply_count: int = 0
    
    # 错误统计
    error_count: int = 0
    retry_count: int = 0
    
    # 时间统计
    start_time: datetime = None
    last_message_time: datetime = None
    
    def __post_init__(self):
        if self.start_time is None:
            self.start_time = datetime.now()
    
    def get_summary(self) -> Dict[str, Any]:
        """获取统计摘要"""
        runtime = (datetime.now() - self.start_time).total_seconds()
        
        return {
            "runtime_seconds": runtime,
            "runtime_hours": runtime / 3600,
            "received": self.received_count,
            "sent": self.sent_count,
            "auto_replied": self.auto_reply_count,
            "manual_replied": self.manual_reply_count,
            "total_replies": self.auto_reply_count + self.manual_reply_count,
            "errors": self.error_count,
            "retries": self.retry_count,
            "avg_messages_per_hour": (self.received_count / (runtime / 3600)) if runtime > 0 else 0
        }
```

### 🎯 消息 ID 追踪设计

```python
# src/teleflow/telegram_web/message_tracker.py
from typing import Dict, Optional, Set
from dataclasses import dataclass
from datetime import datetime

@dataclass
class MessageInfo:
    """消息信息"""
    id: str
    text: str
    is_outgoing: bool
    timestamp: datetime
    chat_id: Optional[str] = None

class MessageTracker:
    """消息追踪器 - 参考 Traneasy 的 ID 追踪机制"""
    
    def __init__(self):
        self.seen_messages: Set[str] = set()
        self.message_cache: Dict[str, MessageInfo] = {}
        self.max_cache_size = 1000
    
    def is_new_message(self, message_id: str) -> bool:
        """检查是否为新消息"""
        if message_id in self.seen_messages:
            return False
        
        self.seen_messages.add(message_id)
        
        # 限制缓存大小
        if len(self.seen_messages) > self.max_cache_size:
            # 移除最旧的消息ID
            oldest = list(self.seen_messages)[:100]
            self.seen_messages -= set(oldest)
        
        return True
    
    def add_message(self, message: MessageInfo):
        """添加消息到缓存"""
        self.message_cache[message.id] = message
        
        # 限制缓存大小
        if len(self.message_cache) > self.max_cache_size:
            oldest_keys = list(self.message_cache.keys())[:100]
            for key in oldest_keys:
                del self.message_cache[key]
    
    def get_message(self, message_id: str) -> Optional[MessageInfo]:
        """获取消息信息"""
        return self.message_cache.get(message_id)
```

---

## 🔧 实现优化建议

### 1. 增强 Monitor 类

```python
# src/teleflow/telegram_web/monitor.py
class MessageMonitor:
    """消息监控器 - 增强版"""
    
    def __init__(self, page, tracker: Optional[MessageTracker] = None):
        self.page = page
        self.tracker = tracker or MessageTracker()
        self.logger = logging.getLogger(__name__)
    
    async def get_messages_with_ids(self) -> List[MessageInfo]:
        """获取带 ID 的消息列表"""
        messages = []
        
        try:
            # 查找所有消息元素
            message_elements = await self.page.locator(
                "[data-message-id], .message"
            ).all()
            
            for elem in message_elements:
                # 尝试获取消息 ID
                message_id = await elem.get_attribute("data-message-id")
                if not message_id:
                    # 回退：使用其他方式生成 ID
                    message_id = await self._generate_message_id(elem)
                
                # 检查是否为新消息
                if not self.tracker.is_new_message(message_id):
                    continue
                
                # 获取消息文本
                text = await elem.inner_text()
                
                # 判断是否为发出的消息
                is_out = await self._is_outgoing_message(elem)
                
                # 创建消息信息
                msg_info = MessageInfo(
                    id=message_id,
                    text=text.strip(),
                    is_outgoing=is_out,
                    timestamp=datetime.now()
                )
                
                self.tracker.add_message(msg_info)
                messages.append(msg_info)
        
        except Exception as e:
            self.logger.error(f"获取消息失败: {e}")
        
        return messages
    
    async def _is_outgoing_message(self, element) -> bool:
        """判断是否为发出的消息"""
        # 检查多种可能的标识
        checks = [
            await element.get_attribute("data-is-out") == "true",
            "is-out" in await element.get_attribute("class") or "",
            "outgoing" in await element.get_attribute("class") or "",
            "message-out" in await element.get_attribute("class") or ""
        ]
        return any(checks)
    
    async def _generate_message_id(self, element) -> str:
        """生成消息 ID（回退方案）"""
        # 使用元素的文本和时间戳生成哈希
        text = await element.inner_text()
        position = await element.bounding_box()
        return f"msg_{hash(text + str(position))}_{int(datetime.now().timestamp())}"
```

### 2. 改进选择器系统

```python
# src/teleflow/telegram_web/selectors.py
class TelegramSelectors:
    """Telegram Web 选择器 - 增强版"""
    
    # 消息相关
    MESSAGE_WITH_ID = "[data-message-id], [data-mid], .message[id]"
    MESSAGE_INCOMING = ".message.incoming, .message:not(.is-out)"
    MESSAGE_OUTGOING = ".message.outgoing, .message.is-out"
    MESSAGE_TEXT = ".message-text, .text-content, [class*='text']"
    MESSAGE_TIME = ".message-time, .time, [class*='time']"
    
    # 聊天列表
    CHAT_LIST_ITEM = "[data-peer-id], [data-dialog-id], .chatlist-chat"
    CHAT_UNREAD_BADGE = ".badge, .unread-count, [class*='badge']"
    
    # 输入相关
    INPUT_AREA = "[contenteditable='true'][role='textbox']"
    SEND_BUTTON = "[data-testid='send-button'], button[aria-label*='Send']"
    
    # 状态相关
    ONLINE_STATUS = ".online-status, [class*='status']"
    TYPING_INDICATOR = ".typing-indicator, [class*='typing']"
    
    @staticmethod
    def get_message_by_id(message_id: str) -> str:
        """根据消息 ID 生成选择器"""
        return f"[data-message-id='{message_id}'], [data-mid='{message_id}']"
    
    @staticmethod
    def get_chat_by_name(chat_name: str) -> str:
        """根据聊天名称生成选择器"""
        return f".chat-title:has-text('{chat_name}'), .dialog-title:has-text('{chat_name}')"
```

---

## 📈 性能优化建议

### 1. 批量操作
```python
# 一次性获取多个元素，而不是逐个查询
messages = await page.locator(".message").all()
```

### 2. 等待策略优化
```python
# 使用更精确的等待条件
await page.wait_for_selector(
    ".message[data-message-id]",
    state="visible",
    timeout=5000
)
```

### 3. 缓存机制
```python
# 缓存选择器查询结果
class SelectorCache:
    def __init__(self, ttl: int = 60):
        self.cache = {}
        self.ttl = ttl
```

---

## 🎯 实施优先级

### 立即实施（Phase 4.5）
- [x] 优化消息列表选择器
- [ ] 添加消息 ID 追踪
- [ ] 实现消息方向区分
- [ ] 增强错误处理

### 短期实施（Phase 5）
- [ ] 快速回复功能
- [ ] 消息统计系统
- [ ] 性能优化

### 长期规划（Phase 6+）
- [ ] 高级缓存机制
- [ ] 智能选择器自适应
- [ ] UI 可视化工具

---

## 📝 参考资源

- Traneasy 消息结构分析
- Playwright 定位器文档
- Telegram Web 源码研究
- 最佳实践案例集
