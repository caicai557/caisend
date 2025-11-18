"""消息操作单元测试（模拟 Playwright）"""

import pytest  # type: ignore[import-not-found]
from unittest.mock import AsyncMock, MagicMock

from teleflow.telegram_web.actions import MessageActions


class TestMessageActions:
    """MessageActions 消息操作测试（使用 mock）"""

    @pytest.fixture
    def mock_page(self):
        """创建模拟的 Playwright Page 对象"""
        page = MagicMock()
        page.locator = MagicMock()
        page.wait_for_selector = AsyncMock()
        page.query_selector = AsyncMock(return_value=None)
        page.query_selector_all = AsyncMock(return_value=[])
        return page

    @pytest.fixture
    def actions(self, mock_page):
        """创建 MessageActions 实例"""
        return MessageActions(mock_page, max_retries=2, retry_delay=0.1)

    @pytest.mark.asyncio
    async def test_mark_as_read_timeout(self, actions, mock_page):
        """标记已读超时"""
        # 模拟超时
        mock_page.wait_for_selector = AsyncMock(side_effect=TimeoutError("Timeout"))

        result = await actions.mark_as_read()

        # 超时后应返回 False
        assert result is False

    @pytest.mark.asyncio
    async def test_send_message_empty_text(self, actions, mock_page):
        """发送空消息失败"""
        result = await actions.send_message("")

        assert result is False

    @pytest.mark.asyncio
    async def test_send_message_whitespace_only(self, actions, mock_page):
        """发送纯空白字符失败"""
        result = await actions.send_message("   ")

        assert result is False

    @pytest.mark.asyncio
    async def test_send_message_timeout(self, actions, mock_page):
        """发送消息超时"""
        # 模拟超时
        mock_page.wait_for_selector = AsyncMock(side_effect=TimeoutError("Timeout"))

        result = await actions.send_message("Hello!")

        # 超时后应返回 False
        assert result is False
