// MVP Observer Script for Telegram Web Z
// Injected by Tauri

(function () {
    console.log("[MVP] Observer Injected");

    const IPC_EVENT_NAME = "automation_event";

    // Helper to send events to Rust
    function sendEvent(type, data) {
        if (window.__TAURI__) {
            window.__TAURI__.event.emit(IPC_EVENT_NAME, { type, ...data });
        } else {
            console.log("[MVP] Mock Event:", type, data);
        }
    }

    // Helper to get coordinates
    window.getCoordinatesFor = function (selector) {
        const el = document.querySelector(selector);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
            x: rect.x + rect.width / 2,
            y: rect.y + rect.height / 2,
            width: rect.width,
            height: rect.height
        };
    };

    // MutationObserver to detect new messages
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        processNode(node);
                    }
                }
            }
        }
    });

    function processNode(node) {
        // Detect New Message (Telegram Web Z specific selectors - simplified)
        // Note: Selectors need to be verified against actual Telegram Web Z DOM
        if (node.classList && node.classList.contains('message-list-item')) {
            const contentEl = node.querySelector('.text-content');
            if (contentEl) {
                const text = contentEl.textContent;
                console.log("[MVP] New Message Detected:", text);

                sendEvent("NewMessage", {
                    content: text,
                    sender: "unknown", // Need selector for sender
                    chat_id: "current_chat" // Need selector for chat id
                });

                // Check for Invite Links
                if (text.includes("t.me/joinchat/") || text.includes("t.me/+")) {
                    sendEvent("InviteLinkFound", {
                        link: text.match(/t\.me\/(joinchat\/|\+)[a-zA-Z0-9_]+/)[0]
                    });
                }
            }
        }

        // Detect Unread Badge
        if (node.classList && node.classList.contains('chat-list-item')) {
            const badge = node.querySelector('.badge');
            if (badge) {
                console.log("[MVP] Unread Chat Detected");
                sendEvent("UnreadChatDetected", {
                    chat_id: "unknown"
                });
            }
        }
    }

    // Start Observing
    // We need to wait for the app to load
    const startObserver = () => {
        const root = document.body; // Or specific container
        if (root) {
            observer.observe(root, {
                childList: true,
                subtree: true
            });
            console.log("[MVP] Observer Started");
        } else {
            setTimeout(startObserver, 1000);
        }
    };

    startObserver();

})();
