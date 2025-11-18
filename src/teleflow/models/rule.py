"""关键词规则数据模型"""

from typing import List, Optional, Union

from pydantic import BaseModel, Field, field_validator


class Rule(BaseModel):
    """关键词自动回复规则"""
    
    keywords: List[str] = Field(
        ..., 
        description="关键词列表，支持通配符 * 和 ?，遵循 Python fnmatch 规范"
    )
    reply_text: str = Field(
        ..., 
        description="回复内容，支持变量替换（如 {ocr_result}）"
    )
    fixed_delay: Union[int, float] = Field(
        ..., 
        ge=0,
        description="固定延时（秒），必须 >= 0"
    )
    random_delay_max: Union[int, float] = Field(
        ..., 
        ge=0,
        description="随机延时上限（秒），必须 >= 0"
    )
    case_sensitive: bool = Field(
        False,
        description="是否区分大小写，默认 false"
    )
    enabled: bool = Field(
        True,
        description="是否启用此规则"
    )
    # 预留字段，为未来扩展做准备
    use_regex: bool = Field(
        False,
        description="是否使用正则表达式（预留，v1.3+ 功能，当前版本未实现）"
    )
    next_id: Optional[str] = Field(
        None,
        description="下一条规则ID（预留，v2.0 多节点流程）"
    )
    description: Optional[str] = Field(
        None,
        description="规则描述（可选，仅用于文档和UI显示）"
    )
    
    @field_validator("keywords")
    @classmethod
    def validate_keywords(cls, v):
        """验证关键词列表"""
        if not v:
            raise ValueError("关键词列表不能为空")
        
        validated_keywords = []
        for keyword in v:
            if not keyword or not keyword.strip():
                raise ValueError("关键词不能为空字符串")
            validated_keywords.append(keyword.strip())
        
        return validated_keywords
    
    @field_validator("reply_text")
    @classmethod
    def validate_reply_text(cls, v):
        """验证回复内容"""
        if not v or not v.strip():
            raise ValueError("回复内容不能为空")
        return v.strip()
    
    @field_validator("fixed_delay", "random_delay_max")
    @classmethod
    def validate_delays(cls, v):
        """验证延时参数"""
        if v < 0:
            raise ValueError("延时不能为负数")
        if isinstance(v, float) and v != int(v):
            # 允许浮点数，但建议使用整数
            pass
        return v
    
    def get_total_delay_range(self) -> tuple[float, float]:
        """获取总延时范围（最小值，最大值）"""
        min_delay = float(self.fixed_delay)
        max_delay = float(self.fixed_delay + self.random_delay_max)
        return min_delay, max_delay
    
    class Config:
        """Pydantic 配置"""
        validate_assignment = True
        extra = "forbid"  # 禁止额外字段
        schema_extra = {
            "example": {
                "keywords": ["hello", "hi", "*meeting*"],
                "reply_text": "Hello! How are you?",
                "fixed_delay": 2,
                "random_delay_max": 3,
                "case_sensitive": False,
                "enabled": True,
                "description": "问候语回复规则"
            }
        }
