#!/usr/bin/env python3
"""
视觉辅助决策模块 - 基于屏幕分析的智能推荐
"""
import cv2
import numpy as np
import pyautogui
from PIL import Image, ImageDraw
from typing import Dict, List, Tuple, Optional, NamedTuple
from dataclasses import dataclass
import logging
import pytesseract
import re
from pathlib import Path

logger = logging.getLogger(__name__)

# 禁用pyautogui的安全检查
pyautogui.FAILSAFE = False


class UIElement(NamedTuple):
    """UI元素定义"""
    type: str  # 元素类型
    position: Tuple[int, int, int, int]  # (x, y, width, height)
    text: str  # 元素文本内容
    confidence: float  # 识别置信度
    actionable: bool  # 是否可操作


@dataclass
class VisualContext:
    """视觉上下文"""
    active_window: str
    ui_elements: List[UIElement]
    focus_area: Optional[Tuple[int, int, int, int]]
    suggested_actions: List[str]
    screenshot_path: Optional[str] = None


class ScreenCapture:
    """屏幕捕获器"""
    
    def __init__(self):
        self.last_screenshot = None
        self.screenshot_cache = {}
    
    def capture_screen(self, region: Optional[Tuple[int, int, int, int]] = None) -> Image.Image:
        """
        捕获屏幕截图
        
        Args:
            region: 区域 (x, y, width, height)，None表示全屏
            
        Returns:
            PIL Image对象
        """
        try:
            if region:
                screenshot = pyautogui.screenshot(region=region)
            else:
                screenshot = pyautogui.screenshot()
            
            self.last_screenshot = screenshot
            return screenshot
            
        except Exception as e:
            logger.error(f"屏幕捕获失败: {e}")
            # 返回空白图像作为fallback
            return Image.new('RGB', (800, 600), color='white')
    
    def capture_window(self, window_title: str) -> Optional[Image.Image]:
        """捕获指定窗口的截图"""
        try:
            # 使用pyautogui获取窗口信息
            windows = pyautogui.getAllWindows()
            target_window = None
            
            for window in windows:
                if window_title.lower() in window.title.lower():
                    target_window = window
                    break
            
            if target_window:
                # 激活窗口
                target_window.activate()
                
                # 获取窗口区域
                region = (target_window.left, target_window.top, 
                         target_window.width, target_window.height)
                
                return self.capture_screen(region)
                
        except Exception as e:
            logger.warning(f"窗口捕获失败 {window_title}: {e}")
        
        return None


class UIElementDetector:
    """UI元素检测器"""
    
    def __init__(self):
        # 预定义的UI元素模板
        self.element_templates = {
            'input_field': self._detect_input_fields,
            'button': self._detect_buttons,
            'text_area': self._detect_text_areas,
            'dropdown': self._detect_dropdowns,
            'chat_bubble': self._detect_chat_bubbles
        }
    
    def detect_elements(self, image: Image.Image) -> List[UIElement]:
        """检测图像中的UI元素"""
        elements = []
        
        # 转换为OpenCV格式
        cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        for element_type, detector_func in self.element_templates.items():
            try:
                detected = detector_func(cv_image)
                elements.extend(detected)
            except Exception as e:
                logger.warning(f"{element_type}检测失败: {e}")
        
        return elements
    
    def _detect_input_fields(self, image: np.ndarray) -> List[UIElement]:
        """检测输入框"""
        elements = []
        
        # 转换为灰度图
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # 检测矩形轮廓（可能是输入框）
        edges = cv2.Canny(gray, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        for contour in contours:
            # 计算轮廓的边界矩形
            x, y, w, h = cv2.boundingRect(contour)
            
            # 过滤掉太小或形状不合适的区域
            if w > 100 and h > 20 and w/h > 3:  # 输入框通常是长方形
                # 提取区域文本
                roi = gray[y:y+h, x:x+w]
                try:
                    text = pytesseract.image_to_string(roi, lang='chi_sim+eng').strip()
                except:
                    text = ""
                
                elements.append(UIElement(
                    type='input_field',
                    position=(x, y, w, h),
                    text=text,
                    confidence=0.7,
                    actionable=True
                ))
        
        return elements
    
    def _detect_buttons(self, image: np.ndarray) -> List[UIElement]:
        """检测按钮"""
        elements = []
        
        # 使用模板匹配检测常见按钮
        button_texts = ['确定', '取消', '提交', '发送', '搜索', '登录', '注册']
        
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # 简化版按钮检测：寻找包含按钮文字的区域
        try:
            # 使用OCR检测所有文本
            data = pytesseract.image_to_data(gray, lang='chi_sim+eng', output_type=pytesseract.Output.DICT)
            
            for i, text in enumerate(data['text']):
                if text.strip() in button_texts:
                    x, y, w, h = data['left'][i], data['top'][i], data['width'][i], data['height'][i]
                    
                    elements.append(UIElement(
                        type='button',
                        position=(x, y, w, h),
                        text=text.strip(),
                        confidence=0.8,
                        actionable=True
                    ))
        except Exception as e:
            logger.warning(f"按钮检测OCR失败: {e}")
        
        return elements
    
    def _detect_text_areas(self, image: np.ndarray) -> List[UIElement]:
        """检测文本区域"""
        elements = []
        
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # 检测大块文本区域
        try:
            data = pytesseract.image_to_data(gray, lang='chi_sim+eng', output_type=pytesseract.Output.DICT)
            
            # 合并相邻的文本块
            text_blocks = []
            current_block = None
            
            for i, text in enumerate(data['text']):
                if text.strip():
                    x, y, w, h = data['left'][i], data['top'][i], data['width'][i], data['height'][i]
                    
                    if current_block is None:
                        current_block = {'x': x, 'y': y, 'w': w, 'h': h, 'text': text}
                    else:
                        # 如果文本块相邻，合并
                        if abs(y - current_block['y']) < 30:  # 同一行或相邻行
                            current_block['w'] = max(x + w - current_block['x'], current_block['w'])
                            current_block['h'] = max(y + h - current_block['y'], current_block['h'])
                            current_block['text'] += ' ' + text
                        else:
                            # 保存当前块，开始新块
                            if len(current_block['text']) > 10:  # 过滤短文本
                                text_blocks.append(current_block)
                            current_block = {'x': x, 'y': y, 'w': w, 'h': h, 'text': text}
            
            # 添加最后一个块
            if current_block and len(current_block['text']) > 10:
                text_blocks.append(current_block)
            
            # 转换为UIElement
            for block in text_blocks:
                elements.append(UIElement(
                    type='text_area',
                    position=(block['x'], block['y'], block['w'], block['h']),
                    text=block['text'],
                    confidence=0.6,
                    actionable=False
                ))
                
        except Exception as e:
            logger.warning(f"文本区域检测失败: {e}")
        
        return elements
    
    def _detect_dropdowns(self, image: np.ndarray) -> List[UIElement]:
        """检测下拉菜单"""
        # 简化实现：检测带有下拉箭头的区域
        return []
    
    def _detect_chat_bubbles(self, image: np.ndarray) -> List[UIElement]:
        """检测聊天气泡"""
        elements = []
        
        # 检测圆角矩形（聊天气泡的特征）
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # 使用形态学操作检测气泡形状
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (20, 20))
        morph = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, kernel)
        
        contours, _ = cv2.findContours(morph, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            
            # 过滤合适大小的区域
            if 50 < w < 400 and 30 < h < 200:
                # 提取文本
                roi = gray[y:y+h, x:x+w]
                try:
                    text = pytesseract.image_to_string(roi, lang='chi_sim+eng').strip()
                    if text:  # 只有包含文本的才认为是聊天气泡
                        elements.append(UIElement(
                            type='chat_bubble',
                            position=(x, y, w, h),
                            text=text,
                            confidence=0.5,
                            actionable=False
                        ))
                except:
                    pass
        
        return elements


class FocusAreaDetector:
    """焦点区域检测器"""
    
    def detect_focus(self, image: Image.Image, elements: List[UIElement]) -> Optional[Tuple[int, int, int, int]]:
        """
        检测用户关注区域
        
        简化版实现：返回最可能的输入区域
        """
        # 优先级：输入框 > 按钮 > 其他
        priority_order = ['input_field', 'button', 'text_area']
        
        for element_type in priority_order:
            for element in elements:
                if element.type == element_type and element.actionable:
                    return element.position
        
        return None


class ActionSuggester:
    """动作建议器"""
    
    def suggest_actions(self, context: VisualContext) -> List[str]:
        """根据视觉上下文建议动作"""
        actions = []
        
        # 根据检测到的元素类型建议动作
        element_types = [elem.type for elem in context.ui_elements]
        
        if 'input_field' in element_types:
            actions.extend(['自动填写', '智能输入建议', '表单验证'])
        
        if 'button' in element_types:
            actions.extend(['一键提交', '批量操作'])
        
        if 'chat_bubble' in element_types:
            actions.extend(['快速回复', '消息分析', '情感识别'])
        
        # 根据窗口类型建议特定动作
        window_lower = context.active_window.lower()
        if '微信' in window_lower or 'wechat' in window_lower:
            actions.extend(['消息模板', '自动回复'])
        elif 'qq' in window_lower:
            actions.extend(['表情包推荐', '群聊助手'])
        elif 'telegram' in window_lower:
            actions.extend(['频道管理', '机器人指令'])
        
        return list(set(actions))  # 去重


class VisualAssistant:
    """视觉辅助决策主类"""
    
    def __init__(self):
        self.screen_capture = ScreenCapture()
        self.element_detector = UIElementDetector()
        self.focus_detector = FocusAreaDetector()
        self.action_suggester = ActionSuggester()
    
    def analyze_context(self, window_title: Optional[str] = None) -> VisualContext:
        """分析当前视觉上下文"""
        try:
            # 捕获屏幕
            if window_title:
                screenshot = self.screen_capture.capture_window(window_title)
                active_window = window_title
            else:
                screenshot = self.screen_capture.capture_screen()
                active_window = self._get_active_window_title()
            
            if screenshot is None:
                screenshot = self.screen_capture.capture_screen()
                active_window = "未知窗口"
            
            # 检测UI元素
            ui_elements = self.element_detector.detect_elements(screenshot)
            
            # 检测焦点区域
            focus_area = self.focus_detector.detect_focus(screenshot, ui_elements)
            
            # 创建上下文对象
            context = VisualContext(
                active_window=active_window,
                ui_elements=ui_elements,
                focus_area=focus_area,
                suggested_actions=[]
            )
            
            # 建议动作
            context.suggested_actions = self.action_suggester.suggest_actions(context)
            
            return context
            
        except Exception as e:
            logger.error(f"视觉上下文分析失败: {e}")
            return VisualContext(
                active_window="错误",
                ui_elements=[],
                focus_area=None,
                suggested_actions=[]
            )
    
    def _get_active_window_title(self) -> str:
        """获取当前活动窗口标题"""
        try:
            active_window = pyautogui.getActiveWindow()
            return active_window.title if active_window else "未知窗口"
        except:
            return "未知窗口"
    
    def save_annotated_screenshot(self, context: VisualContext, output_path: str):
        """保存带标注的截图"""
        try:
            screenshot = self.screen_capture.last_screenshot
            if screenshot is None:
                return
            
            # 创建绘图对象
            draw = ImageDraw.Draw(screenshot)
            
            # 绘制检测到的元素
            colors = {
                'input_field': 'red',
                'button': 'green', 
                'text_area': 'blue',
                'chat_bubble': 'orange'
            }
            
            for element in context.ui_elements:
                x, y, w, h = element.position
                color = colors.get(element.type, 'gray')
                
                # 绘制边框
                draw.rectangle([x, y, x+w, y+h], outline=color, width=2)
                
                # 添加标签
                draw.text((x, y-15), f"{element.type}: {element.text[:20]}", fill=color)
            
            # 绘制焦点区域
            if context.focus_area:
                x, y, w, h = context.focus_area
                draw.rectangle([x, y, x+w, y+h], outline='purple', width=3)
                draw.text((x, y-30), "FOCUS", fill='purple')
            
            # 保存
            screenshot.save(output_path)
            logger.info(f"标注截图已保存: {output_path}")
            
        except Exception as e:
            logger.error(f"保存标注截图失败: {e}")


def main():
    """测试入口"""
    assistant = VisualAssistant()
    
    print("👁️ 视觉辅助决策模块测试")
    print("=" * 50)
    
    # 分析当前屏幕
    context = assistant.analyze_context()
    
    print(f"活动窗口: {context.active_window}")
    print(f"检测到 {len(context.ui_elements)} 个UI元素:")
    
    for i, element in enumerate(context.ui_elements, 1):
        print(f"  {i}. {element.type} - {element.text[:30]}...")
    
    print(f"\n焦点区域: {context.focus_area}")
    print(f"建议动作: {context.suggested_actions}")
    
    # 保存标注截图
    output_path = "visual_analysis_result.png"
    assistant.save_annotated_screenshot(context, output_path)
    print(f"\n标注截图已保存: {output_path}")


if __name__ == "__main__":
    main()

