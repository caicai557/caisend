"""图片预处理模块

提供图片预处理功能以提高 OCR 识别率。
"""

import logging
from pathlib import Path
from typing import Optional, Union

try:
    from PIL import Image, ImageEnhance, ImageFilter
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False


logger = logging.getLogger(__name__)


class ImagePreprocessor:
    """图片预处理器
    
    提供图片预处理功能以提高 OCR 识别准确率：
    - 灰度化
    - 二值化
    - 去噪
    - 增强对比度
    """
    
    def __init__(self):
        """初始化预处理器"""
        if not PIL_AVAILABLE:
            raise ImportError(
                "PIL/Pillow 未安装。请运行: pip install Pillow"
            )
        
        self.logger = logger
    
    def preprocess(
        self, 
        image_path: Union[str, Path],
        output_path: Optional[Union[str, Path]] = None,
        grayscale: bool = True,
        binarize: bool = True,
        threshold: int = 128,
        enhance_contrast: bool = True,
        denoise: bool = False
    ) -> Path:
        """
        预处理图片
        
        Args:
            image_path: 输入图片路径
            output_path: 输出图片路径（可选，默认在同目录生成 _preprocessed.png）
            grayscale: 是否转换为灰度图
            binarize: 是否二值化
            threshold: 二值化阈值 (0-255)
            enhance_contrast: 是否增强对比度
            denoise: 是否去噪
            
        Returns:
            Path: 处理后的图片路径
        """
        try:
            image_path = Path(image_path)
            
            if not image_path.exists():
                raise FileNotFoundError(f"图片文件不存在: {image_path}")
            
            self.logger.debug(f"开始预处理图片: {image_path}")
            
            # 打开图片
            img = Image.open(image_path)
            
            # 灰度化
            if grayscale:
                self.logger.debug("转换为灰度图")
                img = img.convert('L')  # L = 8-bit grayscale
            
            # 增强对比度
            if enhance_contrast:
                self.logger.debug("增强对比度")
                enhancer = ImageEnhance.Contrast(img)
                img = enhancer.enhance(2.0)  # 增强对比度 2 倍
            
            # 去噪（可选）
            if denoise:
                self.logger.debug("去噪处理")
                img = img.filter(ImageFilter.MedianFilter(size=3))
            
            # 二值化
            if binarize:
                self.logger.debug(f"二值化处理 (阈值: {threshold})")
                img = self._binarize(img, threshold)
            
            # 确定输出路径
            if output_path is None:
                output_path = image_path.parent / f"{image_path.stem}_preprocessed.png"
            else:
                output_path = Path(output_path)
            
            # 保存处理后的图片
            img.save(output_path)
            self.logger.info(f"预处理完成: {output_path}")
            
            return output_path
            
        except Exception as e:
            self.logger.error(f"图片预处理失败: {e}")
            raise
    
    def _binarize(self, img: Image.Image, threshold: int = 128) -> Image.Image:
        """
        二值化图片
        
        Args:
            img: PIL Image 对象
            threshold: 二值化阈值 (0-255)
            
        Returns:
            Image: 二值化后的图片
        """
        # 确保是灰度图
        if img.mode != 'L':
            img = img.convert('L')
        
        # 应用阈值
        return img.point(lambda p: 255 if p > threshold else 0)
    
    def auto_threshold(self, img: Image.Image) -> int:
        """
        自动计算最佳二值化阈值（Otsu 方法的简化版）
        
        Args:
            img: PIL Image 对象
            
        Returns:
            int: 计算得到的阈值
        """
        # 确保是灰度图
        if img.mode != 'L':
            img = img.convert('L')
        
        # 获取直方图
        histogram = img.histogram()
        
        # 计算平均灰度值作为简单阈值
        total_pixels = sum(histogram)
        weighted_sum = sum(i * histogram[i] for i in range(256))
        threshold = int(weighted_sum / total_pixels)
        
        self.logger.debug(f"自动计算阈值: {threshold}")
        return threshold
