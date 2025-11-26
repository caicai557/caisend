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

    // 🧠 Phase 2.1: Neural Bridge (React Fiber Deep Perception)
    // Traverse React Fiber tree to extract state directly from memory

    function findReactFiber(dom) {
        const key = Object.keys(dom).find((key) => key.startsWith("__reactFiber$"));
        return key ? dom[key] : null;
    }

    function traverseFiber(fiber, results = []) {
        if (!fiber) return results;

        // Check for Message Component characteristics (Teact specific)
        // Note: This requires reverse engineering Telegram Web Z's component names or props
        // Heuristic: Look for 'message' prop or specific structure

        // Example Heuristic for Message:
        // Component with 'message' prop containing 'content' and 'senderId'
        if (fiber.memoizedProps && fiber.memoizedProps.message) {
            const msg = fiber.memoizedProps.message;
            if (msg.content && msg.content.text) {
                results.push({
                    id: msg.id,
                    content: msg.content.text.text || msg.content.text, // Handle different structures
                    sender_id: msg.senderId,
                    chat_id: msg.chatId,
                    date: msg.date
                });
            }
        }

        // Traverse children and siblings
        if (fiber.child) traverseFiber(fiber.child, results);
        if (fiber.sibling) traverseFiber(fiber.sibling, results);

        return results;
    }

    // Polling for Fiber updates (more stable than MutationObserver for internal state)
    let lastMessageIds = new Set();

    function scanFiberTree() {
        const rootEl = document.querySelector("#root") || document.body; // Adjust root selector
        const rootFiber = findReactFiber(rootEl);

        if (!rootFiber) {
            // console.debug("[Neural Bridge] Root fiber not found");
            return;
        }

        const messages = traverseFiber(rootFiber);

        for (const msg of messages) {
            if (!lastMessageIds.has(msg.id)) {
                lastMessageIds.add(msg.id);

                // Send event via Neural Bridge
                sendEvent("NewMessage", {
                    content: msg.content,
                    sender: msg.sender_id,
                    chat_id: msg.chat_id,
                    raw_id: msg.id
                });

                // Keep set size manageable
                if (lastMessageIds.size > 1000) {
                    const it = lastMessageIds.values();
                    lastMessageIds.delete(it.next().value);
                }
            }
        }
    }

    // Start Neural Bridge
    const startNeuralBridge = () => {
        console.log("[Neural Bridge] Activated");
        setInterval(scanFiberTree, 1000); // Scan every second
    };

    window.addEventListener("load", () => {
        setTimeout(startNeuralBridge, 3000);
    });
})();
