"""消息监控单元测试（模拟 Playwright）"""

import pytest  # type: ignore[import-not-found]
from unittest.mock import AsyncMock, MagicMock

from teleflow.telegram_web.monitor import MessageMonitor


class TestMessageMonitor:
    """MessageMonitor 消息监控测试（使用 mock）"""

    @pytest.fixture
    def mock_page(self):
        """创建模拟的 Playwright Page 对象"""
        page = MagicMock()
        page.locator = MagicMock()
        page.query_selector = AsyncMock(return_value=None)
        page.query_selector_all = AsyncMock(return_value=[])
        page.wait_for_selector = AsyncMock()
        return page

    @pytest.fixture
    def monitor(self, mock_page):
        """创建 MessageMonitor 实例"""
        return MessageMonitor(mock_page, timeout=5.0)

    @pytest.mark.asyncio
    async def test_check_new_messages_timeout(self, monitor, mock_page):
        """检查新消息超时"""
        # 模拟超时
        mock_page.wait_for_selector = AsyncMock(side_effect=TimeoutError("Timeout"))

        result = await monitor.check_new_messages()

        # 超时应返回 False
        assert result is False

    @pytest.mark.asyncio
    async def test_get_latest_message_text_no_messages(self, monitor, mock_page):
        """没有消息时返回 None"""
        # 模拟没有消息气泡
        mock_page.query_selector_all = AsyncMock(return_value=[])

        result = await monitor.get_latest_message_text()

        assert result is None

    @pytest.mark.asyncio
    async def test_get_latest_message_text_timeout(self, monitor, mock_page):
        """获取消息超时"""
        # 模拟超时
        mock_page.wait_for_selector = AsyncMock(side_effect=TimeoutError("Timeout"))

        result = await monitor.get_latest_message_text()

        # 应该返回 None
        assert result is None
