"""导航逻辑单元测试（模拟 Playwright）"""

import pytest  # type: ignore[import-not-found]
from unittest.mock import AsyncMock, MagicMock

from teleflow.telegram_web.navigator import ChatNavigator


class TestChatNavigator:
    """ChatNavigator 导航逻辑测试（使用 mock）"""

    @pytest.fixture
    def mock_page(self):
        """创建模拟的 Playwright Page 对象"""
        page = MagicMock()
        page.goto = AsyncMock()
        page.query_selector = AsyncMock()
        page.wait_for_selector = AsyncMock()
        page.locator = MagicMock()
        return page

    @pytest.fixture
    def navigator(self, mock_page):
        """创建 ChatNavigator 实例"""
        return ChatNavigator(mock_page, max_retries=3, retry_delay=0.1)

    @pytest.mark.asyncio
    async def test_check_login_status_logged_in(self, navigator, mock_page):
        """检查登录状态 - 已登录"""
        # 模拟已登录：无登录输入框，有聊天列表
        mock_page.query_selector = AsyncMock(side_effect=[None, MagicMock()])

        result = await navigator.check_login_status()

        assert result is True

    @pytest.mark.asyncio
    async def test_check_login_status_not_logged_in(self, navigator, mock_page):
        """检查登录状态 - 未登录"""
        # 模拟未登录：有登录输入框
        mock_page.query_selector = AsyncMock(return_value=MagicMock())

        result = await navigator.check_login_status()

        assert result is False

    @pytest.mark.asyncio
    async def test_navigate_to_chat_not_logged_in(self, navigator, mock_page):
        """未登录时导航失败"""
        # 模拟未登录状态
        mock_page.query_selector = AsyncMock(return_value=MagicMock())

        result = await navigator.navigate_to_chat("@friend")

        assert result is False
