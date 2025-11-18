"""规则引擎集成测试（独立于外部配置文件）"""

from __future__ import annotations

from pathlib import Path
from typing import List

import pytest  # type: ignore[import-not-found]

from teleflow.config.loader import ConfigLoader
from teleflow.models.account import Account
from teleflow.models.config import (
    TeleflowConfig,
    LoggingConfig,
    BrowserConfig,
    RuntimeConfig,
)
from teleflow.models.rule import Rule
from teleflow.rules.engine import MatchResult, RuleEngine


def _create_rule(
    keywords: List[str],
    reply_text: str,
    *,
    fixed_delay: int = 0,
    random_delay_max: int = 0,
    case_sensitive: bool = False,
    enabled: bool = True,
    use_regex: bool = False,
    next_id: str | None = None,
    description: str | None = None,
) -> Rule:
    """创建测试用 Rule 对象"""
    return Rule(
        keywords=keywords,
        reply_text=reply_text,
        fixed_delay=fixed_delay,
        random_delay_max=random_delay_max,
        case_sensitive=case_sensitive,
        enabled=enabled,
        use_regex=use_regex,
        next_id=next_id,
        description=description,
    )


def _create_account(name: str, rules: List[Rule]) -> Account:
    """创建测试账号配置"""
    return Account(
        name=name,
        browser_data_dir=None,
        monitor_chats=["@test"],
        rules=rules,
    )


def _create_config(accounts: List[Account]) -> TeleflowConfig:
    """创建根配置"""
    return TeleflowConfig(
        version="1.0",
        accounts=accounts,
        default_account=accounts[0].name if accounts else None,
        logging=LoggingConfig(),
        browser=BrowserConfig(),
        runtime=RuntimeConfig(),
    )


@pytest.fixture
def config_loader() -> ConfigLoader:
    return ConfigLoader()


@pytest.fixture
def base_rule() -> Rule:
    return _create_rule(["hello", "hi"], "Hello there!", fixed_delay=1, random_delay_max=2)


@pytest.fixture
def base_account(base_rule: Rule) -> Account:
    return _create_account("test_account", [base_rule])


@pytest.fixture
def sample_config(base_account: Account) -> TeleflowConfig:
    return _create_config([base_account])


@pytest.fixture
def config_file(tmp_path: Path) -> Path:
    """生成最小 YAML 配置供 load_from_file 验证使用"""
    config_path = tmp_path / "config.yaml"
    config_yaml = """
version: "1.0"
accounts:
  - name: "file_account"
    monitor_chats: ["@test"]
    rules:
      - keywords: ["hello"]
        reply_text: "Hello from file"
        fixed_delay: 1
        random_delay_max: 1
default_account: "file_account"
"""
    config_path.write_text(config_yaml.strip(), encoding="utf-8")
    return config_path


def test_load_config_and_create_rule_engine(config_loader: ConfigLoader, config_file: Path):
    """验证从文件加载并创建规则引擎"""
    config = config_loader.load_from_file(config_file)

    assert config.accounts
    assert config.accounts[0].rules

    engine = RuleEngine(config.accounts[0])
    assert engine.account == config.accounts[0]
    assert engine.get_effective_rules()


def test_rule_engine_with_real_config(sample_config: TeleflowConfig):
    """使用内联配置验证匹配结构"""
    engine = RuleEngine(sample_config.accounts[0])
    result = engine.process_message("hello there")

    assert isinstance(result, MatchResult)
    assert hasattr(result, "matched")
    assert hasattr(result, "rule")
    assert hasattr(result, "reply_text")
    assert hasattr(result, "delay")
    assert hasattr(result, "matched_keyword")


def test_rule_engine_with_minimal_config():
    """最小配置也能工作"""
    rule = _create_rule(["test"], "OK")
    account = _create_account("minimal", [rule])
    config = _create_config([account])

    engine = RuleEngine(config.accounts[0])
    result = engine.process_message("test message")

    assert isinstance(result, MatchResult)


def test_config_update_and_rule_engine_sync(sample_config: TeleflowConfig):
    """更新配置后规则引擎同步"""
    engine = RuleEngine(sample_config.accounts[0])
    initial_count = len(engine.get_effective_rules())

    new_rule = _create_rule(["new_test"], "New reply!", fixed_delay=1)
    sample_config.accounts[0].rules.append(new_rule)

    engine.update_account(sample_config.accounts[0])

    assert len(engine.get_effective_rules()) == initial_count + 1

    result = engine.process_message("new_test")
    assert result.matched
    assert result.reply_text == "New reply!"


def test_rule_engine_with_disabled_rules(sample_config: TeleflowConfig):
    """禁用规则后不应匹配"""
    for rule in sample_config.accounts[0].rules:
        rule.enabled = False

    engine = RuleEngine(sample_config.accounts[0])
    result = engine.process_message("hello there")

    assert not result.matched
    assert result.rule is None
    assert result.reply_text is None


def test_rule_engine_case_sensitivity_from_config():
    """验证大小写敏感配置生效"""
    sensitive_rule = _create_rule(["Hello"], "Case sensitive", case_sensitive=True)
    insensitive_rule = _create_rule(["hi"], "Hi")
    account = _create_account("case_account", [sensitive_rule, insensitive_rule])
    config = _create_config([account])

    engine = RuleEngine(config.accounts[0])

    assert engine.process_message("Hello").matched
    assert not engine.process_message("HELLO").matched


def test_rule_engine_delay_from_config(base_account: Account):
    """验证延迟范围来自配置"""
    rule = _create_rule(["delay"], "Delay", fixed_delay=2, random_delay_max=3)
    base_account.rules.append(rule)
    config = _create_config([base_account])

    engine = RuleEngine(config.accounts[0])
    result = engine.process_message("delay")

    assert result.matched
    min_delay, max_delay = rule.get_total_delay_range()
    assert min_delay <= result.delay <= max_delay


def test_multiple_accounts_rule_engines(base_rule: Rule):
    """多个账号的规则引擎彼此独立"""
    second_rule = _create_rule(["account2"], "Hi from account2")
    account1 = _create_account("account1", [base_rule])
    account2 = _create_account("account2", [second_rule])
    config = _create_config([account1, account2])

    engines = [RuleEngine(account) for account in config.accounts]

    assert len(engines) == 2
    assert engines[0].process_message("hello").matched
    assert engines[1].process_message("account2").matched
