// MVP Observer Script for Telegram Web Z
// Injected by Tauri

(function () {
    console.log("[MVP] Observer Injected");

    const IPC_EVENT_NAME = "automation_event";
    const ACCOUNT_ID =
        typeof window.__TELEFLOW_ACCOUNT_ID === "string"
            ? window.__TELEFLOW_ACCOUNT_ID
            : "default";

    // 🚀 Phase 2.2: Replace Tauri IPC with CDP Runtime Binding
    // Direct JS → Rust communication via teleflowNotify binding
    function sendEvent(type, data) {
        const payload = {
            eventType: type,
            payload: { account_id: ACCOUNT_ID, ...data },
        };

        if (window.teleflowNotify) {
            // Direct link via CDP Runtime Binding (stable & fast)
            try {
                window.teleflowNotify(JSON.stringify(payload));
            } catch (e) {
                console.error("[MVP] teleflowNotify failed:", e);
            }
        } else {
            // Fallback warning
            console.warn("[MVP] window.teleflowNotify binding not ready!", payload);
        }
    }


    // 坐标查询：提供给 Rust 侧调度器
    window.getCoordinates = function (selector) {
        const el = document.querySelector(selector);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        };
    };

    // MutationObserver to detect new messages
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === "childList") {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        processNode(node);
                    }
                }
            }
        }
    });

    function processNode(node) {
        // Detect New Message (selectors需根据 Telegram Web 实际 DOM 校准)
        if (node.classList && node.classList.contains("message-list-item")) {
            const contentEl =
                node.querySelector(".text-content") ||
                node.querySelector("[data-message-text]");
            if (contentEl) {
                const text = contentEl.textContent;
                sendEvent("NewMessage", {
                    content: text,
                    sender: "unknown",
                    chat_id: "current_chat",
                });

                // Check for Invite Links
                if (text.includes("t.me/joinchat/") || text.includes("t.me/+")) {
                    const match = text.match(/t\.me\/(joinchat\/|\+)[a-zA-Z0-9_]+/);
                    if (match && match[0]) {
                        sendEvent("InviteLinkFound", {
                            link: match[0],
                        });
                    }
                }
            }
        }

        // Detect Unread Badge
        if (node.classList && node.classList.contains("chat-list-item")) {
            const badge = node.querySelector(".badge") || node.querySelector("[data-badge]");
            if (badge) {
                sendEvent("UnreadChatDetected", {
                    chat_id: "unknown",
                });
            }
        }
    }

    // Start Observing
    const startObserver = () => {
        const root = document.body; // Or specific container
        if (root) {
            observer.observe(root, {
                childList: true,
                subtree: true,
            });
            console.log("[MVP] Observer Started");
        } else {
            setTimeout(startObserver, 1000);
        }
    };

    window.addEventListener("load", () => {
        setTimeout(startObserver, 3000);
    });
})();
