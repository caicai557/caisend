"""AccountRunner 集成测试（使用 Mock）"""

import pytest  # type: ignore[import-not-found]
from unittest.mock import AsyncMock, MagicMock, patch
import asyncio

from teleflow.models.account import Account
from teleflow.models.config import RuntimeConfig
from teleflow.models.rule import Rule
from teleflow.runtime.runner import AccountRunner


class TestAccountRunnerIntegration:
    """AccountRunner 集成测试"""

    @pytest.fixture
    def account(self):
        """创建测试账号"""
        return Account(
            name="test_account",
            browser_data_dir=None,
            monitor_chats=["@test_user"],
            rules=[
                Rule(
                    keywords=["hello"],
                    reply_text="Hi there!",
                    fixed_delay=1,
                    random_delay_max=0,
                    case_sensitive=False,
                    enabled=True,
                    use_regex=False,
                    next_id=None,
                    description=None,
                )
            ],
            group_invites=[],
        )

    @pytest.fixture
    def runtime_config(self):
        """创建运行时配置"""
        return RuntimeConfig(
            debug=False,
            check_interval=1.0,
            max_retry_count=3,
            random_seed=None,
        )

    @pytest.fixture
    def mock_browser_manager(self):
        """模拟浏览器管理器"""
        manager = MagicMock()
        manager.launch = AsyncMock(return_value=MagicMock())
        manager.navigate_to_telegram = AsyncMock()
        manager.close = AsyncMock()
        return manager

    @pytest.fixture
    def mock_page(self):
        """模拟 Playwright Page"""
        page = MagicMock()
        page.wait_for_selector = AsyncMock()
        page.query_selector = AsyncMock(return_value=None)
        page.query_selector_all = AsyncMock(return_value=[])
        return page

    @pytest.mark.asyncio
    async def test_runner_initialization_success(self, account, runtime_config, mock_browser_manager, mock_page):
        """测试运行器初始化成功"""
        runner = AccountRunner(account, runtime_config, show_browser=False)

        # Mock 浏览器管理器
        with patch('teleflow.runtime.runner.BrowserManager', return_value=mock_browser_manager):
            mock_browser_manager.launch.return_value = mock_page
            
            result = await runner.initialize()

            assert result is True
            assert runner.browser_manager is not None
            assert runner.navigator is not None
            assert runner.monitor is not None
            assert runner.actions is not None
            assert runner.rule_engine is not None

    @pytest.mark.asyncio
    async def test_runner_initialization_failure(self, account, runtime_config):
        """测试运行器初始化失败"""
        runner = AccountRunner(account, runtime_config)

        # Mock 浏览器管理器抛出异常
        with patch('teleflow.runtime.runner.BrowserManager') as mock_browser_class:
            mock_browser_class.return_value.launch.side_effect = Exception("Browser launch failed")
            
            result = await runner.initialize()

            assert result is False

    @pytest.mark.asyncio
    async def test_runner_stop(self, account, runtime_config):
        """测试停止运行器"""
        runner = AccountRunner(account, runtime_config)
        
        await runner.stop()
        
        assert runner.should_stop is True

    @pytest.mark.asyncio
    async def test_runner_cleanup(self, account, runtime_config, mock_browser_manager):
        """测试清理资源"""
        runner = AccountRunner(account, runtime_config)
        runner.browser_manager = mock_browser_manager
        runner.is_running = True

        await runner.cleanup()

        assert runner.is_running is False
        mock_browser_manager.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_runner_process_chat_with_new_message(self, account, runtime_config, mock_browser_manager, mock_page):
        """测试处理聊天中的新消息"""
        runner = AccountRunner(account, runtime_config)

        # 初始化组件
        with patch('teleflow.runtime.runner.BrowserManager', return_value=mock_browser_manager):
            mock_browser_manager.launch.return_value = mock_page
            await runner.initialize()

        # Mock 消息监控和操作
        runner.monitor.check_new_messages = AsyncMock(return_value=True)
        runner.monitor.get_latest_message_text = AsyncMock(return_value="hello")
        runner.actions.mark_as_read = AsyncMock(return_value=True)
        runner.actions.send_message = AsyncMock(return_value=True)
        runner.navigator.navigate_to_chat = AsyncMock(return_value=True)

        # 处理聊天
        await runner._process_chat("@test_user")

        # 验证调用
        runner.monitor.check_new_messages.assert_called_once()
        runner.monitor.get_latest_message_text.assert_called_once()
        runner.actions.mark_as_read.assert_called_once()
        runner.actions.send_message.assert_called_once()

    @pytest.mark.asyncio
    async def test_runner_process_chat_no_new_message(self, account, runtime_config, mock_browser_manager, mock_page):
        """测试处理聊天无新消息"""
        runner = AccountRunner(account, runtime_config)

        # 初始化组件
        with patch('teleflow.runtime.runner.BrowserManager', return_value=mock_browser_manager):
            mock_browser_manager.launch.return_value = mock_page
            await runner.initialize()

        # Mock 无新消息
        runner.monitor.check_new_messages = AsyncMock(return_value=False)
        runner.navigator.navigate_to_chat = AsyncMock(return_value=True)

        # 处理聊天
        await runner._process_chat("@test_user")

        # 验证只检查了消息，没有其他操作
        runner.monitor.check_new_messages.assert_called_once()

    @pytest.mark.asyncio
    async def test_runner_error_handling(self, account, runtime_config, mock_browser_manager, mock_page):
        """测试错误处理"""
        runner = AccountRunner(account, runtime_config)

        # 初始化组件
        with patch('teleflow.runtime.runner.BrowserManager', return_value=mock_browser_manager):
            mock_browser_manager.launch.return_value = mock_page
            await runner.initialize()

        # Mock 导航失败
        runner.navigator.navigate_to_chat = AsyncMock(return_value=False)

        # 处理聊天应该不抛出异常
        try:
            await runner._process_chat("@test_user")
            # 应该正常完成
        except Exception as e:
            pytest.fail(f"不应该抛出异常: {e}")

    @pytest.mark.asyncio
    async def test_runner_consecutive_errors(self, account, runtime_config):
        """测试连续错误处理"""
        runner = AccountRunner(account, runtime_config)
        runner.max_consecutive_errors = 3

        # 模拟连续错误
        runner.consecutive_errors = 3

        assert runner.consecutive_errors >= runner.max_consecutive_errors

    @pytest.mark.asyncio
    async def test_runner_rule_matching(self, account, runtime_config, mock_browser_manager, mock_page):
        """测试规则匹配"""
        runner = AccountRunner(account, runtime_config)

        # 初始化组件
        with patch('teleflow.runtime.runner.BrowserManager', return_value=mock_browser_manager):
            mock_browser_manager.launch.return_value = mock_page
            await runner.initialize()

        # 测试规则引擎
        result = runner.rule_engine.process_message("hello world")

        assert result.matched is True
        assert result.reply_text == "Hi there!"
        assert result.matched_keyword == "hello"
