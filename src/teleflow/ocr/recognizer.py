"""OCR 识别模块

使用 Tesseract OCR 进行文字识别，专注于数字识别。
"""

import logging
import time
from pathlib import Path
from typing import Optional, Union

try:
    import pytesseract
    from PIL import Image
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False

from .types import OCRResult


logger = logging.getLogger(__name__)


class DigitRecognizer:
    """数字识别器
    
    使用 Tesseract OCR 识别图片中的数字。
    
    ⚠️ 依赖:
    - tesseract-ocr: 需要安装 Tesseract OCR 引擎
    - pytesseract: Python 封装库
    """
    
    def __init__(
        self, 
        tesseract_cmd: Optional[str] = None,
        digits_only: bool = True,
        psm_mode: int = 7
    ):
        """
        初始化数字识别器
        
        Args:
            tesseract_cmd: Tesseract 可执行文件路径（可选）
            digits_only: 是否仅识别数字
            psm_mode: Page Segmentation Mode
                      7 = 单行文本（适合数字）
                      8 = 单词
                      13 = 原始行
        """
        if not PYTESSERACT_AVAILABLE:
            raise ImportError(
                "pytesseract 未安装。请运行: pip install pytesseract\n"
                "同时需要安装 Tesseract OCR: https://github.com/tesseract-ocr/tesseract"
            )
        
        # 设置 Tesseract 路径（如果指定）
        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
        
        self.digits_only = digits_only
        self.psm_mode = psm_mode
        self.logger = logger
        
        # 验证 Tesseract 是否可用
        try:
            version = pytesseract.get_tesseract_version()
            self.logger.info(f"Tesseract OCR 版本: {version}")
        except Exception as e:
            self.logger.warning(f"无法获取 Tesseract 版本: {e}")
    
    def recognize(
        self, 
        image_path: Union[str, Path],
        preprocess: bool = False
    ) -> OCRResult:
        """
        识别图片中的文字
        
        Args:
            image_path: 图片路径
            preprocess: 是否自动预处理（如果为 True，会先进行预处理）
            
        Returns:
            OCRResult: 识别结果
        """
        start_time = time.time()
        image_path = Path(image_path)
        
        try:
            if not image_path.exists():
                return OCRResult(
                    text="",
                    success=False,
                    error_message=f"图片文件不存在: {image_path}",
                    image_path=image_path
                )
            
            self.logger.info(f"开始识别图片: {image_path}")
            
            # 如果需要预处理
            if preprocess:
                from .preprocessor import ImagePreprocessor
                preprocessor = ImagePreprocessor()
                image_path = preprocessor.preprocess(image_path)
            
            # 打开图片
            img = Image.open(image_path)
            
            # 构建 Tesseract 配置
            config = self._build_config()
            
            # 执行 OCR
            text = pytesseract.image_to_string(img, config=config)
            
            # 清理结果
            text = self._clean_result(text)
            
            processing_time = time.time() - start_time
            
            self.logger.info(f"识别完成: '{text}' (耗时: {processing_time:.2f}s)")
            
            return OCRResult(
                text=text,
                success=True,
                image_path=image_path,
                processing_time=processing_time
            )
            
        except Exception as e:
            processing_time = time.time() - start_time
            self.logger.error(f"OCR 识别失败: {e}")
            
            return OCRResult(
                text="",
                success=False,
                error_message=str(e),
                image_path=image_path,
                processing_time=processing_time
            )
    
    def _build_config(self) -> str:
        """
        构建 Tesseract 配置字符串
        
        Returns:
            str: 配置字符串
        """
        config_parts = []
        
        # Page Segmentation Mode
        config_parts.append(f"--psm {self.psm_mode}")
        
        # 仅识别数字
        if self.digits_only:
            config_parts.append("-c tessedit_char_whitelist=0123456789")
        
        # 其他优化选项
        config_parts.append("--oem 3")  # OCR Engine Mode: 3 = Default (LSTM)
        
        config = " ".join(config_parts)
        self.logger.debug(f"Tesseract 配置: {config}")
        
        return config
    
    def _clean_result(self, text: str) -> str:
        """
        清理 OCR 结果
        
        Args:
            text: 原始 OCR 文本
            
        Returns:
            str: 清理后的文本
        """
        # 移除空白字符
        text = text.strip()
        
        # 如果仅保留数字
        if self.digits_only:
            text = ''.join(c for c in text if c.isdigit())
        
        return text
    
    def recognize_batch(
        self, 
        image_paths: list[Union[str, Path]],
        preprocess: bool = False
    ) -> list[OCRResult]:
        """
        批量识别多张图片
        
        Args:
            image_paths: 图片路径列表
            preprocess: 是否自动预处理
            
        Returns:
            list[OCRResult]: 识别结果列表
        """
        results = []
        
        for i, image_path in enumerate(image_paths, 1):
            self.logger.info(f"处理图片 {i}/{len(image_paths)}")
            result = self.recognize(image_path, preprocess=preprocess)
            results.append(result)
        
        return results
