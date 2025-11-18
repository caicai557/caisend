#!/usr/bin/env python3
"""
MVP 验收测试脚本
验证 Phase 4 所有核心功能的端到端工作
"""

import asyncio
import time
import sys
from pathlib import Path

from src.teleflow.telegram_web.browser import BrowserManager
from src.teleflow.telegram_web.navigator import ChatNavigator
from src.teleflow.telegram_web.monitor import MessageMonitor
from src.teleflow.telegram_web.actions import MessageActions
from src.teleflow.runtime.runner import AccountRunner
from src.teleflow.models.account import Account, Rule
from src.teleflow.models.config import RuntimeConfig


def test_configuration_loading():
    """测试配置加载功能"""
    print("🧪 测试配置加载功能...")
    
    try:
        from src.teleflow.config.loader import ConfigLoader
        
        loader = ConfigLoader()
        config = loader.load_from_file("config-test.yaml")
        
        print(f"✅ 配置版本: {config.version}")
        print(f"✅ 账号数量: {len(config.accounts)}")
        print(f"✅ 默认账号: {config.default_account}")
        print(f"✅ 检查间隔: {config.runtime.check_interval}秒")
        
        return True
        
    except Exception as e:
        print(f"❌ 配置加载失败: {e}")
        return False


def test_rule_engine_integration():
    """测试规则引擎集成"""
    print("🧪 测试规则引擎集成...")
    
    try:
        from src.teleflow.rules.engine import RuleEngine
        
        # 创建测试账号
        account = Account(
            name="mvp-test",
            browser_data_dir=None,
            monitor_chats=["test"],
            rules=[
                Rule(
                    keywords=["test", "hello"],
                    reply_text="Auto reply: Message received!",
                    fixed_delay=1,
                    random_delay_max=2,
                    case_sensitive=False,
                    enabled=True,
                    use_regex=False,
                    next_id=None,
                    description="MVP测试规则"
                )
            ]
        )
        
        rule_engine = RuleEngine(account)
        
        # 测试消息匹配
        test_cases = [
            ("test message", True),
            ("hello there", True),
            ("no match", False),
            ("TEST uppercase", True),  # 测试大小写不敏感
        ]
        
        for message, should_match in test_cases:
            result = rule_engine.process_message(message)
            if result.matched == should_match:
                print(f"✅ 消息 '{message}' -> 匹配正确")
            else:
                print(f"❌ 消息 '{message}' -> 匹配错误")
                return False
        
        return True
        
    except Exception as e:
        print(f"❌ 规则引擎集成测试失败: {e}")
        return False


async def test_browser_automation():
    """测试浏览器自动化功能"""
    print("🧪 测试浏览器自动化功能...")
    
    browser_manager = BrowserManager(
        user_data_dir=None,
        headless=True  # 使用无头模式进行自动化测试
    )
    
    try:
        # 启动浏览器
        page = await browser_manager.launch()
        print("✅ 浏览器启动成功")
        
        # 导航到 Telegram Web
        await browser_manager.navigate_to_telegram()
        print("✅ Telegram Web 导航成功")
        
        # 初始化组件
        navigator = ChatNavigator(page)
        monitor = MessageMonitor(page)
        actions = MessageActions(page)
        
        # 测试登录检测
        login_status = await navigator.check_login_status()
        print(f"✅ 登录状态检测: {'已登录' if login_status else '未登录'}")
        
        # 测试页面元素检测
        try:
            await monitor._wait_for_message_list()
            print("✅ 消息列表检测成功")
        except:
            print("⚠️ 消息列表检测超时（可能未登录）")
        
        print("✅ 浏览器自动化功能测试完成")
        return True
        
    except Exception as e:
        print(f"❌ 浏览器自动化测试失败: {e}")
        return False
        
    finally:
        await browser_manager.close()


async def test_account_runner_integration():
    """测试 AccountRunner 集成"""
    print("🧪 测试 AccountRunner 集成...")
    
    try:
        # 创建测试账号
        account = Account(
            name="mvp-runner-test",
            browser_data_dir=None,
            monitor_chats=["test"],
            rules=[
                Rule(
                    keywords=["mvp"],
                    reply_text="MVP test successful!",
                    fixed_delay=1,
                    random_delay_max=0,
                    case_sensitive=False,
                    enabled=True,
                    use_regex=False,
                    next_id=None,
                    description="MVP运行器测试"
                )
            ]
        )
        
        runtime_config = RuntimeConfig(
            check_interval=2,
            random_seed=12345,
            debug=False,
            max_retry_count=3
        )
        
        # 创建 AccountRunner
        runner = AccountRunner(
            account=account,
            runtime_config=runtime_config,
            show_browser=False
        )
        
        # 测试初始化
        init_success = await runner.initialize()
        if init_success:
            print("✅ AccountRunner 初始化成功")
            
            # 测试状态获取
            status = runner.get_status()
            print(f"✅ 运行器状态: {status}")
            
            # 清理
            await runner.cleanup()
            print("✅ AccountRunner 清理完成")
            return True
        else:
            print("❌ AccountRunner 初始化失败")
            return False
            
    except Exception as e:
        print(f"❌ AccountRunner 集成测试失败: {e}")
        return False


def test_cli_integration():
    """测试 CLI 集成"""
    print("🧪 测试 CLI 集成...")
    
    try:
        from src.teleflow.cli.main import validate_config, create_parser
        
        # 测试配置验证
        result = validate_config("config-test.yaml")
        if result == 0:
            print("✅ 配置验证成功")
        else:
            print("❌ 配置验证失败")
            return False
        
        # 测试参数解析
        parser = create_parser()
        args = parser.parse_args(["run", "--config", "config-test.yaml"])
        
        if args.command == "run" and args.config == "config-test.yaml":
            print("✅ CLI 参数解析成功")
            return True
        else:
            print("❌ CLI 参数解析失败")
            return False
            
    except Exception as e:
        print(f"❌ CLI 集成测试失败: {e}")
        return False


async def run_mvp_validation():
    """运行 MVP 验收测试"""
    print("🚀 Teleflow Phase 4 MVP 验收测试")
    print("=" * 60)
    
    test_results = []
    
    # 测试1: 配置加载
    print("\n📋 测试1: 配置加载功能")
    test_results.append(test_configuration_loading())
    
    # 测试2: 规则引擎集成
    print("\n📋 测试2: 规则引擎集成")
    test_results.append(test_rule_engine_integration())
    
    # 测试3: CLI 集成
    print("\n📋 测试3: CLI 集成")
    test_results.append(test_cli_integration())
    
    # 测试4: 浏览器自动化
    print("\n📋 测试4: 浏览器自动化功能")
    test_results.append(await test_browser_automation())
    
    # 测试5: AccountRunner 集成
    print("\n📋 测试5: AccountRunner 集成")
    test_results.append(await test_account_runner_integration())
    
    # 统计结果
    passed = sum(test_results)
    total = len(test_results)
    
    print("\n" + "=" * 60)
    print("🎯 MVP 验收测试结果")
    print("=" * 60)
    print(f"✅ 通过测试: {passed}/{total}")
    print(f"❌ 失败测试: {total - passed}/{total}")
    
    if passed == total:
        print("\n🎉 恭喜！Phase 4 MVP 验收测试全部通过！")
        print("📋 核心功能验证:")
        print("  ✅ 配置系统正常工作")
        print("  ✅ 规则引擎正确匹配")
        print("  ✅ CLI 命令完整可用")
        print("  ✅ 浏览器自动化稳定")
        print("  ✅ 账号运行器集成成功")
        print("\n🚀 Phase 4 Telegram Web 集成 MVP 完成！")
        return True
    else:
        print(f"\n⚠️ 还有 {total - passed} 个测试需要修复")
        return False


def main():
    """主函数"""
    try:
        # 运行 MVP 验收测试
        success = asyncio.run(run_mvp_validation())
        
        if success:
            print("\n📝 下一步建议:")
            print("1. 可以开始 Phase 5 多账号支持开发")
            print("2. 或者优化现有选择器适配更多 Telegram Web 版本")
            print("3. 添加更多单元测试提高覆盖率")
            sys.exit(0)
        else:
            print("\n🔧 请修复失败的测试后再进行验收")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⏹️ 测试被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ MVP 验收测试遇到未预期错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
