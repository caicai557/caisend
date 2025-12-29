"""
Message interception system for Telegram Web A.

Contract:
- Message: Data structure for incoming/outgoing messages
- MessageInterceptor: Captures and modifies messages with translation
- Preserves metadata (sender, timestamp)
- Provides JavaScript injection for DOM integration
"""

import json
from enum import Enum
from typing import Optional, Callable
from pydantic import BaseModel, Field, ConfigDict
from src.telegram_multi.config import TranslationConfig


class MessageType(str, Enum):
    """Message type enumeration."""

    INCOMING = "incoming"
    OUTGOING = "outgoing"


class Message(BaseModel):
    """Data structure for a single message."""

    model_config = ConfigDict(use_enum_values=False)

    message_type: MessageType = Field(..., description="Incoming or outgoing message")
    content: str = Field(..., description="Message text content")
    sender: Optional[str] = Field(default=None, description="Sender name/ID")
    timestamp: Optional[str] = Field(
        default=None, description="Message timestamp (ISO 8601)"
    )
    translated_content: Optional[str] = Field(
        default=None, description="Translated message content"
    )


class MessageInterceptor:
    """Message interceptor for capturing and translating messages."""

    def __init__(self, config: TranslationConfig, translator=None):
        """Initialize message interceptor.

        Args:
            config: TranslationConfig with language pair and provider
            translator: Optional Translator instance for translations
        """
        self.config = config
        self.translator = translator
        self._on_message_received_callback: Optional[Callable] = None
        self._on_message_sending_callback: Optional[Callable] = None

    def on_message_received(self, callback: Callable[[Message], None]) -> None:
        """Register callback for incoming messages.

        Args:
            callback: Function to call when message is received
        """
        self._on_message_received_callback = callback

    def on_message_sending(self, callback: Callable[[Message], Message]) -> None:
        """Register callback for outgoing messages.

        Args:
            callback: Function to call when message is about to send.
                     Can modify message and return it.
        """
        self._on_message_sending_callback = callback

    def translate_message(self, message: Message) -> Message:
        """Translate a message content.

        Args:
            message: Message to translate

        Returns:
            Message with translated_content field populated

        If translation is disabled, returns message unchanged.
        """
        if not self.config.enabled or not self.translator:
            return message

        try:
            translated = self.translator.translate(
                message.content,
                src_lang=self.config.source_lang,
                dest_lang=self.config.target_lang,
            )
            message.translated_content = translated
        except Exception:
            # Graceful fallback: keep original translation field as None
            pass

        return message

    def translate_bidirectional(self, message: Message) -> Message:
        """Translate a message based on its direction (incoming/outgoing).

        Bidirectional Translation Logic:
        - INCOMING: Translate FROM target_lang TO source_lang
          (So user reads their native language)
        - OUTGOING: Translate FROM source_lang TO target_lang
          (So recipient reads their native language)

        Args:
            message: Message to translate

        Returns:
            Message with translated_content field populated
        """
        if not self.config.enabled or not self.translator:
            return message

        try:
            if message.message_type == MessageType.INCOMING:
                # Received message: translate TO user's language
                translated = self.translator.translate(
                    message.content,
                    src_lang=self.config.target_lang,  # From foreign
                    dest_lang=self.config.source_lang,  # To user's lang
                )
            else:
                # Sending message: translate FROM user's language
                translated = self.translator.translate(
                    message.content,
                    src_lang=self.config.source_lang,  # From user's lang
                    dest_lang=self.config.target_lang,  # To foreign
                )
            message.translated_content = translated
        except Exception:
            pass

        return message

    def get_injection_script(self) -> str:
        """Get JavaScript injection script for DOM integration.

        Returns:
            JavaScript code to inject into Telegram Web A
        """
        # Build dynamic CONFIG from self.config
        config_dict = {
            "enabled": self.config.enabled,
            "sourceLang": self.config.source_lang,
            "targetLang": self.config.target_lang,
            "displayMode": self.config.display_mode,
            "showHeader": self.config.show_header,
            "jsDebounceMs": self.config.js_debounce_ms,
            "translateUrl": "https://translate.googleapis.com/translate_a/single"
        }
        config_json = json.dumps(config_dict, indent=2)
        return _get_injection_script(config_json)


def _get_injection_script(config_json: str) -> str:
    """Generate JavaScript injection script for message interception.

    Args:
        config_json: JSON string of configuration object

    Returns:
        JavaScript code that:
        - Uses MutationObserver to detect new messages
        - Adds Apple-style "Liquid Glass" translation overlay
        - Handles bidirectional translation with smart alignment
    """
    # Use raw string concatenation to avoid f-string escaping issues with JS braces
    return (
        """
(function() {
  // Telegram Web A Translation Overlay Script (Apple Design System)

  const DEFAULT_CONFIG = """
        + config_json
        + """;

  // Load config from localStorage or use defaults
  function getChatId() {
    const hash = window.location.hash;
    if (!hash) return 'global';
    // Telegram Web A uses #/a/12345 or #12345
    const parts = hash.split('/');
    return parts[parts.length - 1] || 'global';
  }

  let CONFIG = { ...DEFAULT_CONFIG };

  function loadConfig() {
    const chatId = getChatId();
    const savedGlobal = localStorage.getItem('tg_apple_translate_config');
    const savedSession = localStorage.getItem('tg_apple_translate_config_' + chatId);
    
    const globalConfig = savedGlobal ? JSON.parse(savedGlobal) : DEFAULT_CONFIG;
    const sessionConfig = savedSession ? JSON.parse(savedSession) : {};
    
    // Merge: Default < Global < Session
    CONFIG = { ...DEFAULT_CONFIG, ...globalConfig, ...sessionConfig };
    console.log('[AppleTranslate] Config loaded for session:', chatId);
    updateSettingsUI();
  }

  function saveConfig() {
    const chatId = getChatId();
    // Save to session-specific storage
    localStorage.setItem('tg_apple_translate_config_' + chatId, JSON.stringify(CONFIG));
  }

  loadConfig();
  window.addEventListener('hashchange', () => {
    loadConfig();
    syncContactRemark();
  });

  // --- Contact Remark Logic ---
  async function syncContactRemark() {
    const chatId = getChatId();
    if (chatId === 'global' || !window.getContactRemark) return;
    
    try {
      const remark = await window.getContactRemark(chatId);
      const remarkInput = document.querySelector('#tg-apple-contact-remark');
      if (remarkInput) {
        remarkInput.value = remark || '';
      }
      
      // Update UI to show remark near name if possible
      updateNameWithRemark(remark);
    } catch (e) {
      console.warn('[AppleTranslate] Failed to sync remark:', e);
    }
  }

  function updateNameWithRemark(remark) {
    const nameEl = document.querySelector('.top-info .title, .ChatInfo .title');
    if (!nameEl) return;
    
    let remarkSpan = nameEl.querySelector('.tg-apple-remark-span');
    if (!remarkSpan) {
      remarkSpan = document.createElement('span');
      remarkSpan.className = 'tg-apple-remark-span';
      remarkSpan.style.cssText = 'margin-left: 8px; color: var(--apple-blue); font-size: 0.9em; font-weight: normal;';
      nameEl.appendChild(remarkSpan);
    }
    remarkSpan.textContent = remark ? `(${remark})` : '';
  }

  // --- Apple Design System CSS Injection ---
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --apple-glass-bg: rgba(245, 245, 247, 0.75);
      --apple-glass-border: rgba(255, 255, 255, 0.4);
      --apple-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      --apple-blur: blur(20px);
      --apple-font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
      --apple-blue: #007AFF;
      --apple-text-primary: #1C1C1E;
      --apple-text-secondary: #8E8E93;
    }

    /* Dark Mode (Telegram's .theme-dark class or media query) */
    @media (prefers-color-scheme: dark) {
      :root {
        --apple-glass-bg: rgba(30, 30, 30, 0.70);
        --apple-glass-border: rgba(255, 255, 255, 0.1);
        --apple-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        --apple-text-primary: #FFFFFF;
        --apple-text-secondary: #98989D;
      }
    }

    .tg-apple-overlay {
      margin-top: 6px;
      padding: 8px 12px;
      border-radius: 14px;
      background: var(--apple-glass-bg);
      backdrop-filter: var(--apple-blur);
      -webkit-backdrop-filter: var(--apple-blur);
      border: 0.5px solid var(--apple-glass-border);
      box-shadow: var(--apple-shadow);
      font-family: var(--apple-font);
      max-width: 100%;
      min-width: 120px;
      opacity: 0;
      transform: translateY(4px) scale(0.98);
      animation: applePopIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
      pointer-events: auto;
      user-select: text;
    }

    @keyframes applePopIn {
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .tg-apple-header {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 4px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--apple-text-secondary);
    }

    .tg-apple-icon {
      font-size: 11px;
    }

    .tg-apple-content {
      font-size: 13px;
      line-height: 1.4;
      color: var(--apple-text-primary);
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* Loading shimmer effect */
    .tg-apple-loading {
      height: 12px;
      width: 80%;
      background: linear-gradient(90deg,
        rgba(150,150,150,0.1),
        rgba(150,150,150,0.2),
        rgba(150,150,150,0.1));
      background-size: 200% 100%;
      animation: appleShimmer 1.5s infinite;
      border-radius: 4px;
    }

    @keyframes appleShimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* Bilingual mode styles */
    .tg-apple-bilingual-original {
      font-size: 12px;
      color: var(--apple-text-secondary);
      margin-bottom: 4px;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--apple-glass-border);
    }

    .tg-apple-bilingual-translated {
      font-size: 13px;
      color: var(--apple-text-primary);
    }

    /* Settings Panel Styles */
    .tg-apple-settings-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 44px;
      height: 44px;
      border-radius: 22px;
      background: var(--apple-glass-bg);
      backdrop-filter: var(--apple-blur);
      -webkit-backdrop-filter: var(--apple-blur);
      border: 0.5px solid var(--apple-glass-border);
      box-shadow: var(--apple-shadow);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 9999;
      transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .tg-apple-settings-btn:hover { transform: scale(1.1); }
    .tg-apple-settings-btn:active { transform: scale(0.95); }

    .tg-apple-settings-panel {
      position: fixed;
      bottom: 80px;
      right: 20px;
      width: 280px;
      background: var(--apple-glass-bg);
      backdrop-filter: var(--apple-blur);
      -webkit-backdrop-filter: var(--apple-blur);
      border: 0.5px solid var(--apple-glass-border);
      box-shadow: var(--apple-shadow);
      border-radius: 20px;
      padding: 20px;
      z-index: 9998;
      display: none;
      flex-direction: column;
      gap: 16px;
      font-family: var(--apple-font);
      animation: applePopIn 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    .tg-apple-settings-panel.active { display: flex; }

    .tg-apple-settings-title {
      font-size: 17px;
      font-weight: 600;
      color: var(--apple-text-primary);
      margin-bottom: 4px;
    }

    .tg-apple-settings-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .tg-apple-settings-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--apple-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .tg-apple-settings-select, .tg-apple-settings-input {
      background: rgba(150, 150, 150, 0.1);
      border: none;
      border-radius: 8px;
      padding: 8px 12px;
      color: var(--apple-text-primary);
      font-size: 14px;
      outline: none;
      width: 100%;
    }

    .tg-apple-settings-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    /* Switch Style */
    .tg-apple-switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
    }
    .tg-apple-switch input { opacity: 0; width: 0; height: 0; }
    .tg-apple-slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: rgba(150, 150, 150, 0.3);
      transition: .4s;
      border-radius: 24px;
    }
    .tg-apple-slider:before {
      position: absolute;
      content: "";
      height: 18px; width: 18px;
      left: 3px; bottom: 3px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    input:checked + .tg-apple-slider { background-color: var(--apple-blue); }
    input:checked + .tg-apple-slider:before { transform: translateX(20px); }
  `;
  document.head.appendChild(style);

  // --- Utilities ---
  function debounce(fn, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  }

  const processedMessages = new WeakSet();

  // --- Translation Logic ---
  const translationCache = new Map();

  async function translateText(text, targetLang) {
    if (!text || text.length < 2) return null;
    const cacheKey = `${text}:${targetLang}`;
    if (translationCache.has(cacheKey)) return translationCache.get(cacheKey);

    try {
      const params = new URLSearchParams({
        client: 'gtx',
        sl: CONFIG.sourceLang || 'auto',
        tl: targetLang,
        dt: 't',
        q: text
      });
      const response = await fetch(`${CONFIG.translateUrl}?${params}`);
      const data = await response.json();
      if (data && data[0]) {
        const translated = data[0].map(item => item[0]).join('');
        translationCache.set(cacheKey, translated);
        return translated;
      }
    } catch (e) {
      console.warn('[Translation] API error:', e);
    }
    return null;
  }

  // --- Bilingual Display Logic ---
  function renderBilingualContent(content, originalText, translatedText) {
    // For bilingual mode, show both original and translated
    if (CONFIG.displayMode === 'bilingual') {
      const originalDiv = document.createElement('div');
      originalDiv.className = 'tg-apple-bilingual-original';
      originalDiv.textContent = originalText;

      const translatedDiv = document.createElement('div');
      translatedDiv.className = 'tg-apple-bilingual-translated';
      translatedDiv.textContent = translatedText;

      content.innerHTML = '';
      content.appendChild(originalDiv);
      content.appendChild(translatedDiv);
    } else {
      // Replace mode: just show translated
      content.textContent = translatedText;
    }
  }

  // --- Overlay Injection ---
  async function addTranslationOverlay(element) {
    if (!CONFIG.enabled) return;
    if (processedMessages.has(element)) return;
    if (element.querySelector('.tg-apple-overlay')) return;

    // Find text node
    const textNode = element.querySelector('.text-content, .message-content') || element;
    const originalText = (textNode.textContent || '').trim();
    if (!originalText || originalText.length < 2) return;

    processedMessages.add(element);

    // Create container
    const overlay = document.createElement('div');
    overlay.className = 'tg-apple-overlay';

    // Header (conditional based on showHeader config)
    if (CONFIG.showHeader) {
      const header = document.createElement('div');
      header.className = 'tg-apple-header';
      header.innerHTML = '<span class="tg-apple-icon">🌐</span> TRANSPARENT TRANSLATE';
      overlay.appendChild(header);
    }

    // Content (Loading State)
    const content = document.createElement('div');
    content.className = 'tg-apple-content';
    const loader = document.createElement('div');
    loader.className = 'tg-apple-loading';
    content.appendChild(loader);
    overlay.appendChild(content);

    // Append to message bubble
    element.appendChild(overlay);

    const translated = await translateText(originalText, CONFIG.targetLang);

    if (translated && translated !== originalText) {
      // Handle bilingual vs replace mode
      renderBilingualContent(content, originalText, translated);
    } else {
      // Translation failed or same language -> Remove overlay gracefully
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 300);
    }

    // --- Auto-Reply Hook ---
    if (window.onNewMessage) {
      const isOutgoing = element.classList.contains('own') || 
                         element.classList.contains('message-out') ||
                         !!element.closest('.message-out');
      
      window.onNewMessage({
        content: originalText,
        sender: element.querySelector('.sender-title')?.textContent || 'Unknown',
        type: isOutgoing ? 'outgoing' : 'incoming',
        timestamp: new Date().toISOString()
      });
    }
  }

  // --- Observer Logic ---
  const processNewNodes = debounce((nodes) => {
    nodes.forEach(node => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      if (node.matches('.message, .Message, [class*="message-content"]')) {
        addTranslationOverlay(node);
      } else {
        const messages = node.querySelectorAll('.message, .Message, [class*="message-content"]');
        messages.forEach(msg => addTranslationOverlay(msg));
      }
    });
  }, CONFIG.jsDebounceMs || 100);

  const observer = new MutationObserver((mutations) => {
    const addedNodes = [];
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach(node => addedNodes.push(node));
    });
    if (addedNodes.length > 0) {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => processNewNodes(addedNodes));
      } else {
        processNewNodes(addedNodes);
      }
    }
  });

  // --- Input Area Monitoring (for outgoing messages) ---
  function setupInputMonitoring() {
    // Monitor textarea or contenteditable input for message composition
    const inputSelectors = [
      'textarea',
      '[contenteditable="true"]',
      'input[type="text"]',
      '.composer-input',
      '.message-input'
    ];

    inputSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(input => {
        if (input.dataset.translationMonitor) return;
        input.dataset.translationMonitor = 'true';

        // Add subtle indicator that translation is active
        input.addEventListener('focus', () => {
          console.log('[AppleTranslate] Input focused, translation active');
        });
      });
    });
  }

  // --- Settings UI Implementation ---
  function createSettingsUI() {
    // Floating Button
    const btn = document.createElement('div');
    btn.className = 'tg-apple-settings-btn';
    btn.innerHTML = '🌐';
    btn.title = 'Translation Settings';
    document.body.appendChild(btn);

    // Panel
    const panel = document.createElement('div');
    panel.className = 'tg-apple-settings-panel';
    panel.innerHTML = `
      <div class="tg-apple-settings-title">Translation Settings</div>
      
      <div class="tg-apple-settings-item tg-apple-settings-toggle">
        <span class="tg-apple-settings-label">Enable Translation</span>
        <label class="tg-apple-switch">
          <input type="checkbox" id="tg-apple-enabled" ${CONFIG.enabled ? 'checked' : ''}>
          <span class="tg-apple-slider"></span>
        </label>
      </div>

      <div class="tg-apple-settings-item">
        <span class="tg-apple-settings-label">Source Language</span>
        <select class="tg-apple-settings-select" id="tg-apple-source-lang">
          <option value="auto" ${CONFIG.sourceLang === 'auto' ? 'selected' : ''}>Auto Detect</option>
          <option value="zh" ${CONFIG.sourceLang === 'zh' ? 'selected' : ''}>Chinese</option>
          <option value="en" ${CONFIG.sourceLang === 'en' ? 'selected' : ''}>English</option>
          <option value="ru" ${CONFIG.sourceLang === 'ru' ? 'selected' : ''}>Russian</option>
        </select>
      </div>

      <div class="tg-apple-settings-item">
        <span class="tg-apple-settings-label">Target Language</span>
        <select class="tg-apple-settings-select" id="tg-apple-target-lang">
          <option value="zh" ${CONFIG.targetLang === 'zh' ? 'selected' : ''}>Chinese</option>
          <option value="en" ${CONFIG.targetLang === 'en' ? 'selected' : ''}>English</option>
          <option value="ru" ${CONFIG.targetLang === 'ru' ? 'selected' : ''}>Russian</option>
        </select>
      </div>

      <div class="tg-apple-settings-item">
        <span class="tg-apple-settings-label">Display Mode</span>
        <select class="tg-apple-settings-select" id="tg-apple-display-mode">
          <option value="bilingual" ${CONFIG.displayMode === 'bilingual' ? 'selected' : ''}>Bilingual</option>
          <option value="replace" ${CONFIG.displayMode === 'replace' ? 'selected' : ''}>Replace</option>
          <option value="original" ${CONFIG.displayMode === 'original' ? 'selected' : ''}>Original Only</option>
        </select>
      </div>

      <div class="tg-apple-settings-item" id="tg-apple-remark-section">
        <span class="tg-apple-settings-label">Contact Remark (Shared)</span>
        <div style="display: flex; gap: 8px;">
          <input type="text" class="tg-apple-settings-input" id="tg-apple-contact-remark" placeholder="Enter remark...">
          <button class="tg-apple-settings-select" style="width: auto; cursor: pointer; background: var(--apple-blue); color: white;" id="tg-apple-save-remark">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    // Events
    btn.onclick = () => panel.classList.toggle('active');

    panel.querySelector('#tg-apple-display-mode').onchange = (e) => {
      CONFIG.displayMode = e.target.value;
      saveConfig();
    };

    panel.querySelector('#tg-apple-save-remark').onclick = async () => {
      const chatId = getChatId();
      const remark = panel.querySelector('#tg-apple-contact-remark').value;
      const name = document.querySelector('.top-info .title, .ChatInfo .title')?.textContent?.split('(')[0]?.trim() || 'Unknown';
      
      if (window.onContactUpdate) {
        await window.onContactUpdate({
          userId: chatId,
          name: name,
          remark: remark
        });
        updateNameWithRemark(remark);
        console.log('[AppleTranslate] Remark updated for:', chatId);
      }
    };

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target) && !btn.contains(e.target)) {
        panel.classList.remove('active');
      }
    });
  }

  function updateSettingsUI() {
    const panel = document.querySelector('.tg-apple-settings-panel');
    if (!panel) return;

    const enabledInput = panel.querySelector('#tg-apple-enabled');
    const sourceSelect = panel.querySelector('#tg-apple-source-lang');
    const targetSelect = panel.querySelector('#tg-apple-target-lang');
    const modeSelect = panel.querySelector('#tg-apple-display-mode');

    if (enabledInput) enabledInput.checked = CONFIG.enabled;
    if (sourceSelect) sourceSelect.value = CONFIG.sourceLang || 'auto';
    if (targetSelect) targetSelect.value = CONFIG.targetLang;
    if (modeSelect) modeSelect.value = CONFIG.displayMode;
  }

  function startObserver() {
    const container = document.querySelector('#MiddleColumn, .messages-container, [class*="chat"]');
    if (container) {
      observer.observe(container, { childList: true, subtree: true });
      // Process existing
      document.querySelectorAll('.message, .Message, [class*="message-content"]').forEach(addTranslationOverlay);
      console.log('[AppleTranslate] Active');
      setupInputMonitoring();
      createSettingsUI();
      syncContactRemark();
    } else {
      setTimeout(startObserver, 1000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver);
  } else {
    setTimeout(startObserver, 500);
  }
})();
"""
    )
