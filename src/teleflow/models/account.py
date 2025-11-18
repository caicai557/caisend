"""账号配置数据模型"""

from pathlib import Path
from typing import List, Optional, Union

from pydantic import BaseModel, Field, field_validator


class Account(BaseModel):
    """Telegram 账号配置"""
    
    name: str = Field(..., description="账号名称，必须唯一")
    browser_data_dir: Optional[Path] = Field(
        None, 
        description="浏览器数据目录路径，可选。如未指定则使用默认路径"
    )
    monitor_chats: List[str] = Field(
        default_factory=list,
        description="监控的聊天列表（用户名或聊天ID）"
    )
    rules: List["Rule"] = Field(
        default_factory=list,
        description="关键词回复规则列表"
    )
    group_invites: List[Union[str, "GroupInvite"]] = Field(
        default_factory=list,
        description="群组邀请链接列表（v1.1+ 功能），支持字符串或 GroupInvite 对象"
    )
    
    @field_validator("browser_data_dir", mode="before")
    @classmethod
    def set_default_browser_data_dir(cls, v, info):
        """设置默认浏览器数据目录"""
        if v is None:
            account_name = info.data.get("name", "default")
            return Path(f"./browser_data/{account_name}")
        return Path(v) if isinstance(v, str) else v
    
    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        """验证账号名称"""
        if not v or not v.strip():
            raise ValueError("账号名称不能为空")
        if len(v.strip()) > 50:
            raise ValueError("账号名称长度不能超过50个字符")
        return v.strip()
    
    class Config:
        """Pydantic 配置"""
        validate_assignment = True
        use_enum_values = True
        extra = "forbid"  # 禁止额外字段


# 导入其他模型（避免循环导入）
from .rule import Rule
from .group import GroupInvite
