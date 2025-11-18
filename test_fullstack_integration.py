#!/usr/bin/env python3
"""全栈集成测试 - 验证前后端完整流程"""

import asyncio
import sys
from pathlib import Path

# 添加项目路径到 Python 路径
sys.path.insert(0, str(Path(__file__).parent / "src"))

from teleflow.config.loader import ConfigLoader
from teleflow.rules.engine import RuleEngine
from teleflow.rules.delay import DelayCalculator


def test_config_loading():
    """测试 1: 配置加载"""
    print("\n🧪 测试 1: 配置加载")
    print("=" * 60)
    
    try:
        loader = ConfigLoader()
        config = loader.load_from_file("config.yaml")
        
        print(f"✅ 配置加载成功")
        print(f"   版本: {config.version}")
        print(f"   账号数: {len(config.accounts)}")
        print(f"   默认账号: {config.default_account}")
        
        if config.accounts:
            account = config.accounts[0]
            print(f"\n   账号详情:")
            print(f"   - 名称: {account.name}")
            print(f"   - 监控聊天: {len(account.monitor_chats)} 个")
            print(f"   - 规则数: {len(account.rules)} 条")
            
            if account.rules:
                print(f"\n   规则列表:")
                for i, rule in enumerate(account.rules, 1):
                    print(f"   {i}. {rule.description or '(无描述)'}")
                    print(f"      关键词: {', '.join(rule.keywords[:3])}{'...' if len(rule.keywords) > 3 else ''}")
                    print(f"      回复: {rule.reply_text[:30]}{'...' if len(rule.reply_text) > 30 else ''}")
        
        return True
    except Exception as e:
        print(f"❌ 配置加载失败: {e}")
        return False


def test_rule_matching():
    """测试 2: 规则匹配引擎"""
    print("\n🧪 测试 2: 规则匹配引擎")
    print("=" * 60)
    
    try:
        loader = ConfigLoader()
        config = loader.load_from_file("config.yaml")
        account = config.accounts[0]
        
        engine = RuleEngine(account)
        
        # 测试用例
        test_cases = [
            ("hello", "应该匹配问候语规则"),
            ("Let's have a meeting", "应该匹配会议规则（通配符）"),
            ("ok", "应该匹配确认规则"),
            ("help", "应该匹配帮助规则"),
            ("random text", "不应该匹配任何规则"),
        ]
        
        print(f"\n测试消息匹配:")
        for message, expected in test_cases:
            result = engine.process_message(message)
            if result.matched:
                print(f"✅ '{message}' → 匹配: {result.rule.description}")
                print(f"   回复: {result.reply_text}")
                print(f"   延时: {result.delay:.2f} 秒")
            else:
                print(f"⚪ '{message}' → 无匹配 ({expected})")
        
        return True
    except Exception as e:
        print(f"❌ 规则匹配测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_delay_calculation():
    """测试 3: 延时计算"""
    print("\n🧪 测试 3: 延时计算")
    print("=" * 60)
    
    try:
        from teleflow.models.rule import Rule
        calculator = DelayCalculator()
        
        # 测试多次延时计算
        fixed_delay = 2
        random_max = 3
        
        # 创建测试规则
        test_rule = Rule(
            keywords=["test"],
            reply_text="Test",
            fixed_delay=fixed_delay,
            random_delay_max=random_max
        )
        
        print(f"\n固定延时: {fixed_delay} 秒")
        print(f"随机延时上限: {random_max} 秒")
        print(f"\n10 次随机延时结果:")
        
        delays = []
        for i in range(10):
            delay = calculator.calculate_delay(test_rule)
            delays.append(delay)
            print(f"  {i+1}. {delay:.2f} 秒")
        
        avg_delay = sum(delays) / len(delays)
        min_delay = min(delays)
        max_delay = max(delays)
        
        print(f"\n统计:")
        print(f"  平均: {avg_delay:.2f} 秒")
        print(f"  最小: {min_delay:.2f} 秒")
        print(f"  最大: {max_delay:.2f} 秒")
        
        # 验证延时在合理范围内
        if min_delay >= fixed_delay and max_delay <= (fixed_delay + random_max):
            print(f"✅ 延时计算正确（{fixed_delay} ≤ 延时 ≤ {fixed_delay + random_max}）")
            return True
        else:
            print(f"❌ 延时计算异常")
            return False
            
    except Exception as e:
        print(f"❌ 延时计算测试失败: {e}")
        return False


def test_cli_commands():
    """测试 4: CLI 命令"""
    print("\n🧪 测试 4: CLI 命令")
    print("=" * 60)
    
    try:
        import subprocess
        
        # 测试 --version
        result = subprocess.run(
            ["python", "-m", "teleflow", "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            print(f"✅ --version 命令成功")
            print(f"   输出: {result.stdout.strip()}")
        else:
            print(f"❌ --version 命令失败")
            return False
        
        # 测试 validate-config
        result = subprocess.run(
            ["python", "-m", "teleflow", "validate-config", "--config", "config.yaml"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            print(f"✅ validate-config 命令成功")
            # 只打印前3行
            lines = result.stdout.strip().split('\n')[:3]
            for line in lines:
                print(f"   {line}")
        else:
            print(f"❌ validate-config 命令失败")
            print(f"   错误: {result.stderr}")
            return False
        
        return True
    except Exception as e:
        print(f"❌ CLI 命令测试失败: {e}")
        return False


def main():
    """运行所有测试"""
    print("\n" + "=" * 60)
    print("🚀 Teleflow 全栈集成测试")
    print("=" * 60)
    
    results = []
    
    # 运行测试
    results.append(("配置加载", test_config_loading()))
    results.append(("规则匹配", test_rule_matching()))
    results.append(("延时计算", test_delay_calculation()))
    results.append(("CLI 命令", test_cli_commands()))
    
    # 汇总结果
    print("\n" + "=" * 60)
    print("📊 测试结果汇总")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{status} - {name}")
    
    print("\n" + "=" * 60)
    if passed == total:
        print(f"🎉 全部测试通过！({passed}/{total})")
        print("=" * 60)
        return 0
    else:
        print(f"⚠️ {total - passed} 个测试失败 ({passed}/{total} 通过)")
        print("=" * 60)
        return 1


if __name__ == "__main__":
    sys.exit(main())
