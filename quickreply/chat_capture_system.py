"""
企业级聊天捕获系统 - 多层Web应用聊天获取解决方案
支持易翻译等打包的Web版Telegram，处理多层壳和多账号场景
"""

import asyncio
import json
import time
import hashlib
import sqlite3
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from collections import defaultdict
from enum import Enum
import threading
from queue import Queue, Empty
import subprocess
import os

try:
    import aiohttp
    HAS_AIOHTTP = True
except ImportError:
    HAS_AIOHTTP = False

try:
    from selenium import webdriver
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.chrome.options import Options
    HAS_SELENIUM = True
except ImportError:
    HAS_SELENIUM = False

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============= 配置类 =============
@dataclass
class CaptureConfig:
    """捕获系统配置"""
    # CDP配置
    cdp_host: str = "127.0.0.1"
    cdp_port_range: Tuple[int, int] = (9222, 9333)
    cdp_timeout: float = 5.0
    
    # 数据库配置
    db_path: str = "chat_capture.db"
    dedup_window_ms: int = 180000  # 3分钟去重窗口
    
    # 捕获配置
    capture_interval: float = 1.0  # 捕获间隔
    batch_size: int = 100  # 批处理大小
    max_retries: int = 3  # 最大重试次数
    
    # 多账号配置
    max_accounts: int = 10  # 最大账号数
    account_switch_delay: float = 2.0  # 账号切换延迟
    
    # 性能配置
    enable_cache: bool = True
    cache_ttl: int = 300  # 缓存TTL（秒）
    max_workers: int = 4  # 最大工作线程数

# ============= 账号状态 =============
class AccountStatus(Enum):
    """账号状态枚举"""
    INACTIVE = "inactive"
    CONNECTING = "connecting"
    ACTIVE = "active"
    ERROR = "error"
    SUSPENDED = "suspended"

# ============= 账号信息 =============
@dataclass
class AccountInfo:
    """账号信息"""
    account_id: str
    name: str
    status: AccountStatus = AccountStatus.INACTIVE
    last_active: Optional[float] = None
    error_count: int = 0
    cdp_port: Optional[int] = None
    target_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

# ============= 消息记录 =============
@dataclass
class ChatMessage:
    """聊天消息"""
    account_id: str
    chat_key: str
    chat_id: str
    chat_title: str
    message_id: str
    text: str
    is_out: bool
    timestamp: float
    metadata: Dict[str, Any] = field(default_factory=dict)

# ============= CDP客户端 =============
class CDPClient:
    """Chrome DevTools Protocol客户端"""
    
    def __init__(self, host: str = "127.0.0.1", port: int = 9222):
        self.host = host
        self.port = port
        self.ws_url = None
        self.session = None
        self.ws = None
        self.message_id = 0
        self.pending_messages = {}
        
    async def connect(self, target_id: Optional[str] = None) -> bool:
        """连接到CDP"""
        try:
            if not HAS_AIOHTTP:
                logger.error("aiohttp未安装")
                return False
                
            # 获取目标列表
            async with aiohttp.ClientSession() as session:
                async with session.get(f"http://{self.host}:{self.port}/json") as resp:
                    targets = await resp.json()
                    
            if not targets:
                logger.error("没有可用的CDP目标")
                return False
                
            # 选择目标
            target = None
            if target_id:
                target = next((t for t in targets if t.get('id') == target_id), None)
            if not target:
                # 选择第一个页面目标
                target = next((t for t in targets if t.get('type') == 'page'), targets[0])
                
            self.ws_url = target.get('webSocketDebuggerUrl')
            if not self.ws_url:
                logger.error("无法获取WebSocket URL")
                return False
                
            # 连接WebSocket
            self.session = aiohttp.ClientSession()
            self.ws = await self.session.ws_connect(self.ws_url)
            
            logger.info(f"CDP连接成功: {self.ws_url}")
            return True
            
        except Exception as e:
            logger.error(f"CDP连接失败: {e}")
            return False
            
    async def send_command(self, method: str, params: Optional[Dict] = None) -> Dict:
        """发送CDP命令"""
        if not self.ws:
            raise Exception("CDP未连接")
            
        self.message_id += 1
        message = {
            'id': self.message_id,
            'method': method,
            'params': params or {}
        }
        
        await self.ws.send_json(message)
        
        # 等待响应
        while True:
            msg = await self.ws.receive()
            if msg.type == aiohttp.WSMsgType.TEXT:
                data = json.loads(msg.data)
                if data.get('id') == self.message_id:
                    if 'error' in data:
                        raise Exception(f"CDP错误: {data['error']}")
                    return data.get('result', {})
                    
    async def inject_script(self, script: str) -> Any:
        """注入JavaScript脚本"""
        return await self.send_command('Runtime.evaluate', {
            'expression': script,
            'returnByValue': True
        })
        
    async def enable_console(self) -> None:
        """启用控制台监听"""
        await self.send_command('Runtime.enable')
        
    async def close(self) -> None:
        """关闭连接"""
        if self.ws:
            await self.ws.close()
        if self.session:
            await self.session.close()

# ============= 数据库管理器 =============
class DatabaseManager:
    """数据库管理器"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.conn = None
        self.init_database()
        
    def init_database(self) -> None:
        """初始化数据库"""
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        
        # 创建表
        self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id TEXT NOT NULL,
                chat_key TEXT NOT NULL,
                chat_id TEXT,
                chat_title TEXT,
                message_id TEXT,
                text TEXT NOT NULL,
                is_out INTEGER NOT NULL,
                timestamp INTEGER NOT NULL,
                text_hash TEXT NOT NULL,
                dedup_key TEXT NOT NULL UNIQUE,
                metadata TEXT,
                created_at INTEGER DEFAULT (strftime('%s','now')*1000)
            );
            
            CREATE INDEX IF NOT EXISTS idx_account_chat ON chat_messages(account_id, chat_key);
            CREATE INDEX IF NOT EXISTS idx_timestamp ON chat_messages(timestamp);
            CREATE INDEX IF NOT EXISTS idx_dedup ON chat_messages(dedup_key);
            
            CREATE TABLE IF NOT EXISTS accounts (
                account_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                status TEXT NOT NULL,
                last_active INTEGER,
                error_count INTEGER DEFAULT 0,
                metadata TEXT,
                created_at INTEGER DEFAULT (strftime('%s','now')*1000),
                updated_at INTEGER DEFAULT (strftime('%s','now')*1000)
            );
            
            CREATE TABLE IF NOT EXISTS capture_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id TEXT NOT NULL,
                messages_captured INTEGER DEFAULT 0,
                errors_count INTEGER DEFAULT 0,
                last_capture INTEGER,
                created_at INTEGER DEFAULT (strftime('%s','now')*1000)
            );
        """)
        self.conn.commit()
        
    def save_message(self, message: ChatMessage) -> bool:
        """保存消息（去重）"""
        try:
            # 计算去重键
            text_hash = hashlib.sha256(message.text.encode()).hexdigest()
            time_bucket = int(message.timestamp // 180000)  # 3分钟时间桶
            
            dedup_components = [
                message.account_id,
                message.chat_key,
                str(message.is_out),
                message.message_id if message.message_id else f"{text_hash}:{time_bucket}"
            ]
            dedup_key = hashlib.sha256('|'.join(dedup_components).encode()).hexdigest()
            
            # 插入消息
            self.conn.execute("""
                INSERT OR IGNORE INTO chat_messages 
                (account_id, chat_key, chat_id, chat_title, message_id, text, 
                 is_out, timestamp, text_hash, dedup_key, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                message.account_id,
                message.chat_key,
                message.chat_id,
                message.chat_title,
                message.message_id,
                message.text,
                1 if message.is_out else 0,
                int(message.timestamp),
                text_hash,
                dedup_key,
                json.dumps(message.metadata)
            ))
            
            self.conn.commit()
            return self.conn.total_changes > 0
            
        except Exception as e:
            logger.error(f"保存消息失败: {e}")
            return False
            
    def save_messages_batch(self, messages: List[ChatMessage]) -> int:
        """批量保存消息"""
        saved_count = 0
        for message in messages:
            if self.save_message(message):
                saved_count += 1
        return saved_count
        
    def update_account_status(self, account: AccountInfo) -> None:
        """更新账号状态"""
        self.conn.execute("""
            INSERT OR REPLACE INTO accounts 
            (account_id, name, status, last_active, error_count, metadata, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            account.account_id,
            account.name,
            account.status.value,
            int(account.last_active * 1000) if account.last_active else None,
            account.error_count,
            json.dumps(account.metadata),
            int(time.time() * 1000)
        ))
        self.conn.commit()
        
    def get_stats(self, account_id: Optional[str] = None) -> Dict:
        """获取统计信息"""
        if account_id:
            cursor = self.conn.execute("""
                SELECT COUNT(*) as total, 
                       COUNT(DISTINCT chat_key) as chats,
                       MAX(timestamp) as last_message
                FROM chat_messages 
                WHERE account_id = ?
            """, (account_id,))
        else:
            cursor = self.conn.execute("""
                SELECT COUNT(*) as total,
                       COUNT(DISTINCT account_id) as accounts, 
                       COUNT(DISTINCT chat_key) as chats,
                       MAX(timestamp) as last_message
                FROM chat_messages
            """)
            
        row = cursor.fetchone()
        return dict(row) if row else {}
        
    def close(self) -> None:
        """关闭数据库"""
        if self.conn:
            self.conn.close()

# ============= 注入脚本生成器 =============
class ScriptInjector:
    """脚本注入器"""
    
    @staticmethod
    def generate_capture_script(account_id: str) -> str:
        """生成捕获脚本"""
        return """
        (function() {
            'use strict';
            
            const ACCOUNT_ID = '%s';
            const CAPTURE_MARKER = '[CAPTURE]';
            
            // 配置选择器（支持多种Telegram Web版本）
            const SELECTORS = {
                // 易翻译包装版
                messageContainer: [
                    '.message-list-item',
                    '.im_history_message_wrap',
                    '[data-mid]',
                    '.Message'
                ],
                // Telegram Web K
                chatContainer: [
                    '.chat-input',
                    '.bubbles-inner',
                    '.messages-container'
                ],
                // Telegram Web A
                altContainer: [
                    '.im_history_scrollable_wrap',
                    '.im_history_messages_peer'
                ]
            };
            
            // 查找元素
            function findElement(selectors) {
                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) return elements;
                }
                return [];
            }
            
            // 提取消息文本
            function extractText(element) {
                // 尝试多种方式提取文本
                const textSelectors = [
                    '.message-text',
                    '.im_message_text',
                    '.text-content',
                    '.Message__text'
                ];
                
                for (const selector of textSelectors) {
                    const textEl = element.querySelector(selector);
                    if (textEl) return textEl.innerText || textEl.textContent || '';
                }
                
                // 降级到直接获取文本
                return element.innerText || element.textContent || '';
            }
            
            // 判断是否为发出的消息
            function isOutgoing(element) {
                const outClasses = ['is-out', 'im_message_out', 'own', 'Message__own'];
                const classList = element.className || '';
                return outClasses.some(cls => classList.includes(cls));
            }
            
            // 获取消息ID
            function getMessageId(element) {
                return element.dataset.mid || 
                       element.dataset.messageId || 
                       element.getAttribute('data-message-id') || 
                       '';
            }
            
            // 获取聊天信息
            function getChatInfo() {
                // 尝试从URL获取
                const url = window.location.href;
                const chatMatch = url.match(/#\/im\\?p=(@?[\\w_]+)/);
                const chatKey = chatMatch ? chatMatch[1] : '';
                
                // 尝试从页面标题获取
                const title = document.querySelector('.peer-title, .chat-title, .im_page_peer_title');
                const chatTitle = title ? (title.innerText || title.textContent || '') : '';
                
                return {
                    chatKey: chatKey || 'unknown',
                    chatId: chatKey,
                    chatTitle: chatTitle || 'Unknown Chat'
                };
            }
            
            // 捕获消息
            function captureMessages() {
                const messages = [];
                const elements = findElement(SELECTORS.messageContainer);
                
                for (const element of elements) {
                    const text = extractText(element);
                    if (!text || text.length < 2) continue;
                    
                    messages.push({
                        message_id: getMessageId(element),
                        text: text.substring(0, 1000),
                        is_out: isOutgoing(element),
                        timestamp: Date.now()
                    });
                }
                
                if (messages.length === 0) return;
                
                const chatInfo = getChatInfo();
                const payload = {
                    type: 'chat_capture',
                    account_id: ACCOUNT_ID,
                    chat_key: chatInfo.chatKey,
                    chat_id: chatInfo.chatId,
                    chat_title: chatInfo.chatTitle,
                    messages: messages,
                    timestamp: Date.now()
                };
                
                // 发送到控制台供CDP捕获
                console.log(CAPTURE_MARKER, JSON.stringify(payload));
                
                // 保存到window对象供备用读取
                window.__last_capture__ = payload;
            }
            
            // 监听DOM变化
            let observer = null;
            function startObserver() {
                if (observer) observer.disconnect();
                
                const containers = findElement([
                    ...SELECTORS.chatContainer,
                    ...SELECTORS.altContainer
                ]);
                
                if (containers.length === 0) {
                    console.log(CAPTURE_MARKER, 'No container found, retrying...');
                    setTimeout(startObserver, 2000);
                    return;
                }
                
                observer = new MutationObserver((mutations) => {
                    // 防抖处理
                    clearTimeout(window.__capture_timeout__);
                    window.__capture_timeout__ = setTimeout(captureMessages, 100);
                });
                
                for (const container of containers) {
                    observer.observe(container, {
                        childList: true,
                        subtree: true,
                        characterData: true
                    });
                }
                
                console.log(CAPTURE_MARKER, 'Observer started for account: ' + ACCOUNT_ID);
            }
            
            // 处理iframe场景
            function handleIframes() {
                const iframes = document.querySelectorAll('iframe');
                for (const iframe of iframes) {
                    try {
                        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                        if (iframeDoc && iframeDoc.body) {
                            // 在iframe中注入相同脚本
                            const script = iframeDoc.createElement('script');
                            script.textContent = '(' + arguments.callee.toString() + ')()';
                            iframeDoc.body.appendChild(script);
                        }
                    } catch (e) {
                        // 跨域iframe，无法访问
                        console.log(CAPTURE_MARKER, 'Cross-origin iframe detected');
                    }
                }
            }
            
            // 初始化
            function initialize() {
                console.log(CAPTURE_MARKER, 'Initializing capture for account: ' + ACCOUNT_ID);
                
                // 立即捕获一次
                captureMessages();
                
                // 启动观察器
                startObserver();
                
                // 处理iframe
                handleIframes();
                
                // 定期捕获（备用）
                setInterval(captureMessages, 5000);
            }
            
            // 等待页面加载
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initialize);
            } else {
                initialize();
            }
            
        })();
        """ % account_id

# ============= 账号捕获器 =============
class AccountCapturer:
    """单个账号的捕获器"""
    
    def __init__(self, account: AccountInfo, config: CaptureConfig, db: DatabaseManager):
        self.account = account
        self.config = config
        self.db = db
        self.cdp_client = None
        self.running = False
        self.message_queue = Queue(maxsize=1000)
        self.stats = {
            'messages_captured': 0,
            'errors': 0,
            'last_capture': None
        }
        
    async def start(self) -> bool:
        """启动捕获"""
        try:
            logger.info(f"启动账号捕获: {self.account.account_id}")
            
            # 查找可用的CDP端口
            port = await self._find_cdp_port()
            if not port:
                logger.error(f"找不到CDP端口: {self.account.account_id}")
                return False
                
            self.account.cdp_port = port
            
            # 连接CDP
            self.cdp_client = CDPClient(self.config.cdp_host, port)
            if not await self.cdp_client.connect(self.account.target_id):
                return False
                
            # 启用控制台监听
            await self.cdp_client.enable_console()
            
            # 注入捕获脚本
            script = ScriptInjector.generate_capture_script(self.account.account_id)
            await self.cdp_client.inject_script(script)
            
            # 更新账号状态
            self.account.status = AccountStatus.ACTIVE
            self.account.last_active = time.time()
            self.db.update_account_status(self.account)
            
            self.running = True
            
            # 启动消息处理
            asyncio.create_task(self._process_messages())
            
            # 启动控制台监听
            asyncio.create_task(self._listen_console())
            
            return True
            
        except Exception as e:
            logger.error(f"启动捕获失败 {self.account.account_id}: {e}")
            self.account.status = AccountStatus.ERROR
            self.account.error_count += 1
            self.db.update_account_status(self.account)
            return False
            
    async def _find_cdp_port(self) -> Optional[int]:
        """查找可用的CDP端口"""
        for port in range(self.config.cdp_port_range[0], self.config.cdp_port_range[1]):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        f"http://{self.config.cdp_host}:{port}/json",
                        timeout=aiohttp.ClientTimeout(total=1)
                    ) as resp:
                        if resp.status == 200:
                            return port
            except:
                continue
        return None
        
    async def _listen_console(self) -> None:
        """监听控制台输出"""
        while self.running and self.cdp_client and self.cdp_client.ws:
            try:
                msg = await self.cdp_client.ws.receive()
                
                if msg.type == aiohttp.WSMsgType.TEXT:
                    data = json.loads(msg.data)
                    
                    # 处理控制台消息
                    if data.get('method') == 'Runtime.consoleAPICalled':
                        await self._handle_console_message(data.get('params', {}))
                        
            except Exception as e:
                logger.error(f"控制台监听错误 {self.account.account_id}: {e}")
                break
                
    async def _handle_console_message(self, params: Dict) -> None:
        """处理控制台消息"""
        try:
            args = params.get('args', [])
            if not args:
                return
                
            # 提取消息文本
            texts = []
            for arg in args:
                if 'value' in arg:
                    texts.append(str(arg['value']))
                elif 'description' in arg:
                    texts.append(arg['description'])
                    
            message = ' '.join(texts)
            
            # 检查是否为捕获消息
            if '[CAPTURE]' in message:
                # 提取JSON数据
                json_start = message.find('{')
                if json_start >= 0:
                    json_str = message[json_start:]
                    try:
                        data = json.loads(json_str)
                        await self._handle_capture_data(data)
                    except json.JSONDecodeError:
                        pass
                        
        except Exception as e:
            logger.error(f"处理控制台消息失败: {e}")
            
    async def _handle_capture_data(self, data: Dict) -> None:
        """处理捕获的数据"""
        if data.get('type') != 'chat_capture':
            return
            
        messages = data.get('messages', [])
        if not messages:
            return
            
        # 构建消息对象
        for msg_data in messages:
            message = ChatMessage(
                account_id=data.get('account_id', self.account.account_id),
                chat_key=data.get('chat_key', ''),
                chat_id=data.get('chat_id', ''),
                chat_title=data.get('chat_title', ''),
                message_id=msg_data.get('message_id', ''),
                text=msg_data.get('text', ''),
                is_out=msg_data.get('is_out', False),
                timestamp=msg_data.get('timestamp', time.time()),
                metadata=msg_data
            )
            
            # 添加到队列
            try:
                self.message_queue.put_nowait(message)
            except:
                pass  # 队列满，丢弃消息
                
    async def _process_messages(self) -> None:
        """处理消息队列"""
        batch = []
        last_save = time.time()
        
        while self.running:
            try:
                # 从队列获取消息
                try:
                    message = self.message_queue.get(timeout=1)
                    batch.append(message)
                except Empty:
                    pass
                    
                # 批量保存
                if len(batch) >= self.config.batch_size or \
                   (batch and time.time() - last_save > 5):
                    
                    saved = self.db.save_messages_batch(batch)
                    self.stats['messages_captured'] += saved
                    self.stats['last_capture'] = time.time()
                    
                    logger.info(f"保存了 {saved} 条消息 ({self.account.account_id})")
                    
                    batch.clear()
                    last_save = time.time()
                    
                    # 更新账号活跃时间
                    self.account.last_active = time.time()
                    
            except Exception as e:
                logger.error(f"处理消息失败: {e}")
                self.stats['errors'] += 1
                
            await asyncio.sleep(0.1)
            
    async def stop(self) -> None:
        """停止捕获"""
        self.running = False
        
        if self.cdp_client:
            await self.cdp_client.close()
            
        # 保存剩余消息
        batch = []
        while not self.message_queue.empty():
            try:
                batch.append(self.message_queue.get_nowait())
            except:
                break
                
        if batch:
            self.db.save_messages_batch(batch)
            
        # 更新账号状态
        self.account.status = AccountStatus.INACTIVE
        self.db.update_account_status(self.account)
        
        logger.info(f"账号捕获已停止: {self.account.account_id}")

# ============= 多账号管理器 =============
class MultiAccountManager:
    """多账号管理器"""
    
    def __init__(self, config: CaptureConfig):
        self.config = config
        self.db = DatabaseManager(config.db_path)
        self.accounts: Dict[str, AccountInfo] = {}
        self.capturers: Dict[str, AccountCapturer] = {}
        self.running = False
        
    def add_account(self, account_id: str, name: str, metadata: Optional[Dict] = None) -> None:
        """添加账号"""
        account = AccountInfo(
            account_id=account_id,
            name=name,
            metadata=metadata or {}
        )
        self.accounts[account_id] = account
        self.db.update_account_status(account)
        logger.info(f"添加账号: {account_id} ({name})")
        
    async def start_account(self, account_id: str) -> bool:
        """启动单个账号的捕获"""
        if account_id not in self.accounts:
            logger.error(f"账号不存在: {account_id}")
            return False
            
        if account_id in self.capturers and self.capturers[account_id].running:
            logger.warning(f"账号已在运行: {account_id}")
            return True
            
        account = self.accounts[account_id]
        capturer = AccountCapturer(account, self.config, self.db)
        
        if await capturer.start():
            self.capturers[account_id] = capturer
            return True
        else:
            return False
            
    async def stop_account(self, account_id: str) -> None:
        """停止单个账号的捕获"""
        if account_id in self.capturers:
            await self.capturers[account_id].stop()
            del self.capturers[account_id]
            
    async def start_all(self) -> None:
        """启动所有账号"""
        self.running = True
        
        for account_id in self.accounts:
            if len(self.capturers) >= self.config.max_accounts:
                logger.warning(f"达到最大账号数限制: {self.config.max_accounts}")
                break
                
            await self.start_account(account_id)
            
            # 账号切换延迟
            if account_id != list(self.accounts.keys())[-1]:
                await asyncio.sleep(self.config.account_switch_delay)
                
    async def stop_all(self) -> None:
        """停止所有账号"""
        self.running = False
        
        tasks = []
        for account_id in list(self.capturers.keys()):
            tasks.append(self.stop_account(account_id))
            
        await asyncio.gather(*tasks)
        
    def get_stats(self) -> Dict:
        """获取统计信息"""
        stats = {
            'total_accounts': len(self.accounts),
            'active_accounts': len(self.capturers),
            'database_stats': self.db.get_stats(),
            'account_stats': {}
        }
        
        for account_id, capturer in self.capturers.items():
            stats['account_stats'][account_id] = capturer.stats
            
        return stats
        
    def close(self) -> None:
        """关闭管理器"""
        self.db.close()

# ============= 浏览器启动器 =============
class BrowserLauncher:
    """浏览器启动器"""
    
    @staticmethod
    def launch_chrome_with_cdp(port: int, user_data_dir: Optional[str] = None) -> subprocess.Popen:
        """启动带CDP的Chrome"""
        chrome_paths = [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/usr/bin/google-chrome",
            "/usr/bin/chromium-browser"
        ]
        
        chrome_path = None
        for path in chrome_paths:
            if os.path.exists(path):
                chrome_path = path
                break
                
        if not chrome_path:
            raise Exception("找不到Chrome浏览器")
            
        args = [
            chrome_path,
            f"--remote-debugging-port={port}",
            "--no-first-run",
            "--no-default-browser-check"
        ]
        
        if user_data_dir:
            args.append(f"--user-data-dir={user_data_dir}")
        else:
            args.append("--user-data-dir=./chrome_profile")
            
        # 添加易翻译相关参数
        args.extend([
            "--disable-web-security",  # 禁用同源策略（开发环境）
            "--disable-features=IsolateOrigins,site-per-process",  # 禁用站点隔离
            "--allow-running-insecure-content",
            "--disable-blink-features=AutomationControlled"  # 隐藏自动化标记
        ])
        
        logger.info(f"启动Chrome，CDP端口: {port}")
        return subprocess.Popen(args)

# ============= 主应用 =============
class ChatCaptureSystem:
    """聊天捕获系统主应用"""
    
    def __init__(self, config: Optional[CaptureConfig] = None):
        self.config = config or CaptureConfig()
        self.manager = MultiAccountManager(self.config)
        self.browser_processes = []
        
    def setup_accounts(self, accounts: List[Dict]) -> None:
        """设置账号列表"""
        for acc in accounts:
            self.manager.add_account(
                account_id=acc['id'],
                name=acc['name'],
                metadata=acc.get('metadata', {})
            )
            
    async def start(self) -> None:
        """启动系统"""
        logger.info("启动聊天捕获系统...")
        
        # 启动浏览器实例（如需要）
        # 每个账号可以使用不同的端口和用户目录
        
        # 启动所有账号捕获
        await self.manager.start_all()
        
        logger.info("聊天捕获系统已启动")
        
    async def stop(self) -> None:
        """停止系统"""
        logger.info("停止聊天捕获系统...")
        
        await self.manager.stop_all()
        
        # 关闭浏览器进程
        for process in self.browser_processes:
            process.terminate()
            
        self.manager.close()
        
        logger.info("聊天捕获系统已停止")
        
    async def run(self) -> None:
        """运行系统"""
        await self.start()
        
        try:
            while True:
                # 定期输出统计
                stats = self.manager.get_stats()
                logger.info(f"系统统计: {json.dumps(stats, indent=2)}")
                
                await asyncio.sleep(30)
                
        except KeyboardInterrupt:
            logger.info("收到退出信号")
        finally:
            await self.stop()

# ============= 使用示例 =============
async def main():
    """主函数"""
    
    # 配置
    config = CaptureConfig(
        cdp_port_range=(9222, 9232),
        db_path="chat_capture.db",
        batch_size=50,
        max_accounts=5
    )
    
    # 创建系统
    system = ChatCaptureSystem(config)
    
    # 设置账号
    accounts = [
        {'id': 'account1', 'name': '账号1'},
        {'id': 'account2', 'name': '账号2'},
        {'id': 'account3', 'name': '账号3'}
    ]
    system.setup_accounts(accounts)
    
    # 运行系统
    await system.run()

if __name__ == "__main__":
    asyncio.run(main())