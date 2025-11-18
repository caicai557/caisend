"""配置系统集成测试"""

import pytest
import tempfile
import yaml
from pathlib import Path

from teleflow.config.loader import ConfigLoader
from teleflow.config.validator import ConfigValidator
from teleflow.models.config import TeleflowConfig


class TestConfigIntegration:
    """配置系统集成测试类"""
    
    def setup_method(self):
        """每个测试方法前的设置"""
        self.loader = ConfigLoader()
        self.temp_dir = Path(tempfile.mkdtemp())
    
    def teardown_method(self):
        """每个测试方法后的清理"""
        # 清理临时文件
        import shutil
        if self.temp_dir.exists():
            shutil.rmtree(self.temp_dir)
    
    def test_load_and_validate_complete_config(self):
        """测试加载和验证完整配置"""
        # 创建完整的配置文件
        config_path = self.temp_dir / "complete_config.yaml"
        complete_config = {
            "version": "1.0",
            "description": "完整配置测试",
            "accounts": [
                {
                    "name": "primary_account",
                    "browser_data_dir": "./browser_data/primary",
                    "monitor_chats": ["user1", "user2"],
                    "rules": [
                        {
                            "keywords": ["hello", "hi"],
                            "reply_text": "Hello! How are you?",
                            "fixed_delay": 2,
                            "random_delay_max": 3,
                            "case_sensitive": False,
                            "description": "问候语规则"
                        },
                        {
                            "keywords": ["*meeting*"],
                            "reply_text": "I'll join the meeting soon.",
                            "fixed_delay": 1,
                            "random_delay_max": 2,
                            "description": "会议规则"
                        }
                    ]
                },
                {
                    "name": "secondary_account",
                    "monitor_chats": ["user3"],
                    "rules": [
                        {
                            "keywords": ["test"],
                            "reply_text": "Test response",
                            "fixed_delay": 1,
                            "random_delay_max": 1
                        }
                    ]
                }
            ],
            "default_account": "primary_account",
            "logging": {
                "level": "INFO",
                "file": "./logs/teleflow.log",
                "max_file_size": "10MB",
                "backup_count": 7
            },
            "browser": {
                "headless": True,
                "viewport_width": 1280,
                "viewport_height": 720,
                "timeout": 30
            },
            "runtime": {
                "debug": False,
                "check_interval": 2.0,
                "max_retry_count": 3
            },
            "global_rules": [
                {
                    "keywords": ["global"],
                    "reply_text": "Global response",
                    "fixed_delay": 1,
                    "random_delay_max": 1
                }
            ]
        }
        
        # 写入配置文件
        with open(config_path, 'w', encoding='utf-8') as f:
            yaml.dump(complete_config, f, default_flow_style=False, allow_unicode=True)
        
        # 加载配置
        config = self.loader.load_from_file(config_path)
        
        # 验证配置完整性
        assert isinstance(config, TeleflowConfig)
        assert config.version == "1.0"
        assert config.description == "完整配置测试"
        assert len(config.accounts) == 2
        assert config.default_account == "primary_account"
        
        # 验证主账号配置
        primary_account = config.accounts[0]
        assert primary_account.name == "primary_account"
        assert str(primary_account.browser_data_dir) == str(Path("./browser_data/primary"))
        assert len(primary_account.monitor_chats) == 2
        assert len(primary_account.rules) == 2
        
        # 验证规则详情
        rule1 = primary_account.rules[0]
        assert rule1.keywords == ["hello", "hi"]
        assert rule1.reply_text == "Hello! How are you?"
        assert rule1.fixed_delay == 2
        assert rule1.random_delay_max == 3
        assert rule1.case_sensitive is False
        assert rule1.description == "问候语规则"
        
        # 验证日志配置
        assert config.logging.level == "INFO"
        assert str(config.logging.file) == str(Path("./logs/teleflow.log"))
        assert config.logging.max_file_size == "10MB"
        assert config.logging.backup_count == 7
        
        # 验证浏览器配置
        assert config.browser.headless is True
        assert config.browser.viewport_width == 1280
        assert config.browser.viewport_height == 720
        assert config.browser.timeout == 30
        
        # 验证运行时配置
        assert config.runtime.debug is False
        assert config.runtime.check_interval == 2.0
        assert config.runtime.max_retry_count == 3
        
        # 验证全局规则
        assert len(config.global_rules) == 1
        assert config.global_rules[0].keywords == ["global"]
    
    def test_save_and_reload_config(self):
        """测试保存和重新加载配置"""
        # 创建原始配置
        original_config = self.loader.create_example_config()
        
        # 保存配置
        config_path = self.temp_dir / "saved_config.yaml"
        self.loader.save_to_file(original_config, config_path)
        
        # 验证文件存在
        assert config_path.exists()
        
        # 重新加载配置
        reloaded_config = self.loader.load_from_file(config_path)
        
        # 验证配置一致性
        assert reloaded_config.version == original_config.version
        assert len(reloaded_config.accounts) == len(original_config.accounts)
        assert reloaded_config.accounts[0].name == original_config.accounts[0].name
        assert len(reloaded_config.accounts[0].rules) == len(original_config.accounts[0].rules)
        
        # 验证规则详情
        original_rule = original_config.accounts[0].rules[0]
        reloaded_rule = reloaded_config.accounts[0].rules[0]
        assert reloaded_rule.keywords == original_rule.keywords
        assert reloaded_rule.reply_text == original_rule.reply_text
        assert reloaded_rule.fixed_delay == original_rule.fixed_delay
        assert reloaded_rule.random_delay_max == original_rule.random_delay_max
    
    def test_load_minimal_config(self):
        """测试加载最小配置"""
        minimal_config = {
            "version": "1.0",
            "accounts": [
                {
                    "name": "minimal",
                    "monitor_chats": ["user1"],
                    "rules": [
                        {
                            "keywords": ["hello"],
                            "reply_text": "Hi!",
                            "fixed_delay": 1,
                            "random_delay_max": 1
                        }
                    ]
                }
            ]
        }
        
        config = self.loader.load_from_dict(minimal_config)
        
        # 验证最小配置
        assert config.version == "1.0"
        assert len(config.accounts) == 1
        assert config.accounts[0].name == "minimal"
        assert len(config.accounts[0].monitor_chats) == 1
        assert len(config.accounts[0].rules) == 1
        
        # 验证默认值
        assert config.logging.level == "INFO"  # 默认日志级别
        assert config.browser.headless is True  # 默认 headless
        assert config.runtime.debug is False  # 默认非调试模式
        assert config.runtime.check_interval == 2.0  # 默认检查间隔
    
    def test_config_with_unicode_content(self):
        """测试包含 Unicode 内容的配置"""
        unicode_config = {
            "version": "1.0",
            "description": "测试中文配置",
            "accounts": [
                {
                    "name": "中文账号",
                    "monitor_chats": ["用户1", "用户2"],
                    "rules": [
                        {
                            "keywords": ["你好", "hello"],
                            "reply_text": "你好！很高兴见到你！",
                            "fixed_delay": 1,
                            "random_delay_max": 2,
                            "description": "中文问候规则"
                        }
                    ]
                }
            ]
        }
        
        # 保存到文件
        config_path = self.temp_dir / "unicode_config.yaml"
        with open(config_path, 'w', encoding='utf-8') as f:
            yaml.dump(unicode_config, f, default_flow_style=False, allow_unicode=True)
        
        # 加载配置
        config = self.loader.load_from_file(config_path)
        
        # 验证 Unicode 内容
        assert config.description == "测试中文配置"
        assert config.accounts[0].name == "中文账号"
        assert "用户1" in config.accounts[0].monitor_chats
        assert config.accounts[0].rules[0].keywords == ["你好", "hello"]
        assert config.accounts[0].rules[0].reply_text == "你好！很高兴见到你！"
    
    def test_config_validation_error_handling(self):
        """测试配置验证错误处理"""
        # 测试各种无效配置
        invalid_configs = [
            # 缺少版本
            {
                "accounts": [
                    {
                        "name": "test",
                        "monitor_chats": ["user"],
                        "rules": []
                    }
                ]
            },
            # 缺少账号
            {
                "version": "1.0"
            },
            # 空账号列表
            {
                "version": "1.0",
                "accounts": []
            }
        ]
        
        for invalid_config in invalid_configs:
            with pytest.raises(ValueError):
                self.loader.load_from_dict(invalid_config)
    
    def test_get_account_and_effective_rules(self):
        """测试获取账号和有效规则"""
        config = self.loader.create_example_config()
        
        # 测试获取存在的账号
        account = config.get_account("test_account")
        assert account is not None
        assert account.name == "test_account"
        
        # 测试获取不存在的账号
        account = config.get_account("nonexistent")
        assert account is None
        
        # 测试获取有效规则（账号特定规则）
        effective_rules = config.get_effective_rules("test_account")
        assert len(effective_rules) > 0
        
        # 测试不存在账号的有效规则（应返回全局规则）
        global_rules = config.get_effective_rules("nonexistent")
        assert len(global_rules) == 0  # 示例配置中没有全局规则
    
    def test_rule_delay_calculation(self):
        """测试规则延时计算"""
        from teleflow.models.rule import Rule
        
        rule = Rule(
            keywords=["test"],
            reply_text="Test response",
            fixed_delay=2,
            random_delay_max=3
        )
        
        min_delay, max_delay = rule.get_total_delay_range()
        assert min_delay == 2.0
        assert max_delay == 5.0  # 2 + 3
        
        # 测试零随机延时
        rule_zero_random = Rule(
            keywords=["test"],
            reply_text="Test response",
            fixed_delay=1,
            random_delay_max=0
        )
        
        min_delay, max_delay = rule_zero_random.get_total_delay_range()
        assert min_delay == 1.0
        assert max_delay == 1.0
