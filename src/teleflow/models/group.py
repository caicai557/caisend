"""群组相关数据模型"""

from typing import Optional
from pydantic import BaseModel, Field, field_validator


class GroupInvite(BaseModel):
    """群组邀请配置"""
    
    invite_link: str = Field(
        ...,
        description="群组邀请链接，格式: https://t.me/+xxxxx 或 https://t.me/joinchat/xxxxx"
    )
    welcome_message: Optional[str] = Field(
        None,
        description="加入群组后发送的欢迎消息（可选）"
    )
    enabled: bool = Field(
        True,
        description="是否启用此邀请"
    )
    
    @field_validator("invite_link")
    @classmethod
    def validate_invite_link(cls, v):
        """验证邀请链接格式"""
        if not v or not v.strip():
            raise ValueError("邀请链接不能为空")
        
        v = v.strip()
        
        # 检查链接格式
        valid_prefixes = [
            "https://t.me/+",
            "https://t.me/joinchat/",
            "http://t.me/+",
            "http://t.me/joinchat/"
        ]
        
        if not any(v.startswith(prefix) for prefix in valid_prefixes):
            raise ValueError(
                "邀请链接格式无效，必须以 https://t.me/+ 或 https://t.me/joinchat/ 开头"
            )
        
        return v
    
    class Config:
        """Pydantic 配置"""
        validate_assignment = True
        extra = "forbid"
        json_schema_extra = {
            "example": {
                "invite_link": "https://t.me/+AbCdEfGhIjKlMnOp",
                "welcome_message": "Hello everyone! Happy to join this group!",
                "enabled": True
            }
        }
