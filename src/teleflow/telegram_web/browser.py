"""Telegram Web 浏览器管理器"""

import asyncio
from pathlib import Path
from typing import Optional

from playwright.async_api import async_playwright, Browser, BrowserContext, Page  # type: ignore


class BrowserManager:
    """Telegram Web 浏览器管理器
    
    负责启动和管理 Playwright 浏览器实例，支持会话持久化和无头模式。
    """
    
    def __init__(self, user_data_dir: Optional[Path] = None, headless: bool = True):
        """
        初始化浏览器管理器
        
        Args:
            user_data_dir: 浏览器用户数据目录，用于会话持久化
            headless: 是否使用无头模式
        """
        self.user_data_dir = user_data_dir.resolve() if user_data_dir else None
        self.headless = headless
        
        # Playwright 对象
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        
        # 状态标志
        self.is_launched = False
    
    async def launch(self) -> Page:
        """
        启动浏览器并返回页面对象
        
        Returns:
            Page: Playwright 页面对象
            
        Raises:
            Exception: 浏览器启动失败时抛出异常
        """
        if self.is_launched:
            return self.page
            
        try:
            # 启动 Playwright
            self.playwright = await async_playwright().start()
            
            # 确保用户数据目录存在
            if self.user_data_dir:
                self.user_data_dir.mkdir(parents=True, exist_ok=True)
            
            # 使用持久化上下文启动浏览器
            context_options = {
                "headless": self.headless,
                "viewport": {"width": 1280, "height": 720},
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "args": [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--disable-web-security",
                    "--disable-features=VizDisplayCompositor"
                ]
            }
            
            if self.user_data_dir:
                # 使用持久化上下文 API
                self.context = await self.playwright.chromium.launch_persistent_context(
                    str(self.user_data_dir),
                    **context_options
                )
            else:
                # 非持久化模式：先启动浏览器，再创建上下文
                self.browser = await self.playwright.chromium.launch(
                    headless=self.headless,
                    args=context_options["args"]
                )
                self.context = await self.browser.new_context(
                    viewport=context_options["viewport"],
                    user_agent=context_options["user_agent"]
                )
            
            # 获取或创建页面
            if self.context.pages:
                self.page = self.context.pages[0]
            else:
                self.page = await self.context.new_page()
            
            # 设置默认超时
            self.page.set_default_timeout(30000)  # 30秒
            
            self.is_launched = True
            
            return self.page
            
        except Exception as e:
            await self.close()
            raise Exception(f"浏览器启动失败: {e}")
    
    async def navigate_to_telegram(self) -> None:
        """
        导航到 Telegram Web
        
        Raises:
            Exception: 导航失败时抛出异常
        """
        if not self.is_launched or not self.page:
            raise Exception("浏览器未启动，请先调用 launch()")
            
        try:
            # 添加控制台日志监听（调试用）
            self.page.on("console", lambda msg: print(f"Console: {msg.text}"))
            
            # 导航到 Telegram Web
            await self.page.goto("https://web.telegram.org/", wait_until="domcontentloaded")
            
            # 等待页面关键元素加载（登录界面或聊天列表）
            try:
                await self.page.wait_for_selector(
                    'input[type="tel"], .chat-list, .chatlist-container', 
                    timeout=15000
                )
                print("✅ Telegram Web 页面加载成功")
            except Exception as wait_error:
                print(f"⚠️ 页面加载但未找到预期元素: {wait_error}")
                # 页面可能仍在加载，继续执行
            
        except Exception as e:
            raise Exception(f"导航到 Telegram Web 失败: {e}")
    
    async def close(self) -> None:
        """优雅关闭浏览器和 Playwright"""
        try:
            if self.page:
                await self.page.close()
                self.page = None
                
            if self.context:
                await self.context.close()
                self.context = None
                
            if self.browser:
                await self.browser.close()
                self.browser = None
                
            if self.playwright:
                await self.playwright.stop()
                self.playwright = None
                
        except Exception as e:
            # 忽略关闭时的错误，只记录日志
            print(f"关闭浏览器时出现警告: {e}")
            
        finally:
            self.is_launched = False
    
    def __del__(self):
        """析构函数，确保资源释放"""
        if self.is_launched:
            # 注意：这里不能使用 await，因为 __del__ 不是异步的
            # 实际使用时应该显式调用 close()
            pass
