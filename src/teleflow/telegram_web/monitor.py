"""Telegram Web 消息监控模块

提供消息检测、获取等功能。

参考 Traneasy 的设计：
- 消息 ID 追踪
- 消息方向区分 (isOut)
- 批量消息获取
"""

import asyncio
import logging
from typing import Optional, Any, List, Set
from datetime import datetime
from playwright.async_api import Page  # type: ignore

from .selectors import TelegramSelectors


class MessageMonitor:
    """Telegram Web 消息监控器
    
    负责检测新消息、获取消息内容和处理超时。
    """
    
    def __init__(self, page: Page, timeout: float = 30.0):
        """
        初始化消息监控器
        
        Args:
            page: Playwright 页面对象
            timeout: 操作超时时间（秒）
        """
        self.page = page
        self.timeout = timeout
        self.last_message_count = 0
    
    async def check_new_messages(self) -> bool:
        """
        检查是否有新消息
        
        Returns:
            bool: True 表示有新消息，False 表示没有新消息
        """
        try:
            # 等待消息列表加载
            await self._wait_for_message_list()
            
            # 获取当前消息数量
            current_count = await self._get_message_count()
            
            # 比较消息数量
            has_new = current_count > self.last_message_count
            
            if has_new:
                self.last_message_count = current_count
                print(f"检测到新消息，当前消息总数: {current_count}")
            
            return has_new
            
        except Exception as e:
            print(f"检查新消息时发生错误: {e}")
            return False
    
    async def get_latest_message_text(self) -> Optional[str]:
        """
        获取最新消息的文本内容
        
        Returns:
            Optional[str]: 最新消息文本，如果没有消息则返回 None
        """
        try:
            # 等待消息列表加载
            await self._wait_for_message_list()
            
            # 获取所有消息气泡
            message_bubbles = []
            for selector in TelegramSelectors.MESSAGE_BUBBLE:
                bubbles = await self.page.query_selector_all(selector)
                if bubbles:
                    message_bubbles = bubbles
                    break
            
            if not message_bubbles:
                print("未找到任何消息")
                return None
            
            # 获取最后一个消息（最新的）
            last_bubble = message_bubbles[-1]
            
            # 尝试获取消息文本
            text_content = None
            for selector in TelegramSelectors.MESSAGE_TEXT:
                try:
                    text_element = await last_bubble.query_selector(selector)
                    if text_element:
                        text_content = await text_element.text_content()
                        if text_content and text_content.strip():
                            break
                except Exception:
                    continue
            
            if text_content:
                text = text_content.strip()
                print(f"获取到最新消息: {text}")
                return text
            else:
                # 如果没有找到文本元素，尝试直接获取气泡的文本
                try:
                    text = await last_bubble.text_content()
                    if text and text.strip():
                        print(f"获取到最新消息（直接）: {text.strip()}")
                        return text.strip()
                except Exception:
                    pass
            
            print("无法获取最新消息文本")
            return None
            
        except Exception as e:
            print(f"获取最新消息时发生错误: {e}")
            return None
    
    async def get_unread_messages(self) -> List[str]:
        """
        获取所有未读消息的文本
        
        Returns:
            List[str]: 未读消息文本列表
        """
        try:
            # 等待消息列表加载
            await self._wait_for_message_list()
            
            # 获取所有未读消息
            unread_messages = []
            
            for selector in TelegramSelectors.MESSAGE_UNREAD:
                try:
                    unread_bubbles = await self.page.query_selector_all(selector)
                    
                    for bubble in unread_bubbles:
                        try:
                            # 获取消息文本
                            text_content = None
                            for text_selector in TelegramSelectors.MESSAGE_TEXT:
                                try:
                                    text_element = await bubble.query_selector(text_selector)
                                    if text_element:
                                        text_content = await text_element.text_content()
                                        if text_content and text_content.strip():
                                            break
                                except Exception:
                                    continue
                            
                            if text_content:
                                text = text_content.strip()
                                unread_messages.append(text)
                            else:
                                # 尝试直接获取气泡文本
                                try:
                                    text = await bubble.text_content()
                                    if text and text.strip():
                                        unread_messages.append(text.strip())
                                except Exception:
                                    continue
                                    
                        except Exception:
                            continue
                    
                    if unread_messages:
                        break  # 找到未读消息，停止尝试其他选择器
                        
                except Exception:
                    continue
            
            print(f"获取到 {len(unread_messages)} 条未读消息")
            return unread_messages
            
        except Exception as e:
            print(f"获取未读消息时发生错误: {e}")
            return []
    
    async def mark_all_as_read(self) -> bool:
        """
        标记所有消息为已读
        
        Returns:
            bool: True 表示成功标记，False 表示失败
        """
        try:
            # 等待消息列表加载
            await self._wait_for_message_list()
            
            # 尝试点击标记已读按钮（如果存在）
            for selector in TelegramSelectors.MARK_AS_READ_BUTTON:
                try:
                    mark_read_button = await self.page.query_selector(selector)
                    if mark_read_button:
                        await mark_read_button.click()
                        print("成功标记所有消息为已读")
                        return True
                except Exception:
                    continue
            
            # 如果没有标记已读按钮，尝试滚动到底部触发已读
            try:
                await self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                await asyncio.sleep(1)  # 等待标记完成
                print("通过滚动标记消息为已读")
                return True
            except Exception:
                pass
            
            print("无法标记消息为已读")
            return False
            
        except Exception as e:
            print(f"标记消息为已读时发生错误: {e}")
            return False
    
    async def has_image_in_latest_message(self) -> bool:
        """
        检查最新消息是否包含图片
        
        Returns:
            bool: True 表示包含图片
        """
        try:
            # 等待消息列表
            await self._wait_for_message_list()
            
            # 查找最新消息中的图片元素
            image_selectors = [
                ".message:last-child img",
                ".message:last-child .media-photo",
                ".message:last-child [class*='photo']",
                ".bubble:last-child img",
                ".bubble:last-child .media",
            ]
            
            for selector in image_selectors:
                try:
                    img = await self.page.query_selector(selector)
                    if img:
                        return True
                except Exception:
                    continue
            
            return False
            
        except Exception as e:
            print(f"检查图片消息时出错: {e}")
            return False
    
    async def get_latest_image_url(self) -> Optional[str]:
        """
        获取最新消息中的图片 URL
        
        Returns:
            Optional[str]: 图片 URL，如果没有则返回 None
        """
        try:
            # 查找图片元素
            image_selectors = [
                ".message:last-child img",
                ".bubble:last-child img",
                ".media-photo img",
            ]
            
            for selector in image_selectors:
                try:
                    img = await self.page.query_selector(selector)
                    if img:
                        # 获取图片 src
                        src = await img.get_attribute("src")
                        if src:
                            return src
                except Exception:
                    continue
            
            return None
            
        except Exception as e:
            print(f"获取图片URL时出错: {e}")
            return None
    
    async def wait_for_new_message(self, check_interval: float = 2.0) -> Optional[str]:
        """
        等待新消息到达
        
        Args:
            check_interval: 检查间隔（秒）
            
        Returns:
            Optional[str]: 新消息文本，如果超时则返回 None
        """
        try:
            # 记录初始状态
            initial_count = await self._get_message_count()
            
            # 等待新消息
            start_time = asyncio.get_event_loop().time()
            
            while (asyncio.get_event_loop().time() - start_time) < self.timeout:
                # 检查新消息
                current_count = await self._get_message_count()
                
                if current_count > initial_count:
                    # 有新消息，获取最新消息
                    latest_message = await self.get_latest_message_text()
                    return latest_message
                
                # 等待下次检查
                await asyncio.sleep(check_interval)
            
            print(f"等待新消息超时 ({self.timeout} 秒)")
            return None
            
        except Exception as e:
            print(f"等待新消息时发生错误: {e}")
            return None
    
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
    
    async def _get_message_count(self) -> int:
        """
        获取当前消息数量
        
        Returns:
            int: 消息数量
        """
        try:
            # 获取所有消息气泡
            message_bubbles = []
            for selector in TelegramSelectors.MESSAGE_BUBBLE:
                bubbles = await self.page.query_selector_all(selector)
                if bubbles:
                    message_bubbles = bubbles
                    break
            
            return len(message_bubbles)
            
        except Exception:
            return 0
    
    def reset_message_count(self) -> None:
        """重置消息计数器"""
        self.last_message_count = 0
        print("重置消息计数器")
    
    def get_current_message_count(self) -> int:
        """
        获取当前记录的消息数量
        
        Returns:
            int: 消息数量
        """
        return self.last_message_count
