"""配置文件加载器"""

import yaml
from pathlib import Path
from typing import Dict, Any, Optional

from ..models.config import TeleflowConfig
from .validator import ConfigValidator


class ConfigLoader:
    """YAML 配置文件加载器"""
    
    def __init__(self, validator: Optional[ConfigValidator] = None):
        """初始化配置加载器
        
        Args:
            validator: 配置验证器，如未指定则使用默认验证器
        """
        self.validator = validator or ConfigValidator()
    
    def load_from_file(self, config_path: str | Path) -> TeleflowConfig:
        """从文件加载配置
        
        Args:
            config_path: 配置文件路径
            
        Returns:
            TeleflowConfig: 解析后的配置对象
            
        Raises:
            FileNotFoundError: 配置文件不存在
            yaml.YAMLError: YAML 格式错误
            ValueError: 配置验证失败
        """
        config_path = Path(config_path)
        
        if not config_path.exists():
            raise FileNotFoundError(f"配置文件不存在: {config_path}")
        
        if not config_path.is_file():
            raise ValueError(f"配置路径不是文件: {config_path}")
        
        try:
            # 读取 YAML 文件
            with open(config_path, 'r', encoding='utf-8') as f:
                raw_config = yaml.safe_load(f)
            
            if raw_config is None:
                raise ValueError("配置文件为空")
            
            # 验证配置
            self.validator.validate_raw_config(raw_config)
            
            # 转换为 Pydantic 模型
            config = TeleflowConfig(**raw_config)
            
            # 最终验证
            self.validator.validate_config(config)
            
            return config
            
        except yaml.YAMLError as e:
            raise yaml.YAMLError(f"YAML 格式错误: {e}")
        except Exception as e:
            if isinstance(e, (FileNotFoundError, yaml.YAMLError, ValueError)):
                raise
            raise ValueError(f"配置加载失败: {e}")
    
    def load_from_dict(self, config_dict: Dict[str, Any]) -> TeleflowConfig:
        """从字典加载配置
        
        Args:
            config_dict: 配置字典
            
        Returns:
            TeleflowConfig: 解析后的配置对象
            
        Raises:
            ValueError: 配置验证失败
        """
        # 验证配置
        self.validator.validate_raw_config(config_dict)
        
        # 转换为 Pydantic 模型
        config = TeleflowConfig(**config_dict)
        
        # 最终验证
        self.validator.validate_config(config)
        
        return config
    
    def save_to_file(self, config: TeleflowConfig, config_path: str | Path) -> None:
        """保存配置到文件
        
        Args:
            config: 配置对象
            config_path: 保存路径
        """
        config_path = Path(config_path)
        
        # 确保目录存在
        config_path.parent.mkdir(parents=True, exist_ok=True)
        
        # 转换为字典并保存
        config_dict = config.model_dump(exclude_unset=True)
        
        with open(config_path, 'w', encoding='utf-8') as f:
            yaml.dump(config_dict, f, default_flow_style=False, allow_unicode=True, indent=2)
    
    def create_example_config(self) -> TeleflowConfig:
        """创建示例配置
        
        Returns:
            TeleflowConfig: 示例配置对象
        """
        from ..models.rule import Rule
        from ..models.account import Account
        
        example_config = TeleflowConfig(
            version="1.0",
            description="Teleflow 示例配置",
            accounts=[
                Account(
                    name="test_account",
                    monitor_chats=["target_user"],
                    rules=[
                        Rule(
                            keywords=["hello", "hi"],
                            reply_text="Hello! How are you?",
                            fixed_delay=2,
                            random_delay_max=3,
                            description="问候语回复"
                        ),
                        Rule(
                            keywords=["*meeting*"],
                            reply_text="I'll join the meeting soon.",
                            fixed_delay=1,
                            random_delay_max=2,
                            description="会议相关回复"
                        )
                    ]
                )
            ],
            default_account="test_account"
        )
        
        return example_config
