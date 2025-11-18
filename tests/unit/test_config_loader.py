"""配置加载器单元测试"""

import pytest
import tempfile
import yaml
from pathlib import Path

from teleflow.config.loader import ConfigLoader
from teleflow.config.validator import ConfigValidator
from teleflow.models.config import TeleflowConfig


class TestConfigLoader:
    """配置加载器测试类"""
    
    def setup_method(self):
        """每个测试方法前的设置"""
        self.loader = ConfigLoader()
        self.validator = ConfigValidator()
    
    def test_load_valid_config_from_file(self):
        """测试从文件加载有效配置"""
        # 创建临时配置文件
        valid_config = {
            "version": "1.0",
            "accounts": [
                {
                    "name": "test_account",
                    "monitor_chats": ["target_user"],
                    "rules": [
                        {
                            "keywords": ["hello", "hi"],
                            "reply_text": "Hello! How are you?",
                            "fixed_delay": 2,
                            "random_delay_max": 3
                        }
                    ]
                }
            ],
            "default_account": "test_account"
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            yaml.dump(valid_config, f)
            temp_path = f.name
        
        try:
            # 加载配置
            config = self.loader.load_from_file(temp_path)
            
            # 验证配置
            assert isinstance(config, TeleflowConfig)
            assert config.version == "1.0"
            assert len(config.accounts) == 1
            assert config.accounts[0].name == "test_account"
            assert config.default_account == "test_account"
            assert len(config.accounts[0].rules) == 1
            assert config.accounts[0].rules[0].keywords == ["hello", "hi"]
            
        finally:
            # 清理临时文件
            Path(temp_path).unlink()
    
    def test_load_config_from_dict(self):
        """测试从字典加载配置"""
        config_dict = {
            "version": "1.0",
            "accounts": [
                {
                    "name": "test_account",
                    "monitor_chats": ["target_user"],
                    "rules": []
                }
            ]
        }
        
        config = self.loader.load_from_dict(config_dict)
        
        assert isinstance(config, TeleflowConfig)
        assert config.version == "1.0"
        assert len(config.accounts) == 1
        assert config.accounts[0].name == "test_account"
    
    def test_load_nonexistent_file(self):
        """测试加载不存在的文件"""
        with pytest.raises(FileNotFoundError, match="配置文件不存在"):
            self.loader.load_from_file("/nonexistent/path/config.yaml")
    
    def test_load_invalid_yaml(self):
        """测试加载无效的 YAML 文件"""
        invalid_yaml = "invalid: yaml: content: ["
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            f.write(invalid_yaml)
            temp_path = f.name
        
        try:
            with pytest.raises(yaml.YAMLError, match="YAML 格式错误"):
                self.loader.load_from_file(temp_path)
        finally:
            Path(temp_path).unlink()
    
    def test_load_empty_file(self):
        """测试加载空文件"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            f.write("")
            temp_path = f.name
        
        try:
            with pytest.raises(ValueError, match="配置文件为空"):
                self.loader.load_from_file(temp_path)
        finally:
            Path(temp_path).unlink()
    
    def test_load_missing_required_fields(self):
        """测试缺少必需字段的配置"""
        invalid_config = {
            "version": "1.0"
            # 缺少 accounts 字段
        }
        
        with pytest.raises(ValueError, match="缺少必需字段"):
            self.loader.load_from_dict(invalid_config)
    
    def test_load_invalid_version(self):
        """测试无效版本格式"""
        invalid_config = {
            "version": "invalid",
            "accounts": [
                {
                    "name": "test_account",
                    "monitor_chats": ["target_user"],
                    "rules": []
                }
            ]
        }
        
        with pytest.raises(ValueError, match="版本格式应为"):
            self.loader.load_from_dict(invalid_config)
    
    def test_duplicate_account_names(self):
        """测试重复的账号名称"""
        invalid_config = {
            "version": "1.0",
            "accounts": [
                {
                    "name": "duplicate_name",
                    "monitor_chats": ["user1"],
                    "rules": []
                },
                {
                    "name": "duplicate_name",
                    "monitor_chats": ["user2"],
                    "rules": []
                }
            ]
        }
        
        with pytest.raises(ValueError, match="账号名称重复"):
            self.loader.load_from_dict(invalid_config)
    
    def test_save_config_to_file(self):
        """测试保存配置到文件"""
        # 创建配置对象
        config = self.loader.create_example_config()
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            temp_path = f.name
        
        try:
            # 保存配置
            self.loader.save_to_file(config, temp_path)
            
            # 验证文件存在
            assert Path(temp_path).exists()
            
            # 验证可以重新加载
            loaded_config = self.loader.load_from_file(temp_path)
            assert loaded_config.version == config.version
            assert len(loaded_config.accounts) == len(config.accounts)
            
        finally:
            Path(temp_path).unlink()
    
    def test_create_example_config(self):
        """测试创建示例配置"""
        config = self.loader.create_example_config()
        
        assert isinstance(config, TeleflowConfig)
        assert config.version == "1.0"
        assert len(config.accounts) > 0
        assert config.accounts[0].name == "test_account"
        assert len(config.accounts[0].rules) > 0
        
        # 验证规则内容
        rule = config.accounts[0].rules[0]
        assert rule.keywords == ["hello", "hi"]
        assert rule.reply_text == "Hello! How are you?"
        assert rule.fixed_delay == 2
        assert rule.random_delay_max == 3
    
    def test_load_config_with_logging(self):
        """测试加载包含日志配置的配置"""
        config_dict = {
            "version": "1.0",
            "accounts": [
                {
                    "name": "test_account",
                    "monitor_chats": ["target_user"],
                    "rules": []
                }
            ],
            "logging": {
                "level": "DEBUG",
                "file": "./logs/test.log",
                "max_file_size": "5MB",
                "backup_count": 3
            }
        }
        
        config = self.loader.load_from_dict(config_dict)
        
        assert config.logging.level == "DEBUG"
        assert str(config.logging.file) == str(Path("./logs/test.log"))
        assert config.logging.max_file_size == "5MB"
        assert config.logging.backup_count == 3
    
    def test_load_config_with_browser_settings(self):
        """测试加载包含浏览器配置的配置"""
        config_dict = {
            "version": "1.0",
            "accounts": [
                {
                    "name": "test_account",
                    "monitor_chats": ["target_user"],
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
        
        config = self.loader.load_from_dict(config_dict)
        
        assert config.browser.headless is False
        assert config.browser.viewport_width == 1920
        assert config.browser.viewport_height == 1080
        assert config.browser.timeout == 60
