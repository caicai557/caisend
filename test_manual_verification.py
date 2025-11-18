#!/usr/bin/env python3
"""
手动测试验证脚本
用于验证 Phase 4 核心功能是否正常工作
"""

import asyncio
import time
from src.teleflow.telegram_web.browser import BrowserManager
from src.teleflow.telegram_web.navigator import ChatNavigator
from src.teleflow.telegram_web.monitor import MessageMonitor
from src.teleflow.telegram_web.actions import MessageActions


async def test_browser_functionality():
    """测试浏览器基本功能"""
    print("🧪 开始测试浏览器基本功能...")
    
    # 创建浏览器管理器
    browser_manager = BrowserManager(
        user_data_dir=None,  # 不使用持久化进行测试
        headless=False  # 显示浏览器以便观察
    )
    
    try:
        # 启动浏览器
        page = await browser_manager.launch()
        print("✅ 浏览器启动成功")
        
        # 导航到 Telegram Web
        await browser_manager.navigate_to_telegram()
        print("✅ Telegram Web 导航成功")
        
        # 等待用户手动登录
        input("🔑 请在浏览器中手动登录 Telegram，然后按 Enter 继续...")
        
        # 测试导航器
        navigator = ChatNavigator(page)
        login_status = await navigator.check_login_status()
        print(f"✅ 登录状态检测: {'已登录' if login_status else '未登录'}")
        
        if login_status:
            # 测试导航到"已保存消息"
            nav_success = await navigator.navigate_to_chat("Saved Messages")
            print(f"✅ 聊天导航: {'成功' if nav_success else '失败'}")
            
            if nav_success:
                # 测试消息监控
                monitor = MessageMonitor(page)
                new_messages = await monitor.check_new_messages()
                print(f"✅ 新消息检测: {new_messages}")
                
                # 测试消息操作
                actions = MessageActions(page)
                await actions.send_message("Test message from automation")
                print("✅ 消息发送成功")
                
                # 等待一下再检查
                await asyncio.sleep(2)
                
                latest_message = await monitor.get_latest_message_text()
                print(f"✅ 最新消息: {latest_message}")
        
        print("🎉 所有基本功能测试完成!")
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        # 关闭浏览器
        await browser_manager.close()
        print("✅ 浏览器已关闭")


def main():
    """主函数"""
    print("🚀 Teleflow Phase 4 手动测试验证")
    print("=" * 50)
    
    # 运行异步测试
    asyncio.run(test_browser_functionality())
    
    print("\n📋 测试说明:")
    print("1. 如果所有测试通过，说明核心功能正常")
    print("2. 可以继续使用 config-test.yaml 进行完整测试")
    print("3. 建议先在显示模式下测试，然后使用无头模式")


if __name__ == "__main__":
    main()
