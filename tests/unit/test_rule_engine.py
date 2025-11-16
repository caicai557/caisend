"""规则引擎单元测试"""

import pytest
from teleflow.rules.engine import RuleEngine, MatchResult, PatternMatcher
from teleflow.rules.delay import DelayCalculator
from teleflow.models.account import Account
from teleflow.models.rule import Rule
from teleflow.models.chat import Chat


class TestPatternMatcher:
    """模式匹配器测试"""
    
    def test_keyword_match_case_insensitive(self):
        """测试关键词匹配（不区分大小写）"""
        matcher = PatternMatcher(case_sensitive=False)
        
        # 正向匹配
        assert matcher.matches("Hello World", "hello")
        assert matcher.matches("HELLO", "hello")
        assert matcher.matches("hello there", "hello")
        
        # 反向匹配
        assert not matcher.matches("hi world", "hello")
        assert not matcher.matches("", "hello")
        assert not matcher.matches("hello", "")
    
    def test_keyword_match_case_sensitive(self):
        """测试关键词匹配（区分大小写）"""
        matcher = PatternMatcher(case_sensitive=True)
        
        # 正向匹配
        assert matcher.matches("Hello World", "Hello")
        assert matcher.matches("hello", "hello")
        
        # 反向匹配（大小写不匹配）
        assert not matcher.matches("HELLO", "hello")
        assert not matcher.matches("Hello", "hello")
    
    def test_wildcard_match_case_insensitive(self):
        """测试通配符匹配（不区分大小写）"""
        matcher = PatternMatcher(case_sensitive=False)
        
        # * 通配符
        assert matcher.matches("hello world", "hello*")
        assert matcher.matches("HELLO WORLD", "hello*")
        assert matcher.matches("hello there world", "hello*world")
        
        # ? 通配符
        assert matcher.matches("hello", "h?llo")
        assert matcher.matches("HELLO", "h?llo")
        
        # 复杂模式
        assert matcher.matches("meeting at 3pm", "*meeting*")
        assert matcher.matches("MEETING NOW", "*meeting*")
    
    def test_wildcard_match_case_sensitive(self):
        """测试通配符匹配（区分大小写）"""
        matcher = PatternMatcher(case_sensitive=True)
        
        # 正向匹配
        assert matcher.matches("hello world", "hello*")
        assert matcher.matches("hello", "h?llo")
        
        # 反向匹配（大小写不匹配）
        assert not matcher.matches("HELLO WORLD", "hello*")
        assert not matcher.matches("HELLO", "h?llo")
    
    def test_empty_inputs(self):
        """测试空输入处理"""
        matcher = PatternMatcher()
        
        # 空消息
        assert not matcher.matches("", "hello")
        assert not matcher.matches("", "*")
        
        # 空模式
        assert not matcher.matches("hello", "")
        
        # 两个都空
        assert not matcher.matches("", "")


class TestDelayCalculator:
    """延迟计算器测试"""
    
    def test_fixed_delay_only(self):
        """测试只有固定延迟"""
        calculator = DelayCalculator(random_seed=42)
        rule = Rule(
            keywords=["hello"],
            reply_text="Hi!",
            fixed_delay=2,
            random_delay_max=0
        )
        
        delay = calculator.calculate_delay(rule)
        assert delay == 2.0
    
    def test_fixed_and_random_delay(self):
        """测试固定延迟和随机延迟"""
        calculator = DelayCalculator(random_seed=42)
        rule = Rule(
            keywords=["hello"],
            reply_text="Hi!",
            fixed_delay=1,
            random_delay_max=2
        )
        
        # 多次测试确保在范围内
        delays = [calculator.calculate_delay(rule) for _ in range(100)]
        assert all(1.0 <= delay <= 3.0 for delay in delays)
        assert any(delay > 1.0 for delay in delays)  # 确保随机延迟生效
    
    def test_deterministic_with_seed(self):
        """测试使用种子的确定性"""
        calculator1 = DelayCalculator(random_seed=42)
        calculator2 = DelayCalculator(random_seed=42)
        
        rule = Rule(
            keywords=["hello"],
            reply_text="Hi!",
            fixed_delay=1,
            random_delay_max=2
        )
        
        # 相同种子应该产生相同结果
        delay1 = calculator1.calculate_delay(rule)
        delay2 = calculator2.calculate_delay(rule)
        assert delay1 == delay2
    
    def test_delay_range(self):
        """测试延迟范围获取"""
        calculator = DelayCalculator()
        rule = Rule(
            keywords=["hello"],
            reply_text="Hi!",
            fixed_delay=1.5,
            random_delay_max=2.5
        )
        
        min_delay, max_delay = calculator.get_delay_range(rule)
        assert min_delay == 1.5
        assert max_delay == 4.0


class TestRuleEngine:
    """规则引擎测试"""
    
    def setup_method(self):
        """每个测试方法前的设置"""
        self.rule1 = Rule(
            keywords=["hello", "hi"],
            reply_text="Hello! How are you?",
            fixed_delay=1,
            random_delay_max=0,
            case_sensitive=False,
            enabled=True
        )
        
        self.rule2 = Rule(
            keywords=["*meeting*"],
            reply_text="Meeting reminder!",
            fixed_delay=2,
            random_delay_max=1,
            case_sensitive=False,
            enabled=True
        )
        
        self.rule3 = Rule(
            keywords=["bye"],
            reply_text="Goodbye!",
            fixed_delay=0,
            random_delay_max=0,
            enabled=False  # 禁用的规则
        )
        
        self.chat = Chat(
            target_username="test_user",
            display_name="Test User"
        )
        
        self.account = Account(
            name="test_account",
            monitor_chats=[self.chat.target_username],
            rules=[self.rule1, self.rule2, self.rule3]
        )
        
        self.engine = RuleEngine(self.account)
    
    def test_keyword_matching(self):
        """测试关键词匹配"""
        # 匹配第一个规则的关键词
        result = self.engine.process_message("hello there")
        assert result.matched
        assert result.rule == self.rule1
        assert result.reply_text == "Hello! How are you?"
        assert result.delay == 1.0
        assert result.matched_keyword == "hello"
        
        # 匹配第二个关键词
        result = self.engine.process_message("hi everyone")
        assert result.matched
        assert result.rule == self.rule1
        assert result.matched_keyword == "hi"
    
    def test_wildcard_matching(self):
        """测试通配符匹配"""
        result = self.engine.process_message("meeting at 3pm")
        assert result.matched
        assert result.rule == self.rule2
        assert result.reply_text == "Meeting reminder!"
        assert 2.0 <= result.delay <= 3.0  # 2 + random(0-1)
        assert result.matched_keyword == "*meeting*"
    
    def test_no_match(self):
        """测试无匹配情况"""
        result = self.engine.process_message("random message")
        assert not result.matched
        assert result.rule is None
        assert result.reply_text is None
        assert result.delay == 0.0
        assert result.matched_keyword is None
    
    def test_disabled_rule_ignored(self):
        """测试禁用的规则被忽略"""
        result = self.engine.process_message("bye everyone")
        assert not result.matched  # 规则3被禁用，应该不匹配
    
    def test_empty_message(self):
        """测试空消息处理"""
        result = self.engine.process_message("")
        assert not result.matched
        
        result = self.engine.process_message("   ")
        assert not result.matched
    
    def test_rule_priority_order(self):
        """测试规则优先级（按顺序匹配）"""
        # 添加一个可能冲突的规则
        conflict_rule = Rule(
            keywords=["*"],
            reply_text="Catch all!",
            fixed_delay=0,
            random_delay_max=0,
            enabled=True
        )
        
        # 插入到第一个位置
        self.account.rules.insert(0, conflict_rule)
        self.engine.update_account(self.account)
        
        # 应该匹配第一个规则（通配符）
        result = self.engine.process_message("hello")
        assert result.matched
        assert result.rule == conflict_rule
        assert result.reply_text == "Catch all!"
    
    def test_get_effective_rules(self):
        """测试获取有效规则"""
        effective_rules = self.engine.get_effective_rules()
        assert len(effective_rules) == 2  # 只有启用的规则
        assert self.rule1 in effective_rules
        assert self.rule2 in effective_rules
        assert self.rule3 not in effective_rules
    
    def test_multiple_rules_matching_same_message(self):
        """测试多条规则匹配同一消息时，第一条规则优先"""
        # 添加一个可能冲突的规则
        conflict_rule = Rule(
            keywords=["hello"],  # 与 rule1 的关键词相同
            reply_text="Conflict reply!",
            fixed_delay=0,
            random_delay_max=0,
            enabled=True
        )
        
        # 插入到第一个位置
        self.account.rules.insert(0, conflict_rule)
        self.engine.update_account(self.account)
        
        # 应该匹配第一条规则（conflict_rule）
        result = self.engine.process_message("hello there")
        assert result.matched
        assert result.rule == conflict_rule
        assert result.reply_text == "Conflict reply!"
        assert result.matched_keyword == "hello"
    
    def test_rule_update_scenario(self):
        """测试规则更新场景"""
        # 初始状态
        result = self.engine.process_message("hello")
        assert result.matched
        assert result.reply_text == "Hello! How are you?"
        
        # 更新账号规则
        updated_rule = Rule(
            keywords=["hello"],
            reply_text="Updated reply!",
            fixed_delay=5,
            random_delay_max=0,
            enabled=True
        )
        
        self.account.rules[0] = updated_rule
        self.engine.update_account(self.account)
        
        # 验证更新后的行为
        result = self.engine.process_message("hello")
        assert result.matched
        assert result.reply_text == "Updated reply!"
        assert result.delay == 5.0
    
    def test_empty_rules_list(self):
        """测试空规则列表"""
        empty_account = Account(
            name="empty_account",
            monitor_chats=["test"],
            rules=[]  # 空规则列表
        )
        
        empty_engine = RuleEngine(empty_account)
        result = empty_engine.process_message("hello")
        
        assert not result.matched
        assert result.rule is None
        assert result.reply_text is None
        assert result.delay == 0.0
