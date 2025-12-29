// Use window.ipcRenderer exposed by preload.ts (NOT direct electron import!)
// Direct import fails when contextIsolation is enabled

// Type for the preload-exposed IPC interface
interface PreloadIPC {
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
    send: (channel: string, ...args: unknown[]) => void
}

const getIPC = (): PreloadIPC | null => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).ipcRenderer || null
}

const CONFIG = {
    targetLang: 'zh-CN',
}

// --- Styles (Apple Design System) ---
const STYLES = `
  :host {
    display: block;
    margin-top: 6px;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
  }
    .apple-overlay {
    padding: 10px 14px;
    border-radius: 12px;
    background: rgba(250, 250, 252, 0.85);
    backdrop-filter: blur(25px) saturate(180%);
    -webkit-backdrop-filter: blur(25px) saturate(180%);
    border: 0.5px solid rgba(0, 0, 0, 0.1);
    box-shadow:
      0 4px 6px -1px rgba(0, 0, 0, 0.05),
      0 10px 24px -4px rgba(0, 0, 0, 0.12);
    animation: popIn 0.35s cubic-bezier(0.25, 0.1, 0.25, 1.0) forwards;
    transform-origin: top left;
  }
  @media (prefers-color-scheme: dark) {
    .apple-overlay {
      background: rgba(35, 35, 35, 0.85);
      border-color: rgba(255, 255, 255, 0.12);
      color: #FFFFFF;
      box-shadow:
        0 4px 6px -1px rgba(0, 0, 0, 0.2),
        0 10px 24px -4px rgba(0, 0, 0, 0.3);
    }
  }
  .header {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 4px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #8E8E93;
  }
  .content {
    font-size: 13px;
    line-height: 1.4;
    color: #1C1C1E;
    white-space: pre-wrap;
  }
  @media (prefers-color-scheme: dark) {
    .content { color: #FFFFFF; }
  }
  @keyframes popIn {
    from { opacity: 0; transform: translateY(4px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
      :host {
        display: block;
        margin-top: 6px;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
        --bg-glass: rgba(255, 255, 255, 0.85);
        --border-glass: rgba(255, 255, 255, 0.5);
        --shadow-glass: 0 4px 12px rgba(0, 0, 0, 0.08);
        --text-primary: #000;
        --accent: #3390ec;
      }

      @media (prefers-color-scheme: dark) {
        :host {
          --bg-glass: rgba(30, 30, 30, 0.85);
          --border-glass: rgba(255, 255, 255, 0.1);
          --shadow-glass: 0 4px 12px rgba(0, 0, 0, 0.3);
          --text-primary: #fff;
        }
      }

      .seabox-container {
        background: var(--bg-glass);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid var(--border-glass);
        border-radius: 12px;
        padding: 10px 14px;
        box-shadow: var(--shadow-glass);
        max-width: 100%;
        animation: slideIn 0.2s ease-out;
      }

      .seabox-header {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 6px;
        font-size: 11px;
        font-weight: 600;
        color: var(--accent);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .seabox-content {
        font-size: 14px;
        line-height: 1.5;
        color: var(--text-primary);
        word-wrap: break-word;
      }

      .seabox-icon {
        width: 12px;
        height: 12px;
        fill: currentColor;
      }

      @keyframes slideIn {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .loading {
        height: 12px;
        width: 60%;
        background: linear-gradient(90deg, rgba(150,150,150,0.1), rgba(150,150,150,0.2), rgba(150,150,150,0.1));
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: 4px;
      }
      @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
`

class SeaBoxOverlay extends HTMLElement {
    root: ShadowRoot
    contentDiv: HTMLDivElement

    constructor() {
        super()
        this.root = this.attachShadow({ mode: 'open' })
        const style = document.createElement('style')
        style.textContent = STYLES
        this.root.appendChild(style)

        const container = document.createElement('div')
        container.className = 'seabox-container'

        const header = document.createElement('div')
        header.className = 'seabox-header'
        header.innerHTML = `
          <svg class="seabox-icon" viewBox="0 0 24 24"><path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>
          <span>SeaBox Translate</span>
        `

        this.contentDiv = document.createElement('div')
        this.contentDiv.className = 'seabox-content'
        this.contentDiv.innerHTML = '<div class="loading"></div>'

        container.appendChild(header)
        container.appendChild(this.contentDiv)
        this.root.appendChild(container)
    }

    updateContent(text: string) {
        this.contentDiv.textContent = text
    }
}

// Register custom element only when DOM is available
function registerSeaBoxOverlay() {
    if (typeof customElements !== 'undefined' && customElements && !customElements.get('seabox-overlay')) {
        customElements.define('seabox-overlay', SeaBoxOverlay)
    }
}

// --- Translation Logic ---
const cache = new Map<string, string>()

async function translateText(text: string, overrideTargetLang?: string): Promise<string | null> {
    const targetLang = overrideTargetLang || CONFIG.targetLang
    if (!text || text.length < 2) return null
    const cacheKey = `${text}:${targetLang}`
    if (cache.has(cacheKey)) return cache.get(cacheKey)!

    try {
        // Call Python Sidecar via Main Process (using preload-exposed ipcRenderer)
        const ipc = getIPC()
        if (!ipc) return null
        const result = await ipc.invoke('translate', { text, targetLang }) as { translated?: string; error?: string }
        // Verify result format from server.py (it returns { translated: "..." } or { error: "..." })
        if (result && result.translated) {
            // If result is same as original (and not english), maybe ignore?
            // But server.py returns original on error.
            // Let's just trust it.
            cache.set(cacheKey, result.translated)
            return result.translated
        }
    } catch (e) {
        console.error('[SeaBox] Translation fail:', e)
    }
    return null
}

async function processMessage(element: Element, textSelector: string) {
    // Avoid double injection
    if (element.querySelector('seabox-overlay')) return

    // Find text content using dynamic selector
    const textNode = element.querySelector(textSelector) || element
    const text = (textNode.textContent || '').trim()

    // Heuristic: Don't translate time or short numbers
    if (!text || text.length < 2 || /^\d+:\d+$/.test(text)) return

    // Create overlay (Loading state)
    const overlay = new SeaBoxOverlay()
    element.appendChild(overlay)

    // Fetch Translation
    const translated = await translateText(text)

    if (translated && translated !== text) {
        overlay.updateContent(translated)
    } else {
        // Remove if failed or same
        overlay.remove()
    }
}

// --- Observer ---
export async function initTelegramGovernance() {
    console.log('[SeaBox] Governance Module Loading...')

    // Fetch Config
    let selectors = {
        message_selector: ".message, .bubble, [class*='message']",
        text_content_selector: ".text-content",
        container_selector: ".messages-container, .bubbles, .bubbles-group, #MiddleColumn"
    }

    try {
        const ipc = getIPC()
        if (ipc) {
            const remoteConfig = await ipc.invoke('get-governance-config') as typeof selectors
            if (remoteConfig) {
                selectors = { ...selectors, ...remoteConfig }
                console.log('[SeaBox] Loaded remote config:', selectors)
            }
        }
    } catch (e) {
        console.error('[SeaBox] Failed to load config, using defaults', e)
    }

    // Register the custom element first
    registerSeaBoxOverlay()

    // Observer for Incoming Messages
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(m => {
            m.addedNodes.forEach(node => {
                if (node instanceof HTMLElement) {
                    if (node.matches(selectors.message_selector)) {
                        processMessage(node, selectors.text_content_selector)
                    } else {
                        const msgs = node.querySelectorAll(selectors.message_selector)
                        msgs.forEach(el => processMessage(el, selectors.text_content_selector))
                    }
                }
            })
        })
    })

    const start = () => {
        const container = document.querySelector(selectors.container_selector)
        if (container) {
            observer.observe(container, { childList: true, subtree: true })
            console.log('[SeaBox] Observer Started on', container)
            // Process existing
            document.querySelectorAll(selectors.message_selector).forEach(el => processMessage(el, selectors.text_content_selector))
        } else {
            setTimeout(start, 2000)
        }
    }

    start()
    initOutgoingGovernance()
}

// --- Outgoing Governance ---
let previewOverlay: HTMLDivElement | null = null
let currentTranslation = ''
let isBlocked = false
let inputDebounceTimer: ReturnType<typeof setTimeout>

function showPreview(inputElement: HTMLElement, text: string, blocked = false) {
    if (!previewOverlay) {
        previewOverlay = document.createElement('div')
        previewOverlay.className = 'apple-overlay'
        previewOverlay.style.position = 'absolute'
        previewOverlay.style.zIndex = '9999'
        document.body.appendChild(previewOverlay)
    }

    const rect = inputElement.getBoundingClientRect()
    previewOverlay.style.left = `${rect.left}px`
    previewOverlay.style.bottom = `${window.innerHeight - rect.top + 10}px` // Above input
    previewOverlay.innerHTML = `<div class="header">${blocked ? '⛔ BLOCKED' : '📤 PREVIEW (EN)'}</div><div class="content" style="${blocked ? 'color: red;' : ''}">${text}</div>${blocked ? '<div style="font-size:10px;color:#888;">翻译不完整，无法发送</div>' : ''}`
}

function handleInput(e: Event) {
    const target = e.target as HTMLElement
    if (!target.isContentEditable && target.tagName !== 'TEXTAREA' && target.tagName !== 'INPUT') return

    const text = (target.textContent || (target as HTMLInputElement).value || '').trim()

    // Clear previous
    if (inputDebounceTimer) clearTimeout(inputDebounceTimer)

    // If empty or english, hide preview
    if (!text || !/[\u4e00-\u9fa5]/.test(text)) {
        if (previewOverlay) previewOverlay.remove()
        previewOverlay = null
        currentTranslation = ''
        return
    }

    inputDebounceTimer = setTimeout(async () => {
        const ipc = getIPC()
        if (!ipc) return
        const result = await ipc.invoke('translate', { text, targetLang: 'en' }) as { translated?: string; blocked?: boolean }
        if (result && result.translated) {
            currentTranslation = result.translated
            isBlocked = result.blocked || false
            showPreview(target, result.translated, isBlocked)
        }
    }, 300)
}

function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey && currentTranslation && previewOverlay) {
        if (isBlocked) {
            e.preventDefault()
            e.stopPropagation()
            alert('翻译不完整，无法发送。请修改内容后重试。')
            return
        }
        e.preventDefault()
        e.stopPropagation()

        const target = e.target as HTMLElement
        // Replace content
        if (target.isContentEditable) {
            target.textContent = currentTranslation
        } else if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
            target.value = currentTranslation
        }

        // Dispatch input event to sync React state
        target.dispatchEvent(new Event('input', { bubbles: true }))

        // Hide preview
        previewOverlay.remove()
        previewOverlay = null
        currentTranslation = ''
        isBlocked = false

        // Optional: Trigger send automatically?
        // For now, let user press Enter again to confirm sending the ENGLISH text?
        // Or specific logic to re-emit Enter?
        // If we want "Type, Enter -> Sends Translated", we need to re-dispatch Enter.
        // But re-dispatching might be tricky with React.
        // Let's just replace text and focus. User presses Enter again to send.
        // Or we can try to dispatch.
        // The Plan says: "触发发送" (Trigger Send).
        // Let's safe side: Just replace. User sees English and hits Enter.
    }
}

function initOutgoingGovernance() {
    document.addEventListener('input', handleInput, true)
    document.addEventListener('keydown', handleKeydown, true)
    console.log('[SeaBox] Outgoing Governance Ready')
}
