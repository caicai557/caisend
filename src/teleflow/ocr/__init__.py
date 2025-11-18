"""OCR (光学字符识别) 模块

提供图片预处理和数字识别功能。

⚠️ 可选依赖:
- tesseract-ocr: 需要安装 Tesseract OCR 引擎
- pytesseract: Python 封装库
- Pillow: 图片处理库
"""

from .types import OCRResult
from .preprocessor import ImagePreprocessor
from .recognizer import DigitRecognizer

__all__ = ["OCRResult", "ImagePreprocessor", "DigitRecognizer"]
