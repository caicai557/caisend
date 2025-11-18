"""Telegram Web 选择器定义

定义用于定位 Telegram Web 元素的 CSS 选择器，包含回退机制以应对 UI 变化。
"""

class TelegramSelectors:
    """Telegram Web 选择器常量
    
    提供多层回退机制以适配不同版本的 Telegram Web UI
    
    参考 Traneasy 工具的定位策略：
    - 使用消息ID进行精确定位
    - 区分收发消息 (isOut)
    - 实时DOM监听机制
    
    注意：这些选择器基于当前版本的 Telegram Web。
    如果 UI 发生变化，可能需要更新这些选择器。
    """
    
    # 登录相关选择器
    LOGIN_PHONE_INPUT = [
        'input[placeholder*="phone"]',
        'input[placeholder*="Phone"]',
        'input[type="tel"]',
        '#sign-in-phone-number'
    ]
    
    LOGIN_CODE_INPUT = [
        'input[placeholder*="code"]',
        'input[placeholder*="Code"]',
        'input[name="code"]',
        '#sign-in-code'
    ]
    
    LOGIN_BUTTON = [
        'button.sign-in-btn',
        'button[type="submit"]',
        '.btn-primary',
        '#sign-in-button'
    ]
    
    # 主界面选择器
    CHAT_LIST_CONTAINER = [
        ".chat-list",
        ".chatlist-container", 
        ".chat-list-container",
        "[class*='chatlist']",
        "[class*='chat-list']",
        ".chat-list-scrollable",
        ".chat-container",
        "#left-column",
        ".folders-container",
        "[class*='chat']",
        ".chat"
    ]
    
    CHAT_ITEM = [
        ".chat-list .chat",
        ".chatlist-container .chat",
        "[class*='chatlist'] .chat",
        "[class*='chat']",
        ".chat",
        "[role='listitem']",
        ".chat-item",
        ".chatlist-chat",
        ".chat-clickable",
        "[class*='chat-clickable']",
        ".chat-list-item"
    ]
    
    CHAT_TITLE = [
        '.chat-title',
        '.chat-name',
        '.dialog-title',
        '.chat .title'
    ]
    
    CHAT_LAST_MESSAGE = [
        '.chat-last-message',
        '.message-preview',
        '.last-message',
        '.chat .subtitle'
    ]
    
    UNREAD_BADGE = [
        '.unread-badge',
        '.badge',
        '.unread-count',
        '.chat .count'
    ]
    
    # 聊天界面选择器
    MESSAGE_LIST_CONTAINER = [
        '.message-list',
        '.messages-container',
        '.chat-messages',
        '.history'
    ]
    
    MESSAGE_BUBBLE = [
        '.message',
        '.bubble',
        '.message-content',
        '[role="article"]'
    ]
    
    MESSAGE_TEXT = [
        '.message-text',
        '.bubble-content',
        '.message-content-text',
        '.text-content'
    ]
    
    MESSAGE_INPUT = [
        'input[placeholder*="message"]',
        'input[placeholder*="Message"]',
        'textarea.message-input',
        '.input-message'
    ]
    
    SEND_BUTTON = [
        'button.send-btn',
        'button[title*="Send"]',
        '.btn-send',
        '.send-button'
    ]
    
    # 已读状态选择器
    MESSAGE_UNREAD = [
        '.message.unread',
        '.message.unseen',
        '.bubble.unread',
        '.message[data-unread="true"]'
    ]
    
    MARK_AS_READ_BUTTON = [
        '.mark-as-read',
        '.read-button',
        '.btn-read'
    ]
    
    # 搜索相关选择器
    SEARCH_INPUT = [
        'input[placeholder*="search"]',
        'input[placeholder*="Search"]',
        '.search-input',
        '#chat-search'
    ]
    
    SEARCH_RESULTS = [
        '.search-results',
        '.chat-search-results',
        '.found-chats'
    ]
    
    # 错误处理选择器
    ERROR_MESSAGE = [
        '.error-message',
        '.alert-error',
        '.error-text',
        '[role="alert"]'
    ]
    
    LOADING_INDICATOR = [
        '.loading',
        '.spinner',
        '.loading-indicator',
        '[aria-busy="true"]'
    ]
    
    @staticmethod
    def get_primary_selector(selectors: list) -> str:
        """获取主要选择器（列表中的第一个）"""
        return selectors[0] if selectors else ""
    
    @staticmethod
    def get_all_selectors(selectors: list) -> list:
        """获取所有选择器"""
        return selectors.copy()
    
    @staticmethod
    def format_selector_with_text(selector: str, text: str) -> str:
        """格式化选择器以包含文本内容"""
        return f'{selector}:has-text("{text}")'
    
    @staticmethod
    def format_selector_with_contains(selector: str, text: str) -> str:
        """格式化选择器以包含文本内容（部分匹配）"""
        return f'{selector}:text-is("{text}")'
