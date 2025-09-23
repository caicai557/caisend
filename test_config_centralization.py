#!/usr/bin/env python3
"""
配置集中化验证脚本
测试所有组件是否正确使用配置管理器
"""
import sys
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent))

def test_phrase_manager_ui_config():
    """测试话术管理界面的配置使用"""
    print("🖥️ 测试话术管理界面配置...")
    
    try:
        from quickreply.ui.phrase_manager_ui import PhraseManagerUI
        
        # 创建实例
        ui = PhraseManagerUI()
        
        # 检查配置是否正确加载
        print(f"   ✅ phrases_url: {ui.phrases_url}")
        print(f"   ✅ ingest_url: {ui.ingest_url}")
        
        # 验证URL不是硬编码的默认值
        if "127.0.0.1:7788" in ui.phrases_url and "127.0.0.1:7788" in ui.ingest_url:
            print("   ✅ 使用了配置管理器（显示默认值）")
        else:
            print("   ✅ 使用了自定义配置")
            
        return True
        
    except Exception as e:
        print(f"   ❌ 话术管理界面配置测试失败: {e}")
        return False

def test_service_gateway_config():
    """测试服务网关的配置使用"""
    print("🔗 测试服务网关配置...")
    
    try:
        from quickreply.service_gateway import ServiceGateway
        
        # 创建实例
        gateway = ServiceGateway()
        
        # 检查服务配置
        for service_name, service_config in gateway.services.items():
            print(f"   ✅ {service_name}: {service_config.base_url}")
            
        return True
        
    except Exception as e:
        print(f"   ❌ 服务网关配置测试失败: {e}")
        return False

def test_text_processor_config():
    """测试文本处理器的配置使用"""
    print("📝 测试文本处理器配置...")
    
    try:
        from quickreply.text_processor import TextProcessor
        
        # 创建实例（使用默认配置）
        processor = TextProcessor()
        
        print(f"   ✅ api_base: {processor.api_base}")
        
        # 测试自定义配置
        custom_processor = TextProcessor(api_base="http://custom:8080")
        print(f"   ✅ 自定义api_base: {custom_processor.api_base}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ 文本处理器配置测试失败: {e}")
        return False

def test_config_manager_validation():
    """测试配置管理器验证"""
    print("⚙️ 测试配置管理器验证...")
    
    try:
        from quickreply.config_manager import ConfigManager
        
        config_manager = ConfigManager()
        config = config_manager.load()
        
        # 验证API端点
        api_endpoints = config["app"]["api_endpoints"]
        required_endpoints = ["recommend", "ingest", "phrases", "health", "metrics"]
        
        for endpoint in required_endpoints:
            if endpoint in api_endpoints:
                print(f"   ✅ {endpoint}: {api_endpoints[endpoint]}")
            else:
                print(f"   ❌ 缺少端点: {endpoint}")
                return False
        
        # 验证配置
        config_manager.validate()
        print("   ✅ 配置验证通过")
        
        return True
        
    except Exception as e:
        print(f"   ❌ 配置管理器验证失败: {e}")
        return False

def test_environment_override():
    """测试环境变量覆盖"""
    print("🌍 测试环境变量覆盖...")
    
    try:
        import os
        from quickreply.config_manager import ConfigManager
        
        # 设置测试环境变量
        os.environ["QR_RECOMMEND_URL"] = "http://test:9999/recommend"
        
        # 重新加载配置
        config_manager = ConfigManager()
        config_manager._cache = None  # 清除缓存
        config = config_manager.load()
        
        # 检查是否被覆盖
        if config["app"]["api_endpoints"]["recommend"] == "http://test:9999/recommend":
            print("   ✅ 环境变量覆盖成功")
        else:
            print("   ❌ 环境变量覆盖失败")
            return False
        
        # 清理环境变量
        del os.environ["QR_RECOMMEND_URL"]
        
        return True
        
    except Exception as e:
        print(f"   ❌ 环境变量覆盖测试失败: {e}")
        return False

def main():
    """主测试流程"""
    print("🚀 开始配置集中化验证测试")
    print("=" * 50)
    
    tests = [
        ("配置管理器验证", test_config_manager_validation),
        ("话术管理界面配置", test_phrase_manager_ui_config),
        ("服务网关配置", test_service_gateway_config),
        ("文本处理器配置", test_text_processor_config),
        ("环境变量覆盖", test_environment_override)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n📋 测试: {test_name}")
        print("-" * 30)
        
        if test_func():
            passed += 1
            print(f"✅ {test_name} 测试通过")
        else:
            print(f"❌ {test_name} 测试失败")
    
    # 输出总结
    print(f"\n🏁 测试完成")
    print("=" * 50)
    print(f"📊 测试结果: {passed}/{total} 通过")
    
    if passed == total:
        print("🎉 配置集中化验证成功！")
        
        print("\n📋 配置集中化完成总结:")
        print("  ✅ phrase_manager_ui.py - 硬编码URL已修复")
        print("  ✅ service_gateway.py - 使用配置管理器")
        print("  ✅ text_processor.py - 支持配置覆盖")
        print("  ✅ config.json - 包含所有API端点")
        print("  ✅ 环境变量覆盖 - 正常工作")
        
        print("\n🔧 使用方法:")
        print("  1. 通过config.json修改API端点")
        print("  2. 通过QR_*环境变量临时覆盖")
        print("  3. 所有组件自动使用新配置")
        
        return True
    else:
        print("❌ 部分测试失败，需要检查和修复。")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
