/**
 * 【太微垣】Perception Core (Hybrid Engine)
 * 
 * Strategy:
 * 1. L1 - Fiber (Memory Direct)
 * 2. L2 - DOM (Structure Analysis)
 * 3. L3 - Visual (Fallback to Rust/OCR)
 */

(function () {
    'use strict';

    const VERSION = '2.0.0';
    const DEBUG = true;

    function log(...args) {
        if (DEBUG) console.log('[PerceptionCore]', ...args);
    }

    // ========== L1: Fiber Perception ==========
    function tryFiber() {
        try {
            const root = document.getElementById('root') || document.querySelector('.app-container');
            if (!root) return null;

            // React 18+
            const fiber = root._reactRootContainer?._internalRoot?.current;
            if (!fiber) return null;

            // Traverse to find active chat
            // This is a simplified traversal, real implementation needs to be robust
            return traverseFiber(fiber);
        } catch (e) {
            log('L1 Fiber failed:', e);
            return null;
        }
    }

    function traverseFiber(fiber, depth = 0) {
        if (depth > 15) return null;

        // Check for peerId in props/state
        const peerId = fiber.memoizedProps?.peerId || fiber.memoizedState?.peerId;
        if (peerId) return peerId;

        if (fiber.child) {
            const res = traverseFiber(fiber.child, depth + 1);
            if (res) return res;
        }
        if (fiber.sibling) {
            const res = traverseFiber(fiber.sibling, depth + 1);
            if (res) return res;
        }
        return null;
    }

    // ========== L2: DOM Perception ==========
    function tryDOM() {
        try {
            // Telegram Web K/A specific selectors
            const selectors = [
                '.chat-info[data-user-id]',
                '.conversation-header[data-chat-id]',
                '[class*="chat"][data-id]',
                '.active-chat'
            ];

            for (const sel of selectors) {
                const el = document.querySelector(sel);
                if (el) {
                    return el.getAttribute('data-user-id') ||
                        el.getAttribute('data-chat-id') ||
                        el.getAttribute('data-id');
                }
            }
        } catch (e) {
            log('L2 DOM failed:', e);
        }
        return null;
    }

    // ========== Core Logic ==========
    let lastPeerId = null;

    function perceive() {
        let peerId = tryFiber();
        let level = 'L1';

        if (!peerId) {
            peerId = tryDOM();
            level = 'L2';
        }

        if (!peerId) {
            // L3 Fallback: Report failure to Rust to trigger OCR
            // log('Perception failed, requesting L3 support...');
            // window.teleflowNotify(JSON.stringify({ eventType: 'PerceptionLost', payload: {} }));
            return;
        }

        if (peerId !== lastPeerId) {
            log(`Peer changed [${level}]:`, lastPeerId, '->', peerId);
            lastPeerId = peerId;
            notifyBackend(peerId);
        }
    }

    function notifyBackend(peerId) {
        const payload = JSON.stringify({
            eventType: 'PeerFocus',
            payload: { peerId }
        });

        if (window.__TAURI__) {
            window.__TAURI__.core.invoke('notify_peer_focus', { peerId }).catch(console.error);
        } else if (window.teleflowNotify) {
            window.teleflowNotify(payload);
        } else {
            console.debug(`__TELEFLOW_BINDING__:${payload}`);
        }
    }

    // Initialization
    function init() {
        log(`Initialized v${VERSION}`);
        setInterval(perceive, 1000);

        // Listen for hot reload signal
        window.addEventListener('teleflow-reload-script', () => {
            log('Reload signal received');
            // Logic to reload would be handled by Rust re-injecting
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
