"""Telegram Web 群组操作模块"""

import asyncio
import logging
import random
from typing import Optional
from playwright.async_api import Page, TimeoutError as PlaywrightTimeoutError  # type: ignore


logger = logging.getLogger(__name__)


class GroupManager:
    """Telegram Web 群组管理器"""
    
    def __init__(self, page: Page, max_retries: int = 3, retry_delay: float = 5.0):
        """
        初始化群组管理器
        
        Args:
            page: Playwright Page 对象
            max_retries: 最大重试次数（网络错误时）
            retry_delay: 重试间隔（秒）
        """
        self.page = page
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.logger = logger
    
    async def join_group(self, invite_link: str, welcome_message: Optional[str] = None) -> bool:
        """
        通过邀请链接加入群组
        
        Args:
            invite_link: 群组邀请链接
            welcome_message: 加入后发送的欢迎消息（可选）
            
        Returns:
            bool: True 表示成功加入（或已加入），False 表示失败
        """
        self.logger.info(f"准备加入群组: {invite_link}")
        
        for attempt in range(self.max_retries):
            try:
                # 导航到邀请链接
                self.logger.debug(f"导航到邀请链接 (尝试 {attempt + 1}/{self.max_retries})")
                await self.page.goto(invite_link, wait_until="networkidle", timeout=30000)
                
                # 等待页面加载
                await asyncio.sleep(2)
                
                # 检查是否已经在群组中
                if await self._is_already_in_group():
                    self.logger.info("已在群组中，跳过加入")
                    
                    # 如果有欢迎消息，发送
                    if welcome_message:
                        await self._send_welcome_message(welcome_message)
                    
                    return True
                
                # 尝试点击加入按钮
                joined = await self._click_join_button()
                
                if joined:
                    self.logger.info("成功加入群组")
                    
                    # 等待页面稳定（3-5 秒随机）
                    wait_time = random.uniform(3, 5)
                    self.logger.debug(f"等待页面稳定: {wait_time:.1f} 秒")
                    await asyncio.sleep(wait_time)
                    
                    # 发送欢迎消息
                    if welcome_message:
                        await self._send_welcome_message(welcome_message)
                    
                    return True
                else:
                    self.logger.warning("未找到加入按钮或加入失败")
                    return False
                
            except PlaywrightTimeoutError as e:
                self.logger.warning(f"导航超时 (尝试 {attempt + 1}/{self.max_retries}): {e}")
                
                if attempt < self.max_retries - 1:
                    self.logger.info(f"等待 {self.retry_delay} 秒后重试...")
                    await asyncio.sleep(self.retry_delay)
                else:
                    self.logger.error("达到最大重试次数，加入群组失败")
                    return False
            
            except Exception as e:
                self.logger.error(f"加入群组时发生错误: {e}")
                return False
        
        return False
    
    async def _is_already_in_group(self) -> bool:
        """
        检查是否已经在群组中
        
        Returns:
            bool: True 表示已在群组中
        """
        try:
            # 检查多个可能的标识
            indicators = [
                ".chat-input",  # 输入框存在表示已在群组中
                "[contenteditable='true']",  # 可编辑输入框
                ".input-message-container",  # 消息输入容器
            ]
            
            for indicator in indicators:
                try:
                    await self.page.wait_for_selector(indicator, timeout=2000, state="visible")
                    self.logger.debug(f"检测到群组成员标识: {indicator}")
                    return True
                except PlaywrightTimeoutError:
                    continue
            
            return False
            
        except Exception as e:
            self.logger.debug(f"检查群组状态时出错: {e}")
            return False
    
    async def _click_join_button(self) -> bool:
        """
        点击加入群组按钮
        
        Returns:
            bool: True 表示成功点击
        """
        try:
            # 可能的加入按钮选择器
            join_button_selectors = [
                "button:has-text('Join')",
                "button:has-text('加入')",
                "button:has-text('JOIN')",
                "button:has-text('Join Group')",
                "button:has-text('加入群组')",
                ".btn-primary:has-text('Join')",
                ".btn-primary:has-text('加入')",
            ]
            
            for selector in join_button_selectors:
                try:
                    button = await self.page.wait_for_selector(
                        selector, 
                        timeout=3000, 
                        state="visible"
                    )
                    
                    if button:
                        self.logger.debug(f"找到加入按钮: {selector}")
                        await button.click()
                        
                        # 等待加入完成
                        await asyncio.sleep(2)
                        return True
                
                except PlaywrightTimeoutError:
                    continue
            
            self.logger.warning("未找到加入按钮")
            return False
            
        except Exception as e:
            self.logger.error(f"点击加入按钮时出错: {e}")
            return False
    
    async def _send_welcome_message(self, message: str) -> bool:
        """
        发送欢迎消息
        
        Args:
            message: 欢迎消息文本
            
        Returns:
            bool: True 表示发送成功
        """
        try:
            self.logger.info(f"发送欢迎消息: {message}")
            
            # 查找输入框
            input_selectors = [
                "[contenteditable='true']",
                ".input-message-input",
                "div[role='textbox']",
            ]
            
            input_box = None
            for selector in input_selectors:
                try:
                    input_box = await self.page.wait_for_selector(
                        selector,
                        timeout=3000,
                        state="visible"
                    )
                    if input_box:
                        break
                except PlaywrightTimeoutError:
                    continue
            
            if not input_box:
                self.logger.warning("未找到消息输入框")
                return False
            
            # 输入消息
            await input_box.click()
            await input_box.fill(message)
            await asyncio.sleep(0.5)
            
            # 发送消息（按 Enter）
            await self.page.keyboard.press("Enter")
            
            self.logger.info("欢迎消息发送成功")
            return True
            
        except Exception as e:
            self.logger.error(f"发送欢迎消息失败: {e}")
            return False
