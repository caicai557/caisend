"""聊天配置数据模型"""

from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class Chat(BaseModel):
    """聊天对象配置"""
    
    target_username: str = Field(
        ..., 
        description="目标聊天用户名或聊天ID"
    )
    display_name: Optional[str] = Field(
        None,
        description="聊天显示名称（可选，仅用于日志和UI显示）"
    )
    enabled: bool = Field(
        True,
        description="是否启用此聊天的监控"
    )
    auto_read: bool = Field(
        True,
        description="是否自动标记消息为已读"
    )
    rules: List["Rule"] = Field(
        default_factory=list,
        description="此聊天专用的关键词回复规则列表"
    )
    
    @field_validator("target_username")
    @classmethod
    def validate_target_username(cls, v):
        """验证目标用户名"""
        if not v or not v.strip():
            raise ValueError("目标聊天用户名不能为空")
        return v.strip()
    
    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, v):
        """验证显示名称"""
        if v is not None:
            return v.strip() if v.strip() else None
        return v
    
    class Config:
        """Pydantic 配置"""
        validate_assignment = True
        extra = "forbid"  # 禁止额外字段


# 导入 Rule 模型（避免循环导入）
from .rule import Rule
