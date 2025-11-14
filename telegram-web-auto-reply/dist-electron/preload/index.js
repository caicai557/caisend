"use strict";
const electron = require("electron");
const IPC_CHANNELS = {
  // ========================================================================
  // Account Management
  // ========================================================================
  ACCOUNT_ADD: "account:add",
  ACCOUNT_REMOVE: "account:remove",
  ACCOUNT_LIST: "account:list",
  ACCOUNT_GET: "account:get",
  ACCOUNT_STATUS_CHANGED: "account:status-changed",
  ACCOUNT_SHOW_VIEW: "account:show-view",
  ACCOUNT_HIDE_VIEW: "account:hide-view",
  ACCOUNT_RENAME: "account:rename",
  // ========================================================================
  // Rule Management
  // ========================================================================
  RULE_CREATE: "rule:create",
  RULE_UPDATE: "rule:update",
  RULE_DELETE: "rule:delete",
  RULE_LIST: "rule:list",
  RULE_TOGGLE: "rule:toggle",
  // ========================================================================
  // Message Monitoring
  // ========================================================================
  MESSAGE_RECEIVED: "message:received",
  MESSAGE_MATCHED: "message:matched",
  MESSAGE_NOT_MATCHED: "message:not-matched",
  MONITORING_START: "monitoring:start",
  MONITORING_STOP: "monitoring:stop",
  MONITORING_STATUS: "monitoring:status",
  // ========================================================================
  // Manual Send
  // ========================================================================
  SEND_TEXT: "send:text",
  SEND_IMAGE: "send:image",
  SEND_STATUS: "send:status",
  // 与现有渲染层实现保持兼容的别名
  MESSAGE_SEND_TEXT: "message:send-text",
  MESSAGE_SEND_IMAGE: "message:send-image",
  // 其他发送/账号状态（测试中使用）
  MESSAGE_MARK_AS_READ: "message:mark-as-read",
  ACCOUNT_GET_STATUS: "account:get-status",
  // ========================================================================
  // Logs
  // ========================================================================
  LOG_QUERY: "log:query",
  LOG_EXPORT: "log:export",
  DOM_SNAPSHOT_CAPTURE: "dom:snapshot:capture",
  DOM_SNAPSHOT_REQUEST: "dom:snapshot:request",
  DOM_SNAPSHOT_RESULT: "dom:snapshot:result",
  LOG_CLEAR: "log:clear",
  LOG_NEW: "log:new",
  // ========================================================================
  // Chat Management
  // ========================================================================
  CHAT_LIST: "chat:list",
  CHAT_REFRESH: "chat:refresh",
  // ========================================================================
  // Rate Limiting
  // ========================================================================
  RATE_LIMIT_GET: "rate-limit:get",
  RATE_LIMIT_UPDATE: "rate-limit:update",
  RATE_LIMIT_HIT: "rate-limit:hit",
  // ========================================================================
  // App Config
  // ========================================================================
  CONFIG_GET: "config:get",
  CONFIG_UPDATE: "config:update",
  SETTINGS_RESET: "settings:reset",
  // ========================================================================
  // System
  // ========================================================================
  SYSTEM_INFO: "system:info",
  SYSTEM_QUIT: "system:quit",
  // Dashboard
  DASHBOARD_STATS_UPDATED: "dashboard:stats-updated",
  DASHBOARD_STATS_REQUEST: "dashboard:stats-request",
  // ========================================================================
  // New Channels for Enhanced Features
  // ========================================================================
  MESSAGE_SENT: "message:sent",
  SEND_RESULT: "send:result",
  RATE_LIMIT_CHANGED: "rate-limit:changed",
  READ_FILE: "file:read",
  OPEN_FILE_DIALOG: "file:open"
};
class TelegramMonitor {
  observer = null;
  parentObserver = null;
  // 🎯 监听容器父级，检测容器替换
  isMonitoring = false;
  messageCache = /* @__PURE__ */ new Set();
  version = null;
  // 轮询与兜底配置
  scanTimer = void 0;
  checkInterval = 1e3;
  noContainerCount = 0;
  maxNoContainerBeforeOpen = 2;
  autoOpenCooldownMs = 15e3;
  lastAutoOpenAt = 0;
  containerEl = null;
  // 🎯 调试开关：是否上报发出的消息（默认仅上报入站消息）
  includeOutgoingForDebug = false;
  // 选择器配置
  selectors = {
    A: {
      messagesContainer: '[role="list"], .messages-container',
      message: ".Message, [data-message-id], .Message.message-list-item",
      messageText: '.text-content, .message-content .text-content, .message-content [dir="auto"], .message-content .message-text',
      messageAuthor: '.message-title, .name, [data-testid*="author"]',
      messageTime: "time[datetime], .message-time, .time",
      chatTitle: '.chat-info-name, [data-testid*="chat-title"], .MiddleHeader .ChatInfo .fullName',
      outgoingMessage: '.own, .is-out, [data-out="true"]'
    },
    K: {
      messagesContainer: ".bubbles-inner",
      message: ".bubble, .Message, .message-list-item, [data-message-id], [data-mid]",
      // 🎯 覆盖K版本bubble结构
      messageText: ".message, .text-content, .message-content .text",
      messageAuthor: ".name, .message-title",
      messageTime: ".time, .message-time, time[datetime]",
      chatTitle: ".chat-info .name",
      outgoingMessage: ".is-out, .own"
    }
  };
  /**
   * 调试：手动触发自动打开会话
   */
  debugAutoOpenChat() {
    try {
      return this.attemptAutoOpenChat();
    } catch (e) {
      console.error("[TelegramMonitor] debugAutoOpenChat 失败:", e);
      return false;
    }
  }
  /**
   * 兜底：基于时间元素反向提取一条消息
   */
  extractMessageByTime(timeEl) {
    try {
      const selectors = this.selectors[this.version];
      if (this.containerEl && !this.containerEl.contains(timeEl)) return null;
      const MAX_DEPTH = 8;
      let cur = timeEl;
      let depth = 0;
      let root = null;
      const isMsgLike = (el) => {
        try {
          if (el.matches(selectors.message)) return true;
        } catch {
        }
        try {
          if (el.querySelector(selectors.message)) return true;
        } catch {
        }
        const cls = ((el.className || "") + " " + (el.id || "")).toLowerCase();
        if (cls.includes("message") || cls.includes("bubble") || cls.includes("history")) return true;
        return false;
      };
      while (cur && depth <= MAX_DEPTH) {
        if (isMsgLike(cur)) {
          root = cur;
          break;
        }
        cur = cur.parentElement;
        depth++;
      }
      if (!root) {
        cur = timeEl.parentElement;
        depth = 0;
        while (cur && depth <= MAX_DEPTH) {
          const rect = cur.getBoundingClientRect();
          const isLarge = rect.width > 200 && rect.height > 80;
          if (isLarge) {
            root = cur;
            break;
          }
          cur = cur.parentElement;
          depth++;
        }
      }
      if (!root) return null;
      let textEl = root.querySelector(selectors.messageText);
      if (!textEl) {
        const extraTextSel = '.message-content .text-content, .message-content [dir="auto"], .message-content .message-text, .message-content [class*="text"]';
        textEl = root.querySelector(extraTextSel);
      }
      const text = textEl?.textContent?.trim() || "";
      if (!text) return null;
      let isOutgoing = false;
      try {
        const outSel = selectors.outgoingMessage;
        if (outSel) {
          isOutgoing = root.matches(outSel) || !!root.querySelector(outSel);
        }
      } catch {
      }
      if (isOutgoing && !this.includeOutgoingForDebug) return null;
      const authorEl = root.querySelector(selectors.messageAuthor);
      const senderNameRaw = authorEl?.textContent?.trim() || "";
      const timeText = (timeEl.getAttribute("datetime") || timeEl.textContent || "").trim();
      const messageId = this.generateMessageId(root);
      const chatInfo = this.getChatInfo();
      const finalSenderName = senderNameRaw || chatInfo.chatTitle || "Unknown";
      return {
        id: messageId,
        chatId: chatInfo.chatId,
        chatTitle: chatInfo.chatTitle,
        senderId: this.extractSenderId(root),
        senderName: finalSenderName,
        text,
        timestamp: this.parseTimestamp(timeText),
        isOutgoing,
        hasMedia: this.hasMedia(root)
      };
    } catch (e) {
      console.error("[TelegramMonitor] extractMessageByTime 失败:", e);
      return null;
    }
  }
  /**
   * 🎯 基于时间元素反向查找容器
   */
  findContainerByTimeElements() {
    try {
      const center = document.querySelector('#MiddleColumn, #column-center, .center-column, [aria-label="Messages"], [aria-label="Message list"]');
      const timeQuery = "time[datetime], .message-time, .time";
      const timeNodes = center ? Array.from(center.querySelectorAll(timeQuery)) : Array.from(document.querySelectorAll(timeQuery));
      if (timeNodes.length === 0) return null;
      const judged = /* @__PURE__ */ new Set();
      let best = null;
      const isChatListLikeEl = (el) => {
        try {
          if (el.closest(".chatlist, .chat-list, .dialogs, .left-column")) return true;
          const hints = ".ListItem, [data-peer-id], .chatlist-chat, .chat-item";
          return !!el.querySelector(hints);
        } catch {
          return false;
        }
      };
      const scoreEl = (el) => {
        const rect = el.getBoundingClientRect();
        const isScrollable = el.scrollHeight > el.clientHeight + 10;
        const roleItems = el.querySelectorAll('[role="listitem"]').length;
        const timeCount = el.querySelectorAll("time[datetime], .message-time, .time").length;
        const sizeOK = rect.width > 300 && rect.height > 300;
        let score = 0;
        if (isScrollable) score += 30;
        if (sizeOK) score += 15;
        if (roleItems > 1) score += 25;
        if (timeCount > 2) score += 10;
        const classId = ((el.className || "") + " " + (el.id || "")).toLowerCase();
        if (classId.includes("message") || classId.includes("bubble") || classId.includes("history")) score += 5;
        if (isChatListLikeEl(el)) score -= 40;
        return score;
      };
      for (const t of timeNodes) {
        let cur = t;
        let depth = 0;
        const MAX = 10;
        while (cur && depth < MAX) {
          if (center && !center.contains(cur)) {
            cur = cur.parentElement;
            depth++;
            continue;
          }
          if (isChatListLikeEl(cur)) {
            cur = cur.parentElement;
            depth++;
            continue;
          }
          if (!judged.has(cur)) {
            judged.add(cur);
            const s = scoreEl(cur);
            if (s >= 25 && (!best || s > best.score)) {
              best = { el: cur, score: s };
            }
          }
          cur = cur.parentElement;
          depth++;
        }
      }
      return best ? best.el : null;
    } catch (e) {
      console.error("[TelegramMonitor] 基于时间元素查找失败:", e);
      return null;
    }
  }
  isChatOpen() {
    try {
      const center = document.querySelector("#MiddleColumn, #column-center");
      const list = center && center.querySelector('[role="list"], .messages-container, .MessageList') || null;
      const hasList = !!list;
      const hasItems = !!(list && list.querySelector('[role="listitem"], .Message, [data-message-id]'));
      const hasTitle = !!document.querySelector('.MiddleHeader .ChatInfo .fullName, .chat-info-name, [data-testid*="chat-title"]');
      const hasInput = !!document.querySelector('#MiddleColumn .Composer [contenteditable="true"], .input-message-input, [contenteditable="true"]');
      return hasList && (hasItems || hasTitle || hasInput) || hasTitle || hasInput;
    } catch (_e) {
      return false;
    }
  }
  constructor() {
    this.detectVersion();
  }
  /**
   * 检测 Telegram Web 版本
   */
  detectVersion() {
    let url = "";
    try {
      url = window && window.location && (window.location.href || window.location.hash) || "";
    } catch {
      url = "";
    }
    console.log("[TelegramMonitor] 🔍 检测版本, URL:", url);
    if (url.includes("/a/") || url.includes("/a#")) {
      this.version = "A";
      console.log("[TelegramMonitor] ✅ 检测到版本: A");
      return this.version;
    }
    try {
      const hasA = !!document.querySelector(".messages-container");
      const hasK = !!document.querySelector(".bubbles-inner");
      if (hasA) {
        this.version = "A";
        console.log("[TelegramMonitor] ✅ 基于DOM检测到版本: A");
      } else if (hasK) {
        this.version = "K";
        console.log("[TelegramMonitor] ✅ 基于DOM检测到版本: K");
      } else {
        this.version = "K";
        console.log("[TelegramMonitor] ⚠️ 无法根据URL/DOM判定版本，默认使用: K");
      }
    } catch {
      this.version = "K";
      console.log("[TelegramMonitor] ⚠️ 版本检测异常，默认使用: K");
    }
    return this.version;
  }
  /**
   * 暴露全局调试函数（借鉴易翻译）
   */
  exposeDebugFunctions() {
    try {
      window.__tg_find_container__ = () => {
        console.log("[TelegramMonitor] 🔧 手动触发容器查找...");
        const container = this.findMessagesContainer();
        if (container) {
          console.log("[TelegramMonitor] ✅ 找到容器:", container.tagName, container.className);
          console.log(container);
        } else {
          console.log("[TelegramMonitor] ❌ 未找到容器");
        }
        return container;
      };
      window.__tg_scan_messages__ = () => {
        console.log("[TelegramMonitor] 🔧 手动扫描消息...");
        this.processExistingMessages();
      };
      window.__tg_auto_open_chat__ = () => {
        console.log("[TelegramMonitor] 🔧 手动触发自动打开会话...");
        return this.attemptAutoOpenChat();
      };
      window.__tg_info__ = () => {
        return this.getDebugInfo();
      };
      window.__tg_set_include_outgoing__ = (include) => {
        this.setIncludeOutgoingForDebug(include);
        return this.getDebugInfo();
      };
      console.log("[TelegramMonitor] 🔧 全局调试函数已注入: __tg_find_container__, __tg_scan_messages__, __tg_info__, __tg_set_include_outgoing__");
    } catch (e) {
      console.error("[TelegramMonitor] 全局函数注入失败:", e);
    }
  }
  /**
   * 启动消息监控
   */
  startMonitoring() {
    if (this.isMonitoring) {
      console.log("[TelegramMonitor] 监控已在运行中");
      return true;
    }
    if (!this.version) this.detectVersion();
    console.log("[TelegramMonitor] 🚀 开始监控消息，版本:", this.version);
    this.exposeDebugFunctions();
    const container = this.findMessagesContainer();
    if (!container) {
      console.log("[TelegramMonitor] ❌ 未找到消息容器，启动失败");
      return false;
    }
    const target = this.getObserveTarget(container);
    this.containerEl = target;
    const config = { childList: true, subtree: true, attributes: true };
    this.observer = new MutationObserver((mutations) => this.handleMutations(mutations));
    this.observer.observe(target, config);
    this.setupParentObserver(target);
    this.processExistingMessages();
    if (typeof process !== "undefined" && process.env && (process.env.VITEST === "true" || process.env.NODE_ENV === "test")) ;
    else {
      this.scanTimer = window.setInterval(() => this.scanTick(), 1e3);
    }
    this.isMonitoring = true;
    return true;
  }
  /**
   * 停止监控消息
   */
  stopMonitoring() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.parentObserver) {
      this.parentObserver.disconnect();
      this.parentObserver = null;
    }
    this.isMonitoring = false;
    this.containerEl = null;
    this.messageCache.clear();
    if (this.scanTimer !== void 0) {
      window.clearInterval(this.scanTimer);
      this.scanTimer = void 0;
    }
    this.noContainerCount = 0;
    console.log("[TelegramMonitor] Stopped monitoring messages");
  }
  /**
   * 处理 DOM 变化
   */
  handleMutations(mutations) {
    const selectors = this.selectors[this.version];
    mutations.forEach((mutation) => {
      if (mutation.type !== "childList") return;
      mutation.addedNodes.forEach((node) => {
        const element = node;
        const isElem = node?.nodeType === 1 || typeof HTMLElement !== "undefined" && element instanceof HTMLElement;
        if (!isElem) return;
        try {
          if (element.matches && element.matches(selectors.message)) {
            this.processMessageElement(element);
            return;
          }
        } catch {
        }
        try {
          if (element.querySelector && element.querySelector(selectors.message)) {
            this.processMessageElement(element);
            return;
          }
        } catch {
        }
        try {
          const isKMessage = this.version === "K" && (element?.classList?.contains("bubble") || element?.hasAttribute?.("data-mid"));
          if (isKMessage) {
            this.processMessageElement(element);
            return;
          }
        } catch {
        }
        try {
          const times = element.querySelectorAll ? element.querySelectorAll("time[datetime], .time") : [];
          if (times && times.length > 0) {
            Array.from(times).forEach((tn) => {
              const msg = this.extractMessageByTime(tn);
              if (msg && msg.text) {
                const messageKey = `${msg.chatId}-${msg.id}`;
                if (!this.messageCache.has(messageKey)) {
                  this.messageCache.add(messageKey);
                  if (this.messageCache.size > 1e3) {
                    const firstKey = this.messageCache.values().next().value;
                    this.messageCache.delete(firstKey);
                  }
                  this.sendMessageToMain(msg);
                }
              }
            });
          }
        } catch {
        }
      });
    });
  }
  /**
   * 处理现有消息
   */
  processExistingMessages() {
    const selectors = this.selectors[this.version];
    const base = this.containerEl || document.querySelector("#MiddleColumn") || document.querySelector("#column-center") || document.body;
    const messages = base.querySelectorAll(selectors.message);
    const recentMessages = Array.from(messages).slice(-20);
    recentMessages.forEach((element) => {
      this.processMessageElement(element);
    });
    if (recentMessages.length === 0) {
      const base2 = this.containerEl || document.body;
      const times = base2.querySelectorAll("time[datetime], .time");
      const recentTimes = Array.from(times).slice(-20);
      recentTimes.forEach((tn) => {
        const msg = this.extractMessageByTime(tn);
        if (msg && msg.text) {
          const messageKey = `${msg.chatId}-${msg.id}`;
          if (!this.messageCache.has(messageKey)) {
            this.messageCache.add(messageKey);
            if (this.messageCache.size > 1e3) {
              const firstKey = this.messageCache.values().next().value;
              this.messageCache.delete(firstKey);
            }
            this.sendMessageToMain(msg);
          }
        }
      });
    }
  }
  /**
   * 启动轮询扫描以寻找消息容器并尝试兜底
   */
  startScanLoop() {
    if (this.scanTimer !== void 0) return;
    this.scanTimer = window.setInterval(() => this.scanTick(), this.checkInterval);
  }
  getObserveTarget(container) {
    const selectors = [
      '#MiddleColumn [role="list"]',
      "#MiddleColumn .messages-container",
      '[role="list"]',
      ".messages-container",
      ".MessageList",
      '[data-testid="message-list"]'
    ];
    for (const sel of selectors) {
      try {
        const el = container.querySelector(sel);
        if (el) return el;
      } catch {
      }
    }
    return container;
  }
  /**
   * 🎯 设置父级观察器，监听容器替换
   */
  setupParentObserver(container) {
    try {
      if (this.parentObserver) {
        this.parentObserver.disconnect();
        this.parentObserver = null;
      }
      const parent = container.closest("#MiddleColumn, #column-center");
      if (!parent) {
        console.log("[TelegramMonitor] ⚠️ 未找到容器父级，跳过父级观察器设置");
        return;
      }
      this.parentObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === "childList" && mutation.removedNodes.length > 0) {
            const wasContainerRemoved = Array.from(mutation.removedNodes).some((node) => {
              if (!(node instanceof HTMLElement)) return false;
              return node === container || node.contains(container);
            });
            if (wasContainerRemoved && this.containerEl) {
              console.log("[TelegramMonitor] 🔄 检测到消息容器被移除，准备重新绑定...");
              if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
              }
              this.containerEl = null;
              setTimeout(() => {
                console.log("[TelegramMonitor] 🔍 开始重新扫描容器...");
                this.scanTick();
              }, 1e3);
              break;
            }
          }
        }
      });
      this.parentObserver.observe(parent, { childList: true, subtree: false });
      console.log("[TelegramMonitor] 🎯 已设置父级观察器，监听容器替换");
    } catch (e) {
      console.error("[TelegramMonitor] 设置父级观察器失败:", e);
    }
  }
  scanTick() {
    if (typeof document === "undefined" || typeof window === "undefined") return;
    try {
      const container = this.findMessagesContainer();
      if (container) {
        const target = this.getObserveTarget(container);
        this.containerEl = target;
        const config = { childList: true, subtree: true, attributes: true };
        this.observer = new MutationObserver((mutations) => this.handleMutations(mutations));
        this.observer.observe(target, config);
        if (this.scanTimer !== void 0) {
          window.clearInterval(this.scanTimer);
          this.scanTimer = void 0;
        }
        console.log("[TelegramMonitor] ✅ 找到消息容器，开始监听:", target.tagName, target.className);
        this.setupParentObserver(target);
        this.processExistingMessages();
        try {
          const sel = this.selectors[this.version];
          const hasMsgEls = !!target.querySelector(sel.message);
          const hasTimeEls = !!target.querySelector("time[datetime], .time");
          if (!hasMsgEls && !hasTimeEls && Date.now() - this.lastAutoOpenAt >= this.autoOpenCooldownMs) {
            console.log("[TelegramMonitor] ⚠️ 容器内未检测到消息或时间元素，尝试自动打开会话以触发渲染");
            const opened = this.attemptAutoOpenChat();
            this.lastAutoOpenAt = Date.now();
            console.log("[TelegramMonitor] 自动打开会话尝试结果: opened=", opened);
          }
        } catch (_e) {
        }
        this.noContainerCount = 0;
        return;
      }
      this.noContainerCount++;
      const now = Date.now();
      const cooldownRemaining = Math.max(0, this.autoOpenCooldownMs - (now - this.lastAutoOpenAt));
      if (this.noContainerCount <= 3 || this.noContainerCount % 5 === 0) {
        console.log(`[TelegramMonitor] 消息容器 未找到，跳过本轮扫描 ${this.noContainerCount} (冷却剩余: ${Math.round(cooldownRemaining / 1e3)}s)`);
      }
      if (this.noContainerCount >= this.maxNoContainerBeforeOpen && now - this.lastAutoOpenAt >= this.autoOpenCooldownMs) {
        console.log("[TelegramMonitor] 🔄 多次未命中容器，尝试自动打开会话以触发渲染...");
        const opened = this.attemptAutoOpenChat();
        this.lastAutoOpenAt = now;
        this.noContainerCount = 0;
        console.log("[TelegramMonitor] 自动打开会话尝试结果: opened=", opened, "，等待渲染...");
        if (opened) {
          setTimeout(() => {
            console.log("[TelegramMonitor] 渲染等待结束（5秒），继续扫描...");
            const delayedContainer = this.findMessagesContainer();
            if (delayedContainer) {
              const target = this.getObserveTarget(delayedContainer);
              this.containerEl = target;
              const config = { childList: true, subtree: true };
              this.observer = new MutationObserver((mutations) => this.handleMutations(mutations));
              this.observer.observe(target, config);
              if (this.scanTimer !== void 0) {
                window.clearInterval(this.scanTimer);
                this.scanTimer = void 0;
              }
              console.log("[TelegramMonitor] ✅ 延迟扫描找到消息容器，开始监听:", target.tagName, target.className);
              this.setupParentObserver(target);
              this.processExistingMessages();
            } else {
              console.log("[TelegramMonitor] ⚠️ 延迟扫描仍未找到消息容器，将继续轮询...");
            }
          }, 5e3);
        }
      }
    } catch (e) {
      console.error("[TelegramMonitor] 扫描轮询异常:", e);
    }
  }
  /**
   * 寻找消息容器（含多选择器与 Shadow DOM 兜底）
   */
  findMessagesContainer() {
    if (!this.version) this.detectVersion();
    const messageBasedContainer = this.findContainerByMessageElements();
    if (messageBasedContainer) {
      console.log("[TelegramMonitor] ✅ 基于消息元素找到容器:", messageBasedContainer.tagName, messageBasedContainer.className);
      return messageBasedContainer;
    }
    const timeBasedContainer = this.findContainerByTimeElements();
    if (timeBasedContainer) {
      const refined = this.refineToScrollableMessageContainer(timeBasedContainer);
      if (refined !== timeBasedContainer) {
        console.log("[TelegramMonitor] 🔧 基于时间元素容器精炼为:", refined.tagName, refined.className);
      }
      console.log("[TelegramMonitor] ✅ 基于时间元素找到容器:", refined.tagName, refined.className);
      return refined;
    }
    const base = this.selectors[this.version]?.messagesContainer;
    const candidates = [
      // 易翻译推荐的通用选择器（优先级最高）
      '[role="list"]',
      '[role="feed"]',
      '[role="log"]',
      // 版本特定选择器
      base,
      "#MiddleColumn .messages-container",
      "#MiddleColumn .MessageList",
      "#MiddleColumn .custom-scroll .messages-container",
      "#column-center .messages-container",
      "#column-center > div > div",
      ".messages-container",
      ".bubbles-inner",
      ".bubbles",
      '[data-testid="messages-container"]',
      '[data-testid="message-list"]',
      '[data-testid="MessageList"]',
      '[data-list-id="chat-messages"]',
      '[aria-label="Message list"]',
      '[aria-label="Messages"]',
      ".chat__messages",
      ".message-list",
      ".MessageList",
      ".MessageHistory",
      ".im_page_history",
      ".chat-content",
      "cdk-virtual-scroll-viewport",
      ".cdk-virtual-scroll-content-wrapper",
      ".messages-wrapper",
      ".chat-messages",
      "#messages-container",
      ".conversation-messages"
    ].filter(Boolean);
    let debugOnce = false;
    if (this.noContainerCount === 0) {
      debugOnce = true;
      console.log("[TelegramMonitor] 🔍 开始扫描容器，共", candidates.length, "个候选选择器");
    }
    for (const sel of candidates) {
      try {
        const el = document.querySelector(sel);
        if (el) {
          const chatListHints = ".ListItem.chat-item-clickable, a.ListItem, [data-peer-id], .chatlist-chat, .chat-item";
          const isChatListLike = !!el.querySelector(chatListHints);
          const msgItemCount = el.querySelectorAll('[role="listitem"], .Message, [data-message-id]').length;
          if (isChatListLike && msgItemCount < 2) {
            if (debugOnce) {
              console.log("[TelegramMonitor] ⏭️ 跳过疑似聊天列表容器:", sel);
            }
            continue;
          }
          console.log("[TelegramMonitor] ✅ 选中容器:", sel, el.tagName, el.className, "| msgItems:", msgItemCount);
          return el;
        }
        if (debugOnce) {
          console.log("[TelegramMonitor] ❌ 未匹配:", sel);
        }
      } catch (_err) {
        if (debugOnce) {
          console.log("[TelegramMonitor] ⚠️ 选择器错误:", sel, _err);
        }
      }
    }
    if (debugOnce) {
      console.log("[TelegramMonitor] 标准选择器未命中，尝试启发式查找...");
    }
    const heuristicResult = this.findContainerByHeuristics();
    if (heuristicResult) {
      const refined = this.refineToScrollableMessageContainer(heuristicResult);
      if (refined !== heuristicResult) {
        console.log("[TelegramMonitor] 🔧 精炼启发式容器为:", refined.tagName, refined.className);
      }
      console.log("[TelegramMonitor] ✅ 启发式找到容器:", refined.tagName, refined.className);
      return refined;
    }
    const deepResult = this.querySelectorDeep(candidates);
    if (deepResult) {
      console.log("[TelegramMonitor] ✅ 深度选中容器:", deepResult.tagName, deepResult.className);
      return deepResult;
    }
    return null;
  }
  /**
   * 🎯 基于实际消息元素反向查找容器
   */
  findContainerByMessageElements() {
    try {
      const scope = document.querySelector("#MiddleColumn") || document.querySelector("#column-center") || document.body;
      const messageSelectors = [
        '[role="listitem"]',
        'li[role="listitem"]',
        '[data-testid*="message"]',
        ".Message.message-list-item",
        ".Message",
        "[data-message-id]",
        ".message-list-item",
        'div[id^="message-"]'
      ];
      console.log("[TelegramMonitor] 🔍 开始反向查找消息元素...");
      let messageElement = null;
      for (const sel of messageSelectors) {
        let el = null;
        try {
          el = scope.querySelector(sel);
        } catch {
          el = null;
        }
        console.log(`[TelegramMonitor] 测试选择器 "${sel}": ${el ? "✅找到" : "❌未找到"}`);
        if (el) {
          messageElement = el;
          break;
        }
      }
      if (!messageElement) {
        const allDivs = document.querySelectorAll("div").length;
        const hasDataMsg = document.querySelectorAll("[data-message-id]").length;
        console.log("[TelegramMonitor] ⚠️ 未找到消息元素！诊断: 页面共", allDivs, "个div,", hasDataMsg, "个data-message-id");
        return null;
      }
      let current = messageElement.parentElement;
      let depth = 0;
      const maxDepth = 10;
      console.log("[TelegramMonitor] 🔍 开始向上查找容器...");
      while (current && depth < maxDepth) {
        const isScrollable = current.scrollHeight > current.clientHeight + 10;
        const messageCount = current.querySelectorAll('[role="listitem"], .Message, [data-message-id]').length;
        if (isScrollable && messageCount > 1) {
          console.log("[TelegramMonitor] 🎯 反向找到容器 (深度", depth, "):", current.tagName, current.className.substring(0, 50));
          return current;
        }
        current = current.parentElement;
        depth++;
      }
      console.log("[TelegramMonitor] ⚠️ 反向查找未找到合适的可滚动容器（遍历了", maxDepth, "层）");
      return null;
    } catch (e) {
      console.error("[TelegramMonitor] 反向查找失败:", e);
      return null;
    }
  }
  /**
   * 启发式查找消息容器（结构语义优先）
   */
  findContainerByHeuristics() {
    try {
      const allDivs = Array.from(document.querySelectorAll("div"));
      const candidates = [];
      let debugCount = 0;
      for (const div of allDivs) {
        let score = 0;
        const debugInfo = [];
        const rect = div.getBoundingClientRect();
        if (rect.width < 300 || rect.height < 400) continue;
        debugInfo.push(`size:${Math.round(rect.width)}x${Math.round(rect.height)}`);
        if (div.scrollHeight > div.clientHeight + 10) {
          score += 30;
          debugInfo.push("scroll:+30");
        }
        if (rect.width > 400 && rect.height > 500) {
          score += 20;
          debugInfo.push("largeSize:+20");
        }
        const roleItemCount = div.querySelectorAll('[role="listitem"]').length;
        if (roleItemCount > 1) {
          score += 25;
          debugInfo.push(`roleItems:${roleItemCount}:+25`);
        }
        const hasTime = !!div.querySelector("time[datetime], .time");
        if (hasTime) {
          score += 10;
          debugInfo.push("time:+10");
        }
        const classIdText = ((div.className || "") + " " + (div.id || "")).toLowerCase();
        if (classIdText.includes("message") || classIdText.includes("chat")) {
          score += 5;
          debugInfo.push("kw:+5");
        }
        if (score >= 25) {
          candidates.push({ el: div, score, debug: debugInfo.join(" ") });
          if (debugCount < 5) {
            console.log(`[TelegramMonitor] 🎯 候选${debugCount + 1}: ${score}分 | ${debugInfo.join(" ")} | 类名: ${(div.className || "").substring(0, 40)}`);
            debugCount++;
          }
        }
      }
      candidates.sort((a, b) => b.score - a.score);
      console.log(`[TelegramMonitor] 🎯 共找到 ${candidates.length} 个候选容器 (评分≥25)`);
      if (candidates.length > 0) return candidates[0].el;
      console.log("[TelegramMonitor] ⚠️ 启发式查找未找到合适容器");
      return null;
    } catch (e) {
      console.error("[TelegramMonitor] 启发式查找失败:", e);
      return null;
    }
  }
  /**
   * 对启发式结果进行精炼，优先返回其内部更像消息列表的可滚动子容器
   */
  refineToScrollableMessageContainer(root) {
    try {
      const roleList = root.querySelector('[role="list"], [role="feed"], [role="log"]');
      if (roleList) return roleList;
      const divs = Array.from(root.querySelectorAll("div"));
      let best = null;
      for (const d of divs) {
        const rect = d.getBoundingClientRect();
        const isScrollable = d.scrollHeight > d.clientHeight + 10;
        if (!isScrollable) continue;
        let score = 0;
        if (rect.width > 300 && rect.height > 300) score += 15;
        const roleItems = d.querySelectorAll('[role="listitem"]').length;
        const msgLike = d.querySelectorAll(".Message, .message-list-item, [data-message-id]").length;
        const timeCount = d.querySelectorAll("time[datetime], .time").length;
        if (roleItems > 1) score += 25;
        if (msgLike > 1) score += 15;
        if (timeCount > 2) score += 10;
        const classId = ((d.className || "") + " " + (d.id || "")).toLowerCase();
        if (classId.includes("message") || classId.includes("bubble") || classId.includes("history")) score += 5;
        const isChatListLike = !!d.querySelector(".ListItem.chat-item-clickable, a.ListItem, [data-peer-id], .chatlist-chat, .chat-item");
        if (isChatListLike) score -= 20;
        if (!best || score > best.score) best = { el: d, score };
      }
      return best ? best.el : root;
    } catch (_e) {
      return root;
    }
  }
  /**
   * 深度选择器：遍历 shadowRoot 寻找匹配元素（限制扫描规模以保证性能）
   */
  querySelectorDeep(selectors) {
    const root = document.documentElement || document.body;
    const queue = [];
    if (root) queue.push(root);
    let visited = 0;
    const VISIT_MAX = 2e3;
    while (queue.length && visited < VISIT_MAX) {
      const el = queue.shift();
      visited++;
      try {
        if (el instanceof HTMLElement) {
          for (const sel of selectors) {
            try {
              if (el.matches(sel)) return el;
            } catch (_err) {
            }
          }
        }
        for (const sel of selectors) {
          try {
            const found = el.querySelector(sel);
            if (found) return found;
          } catch (_err) {
          }
        }
        const children = Array.from(el.children);
        for (const c of children) queue.push(c);
        const withSR = el;
        if (withSR && withSR.shadowRoot && withSR.shadowRoot instanceof ShadowRoot) {
          const sChildren = Array.from(withSR.shadowRoot.children);
          for (const sc of sChildren) queue.push(sc);
        }
      } catch (_err) {
      }
    }
    return null;
  }
  /**
   * 输出页面关键结构信息（调试用）
   */
  logPageStructure() {
    try {
      const info = {
        url: window.location.href,
        title: document.title,
        hasColumnCenter: !!document.querySelector("#column-center"),
        hasChatList: !!document.querySelector(".chatlist, .chat-list"),
        hasSidebarLeft: !!document.querySelector(".sidebar-left"),
        hasChatInput: !!document.querySelector(".chat-input, .input-message-input"),
        bodyClasses: document.body.className,
        appRoot: document.querySelector('#root, #app, [data-testid="root"]')?.tagName || "none"
      };
      console.log("[TelegramMonitor] 📋 页面结构URL:", info.url);
      console.log("[TelegramMonitor] 📋 hasColumnCenter:", info.hasColumnCenter);
      console.log("[TelegramMonitor] 📋 hasChatList:", info.hasChatList);
      console.log("[TelegramMonitor] 📋 hasSidebarLeft:", info.hasSidebarLeft);
      console.log("[TelegramMonitor] 📋 bodyClasses:", info.bodyClasses);
      this.analyzeDOMStructure();
    } catch (e) {
      console.error("[TelegramMonitor] 获取页面结构失败:", e);
    }
  }
  /**
   * 分析实际DOM结构
   */
  analyzeDOMStructure() {
    try {
      console.log("[TelegramMonitor] 🔬 开始分析实际DOM结构...");
      const allDivs = document.querySelectorAll("div");
      const scrollableContainers = [];
      allDivs.forEach((div) => {
        const el = div;
        const rect = el.getBoundingClientRect();
        const isScrollable = el.scrollHeight > el.clientHeight + 10;
        const isLarge = rect.width > 200 && rect.height > 200;
        if (isScrollable && isLarge) {
          scrollableContainers.push({
            tag: el.tagName,
            classes: el.className || "(no-class)",
            id: el.id || "(no-id)",
            scrollable: isScrollable,
            size: `${Math.round(rect.width)}x${Math.round(rect.height)}`
          });
        }
      });
      console.log("[TelegramMonitor] 🔬 找到", scrollableContainers.length, "个可滚动大容器");
      scrollableContainers.slice(0, 5).forEach((container, idx) => {
        console.log(`[TelegramMonitor] 🔬 容器${idx + 1}:`, container.classes.substring(0, 100), "|", container.size);
      });
      const columnCenter = document.querySelector("#column-center");
      if (columnCenter) {
        const children = Array.from(columnCenter.children);
        console.log("[TelegramMonitor] 🔬 #column-center 子元素数:", children.length);
        children.slice(0, 3).forEach((child, idx) => {
          console.log(`[TelegramMonitor] 🔬 子元素${idx + 1}:`, child.tagName, child.className?.substring(0, 50));
        });
      }
    } catch (e) {
      console.error("[TelegramMonitor] DOM结构分析失败:", e);
    }
  }
  /**
   * 自动打开一个会话（从会话列表中点选第一个可见项）
   */
  attemptAutoOpenChat() {
    try {
      console.log("[TelegramMonitor] 🔍 开始查找会话列表...");
      const listSelectors = [
        ".chatlist",
        ".chat-list",
        ".dialogs",
        '[data-testid="chatlist"]',
        "#chats-container",
        ".chats-container",
        ".left-column .chatlist"
      ];
      const itemSelectors = [
        'a.ListItem-button[href^="#"]',
        "a.ListItem-button",
        'a[role="link"][data-peer-id]',
        ".ListItem.chat-item-clickable",
        "a.ListItem",
        ".chatlist-chat",
        ".chat-item",
        ".ListItem",
        ".im_dialog_wrap",
        "[data-peer-id]"
      ];
      const candidates = [];
      const pushUnique = (el) => {
        const h = el;
        if (h && !candidates.includes(h)) candidates.push(h);
      };
      for (const ls of listSelectors) {
        const list = document.querySelector(ls);
        if (list) {
          console.log("[TelegramMonitor] 🎯 找到会话列表:", ls);
          for (const is of itemSelectors) {
            const items = list.querySelectorAll(is);
            console.log(`[TelegramMonitor] 测试会话项选择器 "${is}": 找到 ${items.length} 个`);
            items.forEach(pushUnique);
          }
          break;
        }
      }
      if (candidates.length === 0) {
        console.log("[TelegramMonitor] 会话列表未找到，尝试全局查找会话项...");
        for (const is of itemSelectors) {
          const items = document.querySelectorAll(is);
          console.log(`[TelegramMonitor] 全局测试 "${is}": 找到 ${items.length} 个`);
          items.forEach(pushUnique);
        }
      }
      if (candidates.length === 0) {
        console.log("[TelegramMonitor] ⚠️ 未找到任何可点击的会话项");
        const allAs = document.querySelectorAll("a").length;
        const allListItems = document.querySelectorAll(".ListItem").length;
        console.log("[TelegramMonitor] 📊 诊断: 页面共", allAs, "个<a>标签,", allListItems, "个.ListItem");
        return false;
      }
      const maxTries = Math.min(3, candidates.length);
      const clickItem = (item) => {
        item.scrollIntoView({ behavior: "auto", block: "center" });
        const rect = item.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        item.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, clientX: x, clientY: y }));
        item.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, clientX: x, clientY: y }));
        item.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, clientX: x, clientY: y }));
        try {
          item.click();
        } catch (_e) {
        }
      };
      let idx = 0;
      const tryClick = () => {
        const item = candidates[idx];
        if (!item) return;
        console.log("[TelegramMonitor] 🎯 准备点击会话项 序号:", idx + 1, "类名:", (item.className || "").toString().substring(0, 60));
        clickItem(item);
        setTimeout(() => {
          const ok = this.isChatOpen();
          console.log("[TelegramMonitor] 🔎 打开判定:", ok, "尝试序号:", idx + 1);
          if (!ok && idx + 1 < maxTries) {
            idx++;
            tryClick();
          }
        }, 1500);
      };
      tryClick();
      console.log("[TelegramMonitor] ✅ 已发起自动打开会话序列，候选数:", candidates.length, "尝试上限:", maxTries);
      return true;
    } catch (e) {
      console.error("[TelegramMonitor] 自动打开会话失败:", e);
      return false;
    }
  }
  /**
   * 处理单个消息元素
   */
  processMessageElement(element) {
    const selectors = this.selectors[this.version];
    let msgEl = null;
    if (element.matches && element.matches(selectors.message)) {
      msgEl = element;
    } else {
      msgEl = element.querySelector(selectors.message) || element.closest && element.closest(selectors.message) || null;
    }
    if (!msgEl) return;
    let msgRoot = msgEl.closest("[data-message-id]") || msgEl.querySelector("[data-message-id]") || null;
    if (!msgRoot) {
      msgRoot = msgEl;
    }
    let isOutgoing = false;
    try {
      const outSel = selectors.outgoingMessage;
      if (outSel) {
        isOutgoing = msgRoot.matches(outSel) || !!msgRoot.querySelector(outSel);
      }
    } catch (_err) {
    }
    if (isOutgoing && !this.includeOutgoingForDebug) return;
    const message = this.extractMessageInfo(msgRoot, isOutgoing);
    if (!message || !message.text) return;
    const messageKey = `${message.chatId}-${message.id}`;
    if (this.messageCache.has(messageKey)) return;
    this.messageCache.add(messageKey);
    if (this.messageCache.size > 1e3) {
      const firstKey = this.messageCache.values().next().value;
      this.messageCache.delete(firstKey);
    }
    this.sendMessageToMain(message);
  }
  /**
   * 提取消息信息
   */
  extractMessageInfo(element, isOutgoing) {
    try {
      const selectors = this.selectors[this.version];
      let text = "";
      const contentEl = element.querySelector(".message-content");
      const textElement = element.querySelector(selectors.messageText);
      if (textElement) {
        const clone = textElement.cloneNode(true);
        clone.querySelectorAll(".MessageMeta, .message-meta, time, .message-time").forEach((e) => e.remove());
        text = clone.textContent?.trim() || "";
      }
      if (!text && contentEl) {
        const clone = contentEl.cloneNode(true);
        clone.querySelectorAll(".MessageMeta, .message-meta, time, .message-time").forEach((e) => e.remove());
        text = clone.textContent?.trim() || "";
      }
      if (!text) return null;
      const authorElement = element.querySelector(selectors.messageAuthor);
      const chatInfo = this.getChatInfo();
      const senderName = authorElement?.textContent?.trim() || chatInfo.chatTitle || "Unknown";
      const timeElement = element.querySelector(selectors.messageTime);
      const timeText = (timeElement?.getAttribute?.("datetime") || timeElement?.textContent || "").trim();
      const messageId = this.generateMessageId(element);
      return {
        id: messageId,
        chatId: chatInfo.chatId,
        chatTitle: chatInfo.chatTitle,
        senderId: this.extractSenderId(element),
        senderName,
        text,
        timestamp: this.parseTimestamp(timeText),
        isOutgoing,
        hasMedia: this.hasMedia(element)
      };
    } catch (error) {
      console.error("[TelegramMonitor] Error extracting message info:", error);
      return null;
    }
  }
  /**
   * 生成消息ID
   */
  generateMessageId(element) {
    const selfId = element.getAttribute("data-message-id") || element.getAttribute("data-mid") || element.getAttribute("data-id");
    if (selfId) return selfId;
    const dataSel = "[data-message-id], [data-mid], [data-id]";
    const desc = element.querySelector(dataSel);
    if (desc) {
      const v = desc.getAttribute("data-message-id") || desc.getAttribute("data-mid") || desc.getAttribute("data-id");
      if (v) return v;
    }
    const anc = element.closest(dataSel);
    if (anc) {
      const v = anc.getAttribute("data-message-id") || anc.getAttribute("data-mid") || anc.getAttribute("data-id");
      if (v) return v;
    }
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  /**
   * 获取聊天信息
   */
  getChatInfo() {
    const selectors = this.selectors[this.version];
    const urlMatch = window.location.hash.match(/#([^/]+)$/);
    let chatId = urlMatch ? urlMatch[1] : "unknown";
    if (!chatId || chatId === "unknown") {
      const peer = document.querySelector("#MiddleColumn .ChatInfo [data-peer-id], .MiddleHeader .ChatInfo [data-peer-id]");
      const idAttr = peer?.getAttribute("data-peer-id") || void 0;
      if (idAttr) chatId = idAttr;
    }
    const titleElement = document.querySelector(selectors.chatTitle);
    const chatTitle = titleElement?.textContent?.trim() || "Unknown Chat";
    return { chatId, chatTitle };
  }
  /**
   * 提取发送者ID
   */
  extractSenderId(element) {
    const senderId = element.getAttribute("data-sender-id") || element.getAttribute("data-peer-id");
    if (senderId) return senderId;
    const authorElement = element.querySelector(".message-title, .name");
    const senderName = authorElement?.textContent?.trim() || "";
    return `user-${this.hashString(senderName)}`;
  }
  /**
   * 解析时间戳
   */
  parseTimestamp(timeText) {
    const now = Date.now();
    if (!timeText) return now;
    if (/^\d{1,2}:\d{2}$/.test(timeText)) {
      const [hours, minutes] = timeText.split(":").map(Number);
      const date = /* @__PURE__ */ new Date();
      date.setHours(hours, minutes, 0, 0);
      return date.getTime();
    }
    return now;
  }
  /**
   * 检查是否包含媒体
   */
  hasMedia(element) {
    return !!(element.querySelector("img, video, audio, .document, .media") || element.querySelector("[data-media]"));
  }
  /**
   * 发送消息到主进程
   */
  sendMessageToMain(message) {
    const payload = {
      id: message.id,
      chatId: message.chatId,
      chatTitle: message.chatTitle,
      senderName: message.senderName,
      text: message.text,
      timestamp: message.timestamp,
      isIncoming: !message.isOutgoing,
      messageType: "text"
    };
    console.log("[TelegramMonitor] New message detected:", payload);
    electron.ipcRenderer.send(IPC_CHANNELS.MESSAGE_RECEIVED, {
      accountId: this.getAccountId(),
      message: payload
    });
  }
  /**
   * 获取当前账号ID
   */
  getAccountId() {
    return window.localStorage.getItem("accountId") || "default";
  }
  /**
   * 字符串哈希
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
  /**
   * 获取监控状态
   */
  getStatus() {
    return this.isMonitoring;
  }
  getDebugInfo() {
    return {
      version: this.version,
      isMonitoring: this.isMonitoring,
      messageCount: this.messageCache.size,
      noContainerCount: this.noContainerCount,
      includeOutgoingForDebug: this.includeOutgoingForDebug
    };
  }
  debugFindContainer() {
    try {
      const c = this.findMessagesContainer();
      return c;
    } catch (_e) {
      return null;
    }
  }
  debugScanMessages() {
    try {
      this.processExistingMessages();
    } catch (_e) {
    }
  }
  /**
   * 设置调试开关：是否上报发出的消息
   */
  setIncludeOutgoingForDebug(include) {
    this.includeOutgoingForDebug = include;
    console.log(`[TelegramMonitor] 🎯 调试开关 includeOutgoingForDebug 已设置为: ${include}`);
  }
  /**
   * 获取调试开关状态
   */
  getIncludeOutgoingForDebug() {
    return this.includeOutgoingForDebug;
  }
}
const telegramMonitor = typeof window !== "undefined" && typeof document !== "undefined" ? new TelegramMonitor() : null;
class ObserverPool {
  pool = /* @__PURE__ */ new Map();
  metrics = {
    observerCount: 0,
    totalMutations: 0,
    avgProcessingTime: 0,
    memoryUsage: 0,
    lastGC: Date.now()
  };
  // 批处理队列
  mutationQueue = [];
  processingTimeout = null;
  BATCH_SIZE = 100;
  BATCH_DELAY = 16;
  // 一帧时间
  // 性能监控
  performanceMonitor = null;
  // P0-2: 事件监听器
  metricsListeners = /* @__PURE__ */ new Set();
  constructor() {
    this.initPerformanceMonitoring();
    this.scheduleGarbageCollection();
  }
  /**
   * 获取或创建优化的观察器
   */
  async getObserver(target, callback, config) {
    const key = this.getTargetKey(target);
    const existing = this.pool.get(key);
    if (existing) {
      console.log("[ObserverPool] 复用现有观察器:", key);
      return existing;
    }
    if (this.pool.size >= 10) {
      await this.evictLeastUsed();
    }
    const batchedCallback = this.createBatchedCallback(callback);
    const observer = new MutationObserver(batchedCallback);
    const optimalConfig = config || this.getOptimalConfig(target);
    observer.observe(target, optimalConfig);
    this.pool.set(key, observer);
    this.metrics.observerCount = this.pool.size;
    console.log("[ObserverPool] 创建新观察器:", key, "当前池大小:", this.pool.size);
    this.emitMetricsChange();
    return observer;
  }
  /**
   * 创建批处理回调
   */
  createBatchedCallback(originalCallback) {
    return (mutations) => {
      const startTime = performance.now();
      this.mutationQueue.push(mutations);
      this.metrics.totalMutations += mutations.length;
      if (this.processingTimeout) {
        clearTimeout(this.processingTimeout);
      }
      this.processingTimeout = setTimeout(() => {
        this.processBatch(originalCallback);
      }, this.BATCH_DELAY);
      const processingTime = performance.now() - startTime;
      this.updateAvgProcessingTime(processingTime);
    };
  }
  /**
   * 批量处理突变
   */
  processBatch(callback) {
    if (this.mutationQueue.length === 0) return;
    const startTime = performance.now();
    const allMutations = this.mutationQueue.flat();
    this.mutationQueue = [];
    const uniqueMutations = this.deduplicateMutations(allMutations);
    const chunks = this.chunkArray(uniqueMutations, this.BATCH_SIZE);
    chunks.forEach((chunk, index) => {
      if ("requestIdleCallback" in window) {
        requestIdleCallback(() => callback(chunk), {
          timeout: 50 + index * 10
        });
      } else {
        setTimeout(() => callback(chunk), index * 10);
      }
    });
    const processingTime = performance.now() - startTime;
    this.updateAvgProcessingTime(processingTime);
  }
  /**
   * 去重突变记录
   */
  deduplicateMutations(mutations) {
    const passThrough = mutations.filter((m) => m.type === "childList");
    const rest = mutations.filter((m) => m.type !== "childList");
    const seen = /* @__PURE__ */ new Set();
    const uniqRest = [];
    for (const mutation of rest) {
      const key = this.getMutationKey(mutation);
      if (!seen.has(key)) {
        seen.add(key);
        uniqRest.push(mutation);
      }
    }
    return [...passThrough, ...uniqRest];
  }
  /**
   * 获取突变键值
   */
  getMutationKey(mutation) {
    return `${mutation.type}-${mutation.target.nodeName}-${mutation.attributeName || ""}-${mutation.addedNodes.length}-${mutation.removedNodes.length}`;
  }
  /**
   * 获取最优配置
   */
  getOptimalConfig(target) {
    const tagName = target.tagName.toLowerCase();
    if (tagName === "div" && target.classList.contains("MessageList")) {
      return {
        childList: true,
        subtree: true,
        // MessageList 需要 subtree:true 捕获嵌套消息
        attributes: false,
        // 不关心属性变化
        characterData: false
        // 不关心文本变化
      };
    }
    if (tagName === "div" && target.classList.contains("messages-container")) {
      return {
        childList: true,
        subtree: false,
        // 不监听深层变化，提高性能
        attributes: false,
        characterData: false
      };
    }
    return {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: false,
      characterData: false
    };
  }
  /**
   * 获取目标元素键值
   */
  getTargetKey(target) {
    return `${target.tagName}-${target.id || target.className || "unknown"}`;
  }
  /**
   * 驱逐最少使用的观察器
   */
  async evictLeastUsed() {
    const firstKey = this.pool.keys().next().value;
    if (firstKey) {
      const observer = this.pool.get(firstKey);
      observer?.disconnect();
      this.pool.delete(firstKey);
      console.log("[ObserverPool] 驱逐观察器:", firstKey);
    }
  }
  /**
   * 分块数组
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  /**
   * 更新平均处理时间
   */
  updateAvgProcessingTime(time) {
    const alpha = 0.1;
    this.metrics.avgProcessingTime = alpha * time + (1 - alpha) * this.metrics.avgProcessingTime;
  }
  /**
   * 初始化性能监控
   */
  initPerformanceMonitoring() {
    if (!("PerformanceObserver" in window)) return;
    try {
      this.performanceMonitor = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "measure") {
            console.log("[ObserverPool] 性能测量:", entry.name, entry.duration);
          }
        }
      });
      this.performanceMonitor.observe({ entryTypes: ["measure"] });
    } catch (error) {
      console.error("[ObserverPool] 性能监控初始化失败:", error);
    }
  }
  /**
   * 调度垃圾回收
   */
  scheduleGarbageCollection() {
    setInterval(() => {
      this.performGarbageCollection();
    }, 6e4);
  }
  /**
   * 执行垃圾回收
   */
  performGarbageCollection() {
    const now = Date.now();
    for (const [key, observer] of this.pool.entries()) {
      try {
        const records = observer.takeRecords();
        if (records.length === 0) {
        }
      } catch (error) {
        this.pool.delete(key);
        console.log("[ObserverPool] 清理失效观察器:", key);
      }
    }
    if ("memory" in performance) {
      const perfWithMemory = performance;
      this.metrics.memoryUsage = perfWithMemory.memory?.usedJSHeapSize || 0;
    }
    this.metrics.lastGC = now;
    this.metrics.observerCount = this.pool.size;
    console.log("[ObserverPool] 垃圾回收完成，当前指标:", this.metrics);
    this.emitMetricsChange();
  }
  /**
   * 断开所有观察器
   */
  disconnectAll() {
    for (const observer of this.pool.values()) {
      observer.disconnect();
    }
    this.pool.clear();
    this.metrics.observerCount = 0;
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
    }
    if (this.performanceMonitor) {
      this.performanceMonitor.disconnect();
    }
    console.log("[ObserverPool] 所有观察器已断开");
    this.emitMetricsChange();
  }
  /**
   * 获取性能指标
   */
  getMetrics() {
    return { ...this.metrics };
  }
  /**
   * P0-2: 添加指标变化监听器
   */
  onMetricsChange(listener) {
    this.metricsListeners.add(listener);
  }
  /**
   * P0-2: 移除指标变化监听器
   */
  offMetricsChange(listener) {
    this.metricsListeners.delete(listener);
  }
  /**
   * P0-2: 发射指标变化事件
   */
  emitMetricsChange() {
    const metrics = this.getMetrics();
    this.metricsListeners.forEach((listener) => {
      try {
        listener(metrics);
      } catch (error) {
        console.error("[ObserverPool] 指标监听器错误:", error);
      }
    });
  }
}
const observerPool = new ObserverPool();
const TELEGRAM_SELECTOR_STRATEGIES = [
  {
    name: "Telegram Web A - Primary",
    version: "A",
    priority: 100,
    selectors: {
      container: [
        // 基于真实 DOM 结构（2025-11-11 验证）
        ".MessageList",
        // ✅ 主容器
        "#MiddleColumn .MessageList",
        // ✅ 精确定位
        '[class*="MessageList"]',
        // ✅ 模糊匹配
        "#MiddleColumn .Transition.MessageList",
        // 完整类名
        // 备用选择器
        '#MiddleColumn [role="list"]',
        "#MiddleColumn .messages-container",
        '#MiddleColumn [class*="messages"]',
        '#MiddleColumn > div > div[class*="messages"]',
        '[data-testid="messages-list"]',
        ".messages-container"
      ],
      message: [
        // 基于真实 DOM 结构（2025-11-11 验证）
        "[data-message-id]",
        // ✅ 最准确：54个消息
        ".Message",
        // ✅ 大写M：72个元素
        '[id^="message"]',
        // ✅ ID格式：message-25996
        ".message-list-item",
        // ✅ 总是和 .Message 一起
        '[class*="Message"]'
        // 兜底
      ],
      text: [
        ".text-content",
        // ✅ 真实类名
        ".content-inner",
        // ✅ 内容容器
        '[dir="auto"]',
        // ✅ 文本方向属性
        ".message-content",
        '[class*="text"]',
        '[data-testid="message-text"]'
      ],
      sender: [
        ".name",
        // ✅ 发送者名称
        "[data-peer-id]",
        ".sender-name",
        '[class*="name"]'
      ],
      time: [
        "time[datetime]",
        ".message-time",
        '[class*="time"]'
      ]
    }
  },
  {
    name: "Telegram Web K - Primary",
    version: "K",
    priority: 100,
    selectors: {
      container: [
        ".bubbles-inner",
        ".chat-container",
        '[class*="MessageList"]',
        ".MessageList",
        ".messages-container"
      ],
      message: [
        ".bubble",
        ".message-bubble",
        '[class*="bubble"]',
        '[class*="message"]',
        ".message"
      ],
      text: [
        ".bubble-content",
        ".message-text",
        '[class*="text"]',
        ".text",
        '[class*="content"]'
      ],
      sender: [
        ".peer-title",
        ".name",
        '[class*="name"]',
        ".sender-name"
      ],
      time: [
        ".time",
        ".message-time",
        '[class*="time"]'
      ]
    }
  },
  {
    name: "Generic Fallback",
    version: "generic",
    priority: 10,
    selectors: {
      container: [
        '#MiddleColumn [role="list"]',
        '#MiddleColumn [class*="messages"]',
        '#MiddleColumn [class*="bubble"]',
        "#MiddleColumn > div:not(#middle-column-portals)",
        '[aria-label*="messages"]',
        '[aria-label*="chat"]',
        'div[class*="messages"]:not([class*="chat-list"])',
        'div[class*="bubble"]:not([class*="badge"])'
      ],
      message: [
        '[role="listitem"]',
        '[class*="message"]',
        '[class*="bubble"]',
        '[class*="item"]',
        "div[id]"
      ],
      text: [
        "span",
        "div",
        "p",
        '[class*="text"]',
        '[class*="content"]'
      ],
      sender: [
        '[class*="name"]',
        '[class*="title"]',
        '[class*="sender"]'
      ],
      time: [
        "time",
        '[class*="time"]',
        '[class*="date"]'
      ]
    }
  }
];
class StrategySelector {
  successRates = /* @__PURE__ */ new Map();
  STORAGE_KEY = "telegram_strategy_success_rates";
  constructor() {
    this.restoreSuccessRates();
  }
  /**
   * 选择最佳策略（增加延迟重试以等待页面加载）
   */
  async selectBestStrategy() {
    console.log("[StrategySelector] 开始选择最佳策略...");
    const sorted = [...TELEGRAM_SELECTOR_STRATEGIES].sort((a, b) => {
      const rateA = this.successRates.get(a.name) || 0;
      const rateB = this.successRates.get(b.name) || 0;
      const scoreA = a.priority + rateA;
      const scoreB = b.priority + rateB;
      return scoreB - scoreA;
    });
    console.log("[StrategySelector] 策略排序:", sorted.map((s) => ({
      name: s.name,
      priority: s.priority,
      successRate: this.successRates.get(s.name) || 0,
      totalScore: s.priority + (this.successRates.get(s.name) || 0)
    })));
    for (const strategy of sorted) {
      console.log(`[StrategySelector] 尝试策略: ${strategy.name}`);
      const found = await this.tryStrategy(strategy);
      if (found) {
        this.recordSuccess(strategy.name);
        console.log(`[StrategySelector] ✅ 选中策略: ${strategy.name}`);
        return strategy;
      }
    }
    console.log("[StrategySelector] ⏳ 首次查找失败，等待 2 秒后重试...");
    await new Promise((resolve) => setTimeout(resolve, 2e3));
    for (const strategy of sorted) {
      console.log(`[StrategySelector] 重试策略: ${strategy.name}`);
      const found = await this.tryStrategy(strategy);
      if (found) {
        this.recordSuccess(strategy.name);
        console.log(`[StrategySelector] ✅ 延迟重试成功，选中策略: ${strategy.name}`);
        return strategy;
      }
    }
    console.warn("[StrategySelector] ❌ 所有策略均失败（包含重试）");
    return null;
  }
  /**
   * 尝试单个策略
   */
  async tryStrategy(strategy) {
    for (const selector of strategy.selectors.container) {
      try {
        const el = document.querySelector(selector);
        if (el) {
          console.log(`[StrategySelector]   🔍 选择器找到元素: ${selector}`);
          const isValid = this.isValidContainer(el);
          if (isValid) {
            console.log(`[StrategySelector]   ✓ 容器选择器匹配: ${selector}`);
            return true;
          }
        } else {
          console.log(`[StrategySelector]   - 选择器未找到: ${selector}`);
        }
      } catch (error) {
        console.warn(`[StrategySelector]   ✗ 选择器错误: ${selector}`, error);
        continue;
      }
    }
    console.log(`[StrategySelector]   ✗ 策略失败: ${strategy.name}`);
    return false;
  }
  /**
   * 验证容器有效性（放宽验证条件以适应页面加载过程）
   */
  isValidContainer(el) {
    try {
      const rect = el.getBoundingClientRect();
      const isScrollable = el.scrollHeight > el.clientHeight + 5;
      const hasScrollAttr = el.style.overflow === "auto" || el.style.overflow === "scroll" || el.style.overflowY === "auto" || el.style.overflowY === "scroll";
      const computedStyle = window.getComputedStyle(el);
      const hasComputedScroll = computedStyle.overflow === "auto" || computedStyle.overflow === "scroll" || computedStyle.overflowY === "auto" || computedStyle.overflowY === "scroll";
      const visuallyHidden = computedStyle.display === "none" || computedStyle.visibility === "hidden" || computedStyle.opacity === "0";
      const messageCount = el.querySelectorAll('[data-message-id], .Message, [id^="message"], .message-list-item, [data-testid="message"]').length;
      const hasTelegramMessage = messageCount > 0 && !!el.querySelector('[data-message-id], .Message, [id^="message"], .message-list-item');
      const isInMiddleColumn = el.id === "MiddleColumn" || el.closest("#MiddleColumn") !== null;
      const isInLeftColumn = this.isLeftColumnElement(el);
      if (isInLeftColumn) {
        console.log("[StrategySelector]   ❌ 跳过 LeftColumn 元素");
        return false;
      }
      const hasScrollPotential = isScrollable || hasScrollAttr || hasComputedScroll;
      if (!hasTelegramMessage) {
        console.log("[StrategySelector]   ⚠️ 容器缺少消息元素特征");
        return false;
      }
      if (rect.width > 200 && rect.height > 200 && hasScrollPotential) {
        return true;
      }
      if (!visuallyHidden && messageCount > 0 && (rect.width > 0 || rect.height > 0) && (hasScrollPotential || el.scrollHeight > 0)) {
        return true;
      }
      if (messageCount > 0 && hasScrollPotential) {
        return true;
      }
      if (messageCount > 0 && el.scrollHeight > 400) {
        return true;
      }
      console.log("[StrategySelector]   ⚠️ 容器验证失败:", {
        width: rect.width,
        height: rect.height,
        scrollable: isScrollable,
        hasScrollAttr,
        hasComputedScroll,
        isInMiddleColumn,
        isInLeftColumn,
        messageCount,
        testId: el.getAttribute("data-testid") || el.getAttribute("data-test-id") || null,
        ariaLabel: el.getAttribute("aria-label") || null,
        className: el.className
      });
      return false;
    } catch {
      return false;
    }
  }
  isLeftColumnElement(el) {
    if (!el) return false;
    if (el.id === "LeftColumn") return true;
    if (el.closest("#LeftColumn")) return true;
    const testId = (el.getAttribute("data-testid") || el.getAttribute("data-test-id") || "").toLowerCase();
    if (testId && ["chatlist", "chat-list", "pinned-chats", "folder-chats"].some((key) => testId.includes(key))) {
      return true;
    }
    const ariaLabel = (el.getAttribute("aria-label") || "").toLowerCase();
    if (ariaLabel && (ariaLabel.includes("chat list") || ariaLabel.includes("聊天列表") || ariaLabel.includes("dialogs"))) {
      return true;
    }
    const className = (el.className || "").toLowerCase();
    if (["chatlist", "chat-list", "dialog-list", "sidebar", "leftcolumn", "left-column"].some((key) => className.includes(key))) {
      return true;
    }
    return false;
  }
  /**
   * 记录成功（用于学习优化）
   */
  recordSuccess(name) {
    const current = this.successRates.get(name) || 0;
    let increment = 10;
    if (current >= 50) {
      increment = 20;
    } else if (current > 0) {
      increment = 15;
    }
    const newRate = Math.min(current + increment, 100);
    this.successRates.set(name, newRate);
    console.log(`[StrategySelector] 记录成功: ${name}, 新成功率: ${newRate} (+${increment})`);
    this.saveSuccessRates();
  }
  /**
   * 保存成功率到 localStorage
   */
  saveSuccessRates() {
    try {
      const data = JSON.stringify(Array.from(this.successRates.entries()));
      localStorage.setItem(this.STORAGE_KEY, data);
    } catch (error) {
      console.warn("[StrategySelector] 保存成功率失败:", error);
    }
  }
  /**
   * 从 localStorage 恢复学习数据
   */
  restoreSuccessRates() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.successRates = new Map(data);
        console.log("[StrategySelector] 恢复成功率:", Object.fromEntries(this.successRates));
      }
    } catch (error) {
      console.warn("[StrategySelector] 恢复成功率失败:", error);
    }
  }
  /**
   * 清除学习数据（用于测试）
   */
  clearSuccessRates() {
    this.successRates.clear();
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log("[StrategySelector] 已清除学习数据");
    } catch (error) {
      console.warn("[StrategySelector] 清除学习数据失败:", error);
    }
  }
  /**
   * 获取当前成功率
   */
  getSuccessRates() {
    return Object.fromEntries(this.successRates);
  }
  /**
   * 使用策略查找容器
   */
  findContainerWithStrategy(strategy) {
    for (const selector of strategy.selectors.container) {
      try {
        const el = document.querySelector(selector);
        if (el && this.isValidContainer(el)) {
          return el;
        }
      } catch {
        continue;
      }
    }
    return null;
  }
  /**
   * 使用策略查找消息元素
   */
  findMessagesWithStrategy(strategy, container) {
    const messages = [];
    for (const selector of strategy.selectors.message) {
      try {
        const elements = container.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`[StrategySelector] 找到 ${elements.length} 个消息元素（选择器: ${selector}）`);
          return Array.from(elements);
        }
      } catch {
        continue;
      }
    }
    return messages;
  }
  /**
   * 使用策略提取文本
   */
  extractTextWithStrategy(strategy, messageElement) {
    for (const selector of strategy.selectors.text) {
      try {
        const textEl = messageElement.querySelector(selector);
        if (textEl && textEl.textContent?.trim()) {
          return textEl.textContent.trim();
        }
      } catch {
        continue;
      }
    }
    return messageElement.textContent?.trim() || null;
  }
}
const strategySelector = new StrategySelector();
class TelegramOverlay {
  container = null;
  shadowRoot = null;
  state = {
    visible: false,
    strategyName: null,
    strategyVersion: null,
    containerSelector: null,
    containerElement: null,
    containerRect: null,
    isScrollable: false,
    isInMiddleColumn: false,
    isInLeftColumn: false,
    messageCount: 0,
    observerCount: 0,
    circuitBreakerState: "CLOSED",
    lastError: null
  };
  constructor() {
    this.initHotkey();
    this.subscribeToMetrics();
  }
  /**
   * P0-2: Subscribe to ObserverPool metrics changes
   */
  subscribeToMetrics() {
    observerPool.onMetricsChange((metrics) => {
      this.updateState({ observerCount: metrics.observerCount });
      if (this.state.visible) {
        this.render();
      }
    });
    setInterval(() => {
      const metrics = observerPool.getMetrics();
      if (this.state.observerCount !== metrics.observerCount) {
        this.updateState({ observerCount: metrics.observerCount });
        if (this.state.visible) {
          this.render();
        }
      }
    }, 1e3);
    console.log("[Overlay] Subscribed to ObserverPool metrics changes");
  }
  /**
   * Initialize hotkey listener (Ctrl+Alt+M to toggle, Ctrl+Alt+R to refresh)
   */
  initHotkey() {
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.altKey && e.key === "m") {
        e.preventDefault();
        this.toggle();
      }
      if (e.ctrlKey && e.altKey && e.key === "r") {
        e.preventDefault();
        this.triggerRefresh();
      }
    });
    console.log("[Overlay] Hotkeys: Ctrl+Alt+M (toggle) | Ctrl+Alt+R (refresh)");
  }
  /**
   * P0-5: Trigger container refresh
   */
  async triggerRefresh() {
    console.log("[Overlay] 🔄 Triggering container refresh...");
    this.updateState({ lastError: "Refreshing container..." });
    if (this.state.visible) {
      this.render();
    }
    try {
      const result = await window.telegramAutoReply?.refreshContainer?.();
      if (result) {
        this.updateState({ lastError: null });
        console.log("[Overlay] ✅ Container refresh successful");
      } else {
        this.updateState({ lastError: "Refresh failed: container not found" });
        console.warn("[Overlay] ⚠️ Container refresh failed");
      }
    } catch (error) {
      this.updateState({ lastError: `Refresh error: ${error}` });
      console.error("[Overlay] ❌ Container refresh error:", error);
    }
    if (this.state.visible) {
      this.render();
    }
  }
  /**
   * Toggle overlay visibility
   */
  toggle() {
    this.state.visible = !this.state.visible;
    if (this.state.visible) {
      this.show();
    } else {
      this.hide();
    }
    console.log(`[Overlay] Toggle: ${this.state.visible ? "SHOW" : "HIDE"}`);
  }
  /**
   * Show overlay
   */
  show() {
    if (!this.container) {
      this.createOverlay();
    }
    if (this.container) {
      this.container.style.display = "block";
      this.render();
    }
  }
  /**
   * Hide overlay
   */
  hide() {
    if (this.container) {
      this.container.style.display = "none";
    }
  }
  /**
   * Create overlay DOM structure with Shadow DOM
   */
  createOverlay() {
    this.container = document.createElement("div");
    this.container.id = "telegram-monitor-overlay";
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 999999;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;
    this.shadowRoot = this.container.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = this.getStyles();
    this.shadowRoot.appendChild(style);
    const wrapper = document.createElement("div");
    wrapper.className = "overlay-wrapper";
    this.shadowRoot.appendChild(wrapper);
    document.body.appendChild(this.container);
    console.log("[Overlay] Created overlay with Shadow DOM");
  }
  /**
   * Get overlay styles (scoped via Shadow DOM)
   */
  getStyles() {
    return `
      .overlay-wrapper {
        width: 100%;
        height: 100%;
        position: relative;
      }

      .status-panel {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 400px;
        background: rgba(0, 0, 0, 0.9);
        color: #fff;
        border-radius: 8px;
        padding: 16px;
        pointer-events: auto;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        font-size: 13px;
        line-height: 1.5;
      }

      .panel-title {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .close-btn {
        cursor: pointer;
        background: none;
        border: none;
        color: #fff;
        font-size: 18px;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background 0.2s;
      }

      .close-btn:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .status-row {
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
      }

      .status-label {
        color: #aaa;
        font-weight: 500;
      }

      .status-value {
        color: #fff;
        font-weight: 400;
        text-align: right;
        max-width: 250px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .status-value.success {
        color: #4caf50;
      }

      .status-value.error {
        color: #f44336;
      }

      .status-value.warning {
        color: #ff9800;
      }

      .container-box {
        position: absolute;
        pointer-events: none;
        border: 3px solid #4caf50;
        box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.3);
        z-index: 999998;
      }

      .container-box.invalid {
        border-color: #f44336;
        box-shadow: 0 0 0 2px rgba(244, 67, 54, 0.3);
      }

      .container-box.left-column {
        border-color: #ff9800;
        box-shadow: 0 0 0 2px rgba(255, 152, 0, 0.3);
      }

      .container-label {
        position: absolute;
        top: -24px;
        left: 0;
        background: #4caf50;
        color: #fff;
        padding: 4px 8px;
        font-size: 12px;
        font-weight: 600;
        border-radius: 4px 4px 0 0;
        white-space: nowrap;
      }

      .container-box.invalid .container-label {
        background: #f44336;
      }

      .container-box.left-column .container-label {
        background: #ff9800;
      }

      .error-banner {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #f44336;
        color: #fff;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        pointer-events: auto;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        transition: background 0.2s;
      }

      .error-banner:hover {
        background: #d32f2f;
      }

      .hotkey-hint {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        pointer-events: none;
        opacity: 0;
        animation: fadeInOut 3s ease-in-out;
      }

      @keyframes fadeInOut {
        0%, 100% { opacity: 0; }
        10%, 90% { opacity: 1; }
      }
    `;
  }
  /**
   * Render overlay content
   */
  render() {
    if (!this.shadowRoot) return;
    const wrapper = this.shadowRoot.querySelector(".overlay-wrapper");
    if (!wrapper) return;
    wrapper.innerHTML = "";
    this.renderStatusPanel(wrapper);
    if (this.state.containerElement && this.state.containerRect) {
      this.renderContainerBox(wrapper);
    }
    if (this.state.lastError) {
      this.renderErrorBanner(wrapper);
    }
  }
  /**
   * Render status panel
   */
  renderStatusPanel(parent) {
    const panel = document.createElement("div");
    panel.className = "status-panel";
    panel.innerHTML = `
      <div class="panel-title">
        <span>📊 Monitor Status</span>
        <button class="close-btn" id="close-overlay">×</button>
      </div>
      <div class="status-row">
        <span class="status-label">Strategy:</span>
        <span class="status-value ${this.state.strategyName ? "success" : "error"}">
          ${this.state.strategyName || "Not selected"}
        </span>
      </div>
      <div class="status-row">
        <span class="status-label">Version:</span>
        <span class="status-value">${this.state.strategyVersion || "Unknown"}</span>
      </div>
      <div class="status-row">
        <span class="status-label">Selector:</span>
        <span class="status-value" title="${this.state.containerSelector || "N/A"}">
          ${this.state.containerSelector || "N/A"}
        </span>
      </div>
      <div class="status-row">
        <span class="status-label">Container:</span>
        <span class="status-value ${this.state.containerElement ? "success" : "error"}">
          ${this.state.containerElement ? "✓ Found" : "✗ Not found"}
        </span>
      </div>
      <div class="status-row">
        <span class="status-label">Scrollable:</span>
        <span class="status-value ${this.state.isScrollable ? "success" : "warning"}">
          ${this.state.isScrollable ? "Yes" : "No"}
        </span>
      </div>
      <div class="status-row">
        <span class="status-label">In MiddleColumn:</span>
        <span class="status-value ${this.state.isInMiddleColumn ? "success" : "warning"}">
          ${this.state.isInMiddleColumn ? "Yes" : "No"}
        </span>
      </div>
      <div class="status-row">
        <span class="status-label">In LeftColumn:</span>
        <span class="status-value ${this.state.isInLeftColumn ? "error" : "success"}">
          ${this.state.isInLeftColumn ? "⚠️ Yes" : "No"}
        </span>
      </div>
      <div class="status-row">
        <span class="status-label">Messages:</span>
        <span class="status-value">${this.state.messageCount}</span>
      </div>
      <div class="status-row">
        <span class="status-label">Observers:</span>
        <span class="status-value">${this.state.observerCount}</span>
      </div>
      <div class="status-row">
        <span class="status-label">Circuit Breaker:</span>
        <span class="status-value ${this.state.circuitBreakerState === "CLOSED" ? "success" : "error"}">
          ${this.state.circuitBreakerState}
        </span>
      </div>
      ${this.state.containerRect ? `
      <div class="status-row">
        <span class="status-label">Rect:</span>
        <span class="status-value">
          ${Math.round(this.state.containerRect.width)}×${Math.round(this.state.containerRect.height)}
        </span>
      </div>
      ` : ""}
    `;
    const closeBtn = panel.querySelector("#close-overlay");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.toggle());
    }
    parent.appendChild(panel);
  }
  /**
   * Render container bounding box
   */
  renderContainerBox(parent) {
    if (!this.state.containerRect) return;
    const box = document.createElement("div");
    const isValid = this.state.isInMiddleColumn && !this.state.isInLeftColumn;
    const isLeftColumn = this.state.isInLeftColumn;
    box.className = `container-box ${isLeftColumn ? "left-column" : isValid ? "" : "invalid"}`;
    box.style.cssText = `
      left: ${this.state.containerRect.left}px;
      top: ${this.state.containerRect.top}px;
      width: ${this.state.containerRect.width}px;
      height: ${this.state.containerRect.height}px;
    `;
    const label = document.createElement("div");
    label.className = "container-label";
    label.textContent = isLeftColumn ? "⚠️ LeftColumn (Wrong!)" : this.state.strategyName || "Container";
    box.appendChild(label);
    parent.appendChild(box);
  }
  /**
   * Render error banner
   */
  renderErrorBanner(parent) {
    const banner = document.createElement("div");
    banner.className = "error-banner";
    banner.textContent = `⚠️ ${this.state.lastError}`;
    banner.addEventListener("click", () => {
      console.log("[Overlay] Error details:", this.state.lastError);
    });
    parent.appendChild(banner);
  }
  /**
   * Update overlay state
   */
  updateState(update) {
    this.state = { ...this.state, ...update };
    if (this.state.visible) {
      this.render();
    }
  }
  /**
   * Update container info
   */
  updateContainer(element, selector, strategy) {
    let rect = null;
    let isScrollable = false;
    let isInMiddleColumn = false;
    let isInLeftColumn = false;
    if (element) {
      rect = element.getBoundingClientRect();
      isScrollable = element.scrollHeight > element.clientHeight + 5;
      isInMiddleColumn = element.id === "MiddleColumn" || element.closest("#MiddleColumn") !== null;
      isInLeftColumn = element.id === "LeftColumn" || element.closest("#LeftColumn") !== null;
    }
    this.updateState({
      containerElement: element,
      containerSelector: selector,
      containerRect: rect,
      isScrollable,
      isInMiddleColumn,
      isInLeftColumn,
      strategyName: strategy?.name || null,
      strategyVersion: strategy?.version || null
    });
  }
  /**
   * Update message count
   */
  updateMessageCount(count) {
    this.updateState({ messageCount: count });
  }
  /**
   * Update observer count
   */
  updateObserverCount(count) {
    this.updateState({ observerCount: count });
  }
  /**
   * Update circuit breaker state
   */
  updateCircuitBreaker(state) {
    this.updateState({ circuitBreakerState: state });
  }
  /**
   * Set error
   */
  setError(error) {
    this.updateState({ lastError: error });
  }
  /**
   * Show hotkey hint (auto-hide after 3s)
   */
  showHotkeyHint() {
    if (!this.shadowRoot) return;
    const hint = document.createElement("div");
    hint.className = "hotkey-hint";
    hint.textContent = "Press Ctrl+Alt+M to toggle overlay";
    const wrapper = this.shadowRoot.querySelector(".overlay-wrapper");
    if (wrapper) {
      wrapper.appendChild(hint);
      setTimeout(() => hint.remove(), 3e3);
    }
  }
  /**
   * Get current state
   */
  getState() {
    return { ...this.state };
  }
}
const telegramOverlay = new TelegramOverlay();
const baseProfile = (opts) => {
  const defaultSelectors = {
    messageInput: [],
    sendButton: [],
    attachButton: [],
    fileInput: [],
    chatList: [],
    chatItem: [],
    chatActive: [],
    emojiButton: [],
    messageContainer: [],
    messageNode: [],
    messageText: [],
    sender: [],
    timestamp: [],
    loginForm: []
  };
  return {
    ...opts,
    selectors: {
      ...defaultSelectors,
      ...opts.selectors
    }
  };
};
const TELEGRAM_DOM_PROFILES = [
  baseProfile({
    id: "tg-web-a",
    label: "Telegram Web A",
    version: "A",
    matchers: {
      urlIncludes: ["/a/", "web.telegram.org/a/"],
      domContains: [".MessageList", "#MiddleColumn"]
    },
    selectors: {
      messageInput: [
        '#MiddleColumn .Composer [contenteditable="true"]',
        '.composer-input [contenteditable="true"]',
        '[data-testid="composer"] [contenteditable="true"]',
        ".composer_rich_textarea"
      ],
      sendButton: [
        ".ComposerFooter .Button.send",
        'button[aria-label="Send"]',
        ".send-button"
      ],
      attachButton: [
        'button[aria-label="Attach"]',
        ".attach-button",
        ".ComposerButton.attach"
      ],
      fileInput: [
        'input[type="file"]',
        'input[accept*="image"]'
      ],
      chatList: [
        ".chat-list",
        ".scroll-container .chat-list",
        '[data-testid="chatlist"]',
        ".DialogList"
      ],
      chatItem: [
        ".chat-item",
        ".peer",
        "[data-peer-id]"
      ],
      chatActive: [
        ".chat-item.active",
        ".peer.active"
      ],
      emojiButton: [
        'button[aria-label="Emoji"]',
        ".emoji-button",
        ".ComposerButton.emoji"
      ],
      messageContainer: [
        ".MessageList",
        "#MiddleColumn .MessageList",
        "#MiddleColumn .messages-container"
      ],
      messageNode: [
        "[data-message-id]",
        ".Message",
        ".message-list-item",
        '[id^="message"]'
      ],
      messageText: [
        ".text-content",
        ".content-inner",
        ".message-content",
        '[data-testid="message-text"]'
      ],
      sender: [
        ".name",
        ".sender-name",
        "[data-peer-id]"
      ],
      timestamp: [
        "time[datetime]",
        ".message-time"
      ],
      loginForm: [
        ".login-form",
        '[data-testid="login-form"]'
      ]
    }
  }),
  baseProfile({
    id: "tg-web-k",
    label: "Telegram Web K",
    version: "K",
    matchers: {
      urlIncludes: ["/k/", "web.telegram.org/k/"],
      domContains: [".bubbles-inner", ".chat-container"]
    },
    selectors: {
      messageInput: [
        ".input-message-input",
        '[contenteditable="true"][aria-label="Message"]',
        ".composer_rich_textarea"
      ],
      sendButton: [
        ".btn-send",
        'button[aria-label="Send"]'
      ],
      attachButton: [
        ".btn-attach",
        'button[aria-label="Attach"]'
      ],
      fileInput: [
        'input[type="file"]',
        'input[accept*="image"]'
      ],
      chatList: [
        ".chatlist",
        ".scroll-container .chatlist",
        '[data-testid="chatlist"]'
      ],
      chatItem: [
        ".chatlist-chat",
        "[data-peer-id]"
      ],
      chatActive: [
        ".chatlist-chat.active",
        ".chatlist-chat.is-selected"
      ],
      emojiButton: [
        ".emoji-dropdown-toggle",
        'button[aria-label="Emoji"]'
      ],
      messageContainer: [
        ".bubbles-inner",
        ".chat-container",
        ".messages-container"
      ],
      messageNode: [
        ".bubble",
        ".message-bubble",
        ".message",
        "[data-message-id]"
      ],
      messageText: [
        ".bubble-content",
        ".message-text",
        '[class*="text"]'
      ],
      sender: [
        ".peer-title",
        ".name",
        ".sender-name"
      ],
      timestamp: [
        ".time",
        ".message-time"
      ],
      loginForm: [
        ".auth-form",
        ".login-form"
      ]
    }
  })
];
const getVersionFromLocation = (href) => {
  if (href.includes("/a/") || href.includes("web.telegram.org/a/")) return "A";
  if (href.includes("/k/") || href.includes("web.telegram.org/k/")) return "K";
  return null;
};
class DomProfileResolver {
  profile;
  constructor() {
    this.profile = this.detectProfile();
  }
  getProfile() {
    return this.profile;
  }
  updateProfile() {
    this.profile = this.detectProfile();
    return this.profile;
  }
  getSelectors(key) {
    return this.profile.selectors[key] || [];
  }
  querySelector(key, root = document) {
    for (const selector of this.getSelectors(key)) {
      const node = root.querySelector(selector);
      if (node) return node;
    }
    return null;
  }
  queryAll(key, root = document) {
    const results = [];
    for (const selector of this.getSelectors(key)) {
      root.querySelectorAll(selector).forEach((el) => results.push(el));
      if (results.length > 0) break;
    }
    return results;
  }
  detectProfile() {
    const href = window.location.href;
    const version = getVersionFromLocation(href);
    const candidates = TELEGRAM_DOM_PROFILES.filter((profile) => {
      if (version && profile.version !== version) return false;
      return true;
    });
    for (const profile of candidates) {
      if (this.matchesProfile(profile)) {
        return profile;
      }
    }
    return TELEGRAM_DOM_PROFILES[0];
  }
  matchesProfile(profile) {
    const href = window.location.href;
    const { urlIncludes, domContains } = profile.matchers;
    const urlMatched = !urlIncludes || urlIncludes.some((marker) => href.includes(marker));
    if (!urlMatched) return false;
    if (!domContains || domContains.length === 0) return true;
    return domContains.some((selector) => !!document.querySelector(selector));
  }
}
const domProfileResolver = new DomProfileResolver();
class ChatListMonitor {
  config = {
    enabled: true,
    autoOpen: true,
    returnToList: false,
    openDelay: 320,
    handleTimeout: 1e4,
    maxConcurrent: 1,
    cooldown: 2e3,
    mutationDebounce: 250,
    activationSettleDelay: 140
  };
  isMonitoring = false;
  observer = null;
  processedChats = /* @__PURE__ */ new Map();
  // chatId -> timestamp
  processingQueue = [];
  currentlyProcessing = 0;
  domProfile = domProfileResolver;
  /**
   * 启动聊天列表监控
   */
  start() {
    if (this.isMonitoring) {
      console.log("[ChatListMonitor] 已在运行中");
      return true;
    }
    if (!this.config.enabled) {
      console.log("[ChatListMonitor] 后台监控未启用");
      return false;
    }
    const leftColumn = document.querySelector("#LeftColumn");
    if (!leftColumn) {
      console.warn("[ChatListMonitor] LeftColumn 未找到，无法启动监控");
      return false;
    }
    this.setupMonitor(leftColumn);
    this.isMonitoring = true;
    console.log("[ChatListMonitor] ✅ 后台监控已启动");
    console.log("[ChatListMonitor] 配置:", this.config);
    return true;
  }
  /**
   * 停止监控
   */
  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.isMonitoring = false;
    console.log("[ChatListMonitor] 后台监控已停止");
  }
  /**
   * 更新配置
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };
    console.log("[ChatListMonitor] 配置已更新:", this.config);
    if (!this.config.enabled && this.isMonitoring) {
      this.stop();
    } else if (this.config.enabled && !this.isMonitoring) {
      this.start();
    }
  }
  async activateChatWindow(container) {
    try {
      try {
        window.focus();
      } catch (error) {
        console.debug("[ChatListMonitor] window.focus 调用失败:", error);
      }
      const messageContainer = document.querySelector("#MiddleColumn .MessageList, .messages-container, .bubbles-inner") || container;
      await this.waitFor(Math.max(80, this.config.activationSettleDelay));
      try {
        messageContainer.scrollTop = messageContainer.scrollHeight;
      } catch (error) {
        console.debug("[ChatListMonitor] 滚动消息容器失败:", error);
      }
      await this.waitFor(Math.max(60, Math.round(this.config.activationSettleDelay / 2)));
      const rect = messageContainer.getBoundingClientRect();
      const x = Math.max(8, Math.min(window.innerWidth - 8, rect.left + rect.width / 2));
      const y = Math.max(8, Math.min(window.innerHeight - 8, rect.bottom - Math.min(60, rect.height / 4)));
      const target = document.elementFromPoint(x, y) || messageContainer;
      const pointerEvents = [
        { type: "pointermove", bubbles: true },
        { type: "mousemove", bubbles: true },
        { type: "pointerdown", bubbles: true, cancelable: true, buttons: 1 },
        { type: "mousedown", bubbles: true, cancelable: true, buttons: 1 },
        { type: "pointerup", bubbles: true, cancelable: true, buttons: 1 },
        { type: "mouseup", bubbles: true, cancelable: true, buttons: 1 },
        { type: "click", bubbles: true, cancelable: true }
      ];
      for (const evt of pointerEvents) {
        try {
          const event = new MouseEvent(evt.type, { ...evt, clientX: x, clientY: y });
          target.dispatchEvent(event);
        } catch (error) {
          console.debug(`[ChatListMonitor] ${evt.type} 事件派发失败:`, error);
        }
      }
      await this.waitFor(Math.max(50, Math.round(this.config.activationSettleDelay / 2)));
      const composer = document.querySelector('#MiddleColumn .Composer [contenteditable="true"], [contenteditable="true"][aria-label="Message"]');
      if (composer) {
        try {
          composer.focus();
          composer.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
        } catch (error) {
          console.debug("[ChatListMonitor] 聚焦输入框失败:", error);
        }
        const composerRect = composer.getBoundingClientRect();
        const cx = Math.max(6, Math.min(window.innerWidth - 6, composerRect.left + composerRect.width - 12));
        const cy = Math.max(6, Math.min(window.innerHeight - 6, composerRect.top + composerRect.height / 2));
        const composerEvents = [
          { type: "pointerdown", bubbles: true, cancelable: true, buttons: 1 },
          { type: "mousedown", bubbles: true, cancelable: true, buttons: 1 },
          { type: "pointerup", bubbles: true, cancelable: true, buttons: 1 },
          { type: "mouseup", bubbles: true, cancelable: true, buttons: 1 },
          { type: "click", bubbles: true, cancelable: true }
        ];
        for (const evt of composerEvents) {
          try {
            const event = new MouseEvent(evt.type, { ...evt, clientX: cx, clientY: cy });
            composer.dispatchEvent(event);
          } catch (error) {
            console.debug(`[ChatListMonitor] composer ${evt.type} 事件派发失败:`, error);
          }
        }
        try {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(composer);
          range.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(range);
        } catch (error) {
          console.debug("[ChatListMonitor] 设置输入框光标失败:", error);
        }
        await this.waitFor(Math.max(100, this.config.activationSettleDelay));
      }
      console.log("[ChatListMonitor] ✅ 已激活消息区域，尝试触发已读");
    } catch (error) {
      console.warn("[ChatListMonitor] 激活聊天窗口失败:", error);
    }
  }
  /**
   * 设置监控器
   */
  setupMonitor(leftColumn) {
    let debounceTimer = null;
    this.observer = new MutationObserver((mutations) => {
      console.log(`[ChatListMonitor] 检测到 ${mutations.length} 个 DOM 变化`);
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      const debounceMs = this.config.mutationDebounce;
      debounceTimer = setTimeout(() => {
        this.checkUnreadChats();
      }, debounceMs);
    });
    this.observer.observe(leftColumn, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
      // 监听 class 变化（未读标记）
    });
  }
  /**
   * 检查未读聊天
   */
  checkUnreadChats() {
    console.log("[ChatListMonitor] 🔍 检查未读聊天...");
    const unreadChats = this.getUnreadChats();
    console.log(`[ChatListMonitor] 扫描结果: ${unreadChats.length} 个未读聊天`);
    if (unreadChats.length === 0) {
      return;
    }
    console.log(`[ChatListMonitor] 检测到 ${unreadChats.length} 个未读聊天`, unreadChats);
    unreadChats.forEach((chat) => {
      if (this.shouldProcess(chat)) {
        this.queueForProcessing(chat);
      } else {
        console.log(`[ChatListMonitor] 跳过聊天（冷却中或已在队列）: ${chat.chatTitle}`);
      }
    });
  }
  /**
   * 获取未读聊天列表
   */
  getUnreadChats() {
    const unreadChats = [];
    const chatItems = document.querySelectorAll('.ListItem.Chat, .ListItem[class*="chat-item"], .chat-item');
    console.log(`[ChatListMonitor] 找到 ${chatItems.length} 个聊天项`);
    chatItems.forEach((item, index) => {
      const element = item;
      if (index < 3) {
        console.log(`[ChatListMonitor] 检查聊天项 ${index + 1}:`, {
          className: element.className,
          dataPeerId: element.getAttribute("data-peer-id")
        });
      }
      const hasUnread = this.hasUnreadIndicator(element);
      if (!hasUnread) return;
      const chatInfo = this.extractChatInfo(element);
      if (chatInfo) {
        console.log(`[ChatListMonitor] 发现未读聊天: ${chatInfo.chatTitle} (未读: ${chatInfo.unreadCount})`);
        unreadChats.push(chatInfo);
      }
    });
    return unreadChats;
  }
  /**
   * 检查是否有未读标记
   */
  hasUnreadIndicator(element) {
    if (!element || !document.contains(element)) {
      console.debug("[ChatListMonitor] ℹ️ 未读元素不在当前 DOM 中，视为已读");
      return false;
    }
    const className = element.className.toLowerCase();
    if (className.includes("unread") || className.includes("has-unread") || className.includes("is-unread")) {
      console.log("[ChatListMonitor] 🔍 通过 className 检测到未读:", element.className);
      return true;
    }
    const badgeSelectors = [
      ".badge",
      ".unread-count",
      '[class*="badge" i]',
      '[class*="Badge" i]',
      '[class*="unread" i]',
      '[class*="Unread" i]',
      '[class*="count" i]',
      '[class*="Count" i]'
    ];
    for (const selector of badgeSelectors) {
      const badges = element.querySelectorAll(selector);
      for (const badge of badges) {
        const text = badge.textContent?.trim();
        if (text && text !== "" && text !== "0" && !isNaN(Number(text))) {
          console.log("[ChatListMonitor] 🔍 通过徽章检测到未读:", selector, "=", text);
          return true;
        }
        const children = badge.querySelectorAll("*");
        for (const child of children) {
          const childText = child.textContent?.trim();
          if (childText && childText !== "" && childText !== "0" && !isNaN(Number(childText))) {
            console.log("[ChatListMonitor] 🔍 通过徽章子元素检测到未读:", selector, ">", child.className, "=", childText);
            return true;
          }
        }
      }
    }
    const titleSelectors = [
      ".title",
      ".chat-title",
      ".name",
      ".peer-title",
      '[class*="title" i]',
      '[class*="Title" i]'
    ];
    for (const selector of titleSelectors) {
      const titleEl = element.querySelector(selector);
      if (titleEl) {
        const style = window.getComputedStyle(titleEl);
        const fontWeight = parseInt(style.fontWeight) || (style.fontWeight === "bold" ? 700 : 400);
        if (fontWeight >= 600) {
          console.log("[ChatListMonitor] 🔍 通过加粗文本检测到未读:", selector, "fontWeight=", fontWeight);
          return true;
        }
      }
    }
    console.log("[ChatListMonitor] 未发现未读标记:", {
      className: element.className,
      peerId: element.getAttribute("data-peer-id")
    });
    return false;
  }
  /**
   * 提取聊天信息
   */
  extractChatInfo(element) {
    try {
      const anchor = element.querySelector('a.ListItem-button, a[href^="#"], button.ListItem-button, button[href^="#"], [role="link"][href^="#"], [role="link"][data-peer-id]');
      const candidates = [anchor, element, element.querySelector("[data-peer-id]"), element.querySelector("[data-chat-id]")];
      let resolvedId = "";
      for (const candidate of candidates) {
        const value = this.extractPeerIdFromElement(candidate);
        if (value) {
          resolvedId = this.normalizeChatId(value);
          break;
        }
      }
      if (!resolvedId && anchor?.getAttribute("href")) {
        const href = anchor.getAttribute("href") || "";
        const match = href.match(/#(-?[\w\d]+)/);
        if (match?.[1]) {
          resolvedId = this.normalizeChatId(match[1]);
        } else if (href.startsWith("#")) {
          resolvedId = this.normalizeChatId(href.substring(1));
        }
      }
      const titleEl = element.querySelector(".title, .chat-title, .name, .peer-title");
      const chatTitle = titleEl?.textContent?.trim() || "Unknown";
      const badgeEl = element.querySelector('.badge, .unread-count, [class*="badge"], [class*="count"]');
      let unreadCount = 1;
      if (badgeEl) {
        const direct = parseInt(badgeEl.textContent?.trim() || "", 10);
        if (!Number.isNaN(direct) && direct > 0) {
          unreadCount = direct;
        } else {
          const badgeChild = badgeEl.querySelector('[class*="badge"], span, div');
          const childNum = parseInt(badgeChild?.textContent?.trim() || "", 10);
          if (!Number.isNaN(childNum) && childNum > 0) {
            unreadCount = childNum;
          }
        }
      }
      const messageEl = element.querySelector('.message, .last-message, [class*="message-text"]');
      const lastMessageText = messageEl?.textContent?.trim() || "";
      return {
        element,
        anchor,
        chatId: this.normalizeChatId(resolvedId),
        chatTitle,
        unreadCount,
        lastMessageText,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error("[ChatListMonitor] 提取聊天信息失败:", error);
      return null;
    }
  }
  /**
   * 判断是否应该处理
   */
  shouldProcess(chat) {
    const key = this.getChatKey(chat);
    const lastProcessed = this.processedChats.get(key);
    if (lastProcessed) {
      const elapsed = Date.now() - lastProcessed;
      if (elapsed < this.config.cooldown) {
        return false;
      }
    }
    if (this.processingQueue.some((item) => this.getChatKey(item) === key)) {
      return false;
    }
    return true;
  }
  /**
   * 加入处理队列
   */
  queueForProcessing(chat) {
    this.processingQueue.push(chat);
    console.log(`[ChatListMonitor] 加入处理队列: ${chat.chatTitle} (未读: ${chat.unreadCount})`);
    this.processQueue();
  }
  /**
   * 处理队列
   */
  async processQueue() {
    if (this.currentlyProcessing >= this.config.maxConcurrent) {
      return;
    }
    const chat = this.processingQueue.shift();
    if (!chat) {
      return;
    }
    this.currentlyProcessing++;
    try {
      await this.processChat(chat);
    } catch (error) {
      console.error(`[ChatListMonitor] 处理聊天失败: ${chat.chatId}`, error);
    } finally {
      this.currentlyProcessing--;
      this.processedChats.set(this.getChatKey(chat), Date.now());
      if (this.processingQueue.length > 0) {
        this.processQueue();
      }
    }
  }
  /**
   * 处理单个聊天
   */
  async processChat(chat) {
    const startTs = this.getNow();
    const markTiming = (stage) => {
      const delta = Math.round(this.getNow() - startTs);
      console.log(`[ChatListMonitor] ⏱️ ${stage}: +${delta}ms`);
    };
    console.log(`[ChatListMonitor] 🔄 开始处理聊天: ${chat.chatId}`);
    markTiming("进入处理流程");
    if (!this.config.autoOpen) {
      console.log("[ChatListMonitor] 自动打开已禁用，跳过处理");
      return;
    }
    this.ensureChatIdentifiers(chat, "点击前");
    const chatElement = this.findChatElement(chat);
    if (!chatElement) {
      console.warn(`[ChatListMonitor] 聊天元素未找到: ${chat.chatId}`);
      return;
    }
    console.log(`[ChatListMonitor] 点击打开对话: ${chat.chatId || chat.chatTitle}`);
    markTiming("定位聊天元素");
    if (chatElement instanceof HTMLElement && typeof chatElement.scrollIntoView === "function") {
      chatElement.scrollIntoView({ block: "center", behavior: "instant" });
    }
    const events = [
      { type: "pointerdown", bubbles: true, cancelable: true },
      { type: "mousedown", bubbles: true, cancelable: true },
      { type: "pointerup", bubbles: true, cancelable: true },
      { type: "mouseup", bubbles: true, cancelable: true },
      { type: "click", bubbles: true, cancelable: true }
    ];
    for (const evt of events) {
      const mouseEvent = new MouseEvent(evt.type, evt);
      chatElement.dispatchEvent(mouseEvent);
    }
    await this.waitFor(this.config.openDelay);
    markTiming("等待对话加载完成");
    this.ensureChatIdentifiers(chat, "加载等待后");
    const container = await this.waitForContainer(this.config.handleTimeout);
    if (!container) {
      console.warn(`[ChatListMonitor] 对话容器未出现: ${chat.chatId || chat.chatTitle}`);
      return;
    }
    console.log(`[ChatListMonitor] ✅ 对话已打开: ${chat.chatId || chat.chatTitle}`);
    markTiming("容器就绪");
    this.ensureChatIdentifiers(chat, "容器就绪后");
    await this.activateChatWindow(container);
    markTiming("激活消息区域完成");
    await this.waitFor(this.config.activationSettleDelay);
    const refreshedElement = this.refreshChatElement(chat);
    const badgeStillVisible = refreshedElement ? this.hasUnreadIndicator(refreshedElement) : false;
    if (badgeStillVisible) {
      console.log("[ChatListMonitor] ⚠️ 激活后徽章仍存在，尝试调用兜底 markAsRead");
      try {
        this.ensureChatIdentifiers(chat, "徽章仍存在");
        if (!chat.chatId) {
          console.warn("[ChatListMonitor] ⚠️ 兜底标记失败：chatId 为空，尝试重新解析活动聊天 ID");
          const resolved = this.resolveActiveChatId();
          if (resolved) {
            console.log(`[ChatListMonitor] 🔁 resolveActiveChatId 命中: ${resolved}`);
            chat.chatId = resolved;
          }
        }
        if (!chat.chatId) {
          console.warn("[ChatListMonitor] ⚠️ 兜底标记失败：仍无法获取 chatId，跳过 markAsRead");
          return;
        }
        if (window.telegramAutoReply?.markAsRead) {
          const markStart = this.getNow();
          const result = await window.telegramAutoReply.markAsRead({ chatId: chat.chatId });
          const markDelta = Math.round(this.getNow() - markStart);
          console.log(`[ChatListMonitor] markAsRead 兜底结果 (${markDelta}ms):`, result);
          if (!result?.success) {
            console.warn("[ChatListMonitor] markAsRead 兜底失败，标记 success=false");
          }
        }
      } catch (error) {
        console.error("[ChatListMonitor] markAsRead 兜底执行异常:", error);
      }
    } else {
      markTiming("徽章自动消失");
    }
    if (this.config.returnToList) {
      await this.waitFor(1e3);
      this.backToList();
    }
    markTiming("处理完成");
  }
  /**
   * 查找聊天元素
   */
  findChatElement(chat) {
    if (chat.anchor && document.contains(chat.anchor)) {
      return chat.anchor;
    }
    if (document.contains(chat.element)) {
      return chat.element.querySelector("a.ListItem-button") || chat.element;
    }
    if (chat.chatId && !chat.chatId.startsWith("chat-")) {
      const selector = `a.ListItem-button[href="#${chat.chatId}"]`;
      const byHref = document.querySelector(selector);
      if (byHref) {
        return byHref;
      }
      const selectorData = `[data-peer-id="${chat.chatId}"] , [data-chat-id="${chat.chatId}"]`;
      const byData = document.querySelector(selectorData);
      if (byData) {
        return byData;
      }
    }
    if (chat.chatTitle) {
      const items = document.querySelectorAll('.ListItem.Chat, .ListItem[class*="chat-item"], .chat-item');
      for (const item of Array.from(items)) {
        const el = item;
        const titleEl = el.querySelector('.title, [class*="title" i]');
        const titleText = titleEl?.textContent?.trim();
        if (titleText && titleText === chat.chatTitle) {
          return el.querySelector("a.ListItem-button") || el;
        }
      }
    }
    return null;
  }
  /**
   * 等待容器出现
   */
  async waitForContainer(timeout) {
    const startTs = this.getNow();
    let attempt = 0;
    const pollInterval = Math.max(60, Math.min(140, this.config.activationSettleDelay));
    while (this.getNow() - startTs < timeout) {
      attempt++;
      const container = this.findMessageContainerCandidate();
      if (container) {
        const delta = Math.round(this.getNow() - startTs);
        console.log(`[ChatListMonitor] ⏱️ 容器出现: +${delta}ms (轮询 ${attempt} 次, 间隔 ${pollInterval}ms)`);
        return container;
      }
      await this.waitFor(pollInterval);
    }
    console.warn(`[ChatListMonitor] ⏱️ 容器等待超时 (>${timeout}ms) after ${attempt} attempts`);
    return null;
  }
  /**
   * 返回聊天列表
   */
  backToList() {
    console.log("[ChatListMonitor] 返回聊天列表");
    const backButton = document.querySelector('[aria-label="Back"], .back-button, [class*="back"]');
    if (backButton) {
      backButton.click();
    } else {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    }
  }
  /**
   * 等待指定时间
   */
  waitFor(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  getNow() {
    return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
  }
  getChatKey(chat) {
    const id = chat.chatId?.trim();
    return id ? id : `title:${chat.chatTitle}`;
  }
  normalizeChatId(raw) {
    if (!raw) return "";
    const trimmed = raw.trim();
    if (!trimmed) return "";
    return trimmed.startsWith("#") ? trimmed.substring(1) : trimmed;
  }
  extractPeerIdFromElement(element) {
    if (!element) return null;
    const attributeCandidates = [
      "data-peer-id",
      "data-peer-id-original",
      "data-peer-id-hash",
      "data-peer",
      "data-chat-id",
      "data-dialog-id",
      "data-list-id",
      "data-list-item-peer-id",
      "data-id"
    ];
    for (const attr of attributeCandidates) {
      const value = element.getAttribute(attr);
      if (value && value !== "null" && value !== "undefined") {
        return value;
      }
    }
    if (element instanceof HTMLElement) {
      const datasetKeys = ["peerId", "peerIdOriginal", "peer", "chatId"];
      for (const key of datasetKeys) {
        const value = element.dataset[key];
        if (value) {
          return value;
        }
      }
    }
    return null;
  }
  extractTitleFromElement(element) {
    if (!element) return null;
    const titleEl = element.querySelector('.title, .chat-title, .name, .peer-title, [data-testid="chatlist-item-name"], [data-testid="chat-list-item-name"]');
    return titleEl?.textContent?.trim() || element.getAttribute("aria-label")?.trim() || null;
  }
  findSelectedChatListItem() {
    const selectors = [
      ".ListItem.Chat.selected",
      ".ListItem.Chat.is-selected",
      ".ListItem.Chat.active",
      '.ListItem.Chat[aria-selected="true"]',
      '[data-testid="chat-list-item"].selected',
      '[data-testid="chatlist-item"].selected'
    ];
    for (const selector of selectors) {
      const found = document.querySelector(selector);
      if (found instanceof HTMLElement) {
        return found;
      }
    }
    return null;
  }
  resolveActiveChatId() {
    const selected = this.findSelectedChatListItem();
    const fromSelected = this.extractPeerIdFromElement(selected) || this.extractPeerIdFromElement(selected?.querySelector("[data-peer-id]"));
    if (fromSelected) {
      return this.normalizeChatId(fromSelected);
    }
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      return this.normalizeChatId(hash.substring(1));
    }
    return null;
  }
  refreshChatElement(chat) {
    if (chat.element && document.contains(chat.element)) {
      return chat.element;
    }
    const candidates = [];
    if (chat.chatId) {
      const idSelectors = [
        `[data-peer-id="${chat.chatId}"]`,
        `[data-chat-id="${chat.chatId}"]`,
        `[data-peer-id-original="${chat.chatId}"]`
      ];
      idSelectors.forEach((selector) => {
        const found = document.querySelector(selector);
        if (found instanceof HTMLElement) {
          candidates.push(found);
        }
      });
    }
    const selected = this.findSelectedChatListItem();
    if (selected) {
      candidates.push(selected);
    }
    for (const candidate of candidates) {
      if (candidate && document.contains(candidate)) {
        chat.element = candidate;
        return candidate;
      }
    }
    return chat.element && document.contains(chat.element) ? chat.element : null;
  }
  ensureChatIdentifiers(chat, stage) {
    const refreshedElement = this.refreshChatElement(chat);
    if (refreshedElement) {
      const newTitle = this.extractTitleFromElement(refreshedElement);
      if (newTitle && newTitle !== chat.chatTitle) {
        console.log(`[ChatListMonitor] 🔁 ${stage} 更新 chatTitle: ${newTitle}`);
        chat.chatTitle = newTitle;
      }
    }
    const resolvedId = this.resolveActiveChatId();
    if (resolvedId && resolvedId !== chat.chatId) {
      console.log(`[ChatListMonitor] 🔁 ${stage} 更新 chatId: ${resolvedId}`);
      chat.chatId = resolvedId;
    } else if (!chat.chatId) {
      const fallback = chat.anchor && this.extractPeerIdFromElement(chat.anchor);
      if (fallback) {
        const normalized = this.normalizeChatId(fallback);
        console.log(`[ChatListMonitor] 🔁 ${stage} 使用 anchor 兜底 chatId: ${normalized}`);
        chat.chatId = normalized;
      }
    }
  }
  findMessageContainerCandidate() {
    const profileSelectors = this.domProfile.getSelectors("messageContainer");
    const scopedSelectors = profileSelectors.filter((selector) => selector && !selector.startsWith("#MiddleColumn")).map((selector) => `#MiddleColumn ${selector}`);
    const fallbackSelectors = [
      "#MiddleColumn .MessageList",
      "#MiddleColumn .messages-container",
      '#MiddleColumn [data-testid="message-list"]',
      '#MiddleColumn [data-testid="messageList"]',
      '#MiddleColumn [role="list"][data-list-id="message-list"]',
      '#MiddleColumn [data-testid="chat-history"]',
      '#MiddleColumn [data-testid="chatHistory"]',
      '#MiddleColumn [aria-label*="History"]',
      ".MiddleColumn .MessageList",
      ".message-list",
      ".MessageList",
      ".messages-container",
      ".messages-inner",
      ".bubbles-inner",
      ".chat-history",
      ".history-wrapper",
      '[data-testid="history"]',
      '[class*="chat-history"]',
      '[class*="history"]',
      '[class*="MessageHistory"]',
      'section[class*="history"]',
      'section[data-testid*="History"]',
      'div[data-testid*="History"]',
      '[class*="messages-viewport"]',
      '[class*="MessagesViewport"]'
    ];
    const selectors = Array.from(/* @__PURE__ */ new Set([
      ...profileSelectors,
      ...scopedSelectors,
      ...fallbackSelectors
    ]));
    for (const selector of selectors) {
      const found = document.querySelector(selector);
      if (found instanceof HTMLElement) {
        return found;
      }
    }
    return null;
  }
  /**
   * 手动触发检查（调试用）
   */
  checkNow() {
    console.log("[ChatListMonitor] 手动触发检查...");
    this.checkUnreadChats();
  }
  /**
   * 获取状态
   */
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      config: this.config,
      queueLength: this.processingQueue.length,
      currentlyProcessing: this.currentlyProcessing,
      processedCount: this.processedChats.size
    };
  }
}
const chatListMonitor = new ChatListMonitor();
class DomSampler {
  MAX_TOP_CONTAINERS = 5;
  MAX_SELECTOR_RESULTS = 20;
  CANDIDATE_SCORE_THRESHOLD = 40;
  selectorCandidates = [
    "#MiddleColumn .MessageList",
    ".MessageList",
    '[class*="MessageList"]',
    ".messages-container",
    ".bubbles-inner",
    '[role="list"]',
    "#column-center .scrollable",
    ".chatlist",
    '.chat-container [role="list"]',
    ".im-page-chat-container"
  ];
  initialized = false;
  init() {
    if (this.initialized) return;
    this.initialized = true;
    electron.ipcRenderer.on(IPC_CHANNELS.DOM_SNAPSHOT_CAPTURE, (_event, req) => {
      this.capture({ ...req ?? {}, emit: true }).catch((error) => {
        console.error("[DomSampler] 捕获 DOM 快照失败:", error);
      });
    });
  }
  async capture(request = {}) {
    const startedAt = performance.now();
    const accountId = this.resolveAccountId();
    const payload = {
      accountId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      url: window.location.href,
      version: this.detectVersion(),
      hash: window.location.hash || null,
      documentReadyState: document.readyState,
      containerCount: 0,
      topCandidates: [],
      selectorMatches: [],
      metrics: {
        elementCount: this.countElementsSafely(),
        textNodeCount: this.countTextNodesSafely(),
        totalScrollHeight: document.scrollingElement?.scrollHeight || document.body?.scrollHeight || 0
      },
      notes: [],
      reason: request.reason,
      requestId: request.requestId
    };
    const topContainers = this.collectTopContainers();
    payload.topCandidates = topContainers.slice(0, this.MAX_TOP_CONTAINERS);
    payload.containerCount = payload.topCandidates.length;
    payload.selectorMatches = this.selectorCandidates.map((selector) => ({
      selector,
      matchCount: this.evaluateSelector(selector)
    })).filter((match) => match.matchCount > 0).slice(0, this.MAX_SELECTOR_RESULTS);
    payload.notes = this.generateNotes(payload, startedAt);
    if (request.emit) {
      electron.ipcRenderer.send(IPC_CHANNELS.DOM_SNAPSHOT_RESULT, payload);
    }
    return payload;
  }
  resolveAccountId() {
    const direct = window.__tgAccountId;
    if (direct && typeof direct === "string") {
      return direct;
    }
    try {
      const fromStorage = window.localStorage.getItem("accountId") || window.sessionStorage.getItem("accountId");
      return fromStorage || null;
    } catch {
      return null;
    }
  }
  detectVersion() {
    try {
      const href = window.location.href;
      if (href.includes("/a/")) return "A";
      if (href.includes("/k/")) return "K";
      if (document.querySelector(".MessageList")) return "A";
      if (document.querySelector(".bubbles-inner")) return "K";
    } catch (error) {
      console.warn("[DomSampler] 版本探测失败:", error);
    }
    return null;
  }
  collectTopContainers() {
    const candidates = [];
    const allDivs = Array.from(document.querySelectorAll("div"));
    for (const div of allDivs) {
      const rect = this.safeGetBoundingRect(div);
      if (!rect) continue;
      if (rect.width < 280 || rect.height < 200) continue;
      if (rect.top < 0 && rect.bottom < 0) continue;
      const isScrollable = div.scrollHeight > div.clientHeight + 8;
      const hasManyChildren = div.children.length > 5;
      let score = 0;
      if (isScrollable) score += 30;
      if (rect.width > 400 && rect.height > 500) score += 20;
      if (hasManyChildren && div.children.length < 1200) score += 10;
      if (this.containsMessageLikeContent(div)) score += 25;
      const text = `${div.className} ${div.id}`.toLowerCase();
      if (text.includes("message") || text.includes("chat")) score += 10;
      if (text.includes("bubble") || text.includes("conversation")) score += 10;
      if (score >= this.CANDIDATE_SCORE_THRESHOLD) {
        candidates.push({
          selector: this.buildSelector(div),
          className: div.className || "(no-class)",
          id: div.id || "(no-id)",
          size: {
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },
          scrollHeight: div.scrollHeight,
          childCount: div.children.length,
          score
        });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  }
  containsMessageLikeContent(element) {
    const MAX_CHECKED_CHILDREN = 50;
    let checked = 0;
    for (const child of element.querySelectorAll("div")) {
      if (checked >= MAX_CHECKED_CHILDREN) break;
      checked += 1;
      const text = child.textContent?.trim() ?? "";
      if (text.length < 12 || text.length > 4e3) continue;
      const hasTimeOrMeta = child.querySelector("[data-timestamp], [data-peer-id], time, .time") !== null;
      if (hasTimeOrMeta || child.children.length > 2) {
        return true;
      }
    }
    return false;
  }
  evaluateSelector(selector) {
    try {
      return document.querySelectorAll(selector).length;
    } catch {
      return 0;
    }
  }
  countElementsSafely() {
    try {
      return document.querySelectorAll("*").length;
    } catch {
      return 0;
    }
  }
  countTextNodesSafely() {
    if (!document.body) return 0;
    try {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let count = 0;
      while (walker.nextNode()) {
        count += 1;
        if (count > 5e4) {
          return count;
        }
      }
      return count;
    } catch {
      return 0;
    }
  }
  buildSelector(element) {
    try {
      if (!element) return void 0;
      const parts = [];
      if (element.id) {
        parts.push(`#${element.id}`);
      }
      if (element.className) {
        const classPart = element.className.toString().split(/\s+/).filter(Boolean).slice(0, 3).map((name) => `.${CSS.escape(name)}`).join("");
        if (classPart) {
          parts.push(classPart);
        }
      }
      if (parts.length === 0) {
        parts.push(element.tagName.toLowerCase());
      }
      return parts.join("");
    } catch {
      return void 0;
    }
  }
  safeGetBoundingRect(element) {
    try {
      return element.getBoundingClientRect();
    } catch {
      return null;
    }
  }
  generateNotes(payload, startedAt) {
    const notes = [];
    const duration = Math.round(performance.now() - startedAt);
    notes.push(`采集耗时: ${duration}ms`);
    notes.push(`候选容器数量: ${payload.topCandidates.length}`);
    notes.push(`选择器命中: ${payload.selectorMatches.length}`);
    if (payload.topCandidates.length === 0) {
      notes.push("未找到符合条件的容器");
    } else {
      const top = payload.topCandidates[0];
      notes.push(`最高分容器: ${top.selector ?? top.className} (${top.score}分)`);
    }
    if (payload.documentReadyState !== "complete") {
      notes.push(`文档状态: ${payload.documentReadyState}`);
    }
    return notes;
  }
}
const domSampler = new DomSampler();
class TelegramMonitorV2 {
  isMonitoring = false;
  messageCache = /* @__PURE__ */ new Map();
  version = null;
  containerEl = null;
  config;
  elementIdMap = /* @__PURE__ */ new WeakMap();
  currentStrategy = null;
  domProfile = domProfileResolver;
  // 性能优化
  selectorCache = /* @__PURE__ */ new Map();
  lastSelectorUpdate = 0;
  SELECTOR_CACHE_TTL = 5e3;
  // 容错机制
  retryCount = 0;
  circuitBreaker = {
    failures: 0,
    lastFailTime: 0,
    state: "CLOSED"
  };
  // 智能选择器系统
  selectorSuccess = /* @__PURE__ */ new Map();
  adaptiveSelectors = [];
  // DOM 快照节流
  lastDomSnapshotAt = 0;
  SNAPSHOT_COOLDOWN_MS = 6e4;
  constructor() {
    this.config = this.getDefaultConfig();
    this.detectVersion();
    this.initializeIntelligence();
    domSampler.init();
  }
  getDefaultConfig() {
    return {
      performance: {
        throttleMs: 100,
        batchSize: 50,
        maxRetries: 3,
        gcInterval: 6e4
      },
      resilience: {
        maxNoContainerCount: 2,
        autoOpenCooldownMs: 15e3,
        containerCheckInterval: 1e3,
        fallbackStrategies: ["timeElements", "messageElements", "heuristics"]
      },
      intelligence: {
        adaptiveSelectors: true,
        patternLearning: true,
        versionDetection: "auto"
      }
    };
  }
  /**
   * 🚀 启动监控 - 主入口
   */
  async startMonitoring() {
    if (this.isMonitoring) {
      console.log("[MonitorV2] 监控已在运行中");
      return true;
    }
    console.log("[MonitorV2] 🚀 启动消息监控 V2，版本:", this.version);
    try {
      const result = await this.executeWithCircuitBreaker(async () => {
        const container = await this.findContainerWithStrategies();
        if (!container) {
          console.log("[MonitorV2] 未找到容器，启动临时全局观察以等待容器出现");
          await this.setupProvisionalObserver();
          return true;
        }
        await this.setupOptimizedObserver(container);
        await this.processExistingMessages();
        return true;
      });
      this.isMonitoring = result;
      if (result) {
        this.setupChatSwitchDetector();
      }
      if (result) {
        chatListMonitor.start();
      }
      return result;
    } catch (error) {
      console.error("[MonitorV2] 启动失败:", error);
      return false;
    }
  }
  /**
   * P1-2: 设置对话切换自动感知
   */
  setupChatSwitchDetector() {
    const middleColumn = document.querySelector("#MiddleColumn");
    if (!middleColumn) {
      console.log("[MonitorV2] MiddleColumn 未找到，跳过对话切换监听");
      return;
    }
    let debounceTimer = null;
    let lastChatId = this.getCurrentChatId();
    const observer = new MutationObserver(() => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(async () => {
        const currentChatId = this.getCurrentChatId();
        if (currentChatId !== lastChatId && currentChatId !== "unknown") {
          console.log(`[MonitorV2] 🔄 检测到对话切换: ${lastChatId} → ${currentChatId}`);
          lastChatId = currentChatId;
          try {
            const success = await this.refreshContainer();
            if (success) {
              console.log("[MonitorV2] ✅ 对话切换后容器自动刷新成功");
            } else {
              console.warn("[MonitorV2] ⚠️ 对话切换后容器自动刷新失败");
            }
          } catch (error) {
            console.error("[MonitorV2] ❌ 对话切换刷新错误:", error);
          }
        }
      }, 500);
    });
    observer.observe(middleColumn, {
      childList: true,
      subtree: true,
      attributes: false
    });
    console.log("[MonitorV2] ✅ 对话切换自动感知已启动");
  }
  /**
   * 🔍 使用多策略查找容器（增强版 - 集成 Traneasy 分层策略）
   */
  async findContainerWithStrategies() {
    console.log("[MonitorV2] 开始多策略容器查找（增强版）...");
    console.log("[MonitorV2] 🎯 Phase 1: 尝试分层选择器策略");
    const strategy = await strategySelector.selectBestStrategy();
    if (strategy) {
      let container = strategySelector.findContainerWithStrategy(strategy);
      if (container && this.isLeftColumnContainer(container)) {
        console.warn("[MonitorV2] ⚠️ Phase 1 命中 LeftColumn，延迟 250ms 重试...");
        this.captureDomSnapshot("monitor:phase1-left-column");
        await new Promise((resolve) => setTimeout(resolve, 250));
        container = strategySelector.findContainerWithStrategy(strategy);
      }
      if (container && !this.isLeftColumnContainer(container)) {
        console.log("[MonitorV2] ✅ 使用分层策略找到容器");
        this.updateSelectorSuccess(container);
        telegramOverlay.updateContainer(
          container,
          strategy.selectors.container[0],
          strategy
        );
        telegramOverlay.setError(null);
        await this.setupOptimizedObserver(container);
        await this.processExistingMessages();
        return container;
      }
      if (container) {
        console.warn("[MonitorV2] ⚠️ Phase 1 重试后仍命中 LeftColumn，忽略此结果");
        this.captureDomSnapshot("monitor:phase1-left-column-repeat");
      }
    }
    if (!this.containerEl) {
      this.captureDomSnapshot("monitor:phase1-no-container");
    }
    const profileContainer = this.domProfile.querySelector("messageContainer");
    if (profileContainer && !this.isLeftColumnContainer(profileContainer)) {
      console.log("[MonitorV2] ✅ 使用配置化选择器找到容器");
      this.updateSelectorSuccess(profileContainer);
      const profileSelectors = this.domProfile.getSelectors("messageContainer");
      const profileStrategy = strategy ?? {
        name: "Profile selector",
        version: this.version ?? "A",
        priority: 50,
        selectors: {
          container: profileSelectors.length > 0 ? profileSelectors : ["[profile:messageContainer]"],
          message: [],
          text: []
        }
      };
      telegramOverlay.updateContainer(
        profileContainer,
        profileStrategy.selectors.container[0],
        profileStrategy
      );
      telegramOverlay.setError(null);
      await this.setupOptimizedObserver(profileContainer);
      await this.processExistingMessages();
      return profileContainer;
    }
    console.log("[MonitorV2] ⚠️ Phase 2: 回退到原有多策略查找");
    telegramOverlay.setError("Phase 1 failed, using Phase 2 fallback");
    const fallbackStrategies = [
      () => this.findByAdaptiveSelectors(),
      () => this.findByMessageElements(),
      () => this.findByTimeElements(),
      () => this.findByHeuristics(),
      () => this.findByPatternRecognition()
    ];
    for (const [index, strategyFn] of fallbackStrategies.entries()) {
      try {
        console.log(`[MonitorV2] 尝试回退策略 ${index + 1}/${fallbackStrategies.length}`);
        const container = await strategyFn();
        if (container) {
          const isInLeftColumn = this.isLeftColumnContainer(container);
          if (isInLeftColumn) {
            console.warn("[MonitorV2] 回退策略命中 LeftColumn，继续尝试其他策略...");
            telegramOverlay.setError("Fallback matched LeftColumn, retrying...");
            this.captureDomSnapshot("monitor:fallback-left-column");
            continue;
          }
          console.log(`[MonitorV2] 回退策略 ${index + 1} 成功找到容器`);
          this.updateSelectorSuccess(container);
          const fallbackStrategy = {
            name: `Phase 2 Fallback #${index + 1}`,
            version: "generic",
            selectors: {
              container: ["[adaptive selector]"],
              message: ["[adaptive]"],
              text: ["[adaptive]"]
            },
            priority: 0
          };
          telegramOverlay.updateContainer(
            container,
            fallbackStrategy.selectors.container[0],
            fallbackStrategy
          );
          telegramOverlay.setError(null);
          await this.setupOptimizedObserver(container);
          await this.processExistingMessages();
          return container;
        }
        console.warn(`[MonitorV2] 回退策略 ${index + 1} 未找到容器`);
      } catch (error) {
        console.error(`[MonitorV2] 回退策略 ${index + 1} 失败:`, error);
      }
    }
    console.log("[MonitorV2] 所有策略均未找到容器");
    this.captureDomSnapshot("monitor:all-strategies-failed");
    return null;
  }
  isLeftColumnContainer(element) {
    if (!element) return false;
    if (element.id === "LeftColumn") return true;
    return element.closest("#LeftColumn") !== null;
  }
  getMessageSelectors() {
    return [
      // Telegram Web A 主要选择器（基于真实DOM结构）
      "[data-message-id]",
      // 最准确：54个消息
      ".Message",
      // 大写M：72个元素
      '[id^="message"]',
      // ID格式：message-25996
      ".message-list-item",
      // 总是和 .Message 一起出现
      // Telegram Web K 兼容选择器
      ".bubble",
      ".service-msg",
      // 兜底选择器（可能匹配过多，放最后）
      '[class*="Message"]'
    ];
  }
  captureDomSnapshot(reason) {
    const now = Date.now();
    if (now - this.lastDomSnapshotAt < this.SNAPSHOT_COOLDOWN_MS) {
      return;
    }
    this.lastDomSnapshotAt = now;
    domSampler.capture({ reason, emit: true }).catch((error) => console.error(`[MonitorV2] DOM 快照捕获失败 (${reason}):`, error));
  }
  /**
   * 🎯 自适应选择器查找
   */
  async findByAdaptiveSelectors() {
    const sortedSelectors = [...this.selectorSuccess.entries()].sort((a, b) => b[1] - a[1]).map(([selector]) => selector);
    const selectors = [
      ...sortedSelectors,
      // A 版本选择器（优先，基于真实DOM结构）
      ".MessageList",
      // Telegram Web A 主容器 ✅
      "#MiddleColumn .MessageList",
      // 更精确的定位
      '[class*="MessageList"]',
      // 类名包含 MessageList
      // A 版本备用
      '[role="list"]',
      '#MiddleColumn [role="list"]',
      '[data-testid="messages-list"]',
      // K 版本选择器
      ".bubbles-inner",
      ".messages-container",
      // 通用兜底选择器
      '.chat-container [role="list"]',
      "#column-center .scrollable",
      ".im-page-chat-container"
    ];
    for (const selector of selectors) {
      const cached = this.getCachedSelector(selector);
      if (cached) return cached;
      try {
        const element = document.querySelector(selector);
        if (element && this.isValidContainer(element)) {
          this.cacheSelector(selector, element);
          return element;
        }
      } catch (error) {
      }
    }
    return null;
  }
  /**
   * 🔍 基于消息元素反向查找
   */
  async findByMessageElements() {
    const messageSelectors = this.getMessageSelectors();
    for (const selector of messageSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        const parent = this.findCommonScrollableParent(Array.from(elements));
        if (parent) return parent;
      }
    }
    return null;
  }
  /**
   * 🕐 基于时间元素查找
   */
  async findByTimeElements() {
    const timeElements = document.querySelectorAll("time[datetime], .message-time, .time");
    if (timeElements.length === 0) return null;
    const containers = /* @__PURE__ */ new Map();
    timeElements.forEach((time) => {
      let parent = time.parentElement;
      let depth = 0;
      while (parent && depth < 10) {
        if (this.isScrollable(parent)) {
          containers.set(parent, (containers.get(parent) || 0) + 1);
        }
        parent = parent.parentElement;
        depth++;
      }
    });
    let bestContainer = null;
    let maxCount = 0;
    for (const [container, count] of containers) {
      if (count > maxCount) {
        maxCount = count;
        bestContainer = container;
      }
    }
    return bestContainer;
  }
  /**
   * 🧠 启发式查找
   */
  async findByHeuristics() {
    const allDivs = document.querySelectorAll("div");
    const candidates = [];
    allDivs.forEach((div) => {
      const score = this.calculateContainerScore(div);
      if (score > 50) {
        candidates.push({ element: div, score });
      }
    });
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.element || null;
  }
  /**
   * 🤖 模式识别查找
   */
  async findByPatternRecognition() {
    const patterns = [
      { parent: "#MiddleColumn", child: '[role="list"]' },
      { parent: "#column-center", child: ".messages-container" },
      { parent: ".chat-content", child: ".message-list" }
    ];
    for (const pattern of patterns) {
      const parent = document.querySelector(pattern.parent);
      if (parent) {
        const child = parent.querySelector(pattern.child);
        if (child) return child;
      }
    }
    return null;
  }
  /**
   * 🎯 设置优化的观察器
   */
  async setupOptimizedObserver(container) {
    if (this.containerEl && this.containerEl !== container) {
      console.log("[MonitorV2] 🔄 检测到容器切换，断开旧观察器");
      observerPool.disconnectAll();
      this.containerEl = null;
    }
    await observerPool.getObserver(
      container,
      (mutations) => this.handleMutations(mutations),
      {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
      }
    );
    this.containerEl = container;
    console.log("[MonitorV2] ✅ 观察器已设置，开始监听消息");
    setTimeout(() => {
      const metrics = observerPool.getMetrics();
      telegramOverlay.updateObserverCount(metrics.observerCount);
    }, 100);
  }
  async setupProvisionalObserver() {
    await observerPool.getObserver(
      document.body,
      (_mutations) => {
        if (this.containerEl) return;
        setTimeout(async () => {
          if (this.containerEl) return;
          try {
            const container = await this.findContainerWithStrategies();
            if (container) {
              console.log("[MonitorV2] 已检测到容器，切换到优化观察器");
              observerPool.disconnectAll();
              await this.setupOptimizedObserver(container);
              await this.processExistingMessages();
            }
          } catch (_e) {
          }
        }, 0);
      },
      {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
      }
    );
    console.log("[MonitorV2] ⏳ 临时观察器已启动");
  }
  /**
   * 处理DOM变化
   */
  handleMutations(mutations) {
    const messages = [];
    const processedElements = /* @__PURE__ */ new Set();
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node;
            const resolved = this.resolveMessageElement(el);
            if (resolved && !processedElements.has(resolved)) {
              processedElements.add(resolved);
              const direct = this.extractMessage(resolved);
              if (direct && !this.isDuplicate(direct)) {
                messages.push(direct);
              }
            }
            const selector = this.getMessageSelectors().join(",");
            const found = el.querySelectorAll(selector);
            if (found && found.length) {
              found.forEach((child) => {
                const resolvedChild = this.resolveMessageElement(child);
                if (resolvedChild && !processedElements.has(resolvedChild)) {
                  processedElements.add(resolvedChild);
                  const m = this.extractMessage(resolvedChild);
                  if (m && !this.isDuplicate(m)) {
                    messages.push(m);
                  }
                }
              });
            }
          }
        });
      } else if (mutation.type === "attributes" || mutation.type === "characterData") {
        const targetNode = mutation.type === "characterData" ? mutation.target.parentElement : mutation.target;
        if (targetNode) {
          const msgEl = this.findNearestMessageElement(targetNode);
          if (msgEl && !processedElements.has(msgEl)) {
            processedElements.add(msgEl);
            const m = this.extractMessage(msgEl);
            if (m && !this.isDuplicate(m)) {
              messages.push(m);
            }
          }
        }
      }
    }
    if (messages.length > 0) {
      this.sendMessagesBatch(messages);
    }
  }
  findNearestMessageElement(start) {
    let el = start;
    let depth = 0;
    while (el && depth < 10) {
      const resolved = this.resolveMessageElement(el);
      if (resolved) return resolved;
      el = el.parentElement;
      depth++;
    }
    return null;
  }
  resolveMessageElement(element, depth = 0) {
    if (!element || depth > 5) return null;
    const candidate = element.closest('[data-message-id], .Message, [id^="message"], .message-list-item');
    if (!candidate) return null;
    if (candidate.classList.contains("bottom-marker") || candidate.getAttribute("data-marker") === "bottom") {
      const fallback = candidate.previousElementSibling || candidate.nextElementSibling || candidate.parentElement;
      return this.resolveMessageElement(fallback, depth + 1);
    }
    if (candidate.tagName.toLowerCase() === "filter" || candidate.tagName.toLowerCase() === "svg") {
      const fallback = candidate.previousElementSibling || candidate.parentElement;
      return this.resolveMessageElement(fallback, depth + 1);
    }
    if (candidate.hasAttribute("data-message-id") && !candidate.classList.contains("Message")) {
      const wrapper = candidate.closest(".Message");
      if (wrapper) return wrapper;
    }
    return candidate;
  }
  /**
   * 批量发送消息
   */
  sendMessagesBatch(messages) {
    const chunks = this.chunkArray(messages, 10);
    const total = messages.length;
    if (total > 0) {
      console.log(`[MonitorV2] 📦 准备分批发送 ${total} 条消息（${chunks.length} 批）`);
    }
    let sentCount = 0;
    let failedCount = 0;
    chunks.forEach((chunk, index) => {
      setTimeout(() => {
        chunk.forEach((message) => {
          this.messageCache.set(message.id, message);
          try {
            this.sendMessageToMain(message);
            sentCount++;
          } catch (error) {
            console.error(`[MonitorV2] 🚨 发送消息失败：${error.message}`);
            failedCount++;
          }
        });
        console.log(`[MonitorV2] 📦 已发送第 ${index + 1}/${chunks.length} 批，共 ${chunk.length} 条，成功 ${sentCount} 条，失败 ${failedCount} 条`);
      }, index * 50);
    });
  }
  /**
   * 📨 发送消息到主进程
   */
  sendMessageToMain(message) {
    const payload = {
      messageId: message.id,
      chatId: message.chatId,
      senderName: message.senderName,
      messageText: message.text,
      text: message.text,
      messageType: "text",
      timestamp: message.timestamp,
      isIncoming: !message.isOutgoing,
      isGroupChat: false,
      groupName: message.chatTitle
    };
    console.log("[MonitorV2] 检测到新消息:", payload.messageText.substring(0, 50));
    telegramOverlay.updateMessageCount(this.messageCache.size);
    electron.ipcRenderer.send(IPC_CHANNELS.MESSAGE_RECEIVED, {
      accountId: this.getAccountId(),
      message: payload
    });
  }
  // === 辅助方法 ===
  detectVersion() {
    const profile = this.domProfile.updateProfile();
    this.version = profile.version;
    return this.version;
  }
  initializeIntelligence() {
    const learned = localStorage.getItem("telegram_monitor_selectors");
    if (learned) {
      try {
        const data = JSON.parse(learned);
        this.selectorSuccess = new Map(data.selectors);
        this.adaptiveSelectors = data.adaptive || [];
      } catch (error) {
        console.error("[MonitorV2] 加载学习数据失败:", error);
      }
    }
  }
  updateSelectorSuccess(container) {
    const selector = this.getContainerSelector(container);
    if (selector) {
      const count = this.selectorSuccess.get(selector) || 0;
      this.selectorSuccess.set(selector, count + 1);
      this.saveLearningData();
    }
  }
  saveLearningData() {
    const data = {
      selectors: Array.from(this.selectorSuccess.entries()),
      adaptive: this.adaptiveSelectors,
      timestamp: Date.now()
    };
    localStorage.setItem("telegram_monitor_selectors", JSON.stringify(data));
  }
  getContainerSelector(element) {
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(" ")[0]}`;
    return null;
  }
  isValidContainer(element) {
    const rect = element.getBoundingClientRect();
    const scrollable = this.isScrollable(element);
    if (rect.width > 200 && rect.height > 200 && scrollable) {
      return true;
    }
    if (element.closest('#LeftColumn, .LeftColumn, [class*="LeftColumn"]')) {
      return false;
    }
    const messageCount = element.querySelectorAll("[data-message-id], .Message, .message, .bubble").length;
    if (messageCount === 0) {
      return false;
    }
    const computed = window.getComputedStyle(element);
    const visuallyHidden = computed.display === "none" || computed.visibility === "hidden" || computed.opacity === "0";
    if (!visuallyHidden && (rect.height > 0 || rect.width > 0) && scrollable) {
      return true;
    }
    if (element.scrollHeight > 0 && scrollable) {
      return true;
    }
    if (element.scrollHeight > 400 && messageCount >= 1) {
      return true;
    }
    return false;
  }
  isScrollable(element) {
    return element.scrollHeight > element.clientHeight + 10;
  }
  getCachedSelector(selector) {
    const now = Date.now();
    if (now - this.lastSelectorUpdate > this.SELECTOR_CACHE_TTL) {
      this.selectorCache.clear();
      this.lastSelectorUpdate = now;
    }
    return this.selectorCache.get(selector) || null;
  }
  cacheSelector(selector, element) {
    this.selectorCache.set(selector, element);
  }
  findCommonScrollableParent(elements) {
    if (elements.length === 0) return null;
    let parent = elements[0].parentElement;
    while (parent) {
      if (this.isScrollable(parent) && elements.every((el) => parent.contains(el))) {
        return parent;
      }
      parent = parent.parentElement;
    }
    return null;
  }
  calculateContainerScore(element) {
    let score = 0;
    const rect = element.getBoundingClientRect();
    if (rect.width > 300 && rect.height > 400) score += 30;
    if (this.isScrollable(element)) score += 30;
    const listItems = element.querySelectorAll('[role="listitem"]').length;
    score += Math.min(listItems * 5, 20);
    const timeElements = element.querySelectorAll("time").length;
    score += Math.min(timeElements * 2, 10);
    const className = element.className.toLowerCase();
    if (className.includes("message") || className.includes("chat")) score += 10;
    return score;
  }
  extractMessage(element) {
    try {
      if (element.classList.contains("date-divider") || element.classList.contains("DateSeparator") || element.tagName === "TIME" || element.getAttribute("role") === "separator") {
        return null;
      }
      const className = element.className || "";
      if (className.includes("name") && !element.closest(".Message, .message, .bubble")) {
        return null;
      }
      if ((className.includes("time") || className.includes("timestamp")) && !element.closest(".Message, .message, .bubble")) {
        return null;
      }
      const isMessageElement = element.classList.contains("Message") || element.classList.contains("message") || element.classList.contains("bubble") || element.hasAttribute("data-message-id") || element.getAttribute("role") === "listitem" && element.querySelector(".Message, .message, .bubble");
      if (!isMessageElement) {
        return null;
      }
      const textSelectors = [
        ".text-content",
        // ✅ Telegram Web A 主要文本容器
        ".content-inner",
        // ✅ 内容容器
        ".message-text",
        ".Message-text",
        '[data-testid="message-text"]',
        '[dir="auto"]',
        // ✅ 文本方向属性
        ".text:not(.time):not(.timestamp)"
      ];
      let text = "";
      for (const selector of textSelectors) {
        const el = element.querySelector(selector);
        if (el?.textContent?.trim()) {
          text = el.textContent.trim();
          break;
        }
      }
      if (!text) return null;
      const lower = text.toLowerCase();
      if (lower === "is typing" || lower.includes("正在输入")) return null;
      if (/^\d{1,2}:\d{2}$/.test(text) || // 时间格式 14:51
      /^\d{1,2}月\d{1,2}日$/.test(text) || // 日期格式
      text === "Yesterday" || text === "Today" || text.length < 2) {
        return null;
      }
      let id = element.getAttribute("data-message-id") || "";
      if (!id) {
        const mapped = this.elementIdMap.get(element);
        if (mapped) {
          id = mapped;
        } else {
          id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          this.elementIdMap.set(element, id);
        }
      }
      return {
        id,
        chatId: this.getCurrentChatId(),
        chatTitle: this.getCurrentChatTitle(),
        senderId: "unknown",
        senderName: element.querySelector(".name")?.textContent || "Unknown",
        text,
        timestamp: Date.now(),
        isOutgoing: element.classList.contains("own") || element.classList.contains("is-out"),
        hasMedia: !!element.querySelector("img, video, audio")
      };
    } catch (error) {
      return null;
    }
  }
  isDuplicate(message) {
    return this.messageCache.has(message.id);
  }
  async processExistingMessages() {
    if (!this.containerEl) return;
    const candidates = Array.from(
      this.containerEl.querySelectorAll('[data-message-id], .Message, [id^="message"]')
    ).map((node) => this.resolveMessageElement(node)).filter((el) => !!el);
    if (candidates.length === 0) {
      console.debug("[MonitorV2] ⚠️ 未在容器中找到消息元素候选");
      return;
    }
    const seenIds = /* @__PURE__ */ new Set();
    const seenElements = /* @__PURE__ */ new Set();
    const uniqueMessages = [];
    for (const el of candidates) {
      const id = el.getAttribute("data-message-id") || el.id;
      if (id) {
        if (seenIds.has(id)) continue;
        seenIds.add(id);
      } else {
        if (seenElements.has(el)) continue;
        seenElements.add(el);
      }
      uniqueMessages.push(el);
    }
    const recent = uniqueMessages.slice(-20);
    const extracted = [];
    for (const element of recent) {
      const message = this.extractMessage(element);
      if (message && !this.isDuplicate(message)) {
        extracted.push(message);
      }
    }
    if (extracted.length > 0) {
      console.log(`[MonitorV2] 📤 发送 ${extracted.length} 条现有消息到主进程`);
      this.sendMessagesBatch(extracted);
    } else {
      console.debug("[MonitorV2] ⚠️ 现有消息解析结果为空，候选数量:", recent.length);
    }
  }
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  getCurrentChatId() {
    const urlMatch = window.location.hash.match(/#([^/]+)$/);
    return urlMatch ? urlMatch[1] : "unknown";
  }
  getCurrentChatTitle() {
    const titleElement = document.querySelector(".chat-info-name, .ChatInfo .fullName");
    return titleElement?.textContent?.trim() || "Unknown Chat";
  }
  getAccountId() {
    try {
      const ls = window.localStorage.getItem("accountId");
      const ss = window.sessionStorage?.getItem("accountId");
      const globalId = window.__tgAccountId;
      const globalStr = typeof globalId === "string" ? globalId : "";
      return ls || ss || globalStr || "default";
    } catch {
      return "default";
    }
  }
  /**
   * 🔌 断路器模式执行
   */
  async executeWithCircuitBreaker(fn, fallback) {
    const breaker = this.circuitBreaker;
    if (breaker.state === "OPEN") {
      const timeSinceLastFail = Date.now() - breaker.lastFailTime;
      if (timeSinceLastFail > 3e4) {
        breaker.state = "HALF_OPEN";
      } else {
        if (fallback) return fallback();
        throw new Error("断路器开启，服务暂时不可用");
      }
    }
    try {
      const result = await fn();
      if (breaker.state === "HALF_OPEN") {
        breaker.state = "CLOSED";
      }
      breaker.failures = 0;
      return result;
    } catch (error) {
      breaker.failures++;
      breaker.lastFailTime = Date.now();
      if (breaker.failures >= 3) {
        breaker.state = "OPEN";
        console.log("[MonitorV2] 断路器开启，服务降级");
      }
      if (fallback) return fallback();
      throw error;
    }
  }
  /**
   * 🛑 停止监控
   */
  stopMonitoring() {
    this.isMonitoring = false;
    observerPool.disconnectAll();
    this.messageCache.clear();
    this.selectorCache.clear();
    console.log("[MonitorV2] 监控已停止");
  }
  /**
   * 📊 获取监控状态
   */
  getStatus() {
    const metrics = observerPool.getMetrics();
    const observerCount = metrics.observerCount || 0;
    telegramOverlay.updateObserverCount(observerCount);
    telegramOverlay.updateCircuitBreaker(this.circuitBreaker.state);
    telegramOverlay.updateMessageCount(this.messageCache.size);
    return {
      isMonitoring: this.isMonitoring,
      version: this.version,
      messageCount: this.messageCache.size,
      circuitBreakerState: this.circuitBreaker.state,
      performance: metrics
    };
  }
  /**
   * P0-5: 刷新容器 - 手动触发重新查找和重绑观察器
   */
  async refreshContainer() {
    console.log("[MonitorV2] 🔄 手动刷新容器...");
    try {
      observerPool.disconnectAll();
      this.containerEl = null;
      const container = await this.findContainerWithStrategies();
      if (container) {
        const isLeftColumn = container.id === "LeftColumn" || container.closest("#LeftColumn") !== null;
        if (isLeftColumn) {
          console.warn("[MonitorV2] ⚠️ 容器刷新失败：找到的是 LeftColumn（聊天列表），请先打开对话");
          telegramOverlay.setError("Please open a chat first (currently in chat list)");
          return false;
        }
        await this.setupOptimizedObserver(container);
        await this.processExistingMessages();
        console.log("[MonitorV2] ✅ 容器刷新成功");
        return true;
      } else {
        console.warn("[MonitorV2] ⚠️ 容器刷新失败：未找到容器");
        telegramOverlay.setError("Container not found - please open a chat");
        return false;
      }
    } catch (error) {
      console.error("[MonitorV2] ❌ 容器刷新失败:", error);
      telegramOverlay.setError(`Refresh error: ${error}`);
      return false;
    }
  }
}
const telegramMonitorV2 = new TelegramMonitorV2();
class TelegramSender {
  version = null;
  isSending = false;
  sendQueue = [];
  queueTimer;
  isTestMode;
  profileResolver = domProfileResolver;
  /**
   * 标记为已读（公开接口）
   */
  async markRead(options) {
    return this.markReadInternal(options);
  }
  /**
   * 标记为已读（内部实现）
   */
  async markReadInternal(options) {
    try {
      const inCorrectChat = await this.ensureInChat(options.chatId);
      if (!inCorrectChat) {
        return {
          success: false,
          error: "Failed to open chat for mark as read"
        };
      }
      if (options.delay && options.delay > 0) {
        await this.humanDelay(options.delay);
      } else {
        await this.humanDelay(this.randomDelay(200, 600));
      }
      const container = this.querySelector("messageContainer") || document.querySelector(".bubbles-inner, .messages-container");
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
      return {
        success: true,
        messageId: void 0,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error("[TelegramSender] Error marking as read:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Mark as read failed"
      };
    }
  }
  constructor(isTestMode = process.env.NODE_ENV === "test" || process.env.VITEST === "true") {
    this.isTestMode = isTestMode;
    this.detectVersion();
    if (!this.isTestMode) {
      this.setupSendQueue();
    }
  }
  /**
   * 检测 Telegram Web 版本
   */
  detectVersion() {
    const profile = this.profileResolver.updateProfile();
    this.version = profile.version;
  }
  /**
   * 设置发送队列处理
   */
  setupSendQueue() {
    this.queueTimer = setInterval(() => {
      this.processQueue();
    }, 1e3);
  }
  /**
   * 处理队列中的任务
   */
  processQueue() {
    if (!this.isSending && this.sendQueue.length > 0) {
      const task = this.sendQueue.shift();
      if (task) {
        this.processSendTask(task);
      }
    }
  }
  /**
   * 手动处理队列（测试专用）
   */
  processQueueOnce() {
    if (this.isTestMode) {
      this.processQueue();
    }
  }
  /**
   * 销毁实例，清理资源
   */
  destroy() {
    if (this.queueTimer) {
      clearInterval(this.queueTimer);
      this.queueTimer = void 0;
    }
  }
  /**
   * 发送文本消息
   */
  async sendText(options) {
    if (!this.version) {
      this.detectVersion();
      if (!this.version) {
        return {
          success: false,
          error: "Telegram Web version not detected"
        };
      }
    }
    return new Promise((resolve) => {
      const task = { ...options, _resolve: resolve };
      this.sendQueue.push(task);
    });
  }
  /**
   * 发送图片消息
   */
  async sendImage(options) {
    if (!options.imagePath) {
      return {
        success: false,
        error: "Image path is required"
      };
    }
    return new Promise((resolve) => {
      const task = { ...options, _resolve: resolve };
      this.sendQueue.push(task);
    });
  }
  /**
   * 处理发送任务
   */
  async processSendTask(task) {
    this.isSending = true;
    const startTime = Date.now();
    try {
      const inCorrectChat = await this.ensureInChat(task.chatId);
      if (!inCorrectChat) {
        task._resolve({
          success: false,
          error: "Failed to open chat"
        });
        return;
      }
      if (task.delay) {
        await this.humanDelay(task.delay);
      } else {
        await this.humanDelay(this.randomDelay(500, 1500));
      }
      let result;
      if (task.imagePath) {
        result = await this.sendImageInternal(task);
      } else if (task.text) {
        result = await this.sendTextInternal(task);
      } else {
        result = {
          success: false,
          error: "No content to send"
        };
      }
      task._resolve(result);
      electron.ipcRenderer.send(IPC_CHANNELS.MESSAGE_SENT, {
        accountId: this.getAccountId(),
        result,
        duration: Date.now() - startTime
      });
    } catch (error) {
      console.error("[TelegramSender] Send error:", error);
      task._resolve({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      this.isSending = false;
    }
  }
  /**
   * 确保在正确的聊天中
   */
  async ensureInChat(chatId) {
    try {
      const currentChatId = this.getCurrentChatId();
      if (currentChatId === chatId) {
        return true;
      }
      const chatList = this.querySelector("chatList");
      if (!chatList) {
        console.error("[TelegramSender] Chat list not found");
        return false;
      }
      const chatItems = this.queryAll("chatItem", chatList);
      let targetChat = null;
      for (const item of chatItems) {
        if (item.getAttribute("data-peer-id") === chatId || item.textContent?.includes(chatId)) {
          targetChat = item;
          break;
        }
      }
      if (!targetChat) {
        console.error("[TelegramSender] Target chat not found:", chatId);
        return false;
      }
      this.simulateClick(targetChat);
      await this.waitForChat(chatId);
      return true;
    } catch (error) {
      console.error("[TelegramSender] Error ensuring chat:", error);
      return false;
    }
  }
  /**
   * 发送文本消息（内部实现）
   */
  async sendTextInternal(options) {
    try {
      const input = this.querySelector("messageInput");
      if (!input) {
        return {
          success: false,
          error: "Message input not found"
        };
      }
      input.focus();
      await this.humanDelay(100);
      this.clearInput(input);
      await this.humanDelay(100);
      await this.simulateTyping(input, options.text);
      const sendButton = this.querySelector("sendButton");
      if (!sendButton) {
        await this.simulateEnterKey(input);
      } else {
        await this.humanDelay(this.randomDelay(100, 300));
        this.simulateClick(sendButton);
      }
      await this.humanDelay(500);
      return {
        success: true,
        messageId: this.generateMessageId(),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error("[TelegramSender] Error sending text:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Send failed"
      };
    }
  }
  /**
   * 发送图片消息（内部实现）
   */
  async sendImageInternal(options) {
    try {
      const attachButton = this.querySelector("attachButton");
      if (!attachButton) {
        return {
          success: false,
          error: "Attach button not found"
        };
      }
      this.simulateClick(attachButton);
      await this.humanDelay(300);
      const fileInput = this.querySelector("fileInput");
      if (!fileInput) {
        return {
          success: false,
          error: "File input not found"
        };
      }
      const file = await this.createFileFromPath(options.imagePath);
      if (!file) {
        return {
          success: false,
          error: "Failed to load image file"
        };
      }
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
      const changeEvent = new Event("change", { bubbles: true });
      fileInput.dispatchEvent(changeEvent);
      await this.humanDelay(1e3);
      if (options.text) {
        const captionInput = document.querySelector(".caption-input");
        if (captionInput) {
          await this.simulateTyping(captionInput, options.text);
        }
      }
      const confirmButton = document.querySelector(".btn-primary, .confirm-button");
      if (confirmButton) {
        await this.humanDelay(300);
        this.simulateClick(confirmButton);
      }
      await this.humanDelay(1e3);
      return {
        success: true,
        messageId: this.generateMessageId(),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error("[TelegramSender] Error sending image:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Send failed"
      };
    }
  }
  /**
   * 模拟打字
   */
  async simulateTyping(element, text) {
    if ("value" in element) {
      element.value = "";
    } else {
      element.textContent = "";
    }
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const keydownEvent = new KeyboardEvent("keydown", {
        key: char,
        bubbles: true,
        cancelable: true
      });
      element.dispatchEvent(keydownEvent);
      if ("value" in element) {
        element.value += char;
      } else {
        element.textContent += char;
      }
      const inputEvent = new Event("input", { bubbles: true });
      element.dispatchEvent(inputEvent);
      await this.humanDelay(this.randomDelay(50, 150));
    }
  }
  /**
   * 模拟点击
   */
  simulateClick(element) {
    const mouseEvents = ["mousedown", "mouseup", "click"];
    mouseEvents.forEach((eventType) => {
      const event = new MouseEvent(eventType, {
        view: window,
        bubbles: true,
        cancelable: true,
        buttons: 1
      });
      element.dispatchEvent(event);
    });
  }
  /**
   * 模拟Enter键
   */
  simulateEnterKey(element) {
    const enterEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(enterEvent);
  }
  /**
   * 清空输入框
   */
  clearInput(element) {
    if ("value" in element) {
      element.value = "";
    } else {
      element.textContent = "";
    }
    const inputEvent = new Event("input", { bubbles: true });
    element.dispatchEvent(inputEvent);
  }
  /**
   * 人性化延迟
   */
  humanDelay(ms) {
    if (this.isTestMode) {
      return Promise.resolve();
    }
    const variance = ms * 0.2;
    const actualDelay = ms + (Math.random() - 0.5) * variance;
    return new Promise((resolve) => setTimeout(resolve, actualDelay));
  }
  /**
   * 随机延迟
   */
  randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  /**
   * 等待聊天加载
   */
  async waitForChat(chatId, timeout = 5e3) {
    if (this.isTestMode) {
      return;
    }
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const currentChatId = this.getCurrentChatId();
      if (currentChatId === chatId) {
        await this.humanDelay(500);
        return;
      }
      await this.humanDelay(100);
    }
    throw new Error("Timeout waiting for chat to load");
  }
  /**
   * 获取当前聊天ID
   */
  getCurrentChatId() {
    const urlMatch = window.location.hash.match(/#([^/]+)$/);
    return urlMatch ? urlMatch[1] : "";
  }
  /**
   * 获取账号ID
   */
  getAccountId() {
    return window.localStorage.getItem("accountId") || "default";
  }
  /**
   * 生成消息ID
   */
  generateMessageId() {
    return `sent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  querySelector(key, root = document) {
    return this.profileResolver.querySelector(key, root);
  }
  queryAll(key, root = document) {
    return this.profileResolver.queryAll(key, root);
  }
  /**
   * 从路径创建文件对象
   */
  async createFileFromPath(path) {
    try {
      const result = await electron.ipcRenderer.invoke(IPC_CHANNELS.READ_FILE, { path });
      if (!result.success || !result.data) {
        return null;
      }
      const { buffer, mimeType, fileName } = result.data;
      const blob = new Blob([buffer], { type: mimeType });
      return new File([blob], fileName, { type: mimeType });
    } catch (error) {
      console.error("[TelegramSender] Error creating file:", error);
      return null;
    }
  }
}
const telegramSender = process.env.NODE_ENV === "test" || process.env.VITEST === "true" ? null : new TelegramSender();
if (telegramSender) {
  electron.ipcRenderer.on(IPC_CHANNELS.SEND_TEXT, async (_event, payload) => {
    const data = payload;
    const taskId = data?.taskId;
    try {
      const result = await telegramSender.sendText({
        chatId: data.chatId,
        text: data.text,
        replyToMessageId: data.replyToMessageId,
        delay: data.delay
      });
      electron.ipcRenderer.send(IPC_CHANNELS.SEND_RESULT, {
        taskId,
        taskType: "text",
        result
      });
    } catch (error) {
      electron.ipcRenderer.send(IPC_CHANNELS.SEND_RESULT, {
        taskId,
        taskType: "text",
        result: { success: false, error: error instanceof Error ? error.message : "Unknown error" }
      });
    }
  });
  electron.ipcRenderer.on(IPC_CHANNELS.SEND_IMAGE, async (_event, payload) => {
    const data = payload;
    const taskId = data?.taskId;
    try {
      const result = await telegramSender.sendImage({
        chatId: data.chatId,
        imagePath: data.imagePath,
        text: data.text,
        replyToMessageId: data.replyToMessageId,
        delay: data.delay
      });
      electron.ipcRenderer.send(IPC_CHANNELS.SEND_RESULT, {
        taskId,
        taskType: "image",
        result
      });
    } catch (error) {
      electron.ipcRenderer.send(IPC_CHANNELS.SEND_RESULT, {
        taskId,
        taskType: "image",
        result: { success: false, error: error instanceof Error ? error.message : "Unknown error" }
      });
    }
  });
  electron.ipcRenderer.on(IPC_CHANNELS.MESSAGE_MARK_AS_READ, async (_event, payload) => {
    const data = payload;
    try {
      await telegramSender.markRead({
        chatId: data.chatId,
        delay: data.delay
      });
    } catch (error) {
      console.error("[TelegramSender] Mark as read failed:", error);
    }
  });
}
electron.contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    invoke: (channel, ...args) => electron.ipcRenderer.invoke(channel, ...args),
    on: (channel, callback) => {
      const subscription = (event, ...args) => callback(event, ...args);
      electron.ipcRenderer.on(channel, subscription);
      return () => electron.ipcRenderer.removeListener(channel, subscription);
    },
    off: (channel, listener) => {
      electron.ipcRenderer.removeListener(channel, listener);
    },
    removeListener: (channel, listener) => {
      electron.ipcRenderer.removeListener(channel, listener);
    },
    once: (channel, callback) => {
      electron.ipcRenderer.once(channel, (_event, ...args) => callback(...args));
    },
    send: (channel, ...args) => {
      electron.ipcRenderer.send(channel, ...args);
    }
  }
});
async function detectVersion() {
  try {
    const href = window.location.href;
    if (href.includes("/a/")) return "A";
    if (href.includes("/k/")) return "K";
    if (document.querySelector(".messages-container, .MessageList")) return "A";
    if (document.querySelector(".bubbles-inner")) return "K";
    return null;
  } catch (error) {
    console.error("[Preload] Version detection failed:", error);
    return null;
  }
}
async function isLoggedIn() {
  try {
    const loginForm = document.querySelector('.login-form, .auth-form, [data-testid="login-form"]');
    if (loginForm) return false;
    const hasMiddle = !!document.querySelector("#MiddleColumn, #column-center");
    const hasComposer = !!document.querySelector('#MiddleColumn .Composer [contenteditable="true"], [contenteditable="true"][aria-label="Message"]');
    const hasMessages = !!document.querySelector('#MiddleColumn .messages-container, [role="list"], .MessageList');
    const hasHeader = !!document.querySelector(".MiddleHeader .ChatInfo .fullName, .chat-info-name");
    const hasChatList = !!document.querySelector('.chat-list, .chatlist, .dialogs, [data-testid="chatlist"]');
    return hasComposer || hasMiddle && (hasMessages || hasHeader) || hasChatList;
  } catch (error) {
    console.error("[Preload] Login check failed:", error);
    return false;
  }
}
async function getUserInfo() {
  try {
    const version = await detectVersion();
    if (!version) return null;
    const userMenuButton = document.querySelector(".user-avatar, .profile-button");
    if (!userMenuButton) return null;
    return {
      id: "user-" + Date.now(),
      // 临时ID，实际需要从Telegram获取
      firstName: "Telegram",
      lastName: "User"
    };
  } catch (error) {
    console.error("[Preload] Get user info failed:", error);
    return null;
  }
}
const ENABLE_V2_MONITOR = process.env.ENABLE_V2_MONITOR !== "false";
electron.contextBridge.exposeInMainWorld("telegramAutoReply", {
  // 版本检测
  detectVersion,
  isLoggedIn,
  getUserInfo,
  // 消息监控 - V1 (当前版本)
  startMonitoring: () => {
    const success = telegramMonitor.startMonitoring();
    console.log("[Preload] Message monitoring started:", success);
    return success;
  },
  stopMonitoring: () => {
    telegramMonitor.stopMonitoring();
    console.log("[Preload] Message monitoring stopped");
  },
  isMonitoring: () => telegramMonitor.getStatus(),
  // 消息监控 - V2 (世界级架构优化版)
  startMonitoringV2: async () => {
    console.log("[Preload] Starting V2 monitoring (World-class architecture)...");
    const success = await telegramMonitorV2.startMonitoring();
    console.log("[Preload] V2 monitoring started:", success);
    return success;
  },
  stopMonitoringV2: () => {
    telegramMonitorV2.stopMonitoring();
    console.log("[Preload] V2 monitoring stopped");
  },
  getStatusV2: () => telegramMonitorV2.getStatus(),
  // Phase 1: 分层选择器策略 API
  getSuccessRates: () => strategySelector.getSuccessRates(),
  clearSuccessRates: () => strategySelector.clearSuccessRates(),
  // Phase 6: 可视化反馈系统 API
  toggleOverlay: () => telegramOverlay.toggle(),
  showOverlay: () => telegramOverlay.toggle(),
  // 别名，保持向后兼容
  getOverlayState: () => telegramOverlay.getState(),
  // P0-5: 容器刷新 API
  refreshContainer: async () => {
    if (ENABLE_V2_MONITOR) {
      return await telegramMonitorV2.refreshContainer();
    }
    return false;
  },
  // P2: 聊天列表后台监控 API
  chatListMonitor: {
    start: () => chatListMonitor.start(),
    stop: () => chatListMonitor.stop(),
    getStatus: () => chatListMonitor.getStatus(),
    updateConfig: (config) => chatListMonitor.updateConfig(config),
    checkNow: () => chatListMonitor.checkNow()
    // 手动触发检查
  },
  // 功能开关
  isV2Enabled: () => ENABLE_V2_MONITOR,
  // 消息发送
  sendText: async (options) => {
    return await telegramSender.sendText(options);
  },
  sendImage: async (options) => {
    return await telegramSender.sendImage(options);
  },
  // 消息操作
  markAsRead: async (options) => {
    try {
      const chatElement = document.querySelector(`[data-peer-id="${options.chatId}"]`);
      if (chatElement) {
        const event = new MouseEvent("click", { bubbles: true });
        chatElement.dispatchEvent(event);
        return { success: true };
      }
      return { success: false, error: "Chat not found" };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
  // 会话管理
  openChat: async (chatId) => {
    try {
      const chatElement = document.querySelector(`[data-peer-id="${chatId}"]`);
      if (chatElement) {
        const event = new MouseEvent("click", { bubbles: true });
        chatElement.dispatchEvent(event);
        return true;
      }
      return false;
    } catch (error) {
      console.error("[Preload] Error opening chat:", error);
      return false;
    }
  },
  getCurrentChat: async () => {
    try {
      const urlMatch = window.location.hash.match(/#([^/]+)$/);
      const chatId = urlMatch ? urlMatch[1] : null;
      if (!chatId) return null;
      const chatTitle = document.querySelector(".chat-info-name, .chat-info .name")?.textContent?.trim();
      return {
        id: chatId,
        title: chatTitle || "Unknown"
      };
    } catch (error) {
      console.error("[Preload] Error getting current chat:", error);
      return null;
    }
  },
  getChatList: async () => {
    try {
      const chats = [];
      const chatElements = document.querySelectorAll(".chat-item, .chatlist-chat");
      chatElements.forEach((element) => {
        const chatId = element.getAttribute("data-peer-id") || "";
        const title = element.querySelector(".chat-title, .peer-title")?.textContent?.trim() || "";
        const lastMessage = element.querySelector(".last-message, .last-message-text")?.textContent?.trim() || "";
        if (chatId) {
          chats.push({
            id: chatId,
            title,
            lastMessage
          });
        }
      });
      return chats;
    } catch (error) {
      console.error("[Preload] Error getting chat list:", error);
      return [];
    }
  },
  // 事件监听
  onMessage: (callback) => {
    const channel = "telegram:new-message";
    electron.ipcRenderer.on(channel, (_event, message) => callback(message));
    return () => electron.ipcRenderer.removeAllListeners(channel);
  },
  onLoginStateChange: (callback) => {
    const channel = "telegram:login-state-change";
    electron.ipcRenderer.on(channel, (_event, loggedIn) => callback(loggedIn));
    return () => electron.ipcRenderer.removeAllListeners(channel);
  },
  // 调试函数（同时也暴露到全局）
  __tg_info__: () => telegramMonitor.getDebugInfo(),
  __tg_find_container__: () => telegramMonitor.debugFindContainer(),
  __tg_scan_messages__: () => {
    telegramMonitor.debugScanMessages();
    return true;
  },
  __tg_auto_open_chat__: () => telegramMonitor.debugAutoOpenChat(),
  __tg_set_include_outgoing__: (include) => {
    telegramMonitor.setIncludeOutgoingForDebug(include);
    return telegramMonitor.getDebugInfo();
  }
});
electron.contextBridge.exposeInMainWorld("__tg_info__", () => telegramMonitor.getDebugInfo());
electron.contextBridge.exposeInMainWorld("__tg_find_container__", () => telegramMonitor.debugFindContainer());
electron.contextBridge.exposeInMainWorld("__tg_scan_messages__", () => telegramMonitor.debugScanMessages());
electron.contextBridge.exposeInMainWorld("__tg_auto_open_chat__", () => telegramMonitor.debugAutoOpenChat());
electron.contextBridge.exposeInMainWorld("__tg_set_include_outgoing__", (include) => {
  telegramMonitor.setIncludeOutgoingForDebug(include);
  return telegramMonitor.getDebugInfo();
});
async function initializePreload() {
  console.log("[Preload] Initializing...");
  const version = await detectVersion();
  console.log(`[Preload] Detected Telegram Web version: ${version || "Unknown"}`);
  const loggedIn = await isLoggedIn();
  console.log(`[Preload] Login status: ${loggedIn ? "Logged in" : "Not logged in"}`);
  const isTelegramContext = (() => {
    try {
      const href = location?.href || "";
      const host = location?.hostname || "";
      if (!href || !host) return false;
      if (href.startsWith("https://web.telegram.org/")) return true;
      if (href.startsWith("https://t.me/")) return true;
      if (/(^|\.)telegram\.org$/i.test(host)) return true;
      return false;
    } catch {
      return false;
    }
  })();
  if (loggedIn && isTelegramContext) {
    const userInfo = await getUserInfo();
    console.log("[Preload] User info:", userInfo);
    setTimeout(async () => {
      if (ENABLE_V2_MONITOR) {
        console.log("[Preload] 🚀 Auto-starting V2 message monitoring (World-class architecture)...");
        const success = await telegramMonitorV2.startMonitoring();
        console.log(`[Preload] ${success ? "✅" : "❌"} V2 monitoring auto-start result: ${success}`);
        if (success) {
          setTimeout(() => telegramOverlay.showHotkeyHint(), 1e3);
        }
      } else {
        console.log("[Preload] 🚀 Auto-starting V1 message monitoring...");
        const success = telegramMonitor.startMonitoring();
        console.log(`[Preload] ${success ? "✅" : "❌"} V1 monitoring auto-start result: ${success}`);
      }
    }, 2e3);
  } else {
    setTimeout(async () => {
      if (!isTelegramContext) {
        console.log("[Preload] ⏭️ Skip monitoring auto-start: non-Telegram context", location?.href);
        return;
      }
      if (ENABLE_V2_MONITOR) {
        console.log("[Preload] 🚀 (fallback) Auto-starting V2 message monitoring...");
        const success = await telegramMonitorV2.startMonitoring();
        console.log(`[Preload] (fallback) ${success ? "✅" : "❌"} V2 monitoring auto-start result`);
      } else {
        console.log("[Preload] 🚀 (fallback) Auto-starting V1 message monitoring...");
        const success = telegramMonitor.startMonitoring();
        console.log(`[Preload] (fallback) ${success ? "✅" : "❌"} V1 monitoring auto-start result`);
      }
    }, 5e3);
  }
  console.log("[Preload] Initialization complete");
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePreload);
} else {
  initializePreload();
}
console.log("[Preload] Preload script loaded");
