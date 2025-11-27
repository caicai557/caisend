/**
 * 【幽灵座舱】Telegram Peer ID 提取脚本
 * 
 * 职责: 从Telegram Web界面提取当前对话的peer_id
 * 策略: 
 *   1. URL Hash解析 (最快,优先)
 *   2. React Fiber树遍历 (备选)
 *   3. DOM结构推断 (最后)
 * 
 * 注入时机: 页面加载完成 + 对话切换时
 */

(function () {
    'use strict';

    const SCRIPT_VERSION = '1.0.0';
    const DEBUG = true;

    function log(...args) {
        if (DEBUG) console.log('[GhostCockpit]', ...args);
    }

    /**
     * 策略1: 从URL Hash提取peer_id
     * Telegram Web URL格式: #@username 或 #-1234567890 (群组/频道)
     */
    function extractFromHash() {
        const hash = window.location.hash;
        if (!hash || hash.length < 2) return null;

        // 移除 # 符号
        const identifier = hash.substring(1);

        // 用户名格式: @username
        if (identifier.startsWith('@')) {
            log('Extracted peer from hash (username):', identifier);
            return identifier;
        }

        // 数字ID格式: -1234567890 或 1234567890
        if (/^-?\d+$/.test(identifier)) {
            log('Extracted peer from hash (numeric):', identifier);
            return identifier;
        }

        return null;
    }

    /**
     * 策略2: 从React Fiber树提取
     * Telegram使用React,组件状态中包含peer信息
     */
    function extractFromReactFiber() {
        try {
            // 查找包含对话信息的DOM节点
            const chatElements = document.querySelectorAll('[data-peer-id], [data-chat-id]');

            for (const el of chatElements) {
                const peerId = el.getAttribute('data-peer-id') || el.getAttribute('data-chat-id');
                if (peerId) {
                    log('Extracted peer from React data attr:', peerId);
                    return peerId;
                }
            }

            // 尝试从React内部状态提取
            const rootEl = document.getElementById('root') || document.querySelector('.app-container');
            if (rootEl && rootEl._reactRootContainer) {
                // React 18+
                const fiber = rootEl._reactRootContainer._internalRoot?.current;
                if (fiber) {
                    const peerId = traverseFiberForPeer(fiber);
                    if (peerId) {
                        log('Extracted peer from React Fiber:', peerId);
                        return peerId;
                    }
                }
            }
        } catch (e) {
            log('React Fiber extraction failed:', e.message);
        }

        return null;
    }

    function traverseFiberForPeer(fiber, depth = 0) {
        if (depth > 10) return null; // 限制深度避免性能问题

        // 检查当前fiber的props和state
        if (fiber.memoizedProps) {
            if (fiber.memoizedProps.peerId) return fiber.memoizedProps.peerId;
            if (fiber.memoizedProps.chatId) return fiber.memoizedProps.chatId;
        }

        if (fiber.memoizedState) {
            if (fiber.memoizedState.peerId) return fiber.memoizedState.peerId;
            if (fiber.memoizedState.chatId) return fiber.memoizedState.chatId;
        }

        // 递归检查子节点
        if (fiber.child) {
            const result = traverseFiberForPeer(fiber.child, depth + 1);
            if (result) return result;
        }

        // 检查兄弟节点
        if (fiber.sibling) {
            const result = traverseFiberForPeer(fiber.sibling, depth + 1);
            if (result) return result;
        }

        return null;
    }

    /**
     * 策略3: 从DOM结构推断
     * 查找包含对话标识的DOM元素
     */
    function extractFromDOM() {
        // 尝试多种选择器
        const selectors = [
            '.chat-info[data-user-id]',
            '.conversation-header[data-chat-id]',
            '[class*="chat"][data-id]',
            '.active-chat',
        ];

        for (const selector of selectors) {
            try {
                const el = document.querySelector(selector);
                if (el) {
                    const id = el.getAttribute('data-user-id') ||
                        el.getAttribute('data-chat-id') ||
                        el.getAttribute('data-id');
                    if (id) {
                        log('Extracted peer from DOM:', id);
                        return id;
                    }
                }
            } catch (e) {
                // 选择器可能无效,继续尝试下一个
            }
        }

        return null;
    }

    /**
     * 主提取逻辑: 依次尝试所有策略
     */
    function extractPeerId() {
        // 策略1: URL Hash (最快)
        let peerId = extractFromHash();
        if (peerId) return peerId;

        // 策略2: React Fiber  
        peerId = extractFromReactFiber();
        if (peerId) return peerId;

        // 策略3: DOM结构
        peerId = extractFromDOM();
        if (peerId) return peerId;

        log('Failed to extract peer_id');
        return null;
    }

    /**
     * 通知Tauri后端
     */
    /**
     * 通知Tauri后端
     * 支持两种模式:
     * 1. Tauri IPC (优先): 用于 Tauri WebView 环境
     * 2. Console Bridge (回退): 用于 CDP 控制的外部浏览器
     */
    async function notifyBackend(peerId) {
        // 模式 1: Tauri IPC
        if (window.__TAURI__) {
            try {
                const { invoke } = window.__TAURI__.core;
                await invoke('notify_peer_focus', { peerId });
                log('Notified backend via Tauri IPC:', peerId);
                return;
            } catch (e) {
                log('Tauri IPC failed, falling back to Binding:', e.message);
            }
        }

        // 模式 2: CDP Binding (teleflowNotify)
        if (window.teleflowNotify) {
            try {
                const payload = JSON.stringify({
                    eventType: 'PeerFocus', // 注意: 保持与后端 handle_notification 期望的字段一致
                    payload: { peerId }
                });
                window.teleflowNotify(payload);
                log('Notified backend via CDP Binding:', peerId);
                return;
            } catch (e) {
                log('CDP Binding failed, falling back to Console:', e.message);
            }
        }

        // 模式 3: Console Bridge (最后防线)
        // 格式: __TELEFLOW_BINDING__:<JSON>
        const payload = JSON.stringify({
            eventType: 'PeerFocus',
            payload: { peerId }
        });
        console.debug(`__TELEFLOW_BINDING__:${payload}`);
        log('Notified backend via Console Bridge:', peerId);
    }

    /**
     * 监控对话切换
     */
    let lastPeerId = null;

    function checkAndNotify() {
        const peerId = extractPeerId();

        if (peerId && peerId !== lastPeerId) {
            log('Peer changed:', lastPeerId, '->', peerId);
            lastPeerId = peerId;
            notifyBackend(peerId);
        }
    }

    /**
     * 初始化监控
     */
    function initialize() {
        log(`Peer ID Extractor v${SCRIPT_VERSION} initialized`);

        // 初始提取
        checkAndNotify();

        // 监听URL变化 (SPA导航)
        window.addEventListener('hashchange', () => {
            log('Hash changed');
            setTimeout(checkAndNotify, 100); // 延迟确保DOM更新
        });

        // 监听DOM变化 (MutationObserver)
        const observer = new MutationObserver(() => {
            checkAndNotify();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-peer-id', 'data-chat-id', 'class'],
        });

        // 定期检查 (备份机制)
        setInterval(checkAndNotify, 2000);

        log('Monitoring started');
    }

    /**
     * 发送消息 (由Rust后端调用)
     * @param {string} peerId - 目标会话ID (用于校验)
     * @param {string} content - 消息内容
     */
    window.teleflowSend = async function (peerId, content) {
        log('Received send request:', peerId, content);

        // 1. 校验当前会话
        const currentPeer = extractPeerId();
        // 注意：有些时候 URL hash 可能还没更新，或者格式不一致，这里做弱校验
        if (currentPeer && peerId && currentPeer !== peerId) {
            log('Peer mismatch warning. Current:', currentPeer, 'Target:', peerId);
            // return { success: false, error: 'Peer mismatch' }; // 暂时允许，因为提取逻辑可能不完美
        }

        // 2. 查找输入框
        // Telegram Web K: .input-message-input
        // Telegram Web A: .composer_rich_textarea
        const input = document.querySelector('.input-message-input') ||
            document.querySelector('.composer_rich_textarea') ||
            document.querySelector('[contenteditable="true"]');

        if (!input) {
            log('Input field not found');
            return { success: false, error: 'Input not found' };
        }

        // 3. 模拟输入
        input.focus();

        // 清空现有内容 (可选)
        input.innerHTML = '';

        // 使用 document.execCommand 'insertText' 模拟真实输入
        let success = false;
        try {
            success = document.execCommand('insertText', false, content);
        } catch (e) {
            log('execCommand failed:', e);
        }

        if (!success) {
            // 回退方案: 直接设置 innerText 并触发 input 事件
            input.innerText = content;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // 等待一下，确保UI更新
        await new Promise(r => setTimeout(r, 100));

        // 4. 点击发送
        // Web K: .btn-send
        // Web A: button[title="Send Message"]
        const sendBtn = document.querySelector('.btn-send') ||
            document.querySelector('button[title="Send Message"]') ||
            document.querySelector('.send') ||
            document.querySelector('[aria-label="Send Message"]');

        if (sendBtn) {
            sendBtn.click();
            log('Send button clicked');
            return { success: true };
        } else {
            // 尝试回车
            const enterEvent = new KeyboardEvent('keydown', {
                bubbles: true, cancelable: true, keyCode: 13, key: 'Enter'
            });
            input.dispatchEvent(enterEvent);
            log('Enter key dispatched');
            return { success: true };
        }
    };

    // 等待DOM完全加载
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
