"""配置验证器单元测试"""

import pytest
from teleflow.config.validator import ConfigValidator
from teleflow.models.config import TeleflowConfig
from teleflow.models.account import Account
from teleflow.models.rule import Rule
from pydantic import ValidationError


class TestConfigValidator:
    """配置验证器测试类"""
    
    def setup_method(self):
        """每个测试方法前的设置"""
        self.validator = ConfigValidator()
    
    def test_validate_valid_raw_config(self):
        """测试验证有效的原始配置"""
        valid_config = {
            "version": "1.0",
            "accounts": [
                {
                    "name": "test_account",
                    "monitor_chats": ["target_user"],
                    "rules": [
                        {
                            "keywords": ["hello"],
                            "reply_text": "Hello!",
                            "fixed_delay": 1,
                            "random_delay_max": 2
                        }
                    ]
                }
            ]
        }
        
        # 应该不抛出异常
        self.validator.validate_raw_config(valid_config)
    
    def test_validate_invalid_config_type(self):
        """测试验证无效的配置类型"""
        with pytest.raises(ValueError, match="配置必须是字典格式"):
            self.validator.validate_raw_config("invalid_config")
    
    def test_validate_missing_required_fields(self):
        """测试缺少必需字段"""
        # 缺少 version
        config1 = {"accounts": []}
        with pytest.raises(ValueError, match="缺少必需字段.*version"):
            self.validator.validate_raw_config(config1)
        
        # 缺少 accounts
        config2 = {"version": "1.0"}
        with pytest.raises(ValueError, match="缺少必需字段.*accounts"):
            self.validator.validate_raw_config(config2)
    
    def test_validate_invalid_field_types(self):
        """测试无效的字段类型"""
        # version 不是字符串
        config1 = {
            "version": 123,
            "accounts": []
        }
        with pytest.raises(ValueError, match="字段 'version' 必须是 str 类型"):
            self.validator.validate_raw_config(config1)
        
        # accounts 不是列表
        config2 = {
            "version": "1.0",
            "accounts": "not_a_list"
        }
        with pytest.raises(ValueError, match="字段 'accounts' 必须是 list 类型"):
            self.validator.validate_raw_config(config2)
    
    def test_validate_version_formats(self):
        """测试版本格式验证"""
        # 有效版本
        valid_versions = ["1.0", "1.0.0", "2.1.3", "10.5.0"]
        for version in valid_versions:
            config = {
                "version": version,
                "accounts": [
                    {
                        "name": "test",
                        "monitor_chats": ["user"],
                        "rules": []
                    }
                ]
            }
            self.validator.validate_raw_config(config)  # 应该不抛出异常
        
        # 无效版本
        invalid_versions = ["1", "1.0.0.0", "a.b.c", "1.0.beta"]
        for version in invalid_versions:
            config = {
                "version": version,
                "accounts": [
                    {
                        "name": "test",
                        "monitor_chats": ["user"],
                        "rules": []
                    }
                ]
            }
            with pytest.raises(ValueError, match="版本格式应为|版本号必须由数字组成"):
                self.validator.validate_raw_config(config)
    
    def test_validate_empty_accounts_list(self):
        """测试空的账号列表"""
        config = {
            "version": "1.0",
            "accounts": []
        }
        with pytest.raises(ValueError, match="账号列表不能为空"):
            self.validator.validate_raw_config(config)
    
    def test_validate_duplicate_account_names(self):
        """测试重复的账号名称"""
        config = {
            "version": "1.0",
            "accounts": [
                {
                    "name": "duplicate",
                    "monitor_chats": ["user1"],
                    "rules": []
                },
                {
                    "name": "duplicate",
                    "monitor_chats": ["user2"],
                    "rules": []
                }
            ]
        }
        with pytest.raises(ValueError, match="账号名称重复"):
            self.validator.validate_raw_config(config)
    
    def test_validate_invalid_account_config(self):
        """测试无效的账号配置"""
        # 缺少 name 字段
        config1 = {
            "version": "1.0",
            "accounts": [
                {
                    "monitor_chats": ["user"],
                    "rules": []
                }
            ]
        }
        with pytest.raises(ValueError, match="账号配置缺少 'name' 字段"):
            self.validator.validate_raw_config(config1)
        
        # 空的账号名称
        config2 = {
            "version": "1.0",
            "accounts": [
                {
                    "name": "",
                    "monitor_chats": ["user"],
                    "rules": []
                }
            ]
        }
        with pytest.raises(ValueError, match="账号名称必须是非空字符串"):
            self.validator.validate_raw_config(config2)
    
    def test_validate_invalid_monitor_chats(self):
        """测试无效的监控聊天配置"""
        config = {
            "version": "1.0",
            "accounts": [
                {
                    "name": "test",
                    "monitor_chats": "not_a_list",
                    "rules": []
                }
            ]
        }
        with pytest.raises(ValueError, match="monitor_chats 必须是列表类型"):
            self.validator.validate_raw_config(config)
    
    def test_validate_invalid_rules(self):
        """测试无效的规则配置"""
        # rules 不是列表
        config1 = {
            "version": "1.0",
            "accounts": [
                {
                    "name": "test",
                    "monitor_chats": ["user"],
                    "rules": "not_a_list"
                }
            ]
        }
        with pytest.raises(ValueError, match="必须是列表类型"):
            self.validator.validate_raw_config(config1)
        
        # 规则缺少必需字段
        config2 = {
            "version": "1.0",
            "accounts": [
                {
                    "name": "test",
                    "monitor_chats": ["user"],
                    "rules": [
                        {
                            "keywords": ["hello"]
                            # 缺少其他必需字段
                        }
                    ]
                }
            ]
        }
        with pytest.raises(ValueError, match="缺少必需字段"):
            self.validator.validate_raw_config(config2)
    
    def test_validate_invalid_rule_fields(self):
        """测试无效的规则字段"""
        # 空的关键词列表
        config1 = {
            "version": "1.0",
            "accounts": [
                {
                    "name": "test",
                    "monitor_chats": ["user"],
                    "rules": [
                        {
                            "keywords": [],
                            "reply_text": "Hello!",
                            "fixed_delay": 1,
                            "random_delay_max": 2
                        }
                    ]
                }
            ]
        }
        with pytest.raises(ValueError, match="keywords 必须是非空列表"):
            self.validator.validate_raw_config(config1)
        
        # 负数的延时
        config2 = {
            "version": "1.0",
            "accounts": [
                {
                    "name": "test",
                    "monitor_chats": ["user"],
                    "rules": [
                        {
                            "keywords": ["hello"],
                            "reply_text": "Hello!",
                            "fixed_delay": -1,
                            "random_delay_max": 2
                        }
                    ]
                }
            ]
        }
        with pytest.raises(ValueError, match="必须是非负数"):
            self.validator.validate_raw_config(config2)
    
    def test_validate_logging_config(self):
        """测试日志配置验证"""
        # 有效的日志配置
        config1 = {
            "version": "1.0",
            "accounts": [
                {
                    "name": "test",
                    "monitor_chats": ["user"],
                    "rules": []
                }
            ],
            "logging": {
                "level": "DEBUG",
                "file": "./logs/test.log"
            }
        }
        self.validator.validate_raw_config(config1)  # 应该不抛出异常
        
        # 无效的日志级别
        config2 = {
            "version": "1.0",
            "accounts": [
                {
                    "name": "test",
                    "monitor_chats": ["user"],
                    "rules": []
                }
            ],
            "logging": {
                "level": "INVALID"
            }
        }
        with pytest.raises(ValueError, match="日志级别必须是以下之一"):
            self.validator.validate_raw_config(config2)
    
    def test_validate_browser_config(self):
        """测试浏览器配置验证"""
        # 有效的浏览器配置
        config1 = {
            "version": "1.0",
            "accounts": [
                {
                    "name": "test",
                    "monitor_chats": ["user"],
                    "rules": []
                }
            ],
            "browser": {
                "headless": False,
                "viewport_width": 1920,
                "viewport_height": 1080,
                "timeout": 60
            }
        }
        self.validator.validate_raw_config(config1)  # 应该不抛出异常
        
        # 负数的视口宽度
        config2 = {
            "version": "1.0",
            "accounts": [
                {
                    "name": "test",
                    "monitor_chats": ["user"],
                    "rules": []
                }
            ],
            "browser": {
                "viewport_width": -100
            }
        }
        with pytest.raises(ValueError, match="必须是正数"):
            self.validator.validate_raw_config(config2)
    
    def test_validate_config_object(self):
        """测试配置对象验证"""
        # 创建有效的配置对象
        account = Account(
            name="test_account",
            monitor_chats=["target_user"],
            rules=[
                Rule(
                    keywords=["hello"],
                    reply_text="Hello!",
                    fixed_delay=1,
                    random_delay_max=2
                )
            ]
        )
        config = TeleflowConfig(
            version="1.0",
            accounts=[account],
            default_account="test_account"
        )
        
        # 应该不抛出异常
        self.validator.validate_config(config)
    
    def test_validate_config_object_no_accounts(self):
        """测试没有账号的配置对象"""
        with pytest.raises(ValidationError, match="至少需要配置一个账号"):
            config = TeleflowConfig(version="1.0", accounts=[])
            self.validator.validate_config(config)
    
    def test_validate_config_object_invalid_default_account(self):
        """测试无效的默认账号"""
        account = Account(
            name="test_account",
            monitor_chats=["target_user"],
            rules=[]
        )
        with pytest.raises(ValidationError, match="默认账号 .* 不在账号列表中"):
            config = TeleflowConfig(
                version="1.0",
                accounts=[account],
                default_account="nonexistent_account"
            )
            self.validator.validate_config(config)
    
    def test_validate_config_object_account_no_chats(self):
        """测试没有监控聊天的账号"""
        account = Account(
            name="test_account",
            monitor_chats=[],  # 空列表
            rules=[]
        )
        config = TeleflowConfig(version="1.0", accounts=[account])
        
        with pytest.raises(ValueError, match="必须配置至少一个监控聊天"):
            self.validator.validate_config(config)
