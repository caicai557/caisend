#!/usr/bin/env python3
"""
纯文本处理引擎 - 移除语音功能的智能对话核心
"""
import re
import requests
import json
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import logging
from .config_manager import ConfigManager

logger = logging.getLogger(__name__)


@dataclass
class ProcessResult:
    """文本处理结果"""
    intent: str
    entities: Dict[str, Any]
    response: str
    actions: List[str]
    confidence: float
    privacy_filtered: bool


class EnhancedPrivacyFilter:
    """增强隐私保护过滤器"""
    
    SENSITIVE_PATTERNS = {
        'id_card': r'\b\d{17}[\dXx]\b',  # 身份证号
        'phone': r'\b1[3-9]\d{9}\b',  # 手机号
        'bank_card': r'\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b',  # 银行卡
        'email': r'\b[\w.-]+@[\w.-]+\.\w+\b',  # 邮箱
        'password': r'(?i)(密码|password|pwd)[:\s]*[\w@#$%^&*]{6,}',  # 密码
        'verification_code': r'(?i)(验证码|code)[:\s]*\d{4,8}'  # 验证码
    }
    
    def filter_text(self, text: str) -> tuple[str, bool]:
        """
        过滤敏感信息
        
        Returns:
            tuple: (过滤后的文本, 是否包含敏感信息)
        """
        original_text = text
        has_sensitive = False
        
        for pattern_name, pattern in self.SENSITIVE_PATTERNS.items():
            if re.search(pattern, text):
                has_sensitive = True
                text = re.sub(pattern, self._get_replacement(pattern_name), text)
        
        return text, has_sensitive
    
    def _get_replacement(self, pattern_name: str) -> str:
        """根据敏感信息类型返回替换文本"""
        replacements = {
            'id_card': '[身份证号已脱敏]',
            'phone': '[手机号已脱敏]', 
            'bank_card': '[银行卡号已脱敏]',
            'email': '[邮箱已脱敏]',
            'password': '[密码已脱敏]',
            'verification_code': '[验证码已脱敏]'
        }
        return replacements.get(pattern_name, '[敏感信息已脱敏]')


class IntentClassifier:
    """意图识别器"""
    
    # 预定义意图规则
    INTENT_RULES = {
        '订单查询': [r'订单', r'查询.*订单', r'订单.*状态', r'物流'],
        '退换货': [r'退货', r'换货', r'退款', r'申请.*退'],
        '产品咨询': [r'产品', r'功能', r'参数', r'规格', r'介绍'],
        '价格询问': [r'价格', r'多少钱', r'费用', r'收费'],
        '投诉建议': [r'投诉', r'建议', r'意见', r'不满意'],
        '技术支持': [r'故障', r'问题', r'不能.*用', r'无法.*使用'],
        '账户问题': [r'账户', r'登录', r'密码', r'注册'],
        '支付问题': [r'支付', r'付款', r'扣费', r'余额']
    }
    
    def classify(self, text: str) -> tuple[str, float]:
        """
        分类意图
        
        Returns:
            tuple: (意图, 置信度)
        """
        text_lower = text.lower()
        best_intent = '其他'
        best_score = 0.0
        
        for intent, patterns in self.INTENT_RULES.items():
            score = 0
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    score += 1
            
            if score > 0:
                confidence = min(score / len(patterns), 1.0)
                if confidence > best_score:
                    best_intent = intent
                    best_score = confidence
        
        return best_intent, best_score


class EntityExtractor:
    """实体抽取器"""
    
    ENTITY_PATTERNS = {
        'order_id': r'订单号?[:\s]*([A-Z0-9]{6,20})',
        'product_name': r'产品[:\s]*([^，。！？\s]{2,20})',
        'phone_number': r'电话[:\s]*(1[3-9]\d{9})',
        'amount': r'金额[:\s]*(\d+(?:\.\d{2})?)',
        'date': r'(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?)'
    }
    
    def extract(self, text: str) -> Dict[str, str]:
        """提取实体"""
        entities = {}
        
        for entity_type, pattern in self.ENTITY_PATTERNS.items():
            matches = re.findall(pattern, text)
            if matches:
                entities[entity_type] = matches[0]
        
        return entities


class ResponseGenerator:
    """响应生成器"""
    
    RESPONSE_TEMPLATES = {
        '订单查询': [
            "我来帮您查询订单{order_id}的状态",
            "正在为您查询订单信息，请稍候",
            "订单查询功能已启动，请提供订单号"
        ],
        '退换货': [
            "为您处理退换货申请，请提供订单信息",
            "退换货服务已为您准备就绪",
            "我将协助您完成退换货流程"
        ],
        '产品咨询': [
            "很高兴为您介绍我们的产品",
            "产品详情正在为您准备",
            "关于产品{product_name}的信息如下"
        ],
        '其他': [
            "我理解您的问题，让我为您查找相关信息",
            "正在为您寻找最佳解决方案",
            "感谢您的咨询，我来为您处理"
        ]
    }
    
    def generate(self, intent: str, entities: Dict[str, str]) -> str:
        """生成响应文本"""
        templates = self.RESPONSE_TEMPLATES.get(intent, self.RESPONSE_TEMPLATES['其他'])
        template = templates[0]  # 选择第一个模板
        
        # 替换实体占位符
        for entity_type, entity_value in entities.items():
            template = template.replace(f'{{{entity_type}}}', entity_value)
        
        return template


class TextProcessor:
    """文本处理主引擎"""
    
    def __init__(self, api_base: str = None):
        # 使用配置管理器获取API基础URL
        if api_base is None:
            config_manager = ConfigManager()
            config = config_manager.load()
            api_endpoints = config["app"]["api_endpoints"]
            # 从recommend端点提取基础URL
            recommend_url = api_endpoints.get("recommend", "http://127.0.0.1:7788/recommend")
            self.api_base = recommend_url.replace("/recommend", "")
        else:
            self.api_base = api_base
        self.privacy_filter = EnhancedPrivacyFilter()
        self.intent_classifier = IntentClassifier()
        self.entity_extractor = EntityExtractor()
        self.response_generator = ResponseGenerator()
    
    def process(self, text: str, context: Optional[Dict] = None) -> ProcessResult:
        """
        文本处理全流程
        
        Args:
            text: 输入文本
            context: 上下文信息
            
        Returns:
            ProcessResult: 处理结果
        """
        try:
            # 1. 隐私过滤
            filtered_text, has_sensitive = self.privacy_filter.filter_text(text)
            
            # 2. 意图识别
            intent, confidence = self.intent_classifier.classify(filtered_text)
            
            # 3. 实体提取
            entities = self.entity_extractor.extract(filtered_text)
            
            # 4. 生成响应
            response = self.response_generator.generate(intent, entities)
            
            # 5. 推荐动作
            actions = self._suggest_actions(intent, entities)
            
            return ProcessResult(
                intent=intent,
                entities=entities,
                response=response,
                actions=actions,
                confidence=confidence,
                privacy_filtered=has_sensitive
            )
            
        except Exception as e:
            logger.error(f"文本处理错误: {e}")
            return ProcessResult(
                intent='错误',
                entities={},
                response='抱歉，处理您的请求时遇到了问题',
                actions=[],
                confidence=0.0,
                privacy_filtered=False
            )
    
    def _suggest_actions(self, intent: str, entities: Dict[str, str]) -> List[str]:
        """根据意图和实体推荐动作"""
        action_map = {
            '订单查询': ['打开订单页面', '查询物流'],
            '退换货': ['打开退货申请', '联系客服'],
            '产品咨询': ['查看产品详情', '添加到购物车'],
            '价格询问': ['查看价格详情', '比较价格'],
            '投诉建议': ['转接人工客服', '记录反馈'],
            '技术支持': ['查看帮助文档', '远程协助'],
            '账户问题': ['打开账户设置', '重置密码'],
            '支付问题': ['查看支付记录', '联系财务']
        }
        
        return action_map.get(intent, ['提供帮助'])
    
    def call_external_service(self, endpoint: str, payload: Dict) -> Optional[Dict]:
        """调用外部API服务"""
        try:
            response = requests.post(
                f"{self.api_base}/{endpoint}",
                json=payload,
                timeout=3
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.warning(f"外部服务调用失败 {endpoint}: {e}")
            return None
    
    def batch_process(self, texts: List[str]) -> List[ProcessResult]:
        """批量处理文本"""
        return [self.process(text) for text in texts]


def main():
    """测试入口"""
    processor = TextProcessor()
    
    test_cases = [
        "我的订单号ABC123456查询一下状态",
        "身份证号110101199001011234需要修改",
        "产品价格是多少钱？",
        "手机号13800138000登录不了",
        "投诉你们的服务态度"
    ]
    
    print("🧠 纯文本处理引擎测试")
    print("=" * 50)
    
    for i, text in enumerate(test_cases, 1):
        print(f"\n测试案例 {i}: {text}")
        result = processor.process(text)
        
        print(f"意图: {result.intent} (置信度: {result.confidence:.2f})")
        print(f"实体: {result.entities}")
        print(f"响应: {result.response}")
        print(f"动作: {result.actions}")
        print(f"隐私过滤: {'是' if result.privacy_filtered else '否'}")


if __name__ == "__main__":
    main()

