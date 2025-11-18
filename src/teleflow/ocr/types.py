"""OCR 数据类型定义"""

from dataclasses import dataclass
from typing import Optional
from pathlib import Path


@dataclass
class OCRResult:
    """OCR 识别结果"""
    
    text: str
    """识别出的文本"""
    
    confidence: Optional[float] = None
    """识别置信度 (0.0-1.0)，可选"""
    
    image_path: Optional[Path] = None
    """图片路径，可选"""
    
    processing_time: Optional[float] = None
    """处理时间（秒），可选"""
    
    success: bool = True
    """是否识别成功"""
    
    error_message: Optional[str] = None
    """错误信息（如果失败）"""
    
    def __str__(self) -> str:
        """字符串表示"""
        if self.success:
            return f"OCRResult(text='{self.text}', confidence={self.confidence})"
        else:
            return f"OCRResult(failed: {self.error_message})"
    
    @property
    def digits_only(self) -> str:
        """仅保留数字字符"""
        return ''.join(c for c in self.text if c.isdigit())
    
    @property
    def is_empty(self) -> bool:
        """是否为空结果"""
        return not self.text or self.text.strip() == ""
