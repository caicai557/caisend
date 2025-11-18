"""数据模型单元测试"""

from pathlib import Path

import pytest  # type: ignore[import-not-found]
from pydantic import ValidationError

from teleflow.models.account import Account
from teleflow.models.chat import Chat
from teleflow.models.config import TeleflowConfig
from teleflow.models.rule import Rule


class TestAccountModel:
    """Account 模型测试"""

    def test_account_defaults_browser_data_dir(self):
        account = Account(
            name="primary",
            browser_data_dir=None,
            monitor_chats=["@target"],
            rules=[],
            group_invites=[],
        )

        assert account.browser_data_dir == Path("./browser_data/primary")

    def test_account_rejects_blank_name(self):
        with pytest.raises(ValidationError):
            Account(
                name="   ",
                browser_data_dir=None,
                monitor_chats=["@target"],
                rules=[],
                group_invites=[],
            )


class TestRuleModel:
    """Rule 模型测试"""

    def test_rule_trims_keyword_and_reply_text(self):
        rule = Rule(
            keywords=["  hello  "],
            reply_text="  hi  ",
            fixed_delay=1,
            random_delay_max=2,
            case_sensitive=False,
            enabled=True,
            use_regex=False,
            next_id=None,
            description=None,
        )

        assert rule.keywords == ["hello"]
        assert rule.reply_text == "hi"
        assert rule.get_total_delay_range() == (1.0, 3.0)

    def test_rule_requires_keywords(self):
        with pytest.raises(ValidationError):
            Rule(
                keywords=[],
                reply_text="hi",
                fixed_delay=1,
                random_delay_max=2,
                case_sensitive=False,
                enabled=True,
                use_regex=False,
                next_id=None,
                description=None,
            )


class TestChatModel:
    """Chat 模型测试"""

    def test_chat_trims_fields(self):
        chat = Chat(
            target_username="  @friend  ",
            display_name="  Friend  ",
            enabled=True,
            auto_read=True,
            rules=[],
        )

        assert chat.target_username == "@friend"
        assert chat.display_name == "Friend"

    def test_chat_requires_target(self):
        with pytest.raises(ValidationError):
            Chat(
                target_username="   ",
                display_name=None,
                enabled=True,
                auto_read=True,
                rules=[],
            )


class TestTeleflowConfigModel:
    """TeleflowConfig 模型测试"""

    def _build_account_data(self) -> dict:
        account = Account(
            name="primary",
            browser_data_dir=None,
            monitor_chats=["@target"],
            rules=[
                Rule(
                    keywords=["hello"],
                    reply_text="Hi",
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
        return account.model_dump(mode="python")

    def test_config_accepts_valid_account(self):
        config = TeleflowConfig.model_validate(
            {
                "version": "1.0",
                "accounts": [self._build_account_data()],
                "default_account": "primary",
            }
        )

        assert config.get_account("primary") is not None
        assert config.get_effective_rules("primary")[0].reply_text == "Hi"

    def test_config_requires_accounts(self):
        with pytest.raises(ValidationError):
            TeleflowConfig.model_validate(
                {
                    "version": "1.0",
                    "accounts": [],
                }
            )

    def test_config_rejects_unknown_default_account(self):
        with pytest.raises(ValidationError):
            TeleflowConfig.model_validate(
                {
                    "version": "1.0",
                    "accounts": [self._build_account_data()],
                    "default_account": "missing",
                }
            )

    def test_config_rejects_duplicate_account_names(self):
        duplicate_account = self._build_account_data()
        duplicate_copy = dict(duplicate_account)
        with pytest.raises(ValidationError):
            TeleflowConfig.model_validate(
                {
                    "version": "1.0",
                    "accounts": [duplicate_account, duplicate_copy],
                }
            )

