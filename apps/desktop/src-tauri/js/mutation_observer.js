// Teleflow Mutation Observer
// Efficiently detects DOM changes to capture new messages

(function () {
    console.log("Teleflow Observer Injected");

    // Ensure the binding exists
    if (!window.teleflowNotify) {
        console.error("teleflowNotify binding not found!");
        return;
    }

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Logic to identify message elements
                        // This is a placeholder. In a real app, you'd check for specific classes/IDs
                        // corresponding to the target platform (e.g., WhatsApp, Telegram).
                        const element = node;
                        // Example heuristic: check if it looks like a message bubble
                        // if (element.classList.contains('message-in')) { ... }

                        // For MVP/Demo, we just send the text content of any added div
                        if (element.tagName === 'DIV' && element.innerText) {
                            window.teleflowNotify(JSON.stringify({
                                type: 'new_message',
                                content: element.innerText,
                                timestamp: Date.now()
                            }));
                        }
                    }
                });
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
