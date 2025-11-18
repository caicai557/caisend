"""Telegram Web 聊天导航器"""

import asyncio
from typing import Optional, List

from playwright.async_api import Page  # type: ignore

from .selectors import TelegramSelectors


class ChatNavigator:
    """Telegram Web 聊天导航器
    
    负责搜索和定位特定聊天，处理登录状态检测和重试逻辑。
    """
    
    def __init__(self, page: Page, max_retries: int = 3, retry_delay: float = 5.0):
        """
        初始化聊天导航器
        
        Args:
            page: Playwright 页面对象
            max_retries: 最大重试次数
            retry_delay: 重试延迟（秒）
        """
        self.page = page
        self.max_retries = max_retries
        self.retry_delay = retry_delay
    
    async def check_login_status(self) -> bool:
        """
        检查是否已登录
        
        Returns:
            bool: True 表示已登录，False 表示需要登录
        """
        try:
            # 检查是否存在登录输入框
            login_input = await self.page.query_selector(
                TelegramSelectors.get_primary_selector(TelegramSelectors.LOGIN_PHONE_INPUT)
            )
            
            # 如果找到登录输入框，说明未登录
            if login_input:
                return False
            
            # 检查是否存在聊天列表（已登录的标志）
            chat_list = await self.page.query_selector(
                TelegramSelectors.get_primary_selector(TelegramSelectors.CHAT_LIST_CONTAINER)
            )
            
            return chat_list is not None
            
        except Exception:
            return False
    
    async def navigate_to_chat(self, chat_name: str) -> bool:
        """
        导航到指定聊天
        
        Args:
            chat_name: 聊天名称或用户名
            
        Returns:
            bool: True 表示成功导航到聊天，False 表示失败
        """
        for attempt in range(self.max_retries):
            try:
                # 检查登录状态
                if not await self.check_login_status():
                    print(f"尝试 {attempt + 1}: 未登录，跳过导航到聊天 {chat_name}")
                    return False
                
                # 等待聊天列表加载
                await self._wait_for_chat_list()
                
                # 搜索聊天
                chat_found = await self._search_chat(chat_name)
                
                if chat_found:
                    # 点击聊天
                    click_success = await self._click_chat(chat_name)
                    
                    if click_success:
                        # 等待聊天界面加载
                        await self._wait_for_chat_interface()
                        print(f"成功导航到聊天: {chat_name}")
                        return True
                
                # 如果失败，等待后重试
                if attempt < self.max_retries - 1:
                    print(f"导航到聊天 {chat_name} 失败，{self.retry_delay} 秒后重试...")
                    await asyncio.sleep(self.retry_delay)
                    
            except Exception as e:
                print(f"导航到聊天 {chat_name} 时发生错误 (尝试 {attempt + 1}): {e}")
                
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay)
        
        print(f"导航到聊天 {chat_name} 失败，已达到最大重试次数")
        return False
    
    async def _wait_for_chat_list(self) -> None:
        """等待聊天列表加载完成"""
        selectors = TelegramSelectors.CHAT_LIST_CONTAINER
        
        for selector in selectors:
            try:
                await self.page.wait_for_selector(selector, timeout=10000)
                return
            except Exception:
                continue
        
        raise Exception("聊天列表加载超时")
    
    async def _search_chat(self, chat_name: str) -> bool:
        """
        搜索指定聊天
        
        Args:
            chat_name: 聊天名称
            
        Returns:
            bool: True 表示找到聊天，False 表示未找到
        """
        try:
            # 尝试使用搜索功能
            search_input = await self.page.query_selector(
                TelegramSelectors.get_primary_selector(TelegramSelectors.SEARCH_INPUT)
            )
            
            if search_input:
                # 清空搜索框并输入聊天名称
                await search_input.click()
                await search_input.fill("")  # 清空
                await search_input.type(chat_name)
                
                # 等待搜索结果
                await asyncio.sleep(2)
                
                # 检查搜索结果
                for selector in TelegramSelectors.SEARCH_RESULTS:
                    results = await self.page.query_selector_all(selector)
                    if results:
                        return True
            
            # 如果搜索失败，直接在聊天列表中查找
            return await self._find_chat_in_list(chat_name)
            
        except Exception as e:
            print(f"搜索聊天 {chat_name} 时发生错误: {e}")
            return await self._find_chat_in_list(chat_name)
    
    async def _find_chat_in_list(self, chat_name: str) -> bool:
        """
        在聊天列表中查找指定聊天
        
        Args:
            chat_name: 聊天名称
            
        Returns:
            bool: True 表示找到聊天，False 表示未找到
        """
        try:
            # 获取所有聊天项
            chat_items = []
            for selector in TelegramSelectors.CHAT_ITEM:
                items = await self.page.query_selector_all(selector)
                if items:
                    chat_items = items
                    break
            
            # 遍历聊天项，查找匹配的聊天
            for item in chat_items:
                try:
                    # 获取聊天标题
                    title_element = await item.query_selector(
                        TelegramSelectors.get_primary_selector(TelegramSelectors.CHAT_TITLE)
                    )
                    
                    if title_element:
                        title = await title_element.text_content()
                        if title and chat_name.lower() in title.lower():
                            return True
                            
                except Exception:
                    continue
            
            return False
            
        except Exception:
            return False
    
    async def _click_chat(self, chat_name: str) -> bool:
        """
        点击指定聊天
        
        Args:
            chat_name: 聊天名称
            
        Returns:
            bool: True 表示成功点击，False 表示失败
        """
        try:
            # 获取所有聊天项
            chat_items = []
            for selector in TelegramSelectors.CHAT_ITEM:
                items = await self.page.query_selector_all(selector)
                if items:
                    chat_items = items
                    break
            
            # 遍历聊天项，查找并点击匹配的聊天
            for item in chat_items:
                try:
                    # 获取聊天标题
                    title_element = await item.query_selector(
                        TelegramSelectors.get_primary_selector(TelegramSelectors.CHAT_TITLE)
                    )
                    
                    if title_element:
                        title = await title_element.text_content()
                        if title and chat_name.lower() in title.lower():
                            await item.click()
                            return True
                            
                except Exception:
                    continue
            
            return False
            
        except Exception as e:
            print(f"点击聊天 {chat_name} 时发生错误: {e}")
            return False
    
    async def _wait_for_chat_interface(self) -> None:
        """等待聊天界面加载完成"""
        selectors = TelegramSelectors.MESSAGE_LIST_CONTAINER
        
        for selector in selectors:
            try:
                await self.page.wait_for_selector(selector, timeout=10000)
                return
            except Exception:
                continue
        
        raise Exception("聊天界面加载超时")
    
    async def get_current_chat_name(self) -> Optional[str]:
        """
        获取当前聊天的名称
        
        Returns:
            Optional[str]: 当前聊天名称，如果不在聊天中则返回 None
        """
        try:
            # 检查是否在聊天界面
            message_list = await self.page.query_selector(
                TelegramSelectors.get_primary_selector(TelegramSelectors.MESSAGE_LIST_CONTAINER)
            )
            
            if not message_list:
                return None
            
            # 尝试获取聊天标题（可能在不同的位置）
            title_selectors = [
                '.chat-title',
                '.chat-name',
                '.dialog-title',
                '.chat-header .title'
            ]
            
            for selector in title_selectors:
                try:
                    title_element = await self.page.query_selector(selector)
                    if title_element:
                        title = await title_element.text_content()
                        if title and title.strip():
                            return title.strip()
                except Exception:
                    continue
            
            return None
            
        except Exception:
            return None
