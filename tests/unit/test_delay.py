"""延时计算器单元测试"""

import pytest  # type: ignore[import-not-found]

from teleflow.models.rule import Rule
from teleflow.rules.delay import DelayCalculator


class TestDelayCalculator:
    """DelayCalculator 延时计算测试"""

    def test_fixed_delay_only(self):
        """仅固定延时"""
        calculator = DelayCalculator(random_seed=42)
        rule = Rule(
            keywords=["hello"],
            reply_text="Hi!",
            fixed_delay=2,
            random_delay_max=0,
            case_sensitive=False,
            enabled=True,
            use_regex=False,
            next_id=None,
            description=None,
        )

        delay = calculator.calculate_delay(rule)

        assert delay == 2.0

    def test_fixed_and_random_delay(self):
        """固定延时 + 随机延时"""
        calculator = DelayCalculator(random_seed=42)
        rule = Rule(
            keywords=["hello"],
            reply_text="Hi!",
            fixed_delay=2,
            random_delay_max=3,
            case_sensitive=False,
            enabled=True,
            use_regex=False,
            next_id=None,
            description=None,
        )

        delay = calculator.calculate_delay(rule)

        # 固定2 + 随机[0, 3]
        assert 2.0 <= delay <= 5.0

    def test_deterministic_with_seed(self):
        """相同种子产生相同延时"""
        rule = Rule(
            keywords=["hello"],
            reply_text="Hi!",
            fixed_delay=1,
            random_delay_max=2,
            case_sensitive=False,
            enabled=True,
            use_regex=False,
            next_id=None,
            description=None,
        )

        calc1 = DelayCalculator(random_seed=100)
        calc2 = DelayCalculator(random_seed=100)

        delay1 = calc1.calculate_delay(rule)
        delay2 = calc2.calculate_delay(rule)

        assert delay1 == delay2

    def test_get_delay_range(self):
        """获取延时范围"""
        calculator = DelayCalculator()
        rule = Rule(
            keywords=["hello"],
            reply_text="Hi!",
            fixed_delay=2,
            random_delay_max=3,
            case_sensitive=False,
            enabled=True,
            use_regex=False,
            next_id=None,
            description=None,
        )

        min_delay, max_delay = calculator.get_delay_range(rule)

        assert min_delay == 2.0
        assert max_delay == 5.0

    def test_set_seed(self):
        """动态设置种子"""
        calculator = DelayCalculator()
        rule = Rule(
            keywords=["hello"],
            reply_text="Hi!",
            fixed_delay=1,
            random_delay_max=2,
            case_sensitive=False,
            enabled=True,
            use_regex=False,
            next_id=None,
            description=None,
        )

        calculator.set_seed(200)
        delay1 = calculator.calculate_delay(rule)

        calculator.set_seed(200)
        delay2 = calculator.calculate_delay(rule)

        assert delay1 == delay2
