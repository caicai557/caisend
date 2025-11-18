"""延迟计算器实现"""

import random
from typing import Optional

from ..models.rule import Rule


class DelayCalculator:
    """延迟计算器 - 处理固定延迟和随机延迟"""
    
    def __init__(self, random_seed: Optional[int] = None):
        """
        初始化延迟计算器
        
        Args:
            random_seed: 随机种子，用于测试和可重现的结果
        """
        self.random = random.Random(random_seed)
    
    def calculate_delay(self, rule: Rule) -> float:
        """
        计算规则的总延迟时间
        
        Args:
            rule: 规则对象
            
        Returns:
            float: 总延迟时间（秒）
        """
        fixed_delay = float(rule.fixed_delay)
        random_delay = self.random.uniform(0, float(rule.random_delay_max))
        return fixed_delay + random_delay
    
    def get_delay_range(self, rule: Rule) -> tuple[float, float]:
        """
        获取规则的延迟范围
        
        Args:
            rule: 规则对象
            
        Returns:
            tuple[float, float]: (最小延迟, 最大延迟)
        """
        return rule.get_total_delay_range()
    
    def set_seed(self, seed: int):
        """设置随机种子"""
        self.random.seed(seed)
