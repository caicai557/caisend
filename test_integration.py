#!/usr/bin/env python3
"""
ConfigManager 端到端集成测试
验证统一配置管理、环境变量覆盖、服务间通信
"""

import os
import sys
import time
import json
import requests
from pathlib import Path

def test_config_manager():
    """测试ConfigManager基本功能"""
    print("🔍 测试 ConfigManager 基本功能...")
    
    try:
        from quickreply.config_manager import ConfigManager
        
        cm = ConfigManager()
        config = cm.load()
        cm.validate(config)
        
        user_cfg = cm.get_user_config()
        app_cfg = cm.get_app_config()
        cdp_cfg = cm.get_cdp_config()
        
        assert user_cfg.top_k > 0, "top_k应该大于0"
        assert len(user_cfg.target_keywords) > 0, "应该有目标关键词"
        assert app_cfg.api_endpoints["ws"].startswith("ws://"), "WS端点格式错误"
        assert cdp_cfg.host, "CDP主机不能为空"
        
        print("✅ ConfigManager 基本功能测试通过")
        return True
        
    except Exception as e:
        print(f"❌ ConfigManager 测试失败: {e}")
        return False

def test_env_override():
    """测试环境变量覆盖"""
    print("🔍 测试环境变量覆盖...")
    
    try:
        # 设置测试环境变量
        os.environ["QR_TOP_K"] = "15"
        os.environ["QR_THEME"] = "test-theme"
        os.environ["QR_WS_URL"] = "ws://test-host:8888"
        os.environ["QR_CDP_PORT"] = "9999"
        
        from quickreply.config_manager import ConfigManager
        
        cm = ConfigManager()
        config = cm.load()
        
        user_cfg = cm.get_user_config()
        app_cfg = cm.get_app_config()
        cdp_cfg = cm.get_cdp_config()
        
        assert user_cfg.top_k == 15, f"top_k覆盖失败: {user_cfg.top_k}"
        assert user_cfg.theme == "test-theme", f"theme覆盖失败: {user_cfg.theme}"
        assert app_cfg.api_endpoints["ws"] == "ws://test-host:8888", f"WS覆盖失败: {app_cfg.api_endpoints['ws']}"
        assert cdp_cfg.port == 9999, f"CDP端口覆盖失败: {cdp_cfg.port}"
        
        print("✅ 环境变量覆盖测试通过")
        return True
        
    except Exception as e:
        print(f"❌ 环境变量覆盖测试失败: {e}")
        return False
    finally:
        # 清理环境变量
        for key in ["QR_TOP_K", "QR_THEME", "QR_WS_URL", "QR_CDP_PORT"]:
            os.environ.pop(key, None)

def test_config_validation():
    """测试配置校验"""
    print("🔍 测试配置校验...")
    
    try:
        from quickreply.config_manager import ConfigManager
        
        cm = ConfigManager()
        
        # 测试正常配置
        valid_config = cm.load()
        cm.validate(valid_config)  # 应该不抛异常
        
        # 测试无效配置
        invalid_config = {
            "user": {"theme": 123},  # 类型错误
            "app": {},  # 缺少必需字段
            "cdp": {"range": "invalid"}  # 格式错误
        }
        
        try:
            cm.validate(invalid_config)
            assert False, "应该抛出校验异常"
        except (ValueError, TypeError):
            pass  # 预期的异常
        
        print("✅ 配置校验测试通过")
        return True
        
    except Exception as e:
        print(f"❌ 配置校验测试失败: {e}")
        return False

def test_legacy_migration():
    """测试旧配置迁移"""
    print("🔍 测试旧配置迁移...")
    
    try:
        # 创建临时旧配置文件
        legacy_settings = {
            "top_k": 8,
            "hotkey_show": "alt+q",
            "hotkey_reload": "ctrl+f5",
            "target_keywords": ["test1", "test2"]
        }
        
        settings_path = Path("test_settings.json")
        settings_path.write_text(json.dumps(legacy_settings), encoding="utf-8")
        
        try:
            from quickreply.config_manager import ConfigManager
            
            cm = ConfigManager(user_name="test_settings.json")
            config = cm.load()
            
            user_cfg = cm.get_user_config()
            
            assert user_cfg.top_k == 8, f"旧配置迁移失败: top_k={user_cfg.top_k}"
            assert user_cfg.hotkeys.get("show") == "alt+q", f"热键迁移失败"
            assert "test1" in user_cfg.target_keywords, "关键词迁移失败"
            
            print("✅ 旧配置迁移测试通过")
            return True
            
        finally:
            settings_path.unlink(missing_ok=True)
        
    except Exception as e:
        print(f"❌ 旧配置迁移测试失败: {e}")
        return False

def test_service_health():
    """测试服务健康状态"""
    print("🔍 测试服务健康状态...")
    
    try:
        # 测试推荐服务
        try:
            response = requests.post(
                "http://127.0.0.1:7788/recommend",
                json={"text": "测试消息"},
                timeout=3
            )
            if response.status_code == 200:
                print("✅ 推荐服务运行正常")
                service_ok = True
            else:
                print(f"⚠️  推荐服务响应异常: {response.status_code}")
                service_ok = False
        except requests.RequestException as e:
            print(f"❌ 推荐服务不可用: {e}")
            service_ok = False
        
        # 测试WebSocket端口（简单连接测试）
        import socket
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            result = sock.connect_ex(('127.0.0.1', 7799))
            sock.close()
            
            if result == 0:
                print("✅ WebSocket端口可用")
                ws_ok = True
            else:
                print("⚠️  WebSocket端口不可用")
                ws_ok = False
        except Exception as e:
            print(f"❌ WebSocket端口测试失败: {e}")
            ws_ok = False
        
        return service_ok and ws_ok
        
    except Exception as e:
        print(f"❌ 服务健康测试失败: {e}")
        return False

def main():
    """主测试函数"""
    print("🚀 ConfigManager 端到端集成测试开始")
    print("=" * 50)
    
    test_results = []
    
    # 运行所有测试
    tests = [
        ("ConfigManager基本功能", test_config_manager),
        ("环境变量覆盖", test_env_override), 
        ("配置校验", test_config_validation),
        ("旧配置迁移", test_legacy_migration),
        ("服务健康状态", test_service_health),
    ]
    
    for test_name, test_func in tests:
        print(f"\n📋 运行测试: {test_name}")
        success = test_func()
        test_results.append((test_name, success))
        
        if not success:
            print(f"⏸️  测试 '{test_name}' 失败，继续下一个...")
    
    # 汇总结果
    print("\n" + "=" * 50)
    print("📊 测试结果汇总:")
    
    passed = 0
    total = len(test_results)
    
    for test_name, success in test_results:
        status = "✅ 通过" if success else "❌ 失败"
        print(f"  {test_name}: {status}")
        if success:
            passed += 1
    
    print(f"\n🏆 总计: {passed}/{total} 个测试通过")
    
    if passed == total:
        print("🎉 所有测试通过！ConfigManager集成成功")
        return 0
    else:
        print("⚠️  部分测试失败，请检查相关功能")
        return 1

if __name__ == "__main__":
    sys.exit(main())
