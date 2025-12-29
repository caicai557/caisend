"""
Page Object Model for Telegram Web A.
"""

from playwright.async_api import Page


class TelegramWebPage:
    """Encapsulates interactions with Telegram Web A."""

    def __init__(self, page: Page):
        """Initialize with Playwright page instance."""
        self.page = page

    async def navigate(self):
        """Navigate to Telegram Web A."""
        await self.page.goto("https://web.telegram.org/a/", wait_until="domcontentloaded")

    async def is_loaded(self) -> bool:
        """Check if the main chat interface is loaded."""
        try:
            await self.page.wait_for_selector(
                "#MiddleColumn, .messages-container", state="visible", timeout=30000
            )
            return True
        except Exception:
            return False

    async def get_message_bubbles(self):
        """Get all message bubble elements."""
        return await self.page.locator(
            ".message, .Message, [class*='message-content']"
        ).all()

    async def type_and_send_human_like(self, text: str, delay_override: float = None):
        """Type and send a message simulating human behavior.
        
        Args:
            text: Message text to type
            delay_override: Optional delay to use instead of random thinking delay
        """
        import random
        import asyncio
        
        input_selector = "[contenteditable='true'], .composer-input, textarea"
        
        # 1. Simulate "thinking" delay
        thinking_delay = delay_override if delay_override is not None else random.uniform(1.0, 3.0)
        await asyncio.sleep(thinking_delay)
        
        # 2. Focus and type with variable speed
        await self.page.click(input_selector)
        await self.page.locator(input_selector).press_sequentially(
            text, delay=random.randint(50, 150)
        )
        
        # 3. Small delay before pressing Enter
        await asyncio.sleep(random.uniform(0.3, 0.8))
        await self.page.keyboard.press("Enter")

    async def mark_as_read(self):
        """Mark current chat as read by simulating a click on the chat area."""
        try:
            # Clicking the middle column usually triggers 'read' status if not already
            await self.page.click("#MiddleColumn", timeout=2000)
        except Exception:
            pass

    async def inject_script(self, script: str):
        """Inject a script into the page."""
        await self.page.add_init_script(script)
