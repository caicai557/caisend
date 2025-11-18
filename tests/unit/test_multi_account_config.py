"""多账号配置单元测试"""

import pytest  # type: ignore[import-not-found]
from pathlib import Path

from teleflow.models.account import Account
from teleflow.models.config import TeleflowConfig
from teleflow.models.rule import Rule


class TestMultiAccountConfig:
    """多账号配置测试"""

    def test_multiple_accounts_creation(self):
        """创建多账号配置"""
        account1 = Account(
            name="account1",
            browser_data_dir=None,
            monitor_chats=["@user1"],
            rules=[],
            group_invites=[],
        )
        account2 = Account(
            name="account2",
            browser_data_dir=None,
            monitor_chats=["@user2"],
            rules=[],
            group_invites=[],
        )

        config = TeleflowConfig(
            version="1.0",
            accounts=[account1, account2],
            default_account="account1",
        )

        assert len(config.accounts) == 2
        assert config.default_account == "account1"

    def test_get_account_by_name(self):
        """根据名称获取账号"""
        account1 = Account(
            name="primary",
            browser_data_dir=None,
            monitor_chats=["@friend"],
            rules=[],
            group_invites=[],
        )
        account2 = Account(
            name="secondary",
            browser_data_dir=None,
            monitor_chats=["@colleague"],
            rules=[],
            group_invites=[],
        )

        config = TeleflowConfig(
            version="1.0",
            accounts=[account1, account2],
        )

        retrieved = config.get_account("primary")
        assert retrieved is not None
        assert retrieved.name == "primary"

        retrieved2 = config.get_account("secondary")
        assert retrieved2 is not None
        assert retrieved2.name == "secondary"

    def test_get_nonexistent_account(self):
        """获取不存在的账号"""
        account = Account(
            name="test",
            browser_data_dir=None,
            monitor_chats=[],
            rules=[],
            group_invites=[],
        )

        config = TeleflowConfig(
            version="1.0",
            accounts=[account],
        )

        result = config.get_account("nonexistent")
        assert result is None

    def test_account_name_uniqueness(self):
        """账号名称必须唯一"""
        account1 = Account(
            name="duplicate",
            browser_data_dir=None,
            monitor_chats=[],
            rules=[],
            group_invites=[],
        )
        account2 = Account(
            name="duplicate",
            browser_data_dir=None,
            monitor_chats=[],
            rules=[],
            group_invites=[],
        )

        with pytest.raises(ValueError, match="账号名称必须唯一"):
            TeleflowConfig(
                version="1.0",
                accounts=[account1, account2],
            )

    def test_default_account_must_exist(self):
        """默认账号必须存在于账号列表中"""
        account = Account(
            name="test",
            browser_data_dir=None,
            monitor_chats=[],
            rules=[],
            group_invites=[],
        )

        with pytest.raises(ValueError, match="默认账号.*不在账号列表中"):
            TeleflowConfig(
                version="1.0",
                accounts=[account],
                default_account="nonexistent",
            )

    def test_account_browser_data_dir_isolation(self):
        """账号浏览器数据目录隔离"""
        account1 = Account(
            name="account1",
            browser_data_dir=None,
            monitor_chats=[],
            rules=[],
            group_invites=[],
        )
        account2 = Account(
            name="account2",
            browser_data_dir=None,
            monitor_chats=[],
            rules=[],
            group_invites=[],
        )

        # 默认路径应该不同
        assert account1.browser_data_dir != account2.browser_data_dir
        assert "account1" in str(account1.browser_data_dir)
        assert "account2" in str(account2.browser_data_dir)

    def test_get_effective_rules_global_fallback(self):
        """账号无规则时使用全局规则"""
        global_rule = Rule(
            keywords=["global"],
            reply_text="Global response",
            fixed_delay=1,
            random_delay_max=0,
            case_sensitive=False,
            enabled=True,
            use_regex=False,
            next_id=None,
            description=None,
        )

        account = Account(
            name="test",
            browser_data_dir=None,
            monitor_chats=[],
            rules=[],
            group_invites=[],
        )

        config = TeleflowConfig(
            version="1.0",
            accounts=[account],
            global_rules=[global_rule],
        )

        effective_rules = config.get_effective_rules("test")
        assert len(effective_rules) == 1
        assert effective_rules[0].keywords == ["global"]

    def test_get_effective_rules_account_override(self):
        """账号特定规则覆盖全局规则"""
        global_rule = Rule(
            keywords=["global"],
            reply_text="Global response",
            fixed_delay=1,
            random_delay_max=0,
            case_sensitive=False,
            enabled=True,
            use_regex=False,
            next_id=None,
            description=None,
        )

        account_rule = Rule(
            keywords=["account"],
            reply_text="Account response",
            fixed_delay=1,
            random_delay_max=0,
            case_sensitive=False,
            enabled=True,
            use_regex=False,
            next_id=None,
            description=None,
        )

        account = Account(
            name="test",
            browser_data_dir=None,
            monitor_chats=[],
            rules=[account_rule],
            group_invites=[],
        )

        config = TeleflowConfig(
            version="1.0",
            accounts=[account],
            global_rules=[global_rule],
        )

        effective_rules = config.get_effective_rules("test")
        assert len(effective_rules) == 1
        assert effective_rules[0].keywords == ["account"]
