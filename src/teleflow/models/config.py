"""Teleflow 根配置数据模型"""

from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from .account import Account
from .chat import Chat
from .rule import Rule


class LoggingConfig(BaseModel):
    """日志配置"""
    
    level: str = Field(
        "INFO",
        description="日志级别：DEBUG, INFO, WARNING, ERROR"
    )
    file: Optional[Path] = Field(
        None,
        description="日志文件路径，如未指定则只输出到控制台"
    )
    max_file_size: str = Field(
        "10MB",
        description="单个日志文件最大大小"
    )
    backup_count: int = Field(
        7,
        description="保留的日志文件备份数量"
    )
    format: str = Field(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        description="日志格式"
    )
    
    @field_validator("level")
    @classmethod
    def validate_level(cls, v):
        """验证日志级别"""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR"]
        if v.upper() not in valid_levels:
            raise ValueError(f"日志级别必须是以下之一: {valid_levels}")
        return v.upper()


class BrowserConfig(BaseModel):
    """浏览器配置"""
    
    headless: bool = Field(
        True,
        description="是否使用 headless 模式（无界面）"
    )
    user_agent: Optional[str] = Field(
        None,
        description="自定义 User-Agent"
    )
    viewport_width: int = Field(
        1280,
        description="浏览器视口宽度"
    )
    viewport_height: int = Field(
        720,
        description="浏览器视口高度"
    )
    timeout: int = Field(
        30,
        description="页面加载超时时间（秒）"
    )
    
    @field_validator("viewport_width", "viewport_height")
    @classmethod
    def validate_viewport(cls, v):
        """验证视口尺寸"""
        if v <= 0:
            raise ValueError("视口尺寸必须大于0")
        return v


class RuntimeConfig(BaseModel):
    """运行时配置"""
    
    debug: bool = Field(
        False,
        description="是否启用调试模式"
    )
    random_seed: Optional[int] = Field(
        None,
        description="随机种子（仅调试模式有效）"
    )
    check_interval: float = Field(
        2.0,
        description="消息检查间隔（秒）"
    )
    max_retry_count: int = Field(
        3,
        description="最大重试次数"
    )
    
    @field_validator("random_seed")
    @classmethod
    def validate_random_seed(cls, v):
        """验证随机种子"""
        if v is not None and (v < 0 or v > 2**31 - 1):
            raise ValueError("随机种子必须在 0 到 2^31-1 之间")
        return v
    
    @field_validator("check_interval")
    @classmethod
    def validate_check_interval(cls, v):
        """验证检查间隔"""
        if v <= 0:
            raise ValueError("检查间隔必须大于0")
        if v < 0.5:
            raise ValueError("检查间隔不能小于0.5秒")
        return v


class TeleflowConfig(BaseModel):
    """Teleflow 根配置模型"""
    
    version: str = Field(
        "1.0",
        description="配置文件版本"
    )
    accounts: List[Account] = Field(
        default_factory=list,
        description="账号配置列表"
    )
    default_account: Optional[str] = Field(
        None,
        description="默认账号名称"
    )
    logging: LoggingConfig = Field(
        default_factory=LoggingConfig,
        description="日志配置"
    )
    browser: BrowserConfig = Field(
        default_factory=BrowserConfig,
        description="浏览器配置"
    )
    runtime: RuntimeConfig = Field(
        default_factory=RuntimeConfig,
        description="运行时配置"
    )
    
    # 全局规则（可被账号特定规则覆盖）
    global_rules: List[Rule] = Field(
        default_factory=list,
        description="全局关键词规则列表"
    )
    
    # 元数据
    created_at: Optional[datetime] = Field(
        None,
        description="配置创建时间"
    )
    updated_at: Optional[datetime] = Field(
        None,
        description="配置更新时间"
    )
    description: Optional[str] = Field(
        None,
        description="配置描述"
    )
    
    @field_validator("accounts")
    @classmethod
    def validate_accounts(cls, v):
        """验证账号列表"""
        if not v:
            raise ValueError("至少需要配置一个账号")
        
        # 检查账号名称唯一性
        names = [account.name for account in v]
        if len(names) != len(set(names)):
            raise ValueError("账号名称必须唯一")
        
        return v
    
    @field_validator("default_account")
    @classmethod
    def validate_default_account(cls, v, info):
        """验证默认账号"""
        if v is not None:
            accounts = info.data.get("accounts", [])
            account_names = [account.name for account in accounts]
            if v not in account_names:
                raise ValueError(f"默认账号 '{v}' 不在账号列表中")
        return v
    
    def get_account(self, name: str) -> Optional[Account]:
        """根据名称获取账号配置"""
        for account in self.accounts:
            if account.name == name:
                return account
        return None
    
    def get_effective_rules(self, account_name: str) -> List[Rule]:
        """获取账号的有效规则（全局规则 + 账号特定规则）"""
        account = self.get_account(account_name)
        if not account:
            return self.global_rules
        
        # 账号特定规则会覆盖全局规则
        return account.rules or self.global_rules
    
    class Config:
        """Pydantic 配置"""
        validate_assignment = True
        extra = "forbid"  # 禁止额外字段
        schema_extra = {
            "example": {
                "version": "1.0",
                "accounts": [
                    {
                        "name": "test_account",
                        "browser_data_dir": "./browser_data/test_account",
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
                "logging": {
                    "level": "INFO",
                    "file": "./logs/teleflow.log"
                },
                "browser": {
                    "headless": True,
                    "timeout": 30
                },
                "runtime": {
                    "debug": False,
                    "check_interval": 2.0
                }
            }
        }
