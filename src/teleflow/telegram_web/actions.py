"""Telegram Web 消息操作器"""

import asyncio
from typing import Optional, List, Any

from playwright.async_api import Page  # type: ignore

from .selectors import TelegramSelectors


class MessageActions:
    """Telegram Web 消息操作器
    
    负责标记消息为已读和发送消息，包含选择器回退和重试机制。
    """
    
    def __init__(self, page: Page, max_retries: int = 3, retry_delay: float = 2.0):
        """
        初始化消息操作器
        
        Args:
            page: Playwright 页面对象
            max_retries: 最大重试次数
            retry_delay: 重试延迟（秒）
        """
        self.page = page
        self.max_retries = max_retries
        self.retry_delay = retry_delay
    
    async def mark_as_read(self) -> bool:
        """
        标记当前聊天的所有消息为已读
        
        Returns:
            bool: True 表示成功标记，False 表示失败
        """
        for attempt in range(self.max_retries):
            try:
                # 等待消息列表加载
                await self._wait_for_message_list()
                
                # 方法1: 尝试点击标记已读按钮
                if await self._try_mark_read_button():
                    print(f"成功通过按钮标记消息为已读 (尝试 {attempt + 1})")
                    return True
                
                # 方法2: 尝试滚动到底部
                if await self._try_scroll_to_bottom():
                    print(f"成功通过滚动标记消息为已读 (尝试 {attempt + 1})")
                    return True
                
                # 方法3: 尝试点击最后一条消息
                if await self._try_click_last_message():
                    print(f"成功通过点击最后消息标记为已读 (尝试 {attempt + 1})")
                    return True
                
                # 如果所有方法都失败，等待后重试
                if attempt < self.max_retries - 1:
                    print(f"标记已读失败，{self.retry_delay} 秒后重试...")
                    await asyncio.sleep(self.retry_delay)
                    
            except Exception as e:
                print(f"标记消息为已读时发生错误 (尝试 {attempt + 1}): {e}")
                
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay)
        
        print(f"标记消息为已读失败，已达到最大重试次数")
        return False
    
    async def send_message(self, message_text: str) -> bool:
        """
        发送消息到当前聊天
        
        Args:
            message_text: 要发送的消息文本
            
        Returns:
            bool: True 表示成功发送，False 表示失败
        """
        if not message_text or not message_text.strip():
            print("消息文本为空，跳过发送")
            return False
        
        for attempt in range(self.max_retries):
            try:
                # 等待消息输入框加载
                input_element = await self._wait_for_message_input()
                
                if not input_element:
                    raise Exception("未找到消息输入框")
                
                # 清空输入框并输入消息
                await input_element.click()
                await input_element.fill("")  # 清空
                await input_element.type(message_text.strip())
                
                # 等待一下确保文本输入完成
                await asyncio.sleep(0.5)
                
                # 尝试发送消息
                if await self._try_send_message():
                    print(f"成功发送消息: {message_text.strip()}")
                    return True
                
                # 如果发送失败，等待后重试
                if attempt < self.max_retries - 1:
                    print(f"发送消息失败，{self.retry_delay} 秒后重试...")
                    await asyncio.sleep(self.retry_delay)
                    
            except Exception as e:
                print(f"发送消息时发生错误 (尝试 {attempt + 1}): {e}")
                
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay)
        
        print(f"发送消息失败，已达到最大重试次数")
        return False
    
    async def _try_mark_read_button(self) -> bool:
        """
        尝试通过点击标记已读按钮来标记消息为已读
        
        Returns:
            bool: True 表示成功，False 表示失败
        """
        try:
            for selector in TelegramSelectors.MARK_AS_READ_BUTTON:
                try:
                    button = await self.page.query_selector(selector)
                    if button:
                        await button.click()
                        await asyncio.sleep(1)  # 等待标记完成
                        return True
                except Exception:
                    continue
            
            return False
            
        except Exception:
            return False
    
    async def _try_scroll_to_bottom(self) -> bool:
        """
        尝试通过滚动到底部来标记消息为已读
        
        Returns:
            bool: True 表示成功，False 表示失败
        """
        try:
            # 滚动到底部
            await self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(2)  # 等待滚动和标记完成
            
            # 验证是否成功（检查是否还有未读消息）
            unread_bubbles = []
            for selector in TelegramSelectors.MESSAGE_UNREAD:
                try:
                    bubbles = await self.page.query_selector_all(selector)
                    if bubbles:
                        unread_bubbles = bubbles
                        break
                except Exception:
                    continue
            
            # 如果没有未读消息，说明成功
            return len(unread_bubbles) == 0
            
        except Exception:
            return False
    
    async def _try_click_last_message(self) -> bool:
        """
        尝试通过点击最后一条消息来标记为已读
        
        Returns:
            bool: True 表示成功，False 表示失败
        """
        try:
            # 获取所有消息气泡
            message_bubbles = []
            for selector in TelegramSelectors.MESSAGE_BUBBLE:
                try:
                    bubbles = await self.page.query_selector_all(selector)
                    if bubbles:
                        message_bubbles = bubbles
                        break
                except Exception:
                    continue
            
            if not message_bubbles:
                return False
            
            # 点击最后一条消息
            last_bubble = message_bubbles[-1]
            await last_bubble.click()
            await asyncio.sleep(1)  # 等待标记完成
            
            return True
            
        except Exception:
            return False
    
    async def _try_send_message(self) -> bool:
        """
        尝试发送消息（通过多种方法）
        
        Returns:
            bool: True 表示成功，False 表示失败
        """
        try:
            # 方法1: 点击发送按钮
            for selector in TelegramSelectors.SEND_BUTTON:
                try:
                    send_button = await self.page.query_selector(selector)
                    if send_button:
                        await send_button.click()
                        await asyncio.sleep(1)  # 等待发送完成
                        return True
                except Exception:
                    continue
            
            # 方法2: 按回车键发送
            try:
                await self.page.keyboard.press("Enter")
                await asyncio.sleep(1)  # 等待发送完成
                return True
            except Exception:
                pass
            
            # 方法3: 按 Ctrl+Enter 发送
            try:
                await self.page.keyboard.press("Control+Enter")
                await asyncio.sleep(1)  # 等待发送完成
                return True
            except Exception:
                pass
            
            return False
            
        except Exception:
            return False
    
    async def _wait_for_message_list(self) -> None:
        """等待消息列表加载完成"""
        selectors = TelegramSelectors.MESSAGE_LIST_CONTAINER
        
        for selector in selectors:
            try:
                await self.page.wait_for_selector(selector, timeout=10000)
                return
            except Exception:
                continue
        
        raise Exception("消息列表加载超时")
    
    async def _wait_for_message_input(self) -> Optional[Any]:
        """
        等待消息输入框加载完成
        
        Returns:
            Optional[Any]: 输入框元素，如果未找到则返回 None
        """
        for selector in TelegramSelectors.MESSAGE_INPUT:
            try:
                input_element = await self.page.wait_for_selector(selector, timeout=10000)
                return input_element
            except Exception:
                continue
        
        return None
    
    async def is_message_input_available(self) -> bool:
        """
        检查消息输入框是否可用
        
        Returns:
            bool: True 表示可用，False 表示不可用
        """
        try:
            input_element = await self._wait_for_message_input()
            return input_element is not None
        except Exception:
            return False
    
    async def get_current_input_text(self) -> Optional[str]:
        """
        获取当前输入框中的文本
        
        Returns:
            Optional[str]: 输入框文本，如果获取失败则返回 None
        """
        try:
            input_element = await self._wait_for_message_input()
            if input_element:
                text = await input_element.input_value()
                return text.strip() if text else None
            return None
        except Exception:
            return None
    
    async def clear_input(self) -> bool:
        """
        清空输入框
        
        Returns:
            bool: True 表示成功清空，False 表示失败
        """
        try:
            input_element = await self._wait_for_message_input()
            if input_element:
                await input_element.fill("")
                return True
            return False
        except Exception:
            return False
