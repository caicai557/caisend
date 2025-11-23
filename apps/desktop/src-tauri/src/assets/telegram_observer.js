// telegram_observer.js
(function () {
    console.log("Teleflow Observer Started");

    // Ensure the binding exists
    if (!window.Teleflow) {
        console.error("Teleflow binding not found!");
        return;
    }

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // This selector needs to be adjusted based on actual Telegram Web DOM
                        // For MVP, we look for generic message containers
                        const messageElement = node.querySelector('.message-content-wrapper') || node;

                        if (messageElement && messageElement.classList && messageElement.classList.contains('message-content-wrapper')) {
                            const textContent = messageElement.textContent;
                            if (textContent) {
                                window.Teleflow.send(JSON.stringify({
                                    type: 'message',
                                    content: textContent,
                                    timestamp: Date.now()
                                }));
                            }
                        }
                    }
                });
            }
        }
    });

    // Start observing the document body for now
    // In production, we should target the specific message list container
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    console.log("Teleflow Observer Attached");
})();
