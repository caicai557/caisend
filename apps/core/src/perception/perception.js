/**
 * Teleflow Perception Engine - JavaScript Injection
 *
 * This script is injected into Telegram Web A/K to extract
 * perception signals via React Fiber traversal.
 *
 * Communication: MessagePack over console.debug
 */

(function () {
  "use strict";

  const BRIDGE_PREFIX = "__TF_BRIDGE__";
  const HEARTBEAT_INTERVAL = 5000;

  // MessagePack encoder (minimal implementation)
  const msgpack = {
    encode: function (obj) {
      return JSON.stringify(obj); // Fallback to JSON for now
    },
  };

  // Base64 encoder
  function toBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  // Send message to Rust backend
  function sendBridgeMessage(type, payload) {
    const message = {
      msg_type: type,
      payload: Array.from(new TextEncoder().encode(msgpack.encode(payload))),
      timestamp: Date.now(),
    };

    const encoded = toBase64(msgpack.encode(message));
    console.debug(BRIDGE_PREFIX + encoded);
  }

  // Find React Fiber root
  function findFiberRoot(dom) {
    const keys = Object.keys(dom);
    const fiberKey = keys.find((k) => k.startsWith("__reactFiber$"));
    return fiberKey ? dom[fiberKey] : null;
  }

  // Traverse up to find component by name
  function findAncestor(fiber, componentName) {
    let current = fiber;
    while (current) {
      if (
        current.type?.name === componentName ||
        current.type?.displayName === componentName
      ) {
        return current;
      }
      current = current.return;
    }
    return null;
  }

  // Extract message data from a message element
  function extractMessageData(element) {
    const fiber = findFiberRoot(element);
    if (!fiber) return null;

    const messageFiber = findAncestor(fiber, "Message");
    if (!messageFiber?.memoizedProps?.message) return null;

    const msg = messageFiber.memoizedProps.message;
    return {
      id: msg.id,
      content: msg.content?.text?.text || msg.content || "",
      senderId: msg.senderId || msg.fromId,
      isOutgoing: msg.isOutgoing || false,
      date: msg.date,
    };
  }

  // Message observer
  function setupMessageObserver() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;

          // Check if it's a message
          const messages = node.matches?.(".message, .Message")
            ? [node]
            : node.querySelectorAll?.(".message, .Message") || [];

          for (const msgEl of messages) {
            const data = extractMessageData(msgEl);
            if (data) {
              sendBridgeMessage("Perception", {
                type: "MessageReceived",
                data: {
                  chat_id: getChatId(),
                  sender_id: String(data.senderId || ""),
                  sender_name: "", // Would need additional lookup
                  content: data.content,
                  timestamp: new Date().toISOString(),
                  is_outgoing: data.isOutgoing,
                },
              });
            }
          }
        }
      }
    });

    // Observe message list
    const messageList = document.querySelector(
      ".messages-container, .MessageList"
    );
    if (messageList) {
      observer.observe(messageList, { childList: true, subtree: true });
      console.log("[TF] Message observer attached");
    }

    return observer;
  }

  // Get current chat ID from URL or Fiber
  function getChatId() {
    const hash = location.hash;
    const match = hash.match(/#(-?\d+)/);
    return match ? match[1] : "unknown";
  }

  // Hash change listener for chat switches
  function setupChatChangeListener() {
    let lastChatId = getChatId();

    window.addEventListener("hashchange", () => {
      const newChatId = getChatId();
      if (newChatId !== lastChatId) {
        sendBridgeMessage("Perception", {
          type: "ChatChanged",
          data: {
            chat_id: newChatId,
            chat_title:
              document.querySelector(".chat-info .title")?.textContent || "",
            peer_type: "User", // Would need detection logic
          },
        });
        lastChatId = newChatId;
      }
    });

    console.log("[TF] Chat change listener attached");
  }

  // Heartbeat
  function startHeartbeat() {
    setInterval(() => {
      sendBridgeMessage("Heartbeat", {});
    }, HEARTBEAT_INTERVAL);

    console.log("[TF] Heartbeat started");
  }

  // Initialize
  function init() {
    console.log("[TF] Teleflow Perception Engine v1.0 initializing...");

    // Wait for page to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
      return;
    }

    // Setup observers
    setupMessageObserver();
    setupChatChangeListener();
    startHeartbeat();

    console.log("[TF] Perception Engine ready!");
  }

  init();
})();
