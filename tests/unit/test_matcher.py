"""规则匹配器单元测试"""

from pathlib import Path

import pytest  # type: ignore[import-not-found]

from teleflow.models.account import Account
from teleflow.models.rule import Rule
from teleflow.rules.engine import PatternMatcher, RuleEngine


class TestPatternMatcher:
    """PatternMatcher 核心功能测试"""

    def test_literal_match_case_insensitive(self):
        """字面量匹配（不区分大小写）"""
        matcher = PatternMatcher(case_sensitive=False)

        assert matcher.matches("Hello World", "hello")
        assert matcher.matches("HELLO", "hello")
        assert not matcher.matches("hi", "hello")

    def test_literal_match_case_sensitive(self):
        """字面量匹配（区分大小写）"""
        matcher = PatternMatcher(case_sensitive=True)

        assert matcher.matches("Hello World", "Hello")
        assert not matcher.matches("HELLO", "hello")

    def test_wildcard_asterisk(self):
        """通配符 * 匹配"""
        matcher = PatternMatcher(case_sensitive=False)

        assert matcher.matches("hello world", "hello*")
        assert matcher.matches("meeting at 3pm", "*meeting*")
        assert not matcher.matches("hi there", "hello*")

    def test_wildcard_question_mark(self):
        """通配符 ? 匹配"""
        matcher = PatternMatcher(case_sensitive=False)

        assert matcher.matches("hello", "h?llo")
        assert matcher.matches("hallo", "h?llo")
        assert not matcher.matches("hllo", "h?llo")

    def test_empty_inputs(self):
        """空输入边界测试"""
        matcher = PatternMatcher()

        assert not matcher.matches("", "hello")
        assert not matcher.matches("hello", "")
        assert not matcher.matches("", "")


class TestRuleEngineMatching:
    """RuleEngine 规则匹配与优先级测试"""

    def _build_account(self, rules):
        return Account(
            name="test",
            browser_data_dir=None,
            monitor_chats=["@target"],
            rules=rules,
            group_invites=[],
        )

    def test_single_rule_match(self):
        """单规则匹配"""
        rule = Rule(
            keywords=["hello"],
            reply_text="Hi!",
            fixed_delay=1,
            random_delay_max=0,
            case_sensitive=False,
            enabled=True,
            use_regex=False,
            next_id=None,
            description=None,
        )
        account = self._build_account([rule])
        engine = RuleEngine(account)

        result = engine.process_message("hello there")

        assert result.matched
        assert result.reply_text == "Hi!"
        assert result.matched_keyword == "hello"

    def test_multiple_rules_priority(self):
        """多规则优先级（返回第一个匹配）"""
        rule1 = Rule(
            keywords=["hello"],
            reply_text="First",
            fixed_delay=1,
            random_delay_max=0,
            case_sensitive=False,
            enabled=True,
            use_regex=False,
            next_id=None,
            description=None,
        )
        rule2 = Rule(
            keywords=["hello"],
            reply_text="Second",
            fixed_delay=1,
            random_delay_max=0,
            case_sensitive=False,
            enabled=True,
            use_regex=False,
            next_id=None,
            description=None,
        )
        account = self._build_account([rule1, rule2])
        engine = RuleEngine(account)

        result = engine.process_message("hello")

        assert result.matched
        assert result.reply_text == "First"

    def test_no_match(self):
        """无匹配规则"""
        rule = Rule(
            keywords=["hello"],
            reply_text="Hi!",
            fixed_delay=1,
            random_delay_max=0,
            case_sensitive=False,
            enabled=True,
            use_regex=False,
            next_id=None,
            description=None,
        )
        account = self._build_account([rule])
        engine = RuleEngine(account)

        result = engine.process_message("goodbye")

        assert not result.matched
        assert result.reply_text is None

    def test_disabled_rule_ignored(self):
        """禁用规则被忽略"""
        rule = Rule(
            keywords=["hello"],
            reply_text="Hi!",
            fixed_delay=1,
            random_delay_max=0,
            case_sensitive=False,
            enabled=False,
            use_regex=False,
            next_id=None,
            description=None,
        )
        account = self._build_account([rule])
        engine = RuleEngine(account)

        result = engine.process_message("hello")

        assert not result.matched
