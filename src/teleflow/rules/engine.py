"""规则引擎核心实现"""

from dataclasses import dataclass
from typing import List, Optional
import fnmatch
import random

from ..models.account import Account
from ..models.rule import Rule
from .delay import DelayCalculator


@dataclass
class MatchResult:
    """规则匹配结果
    
    注意：reply_text 包含原始模板（如 "Reply: {ocr_result}"），
    变量替换将在 Phase 4 (Telegram 客户端集成) 中处理。
    """
    matched: bool
    rule: Optional[Rule] = None
    reply_text: Optional[str] = None
    delay: float = 0.0
    matched_keyword: Optional[str] = None
    
    def __post_init__(self):
        """初始化后处理"""
        if not self.matched:
            # 如果没有匹配，清空其他字段
            self.rule = None
            self.reply_text = None
            self.delay = 0.0
            self.matched_keyword = None


class PatternMatcher:
    """模式匹配器 - 支持关键词和通配符
    
    注意：当前版本不支持正则表达式匹配。use_regex 字段为预留功能，将在 v1.3+ 版本中实现。
    """
    
    def __init__(self, case_sensitive: bool = False):
        self.case_sensitive = case_sensitive
    
    def matches(self, message: str, pattern: str) -> bool:
        """检查消息是否匹配模式"""
        if not message or not pattern:
            return False
        
        # 检查是否包含通配符
        if '*' in pattern or '?' in pattern:
            # 使用通配符匹配
            if self.case_sensitive:
                return fnmatch.fnmatchcase(message, pattern)
            else:
                # 处理大小写敏感性
                message_lower = message.lower()
                pattern_lower = pattern.lower()
                return fnmatch.fnmatch(message_lower, pattern_lower)
        else:
            # 直接字符串匹配
            if self.case_sensitive:
                return pattern in message
            else:
                return pattern.lower() in message.lower()


class RuleEngine:
    """规则引擎 - 每个账号一个实例
    
    TODO (Phase 4): 
    - 接收 RuntimeConfig.random_seed 并传递给 DelayCalculator
    - 在 Phase 4 集成层处理 global_rules 与 account.rules 的合并逻辑
    """
    
    def __init__(self, account: Account):
        self.account = account
        self.matchers = {}  # 缓存匹配器实例
        # TODO (Phase 4): 传递 config.runtime.random_seed 到 DelayCalculator
        self.delay_calculator = DelayCalculator()
        
        # 预处理规则
        self._preprocess_rules()
    
    def _preprocess_rules(self):
        """预处理规则，创建匹配器缓存"""
        for rule in self.account.rules:
            if rule.enabled:
                # 为每个规则创建匹配器
                self.matchers[id(rule)] = PatternMatcher(rule.case_sensitive)
    
    def process_message(self, message: str) -> MatchResult:
        """处理消息，返回匹配结果"""
        if not message or not message.strip():
            return MatchResult(matched=False)
        
        # 按顺序检查启用的规则
        for rule in self.account.rules:
            if not rule.enabled:
                continue
            
            matcher = self.matchers.get(id(rule))
            if not matcher:
                continue
            
            # 检查规则的所有关键词
            for keyword in rule.keywords:
                if matcher.matches(message, keyword):
                    # 找到匹配，计算延迟并返回结果
                    delay = self.delay_calculator.calculate_delay(rule)
                    return MatchResult(
                        matched=True,
                        rule=rule,
                        reply_text=rule.reply_text,
                        delay=delay,
                        matched_keyword=keyword
                    )
        
        # 没有找到匹配
        return MatchResult(matched=False)
    
    def get_effective_rules(self) -> List[Rule]:
        """获取有效的规则列表"""
        return [rule for rule in self.account.rules if rule.enabled]
    
    def update_account(self, account: Account):
        """更新账号配置"""
        self.account = account
        self.matchers.clear()
        self._preprocess_rules()
