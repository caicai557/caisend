"""单账号端到端集成测试"""

import pytest  # type: ignore[import-not-found]
from pathlib import Path

from teleflow.config.loader import ConfigLoader
from teleflow.models.account import Account
from teleflow.models.rule import Rule
from teleflow.rules.engine import RuleEngine


class TestSingleAccountIntegration:
    """单账号端到端流程集成测试（不涉及实际浏览器）"""

    def test_config_to_rule_engine_flow(self):
        """配置加载 → 规则引擎 → 消息匹配流程"""
        # 1. 加载配置
        loader = ConfigLoader()
        config_path = Path(__file__).resolve().parents[1] / "fixtures" / "config_samples" / "valid_config.yaml"
        config = loader.load_from_file(config_path)

        # 2. 获取账号
        account = config.get_account("primary")
        assert account is not None

        # 3. 创建规则引擎
        engine = RuleEngine(account)

        # 4. 测试消息匹配
        result = engine.process_message("hello there")

        assert result.matched
        assert result.reply_text is not None
        assert result.delay >= 0

    def test_account_with_multiple_rules(self):
        """多规则账号的优先级匹配"""
        rule1 = Rule(
            keywords=["urgent"],
            reply_text="Urgent response",
            fixed_delay=0,
            random_delay_max=0,
            case_sensitive=False,
            enabled=True,
            use_regex=False,
            next_id=None,
            description=None,
        )
        rule2 = Rule(
            keywords=["hello"],
            reply_text="Normal response",
            fixed_delay=1,
            random_delay_max=1,
            case_sensitive=False,
            enabled=True,
            use_regex=False,
            next_id=None,
            description=None,
        )

        account = Account(
            name="test",
            browser_data_dir=None,
            monitor_chats=["@target"],
            rules=[rule1, rule2],
            group_invites=[],
        )

        engine = RuleEngine(account)

        # 匹配第一条规则
        result1 = engine.process_message("urgent message")
        assert result1.matched
        assert result1.reply_text == "Urgent response"

        # 匹配第二条规则
        result2 = engine.process_message("hello friend")
        assert result2.matched
        assert result2.reply_text == "Normal response"

    def test_disabled_rule_skipped(self):
        """禁用规则被跳过"""
        rule_disabled = Rule(
            keywords=["skip"],
            reply_text="Should not match",
            fixed_delay=0,
            random_delay_max=0,
            case_sensitive=False,
            enabled=False,
            use_regex=False,
            next_id=None,
            description=None,
        )
        rule_enabled = Rule(
            keywords=["active"],
            reply_text="Active response",
            fixed_delay=0,
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
            monitor_chats=["@target"],
            rules=[rule_disabled, rule_enabled],
            group_invites=[],
        )

        engine = RuleEngine(account)

        # 禁用规则不匹配
        result1 = engine.process_message("skip this")
        assert not result1.matched

        # 启用规则匹配
        result2 = engine.process_message("active now")
        assert result2.matched
        assert result2.reply_text == "Active response"

    def test_wildcard_matching_integration(self):
        """通配符匹配集成测试"""
        rule = Rule(
            keywords=["*meeting*", "schedule?"],
            reply_text="Meeting confirmed",
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
            monitor_chats=["@target"],
            rules=[rule],
            group_invites=[],
        )

        engine = RuleEngine(account)

        # 通配符 * 匹配
        result1 = engine.process_message("urgent meeting at 3pm")
        assert result1.matched
        assert result1.matched_keyword == "*meeting*"

        # 通配符 ? 匹配
        result2 = engine.process_message("schedule1")
        assert result2.matched
        assert result2.matched_keyword == "schedule?"
