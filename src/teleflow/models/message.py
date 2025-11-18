"""消息数据模型"""

from datetime import datetime
from typing import Optional, Dict, Any

from pydantic import BaseModel, Field


class Message(BaseModel):
    """Telegram 消息数据结构"""
    
    id: str = Field(..., description="消息ID")
    sender_username: str = Field(..., description="发送者用户名")
    chat_username: str = Field(..., description="聊天用户名或群组名")
    text: str = Field(..., description="消息文本内容")
    timestamp: datetime = Field(..., description="消息时间戳")
    is_read: bool = Field(False, description="是否已读")
    is_from_me: bool = Field(False, description="是否是自己发送的消息")
    has_media: bool = Field(False, description="是否包含媒体文件")
    media_type: Optional[str] = Field(None, description="媒体类型（image, video, document等）")
    
    # 内部处理字段
    matched_rule_ids: list[str] = Field(
        default_factory=list,
        description="匹配的规则ID列表"
    )
    processed: bool = Field(
        False,
        description="是否已处理（已读或回复）"
    )
    processing_time: Optional[datetime] = Field(
        None,
        description="处理时间"
    )
    error_info: Optional[Dict[str, Any]] = Field(
        None,
        description="处理错误信息"
    )
    
    def mark_as_read(self) -> None:
        """标记消息为已读"""
        self.is_read = True
        self.processing_time = datetime.now()
    
    def add_matched_rule(self, rule_id: str) -> None:
        """添加匹配的规则ID"""
        if rule_id not in self.matched_rule_ids:
            self.matched_rule_ids.append(rule_id)
    
    def set_error(self, error_type: str, error_message: str) -> None:
        """设置错误信息"""
        self.error_info = {
            "type": error_type,
            "message": error_message,
            "timestamp": datetime.now().isoformat()
        }
    
    class Config:
        """Pydantic 配置"""
        validate_assignment = True
        extra = "forbid"  # 禁止额外字段
        schema_extra = {
            "example": {
                "id": "msg_123456",
                "sender_username": "john_doe",
                "chat_username": "my_friend",
                "text": "Hello, how are you?",
                "timestamp": "2025-01-16T10:30:00Z",
                "is_read": False,
                "is_from_me": False,
                "has_media": False
            }
        }
