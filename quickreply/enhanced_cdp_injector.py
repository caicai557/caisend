"""
增强型CDP注入器 - 处理多层iframe和复杂Web应用
专门优化易翻译等多层封装的Telegram Web应用
"""

import asyncio
import json
import base64
import hashlib
import time
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

# ============= Frame信息 =============
@dataclass
class FrameInfo:
    """Frame信息"""
    frame_id: str
    parent_id: Optional[str]
    url: str
    name: str
    is_main: bool
    security_origin: str
    
# ============= 增强注入脚本 =============
class EnhancedScriptInjector:
    """增强型脚本注入器"""
    
    @staticmethod
    def generate_universal_capture_script(account_id: str) -> str:
        """生成通用捕获脚本（支持多种Telegram版本）"""
        return """
        (function() {
            'use strict';
            
            const ACCOUNT_ID = '%s';
            const DEBUG = true;
            
            // ============= 全局配置 =============
            const CONFIG = {
                captureInterval: 1000,
                maxMessagesPerCapture: 100,
                dedupWindow: 180000,  // 3分钟
                retryAttempts: 3,
                observerThrottle: 100
            };
            
            // ============= 选择器配置（支持多版本） =============
            const SELECTORS = {
                // Telegram Web K (官方新版)
                webK: {
                    container: '.bubbles-inner, .messages-container',
                    message: '.message, .bubble',
                    text: '.message-text, .text-content',
                    outgoing: '.is-out, .own',
                    messageId: '[data-mid], [data-message-id]',
                    chatTitle: '.chat-info-name, .peer-title',
                    chatId: '.chat-info-container'
                },
                // Telegram Web A (官方旧版)
                webA: {
                    container: '.im_history_scrollable_wrap',
                    message: '.im_message_wrap, .im_history_message_wrap',
                    text: '.im_message_text',
                    outgoing: '.im_message_out',
                    messageId: '[data-msg-id]',
                    chatTitle: '.im_page_peer_title',
                    chatId: '.im_dialogs_col'
                },
                // 易翻译包装版
                traneasy: {
                    container: '.message-list, .chat-messages',
                    message: '.message-item, .msg-item',
                    text: '.msg-text, .message-content',
                    outgoing: '.msg-out, .self',
                    messageId: '[data-id]',
                    chatTitle: '.chat-header-title',
                    chatId: '.chat-header'
                },
                // Element/Riot (Matrix协议)
                element: {
                    container: '.mx_RoomView_MessageList',
                    message: '.mx_EventTile',
                    text: '.mx_EventTile_body',
                    outgoing: '.mx_EventTile_sent',
                    messageId: '[data-event-id]',
                    chatTitle: '.mx_RoomHeader_name',
                    chatId: '.mx_RoomHeader'
                }
            };
            
            // ============= 工具函数 =============
            const Utils = {
                // 安全的querySelector
                $(selector, context = document) {
                    try {
                        return context.querySelector(selector);
                    } catch {
                        return null;
                    }
                },
                
                // 安全的querySelectorAll
                $$(selector, context = document) {
                    try {
                        return Array.from(context.querySelectorAll(selector));
                    } catch {
                        return [];
                    }
                },
                
                // 深度查找元素
                deepFind(selectors, context = document) {
                    const selectorList = Array.isArray(selectors) ? selectors : selectors.split(',');
                    for (const selector of selectorList) {
                        const elements = this.$$(selector.trim(), context);
                        if (elements.length > 0) return elements;
                    }
                    return [];
                },
                
                // 获取元素文本
                getText(element) {
                    if (!element) return '';
                    
                    // 尝试多种方式获取文本
                    const methods = [
                        () => element.innerText,
                        () => element.textContent,
                        () => element.value,
                        () => element.getAttribute('aria-label'),
                        () => element.getAttribute('title')
                    ];
                    
                    for (const method of methods) {
                        try {
                            const text = method();
                            if (text && text.trim()) return text.trim();
                        } catch {}
                    }
                    
                    // 递归获取子节点文本
                    let text = '';
                    for (const child of element.childNodes) {
                        if (child.nodeType === Node.TEXT_NODE) {
                            text += child.textContent || '';
                        } else if (child.nodeType === Node.ELEMENT_NODE) {
                            text += this.getText(child);
                        }
                    }
                    
                    return text.trim();
                },
                
                // 生成唯一ID
                generateId(text, timestamp) {
                    const hash = this.hash(text + timestamp);
                    return `msg_${hash}_${timestamp}`;
                },
                
                // 简单哈希函数
                hash(str) {
                    let hash = 0;
                    for (let i = 0; i < str.length; i++) {
                        const char = str.charCodeAt(i);
                        hash = ((hash << 5) - hash) + char;
                        hash = hash & hash;
                    }
                    return Math.abs(hash).toString(36);
                },
                
                // 防抖函数
                debounce(func, wait) {
                    let timeout;
                    return function(...args) {
                        clearTimeout(timeout);
                        timeout = setTimeout(() => func.apply(this, args), wait);
                    };
                },
                
                // 节流函数
                throttle(func, limit) {
                    let inThrottle;
                    return function(...args) {
                        if (!inThrottle) {
                            func.apply(this, args);
                            inThrottle = true;
                            setTimeout(() => inThrottle = false, limit);
                        }
                    };
                }
            };
            
            // ============= 平台检测器 =============
            class PlatformDetector {
                constructor() {
                    this.platform = null;
                    this.version = null;
                }
                
                detect() {
                    // 检测URL特征
                    const url = window.location.href;
                    
                    if (url.includes('web.telegram.org')) {
                        this.platform = url.includes('/k/') ? 'webK' : 'webA';
                    } else if (url.includes('traneasy') || url.includes('易翻译')) {
                        this.platform = 'traneasy';
                    } else if (url.includes('element') || url.includes('riot')) {
                        this.platform = 'element';
                    }
                    
                    // 检测DOM特征
                    if (!this.platform) {
                        if (Utils.$('.bubbles-inner')) {
                            this.platform = 'webK';
                        } else if (Utils.$('.im_history_scrollable_wrap')) {
                            this.platform = 'webA';
                        } else if (Utils.$('.message-list')) {
                            this.platform = 'traneasy';
                        }
                    }
                    
                    // 默认使用webK
                    if (!this.platform) {
                        this.platform = 'webK';
                    }
                    
                    console.log(`[Platform] Detected: ${this.platform}`);
                    return this.platform;
                }
                
                getSelectors() {
                    return SELECTORS[this.platform] || SELECTORS.webK;
                }
            }
            
            // ============= 消息提取器 =============
            class MessageExtractor {
                constructor(selectors) {
                    this.selectors = selectors;
                    this.processedMessages = new Set();
                }
                
                extractFromElement(element) {
                    if (!element) return null;
                    
                    // 获取消息ID
                    let messageId = '';
                    if (this.selectors.messageId) {
                        const idElement = Utils.$(this.selectors.messageId, element) || element;
                        messageId = idElement.getAttribute('data-mid') ||
                                  idElement.getAttribute('data-message-id') ||
                                  idElement.getAttribute('data-msg-id') ||
                                  idElement.getAttribute('data-id') ||
                                  '';
                    }
                    
                    // 获取消息文本
                    let text = '';
                    if (this.selectors.text) {
                        const textElements = Utils.deepFind(this.selectors.text, element);
                        text = textElements.map(el => Utils.getText(el)).join(' ');
                    }
                    
                    if (!text) {
                        text = Utils.getText(element);
                    }
                    
                    // 过滤无效消息
                    if (!text || text.length < 2) return null;
                    
                    // 判断是否为发出消息
                    const isOutgoing = this.selectors.outgoing ? 
                        element.matches(this.selectors.outgoing) || 
                        Utils.$(this.selectors.outgoing, element) !== null : false;
                    
                    // 生成去重键
                    const dedupKey = messageId || Utils.generateId(text, Date.now());
                    
                    // 检查是否已处理
                    if (this.processedMessages.has(dedupKey)) {
                        return null;
                    }
                    
                    this.processedMessages.add(dedupKey);
                    
                    // 清理过期的去重键（保留最近3分钟）
                    if (this.processedMessages.size > 1000) {
                        const oldKeys = Array.from(this.processedMessages).slice(0, 500);
                        oldKeys.forEach(key => this.processedMessages.delete(key));
                    }
                    
                    return {
                        message_id: messageId,
                        text: text.substring(0, 2000),
                        is_out: isOutgoing,
                        timestamp: Date.now(),
                        element_html: DEBUG ? element.outerHTML.substring(0, 200) : undefined
                    };
                }
                
                extractAll(container) {
                    const messages = [];
                    const elements = Utils.deepFind(this.selectors.message, container);
                    
                    for (const element of elements) {
                        const message = this.extractFromElement(element);
                        if (message) {
                            messages.push(message);
                        }
                    }
                    
                    return messages;
                }
            }
            
            // ============= 聊天信息提取器 =============
            class ChatInfoExtractor {
                constructor(selectors) {
                    this.selectors = selectors;
                }
                
                extract() {
                    const info = {
                        chat_key: '',
                        chat_id: '',
                        chat_title: ''
                    };
                    
                    // 从URL提取
                    const url = window.location.href;
                    const patterns = [
                        /#\/im\?p=(@?[\w_]+)/,
                        /\/k\/([^\/]+)/,
                        /chat\/([^\/]+)/,
                        /c\/([^\/]+)/
                    ];
                    
                    for (const pattern of patterns) {
                        const match = url.match(pattern);
                        if (match) {
                            info.chat_key = match[1];
                            info.chat_id = match[1];
                            break;
                        }
                    }
                    
                    // 从DOM提取标题
                    if (this.selectors.chatTitle) {
                        const titleElement = Utils.$(this.selectors.chatTitle);
                        if (titleElement) {
                            info.chat_title = Utils.getText(titleElement);
                        }
                    }
                    
                    // 备用方案：从页面标题提取
                    if (!info.chat_title) {
                        const pageTitle = document.title;
                        if (pageTitle && !pageTitle.includes('Telegram')) {
                            info.chat_title = pageTitle;
                        }
                    }
                    
                    // 设置默认值
                    info.chat_key = info.chat_key || 'unknown';
                    info.chat_id = info.chat_id || info.chat_key;
                    info.chat_title = info.chat_title || 'Unknown Chat';
                    
                    return info;
                }
            }
            
            // ============= Frame处理器 =============
            class FrameHandler {
                constructor() {
                    this.frames = new Map();
                    this.injected = new Set();
                }
                
                async discoverFrames() {
                    const frames = document.querySelectorAll('iframe');
                    
                    for (const frame of frames) {
                        try {
                            const frameId = frame.src || frame.name || Utils.hash(frame.outerHTML);
                            
                            if (this.injected.has(frameId)) continue;
                            
                            // 尝试访问iframe内容
                            const frameDoc = frame.contentDocument || frame.contentWindow?.document;
                            
                            if (frameDoc && frameDoc.body) {
                                console.log(`[Frame] Injecting into frame: ${frameId}`);
                                
                                // 在iframe中注入相同脚本
                                const script = frameDoc.createElement('script');
                                script.textContent = `(${arguments.callee.toString()})()`;
                                frameDoc.body.appendChild(script);
                                
                                this.injected.add(frameId);
                                this.frames.set(frameId, {
                                    element: frame,
                                    document: frameDoc,
                                    origin: frame.src
                                });
                            }
                        } catch (e) {
                            // 跨域iframe
                            console.log('[Frame] Cross-origin iframe detected:', frame.src);
                            
                            // 尝试使用postMessage通信
                            this.setupCrossOriginCommunication(frame);
                        }
                    }
                }
                
                setupCrossOriginCommunication(frame) {
                    // 设置消息监听
                    window.addEventListener('message', (event) => {
                        if (event.data && event.data.type === 'chat_capture_proxy') {
                            // 转发捕获的数据
                            window.parent.postMessage(event.data, '*');
                        }
                    });
                    
                    // 尝试向iframe发送初始化消息
                    try {
                        frame.contentWindow.postMessage({
                            type: 'init_capture',
                            account_id: ACCOUNT_ID
                        }, '*');
                    } catch {}
                }
            }
            
            // ============= 捕获管理器 =============
            class CaptureManager {
                constructor() {
                    this.platform = new PlatformDetector();
                    this.selectors = null;
                    this.messageExtractor = null;
                    this.chatInfoExtractor = null;
                    this.frameHandler = new FrameHandler();
                    this.observer = null;
                    this.captureTimer = null;
                    this.lastCapture = 0;
                    this.stats = {
                        captured: 0,
                        errors: 0,
                        lastError: null
                    };
                }
                
                initialize() {
                    console.log(`[Capture] Initializing for account: ${ACCOUNT_ID}`);
                    
                    // 检测平台
                    this.platform.detect();
                    this.selectors = this.platform.getSelectors();
                    
                    // 创建提取器
                    this.messageExtractor = new MessageExtractor(this.selectors);
                    this.chatInfoExtractor = new ChatInfoExtractor(this.selectors);
                    
                    // 处理iframe
                    this.frameHandler.discoverFrames();
                    
                    // 设置观察器
                    this.setupObserver();
                    
                    // 设置定期捕获
                    this.setupPeriodicCapture();
                    
                    // 立即捕获一次
                    this.capture('init');
                    
                    // 监听页面变化
                    this.setupPageChangeListener();
                    
                    console.log('[Capture] Initialization complete');
                }
                
                setupObserver() {
                    const container = Utils.$(this.selectors.container);
                    
                    if (!container) {
                        console.log('[Capture] Container not found, retrying...');
                        setTimeout(() => this.setupObserver(), 2000);
                        return;
                    }
                    
                    // 创建防抖的捕获函数
                    const debouncedCapture = Utils.debounce(() => {
                        this.capture('mutation');
                    }, CONFIG.observerThrottle);
                    
                    // 设置MutationObserver
                    this.observer = new MutationObserver((mutations) => {
                        // 检查是否有相关变化
                        const hasRelevantChange = mutations.some(mutation => {
                            return mutation.type === 'childList' && 
                                   (mutation.addedNodes.length > 0 || 
                                    mutation.removedNodes.length > 0);
                        });
                        
                        if (hasRelevantChange) {
                            debouncedCapture();
                        }
                    });
                    
                    this.observer.observe(container, {
                        childList: true,
                        subtree: true,
                        attributes: false,
                        characterData: false
                    });
                    
                    console.log('[Capture] Observer attached to container');
                }
                
                setupPeriodicCapture() {
                    // 定期捕获作为备用方案
                    this.captureTimer = setInterval(() => {
                        this.capture('periodic');
                    }, CONFIG.captureInterval * 5);
                }
                
                setupPageChangeListener() {
                    // 监听URL变化
                    let lastUrl = window.location.href;
                    
                    const checkUrlChange = () => {
                        const currentUrl = window.location.href;
                        if (currentUrl !== lastUrl) {
                            console.log('[Capture] URL changed, reinitializing...');
                            lastUrl = currentUrl;
                            
                            // 重新初始化
                            setTimeout(() => {
                                this.cleanup();
                                this.initialize();
                            }, 1000);
                        }
                    };
                    
                    // 监听历史API
                    const originalPushState = history.pushState;
                    history.pushState = function() {
                        originalPushState.apply(history, arguments);
                        checkUrlChange();
                    };
                    
                    window.addEventListener('popstate', checkUrlChange);
                    
                    // 定期检查（备用）
                    setInterval(checkUrlChange, 2000);
                }
                
                capture(reason = 'manual') {
                    try {
                        // 防止过于频繁的捕获
                        const now = Date.now();
                        if (now - this.lastCapture < CONFIG.observerThrottle) {
                            return;
                        }
                        this.lastCapture = now;
                        
                        // 查找容器
                        const containers = Utils.deepFind(this.selectors.container);
                        if (containers.length === 0) {
                            console.log('[Capture] No container found');
                            return;
                        }
                        
                        // 提取消息
                        let allMessages = [];
                        for (const container of containers) {
                            const messages = this.messageExtractor.extractAll(container);
                            allMessages = allMessages.concat(messages);
                        }
                        
                        if (allMessages.length === 0) {
                            return;
                        }
                        
                        // 限制消息数量
                        if (allMessages.length > CONFIG.maxMessagesPerCapture) {
                            allMessages = allMessages.slice(-CONFIG.maxMessagesPerCapture);
                        }
                        
                        // 提取聊天信息
                        const chatInfo = this.chatInfoExtractor.extract();
                        
                        // 构建payload
                        const payload = {
                            type: 'chat_capture',
                            account_id: ACCOUNT_ID,
                            ...chatInfo,
                            messages: allMessages,
                            reason: reason,
                            timestamp: now,
                            platform: this.platform.platform,
                            stats: this.stats
                        };
                        
                        // 发送数据
                        this.send(payload);
                        
                        // 更新统计
                        this.stats.captured += allMessages.length;
                        
                    } catch (error) {
                        console.error('[Capture] Error:', error);
                        this.stats.errors++;
                        this.stats.lastError = error.message;
                    }
                }
                
                send(payload) {
                    // 发送到控制台（CDP捕获）
                    console.log('[CAPTURE]', JSON.stringify(payload));
                    
                    // 保存到window对象
                    window.__last_capture__ = payload;
                    
                    // 如果在iframe中，使用postMessage
                    if (window.parent !== window) {
                        window.parent.postMessage({
                            type: 'chat_capture_proxy',
                            data: payload
                        }, '*');
                    }
                    
                    // 触发自定义事件
                    window.dispatchEvent(new CustomEvent('chat_captured', {
                        detail: payload
                    }));
                }
                
                cleanup() {
                    if (this.observer) {
                        this.observer.disconnect();
                    }
                    
                    if (this.captureTimer) {
                        clearInterval(this.captureTimer);
                    }
                }
            }
            
            // ============= 主入口 =============
            const manager = new CaptureManager();
            
            // 等待DOM加载
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    manager.initialize();
                });
            } else {
                // 延迟初始化，等待动态内容加载
                setTimeout(() => {
                    manager.initialize();
                }, 1000);
            }
            
            // 暴露到全局（调试用）
            window.__capture_manager__ = manager;
            window.__capture_now__ = () => manager.capture('manual');
            
        })();
        """ % account_id
        
    @staticmethod
    def generate_frame_bridge_script() -> str:
        """生成iframe通信桥接脚本"""
        return """
        (function() {
            'use strict';
            
            // Frame通信桥接器
            class FrameBridge {
                constructor() {
                    this.frames = new Map();
                    this.messages = [];
                    this.setupListeners();
                }
                
                setupListeners() {
                    // 监听来自iframe的消息
                    window.addEventListener('message', (event) => {
                        if (event.data && event.data.type === 'chat_capture_proxy') {
                            this.handleFrameMessage(event);
                        }
                    });
                    
                    // 定期检查iframe
                    setInterval(() => this.checkFrames(), 5000);
                }
                
                handleFrameMessage(event) {
                    const payload = event.data.data;
                    
                    // 添加来源信息
                    payload.frame_origin = event.origin;
                    payload.frame_source = event.source === window ? 'self' : 'child';
                    
                    // 转发到CDP
                    console.log('[CAPTURE]', JSON.stringify(payload));
                    
                    // 存储消息
                    this.messages.push(payload);
                    
                    // 限制存储大小
                    if (this.messages.length > 100) {
                        this.messages = this.messages.slice(-50);
                    }
                }
                
                checkFrames() {
                    const frames = document.querySelectorAll('iframe');
                    
                    frames.forEach(frame => {
                        const frameId = frame.src || frame.id || frame.name;
                        
                        if (!this.frames.has(frameId)) {
                            this.initializeFrame(frame, frameId);
                        }
                    });
                }
                
                initializeFrame(frame, frameId) {
                    try {
                        // 发送初始化消息
                        frame.contentWindow.postMessage({
                            type: 'init_capture',
                            bridge: true
                        }, '*');
                        
                        this.frames.set(frameId, {
                            element: frame,
                            initialized: true
                        });
                        
                        console.log('[FrameBridge] Initialized frame:', frameId);
                        
                    } catch (e) {
                        console.log('[FrameBridge] Cannot access frame:', frameId);
                    }
                }
                
                getMessages() {
                    return this.messages;
                }
            }
            
            // 创建全局桥接器
            window.__frame_bridge__ = new FrameBridge();
            
        })();
        """

# ============= CDP增强客户端 =============
class EnhancedCDPClient:
    """增强型CDP客户端"""
    
    def __init__(self, host: str = "127.0.0.1", port: int = 9222):
        self.host = host
        self.port = port
        self.session = None
        self.ws = None
        self.frames: Dict[str, FrameInfo] = {}
        self.injected_frames: Set[str] = set()
        
    async def connect(self) -> bool:
        """连接CDP"""
        try:
            import aiohttp
            
            # 获取调试目标
            async with aiohttp.ClientSession() as session:
                async with session.get(f"http://{self.host}:{self.port}/json") as resp:
                    targets = await resp.json()
                    
            if not targets:
                return False
                
            target = targets[0]
            ws_url = target.get('webSocketDebuggerUrl')
            
            # 连接WebSocket
            self.session = aiohttp.ClientSession()
            self.ws = await self.session.ws_connect(ws_url)
            
            # 启用必要的域
            await self._enable_domains()
            
            # 监听frame事件
            asyncio.create_task(self._listen_frames())
            
            logger.info(f"Enhanced CDP connected: {ws_url}")
            return True
            
        except Exception as e:
            logger.error(f"CDP connection failed: {e}")
            return False
            
    async def _enable_domains(self) -> None:
        """启用CDP域"""
        domains = ['Page', 'Runtime', 'Network', 'DOM']
        
        for domain in domains:
            await self._send_command(f'{domain}.enable')
            
    async def _send_command(self, method: str, params: Optional[Dict] = None) -> Dict:
        """发送CDP命令"""
        message_id = int(time.time() * 1000)
        
        message = {
            'id': message_id,
            'method': method,
            'params': params or {}
        }
        
        await self.ws.send_json(message)
        
        # 等待响应
        while True:
            msg = await self.ws.receive()
            if msg.type == 1:  # TEXT
                data = json.loads(msg.data)
                if data.get('id') == message_id:
                    return data.get('result', {})
                    
    async def _listen_frames(self) -> None:
        """监听frame事件"""
        while self.ws:
            try:
                msg = await self.ws.receive()
                if msg.type == 1:  # TEXT
                    data = json.loads(msg.data)
                    method = data.get('method', '')
                    
                    if method == 'Page.frameAttached':
                        await self._handle_frame_attached(data['params'])
                    elif method == 'Page.frameNavigated':
                        await self._handle_frame_navigated(data['params'])
                        
            except Exception as e:
                logger.error(f"Frame listener error: {e}")
                break
                
    async def _handle_frame_attached(self, params: Dict) -> None:
        """处理frame附加事件"""
        frame_id = params['frameId']
        parent_id = params.get('parentFrameId')
        
        self.frames[frame_id] = FrameInfo(
            frame_id=frame_id,
            parent_id=parent_id,
            url='',
            name='',
            is_main=False,
            security_origin=''
        )
        
        logger.debug(f"Frame attached: {frame_id}")
        
    async def _handle_frame_navigated(self, params: Dict) -> None:
        """处理frame导航事件"""
        frame = params['frame']
        frame_id = frame['id']
        
        if frame_id in self.frames:
            self.frames[frame_id].url = frame.get('url', '')
            self.frames[frame_id].name = frame.get('name', '')
            self.frames[frame_id].security_origin = frame.get('securityOrigin', '')
            
        # 自动注入脚本到新frame
        if frame_id not in self.injected_frames:
            await self.inject_to_frame(frame_id)
            
    async def inject_universal_script(self, account_id: str) -> None:
        """注入通用捕获脚本到所有frame"""
        script = EnhancedScriptInjector.generate_universal_capture_script(account_id)
        
        # 注入到主frame
        await self._send_command('Runtime.evaluate', {
            'expression': script,
            'includeCommandLineAPI': True,
            'awaitPromise': True
        })
        
        # 注入桥接脚本
        bridge_script = EnhancedScriptInjector.generate_frame_bridge_script()
        await self._send_command('Runtime.evaluate', {
            'expression': bridge_script
        })
        
        # 注入到所有已知frame
        for frame_id in self.frames:
            await self.inject_to_frame(frame_id)
            
        logger.info(f"Universal script injected for account: {account_id}")
        
    async def inject_to_frame(self, frame_id: str) -> None:
        """注入脚本到特定frame"""
        if frame_id in self.injected_frames:
            return
            
        try:
            # 创建执行上下文
            result = await self._send_command('Page.createIsolatedWorld', {
                'frameId': frame_id,
                'worldName': 'capture_world'
            })
            
            execution_context_id = result.get('executionContextId')
            
            if execution_context_id:
                # 在frame中执行脚本
                script = EnhancedScriptInjector.generate_universal_capture_script('frame')
                
                await self._send_command('Runtime.evaluate', {
                    'expression': script,
                    'contextId': execution_context_id
                })
                
                self.injected_frames.add(frame_id)
                logger.debug(f"Script injected to frame: {frame_id}")
                
        except Exception as e:
            logger.debug(f"Cannot inject to frame {frame_id}: {e}")
            
    async def close(self) -> None:
        """关闭连接"""
        if self.ws:
            await self.ws.close()
        if self.session:
            await self.session.close()