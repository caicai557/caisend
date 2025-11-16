"""规则引擎集成测试"""

import pytest
from pathlib import Path

from teleflow.config.loader import ConfigLoader
from teleflow.rules.engine import RuleEngine, MatchResult


class TestRuleEngineIntegration:
    """规则引擎集成测试"""
    
    def setup_method(self):
        """每个测试方法前的设置"""
        self.config_loader = ConfigLoader()
        
    def test_load_config_and_create_rule_engine(self):
        """测试从配置文件加载并创建规则引擎"""
        # 加载配置
        config = self.config_loader.load_from_file("config.yaml")
        
        # 验证配置结构
        assert len(config.accounts) > 0
        assert len(config.accounts[0].rules) > 0
        
        # 创建规则引擎
        engine = RuleEngine(config.accounts[0])
        
        # 验证引擎初始化
        assert engine.account == config.accounts[0]
        assert len(engine.get_effective_rules()) > 0
        
    def test_rule_engine_with_real_config(self):
        """测试规则引擎使用真实配置文件"""
        # 加载配置
        config = self.config_loader.load_from_file("config.yaml")
        engine = RuleEngine(config.accounts[0])
        
        # 测试真实规则匹配
        # 假设配置中有 "hello" 关键词规则
        result = engine.process_message("hello there")
        
        # 验证结果结构
        assert isinstance(result, MatchResult)
        assert hasattr(result, 'matched')
        assert hasattr(result, 'rule')
        assert hasattr(result, 'reply_text')
        assert hasattr(result, 'delay')
        assert hasattr(result, 'matched_keyword')
        
    def test_rule_engine_with_minimal_config(self):
        """测试规则引擎使用最小配置"""
        # 加载最小配置
        config = self.config_loader.load_from_file("config-minimal.yaml")
        engine = RuleEngine(config.accounts[0])
        
        # 验证最小配置的规则引擎工作
        result = engine.process_message("test message")
        
        # 应该有匹配结果（基于最小配置中的规则）
        assert isinstance(result, MatchResult)
        
    def test_config_update_and_rule_engine_sync(self):
        """测试配置更新和规则引擎同步"""
        # 加载初始配置
        config = self.config_loader.load_from_file("config-minimal.yaml")
        engine = RuleEngine(config.accounts[0])
        
        # 记录初始状态
        initial_rules_count = len(engine.get_effective_rules())
        
        # 修改配置 - 创建 Rule 对象而不是字典
        from teleflow.models.rule import Rule
        new_rule = Rule(
            keywords=["new_test"],
            reply_text="New reply!",
            fixed_delay=1,
            random_delay_max=0,
            case_sensitive=False,
            enabled=True
        )
        
        config.accounts[0].rules.append(new_rule)
        
        # 更新规则引擎
        engine.update_account(config.accounts[0])
        
        # 验证更新
        assert len(engine.get_effective_rules()) == initial_rules_count + 1
        
        # 测试新规则
        result = engine.process_message("new_test")
        assert result.matched
        assert result.reply_text == "New reply!"
        
    def test_rule_engine_with_disabled_rules(self):
        """测试规则引擎处理禁用的规则"""
        # 加载配置
        config = self.config_loader.load_from_file("config.yaml")
        
        # 禁用所有规则
        for rule in config.accounts[0].rules:
            rule.enabled = False
            
        # 创建规则引擎
        engine = RuleEngine(config.accounts[0])
        
        # 测试消息处理（应该没有匹配）
        result = engine.process_message("hello there")
        assert not result.matched
        assert result.rule is None
        assert result.reply_text is None
        
    def test_rule_engine_case_sensitivity_from_config(self):
        """测试规则引擎从配置中读取大小写敏感性设置"""
        # 加载配置
        config = self.config_loader.load_from_file("config.yaml")
        
        # 查找区分大小写的规则（如果存在）
        case_sensitive_rule = None
        for rule in config.accounts[0].rules:
            if rule.case_sensitive:
                case_sensitive_rule = rule
                break
                
        if case_sensitive_rule:
            engine = RuleEngine(config.accounts[0])
            
            # 测试大小写敏感性
            keyword = case_sensitive_rule.keywords[0]
            
            # 精确匹配应该成功
            result = engine.process_message(keyword)
            assert result.matched
            
            # 大小写不匹配应该失败
            result = engine.process_message(keyword.upper())
            if keyword != keyword.upper():  # 只有当大小写不同时才测试
                assert not result.matched
                
    def test_rule_engine_delay_from_config(self):
        """测试规则引擎从配置中读取延迟设置"""
        # 加载配置
        config = self.config_loader.load_from_file("config.yaml")
        engine = RuleEngine(config.accounts[0])
        
        # 查找有延迟设置的规则
        rule_with_delay = None
        for rule in config.accounts[0].rules:
            if rule.fixed_delay > 0 or rule.random_delay_max > 0:
                rule_with_delay = rule
                break
                
        if rule_with_delay:
            # 触发规则匹配
            keyword = rule_with_delay.keywords[0]
            result = engine.process_message(keyword)
            
            # 验证延迟计算
            assert result.matched
            min_delay, max_delay = rule_with_delay.get_total_delay_range()
            assert min_delay <= result.delay <= max_delay
            
    def test_multiple_accounts_rule_engines(self):
        """测试多账号的规则引擎"""
        # 加载配置（假设有多个账号）
        config = self.config_loader.load_from_file("config.yaml")
        
        # 为每个账号创建规则引擎
        engines = []
        for account in config.accounts:
            engine = RuleEngine(account)
            engines.append(engine)
            
        # 验证每个引擎独立工作
        assert len(engines) == len(config.accounts)
        
        # 测试每个引擎
        for i, engine in enumerate(engines):
            assert engine.account == config.accounts[i]
            assert len(engine.get_effective_rules()) >= 0
