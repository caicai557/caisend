"""
机器学习推荐引擎 - 基于竞品分析的智能推荐系统
结合了传统算法和深度学习的混合推荐架构
"""
from __future__ import annotations

import json
import time
import hashlib
import numpy as np
from pathlib import Path
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass
from collections import Counter, defaultdict
import logging
from functools import lru_cache

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============= 配置 =============
@dataclass
class MLConfig:
    """ML推荐配置"""
    embedding_dim: int = 128        # 嵌入维度
    similarity_threshold: float = 0.3  # 相似度阈值
    context_window: int = 5         # 上下文窗口
    learning_rate: float = 0.001    # 学习率
    batch_size: int = 32            # 批次大小
    use_cache: bool = True          # 是否使用缓存
    
# ============= 文本处理工具 =============
class TextProcessor:
    """高级文本处理器"""
    
    def __init__(self):
        self.stop_words = {'的', '了', '在', '是', '我', '你', '他', '她', '它', '们', '这', '那', '有', '和'}
        self.vocab = {}
        self.inverse_vocab = {}
        self.build_vocab()
        
    def build_vocab(self) -> None:
        """构建词汇表"""
        # 这里应该从实际数据构建，现在用示例
        common_words = ['您好', '请问', '价格', '产品', '服务', '退款', '发货', '售后', '咨询', '帮助']
        for idx, word in enumerate(common_words):
            self.vocab[word] = idx
            self.inverse_vocab[idx] = word
            
    def tokenize(self, text: str) -> List[str]:
        """中文分词(简化版)"""
        # 实际应用中应使用jieba等分词工具
        tokens = []
        
        # 按字符分词(适用于短语)
        for i in range(len(text)):
            tokens.append(text[i])
            if i < len(text) - 1:
                tokens.append(text[i:i+2])  # 双字词
                
        return [t for t in tokens if t not in self.stop_words]
        
    def extract_features(self, text: str) -> Dict[str, float]:
        """提取文本特征"""
        features = {}
        
        # 1. 长度特征
        features['length'] = len(text)
        features['word_count'] = len(text.split())
        
        # 2. 字符特征
        features['has_number'] = any(c.isdigit() for c in text)
        features['has_english'] = any(c.isalpha() for c in text)
        features['question_mark'] = text.count('？')
        
        # 3. N-gram特征
        tokens = self.tokenize(text)
        for token in tokens:
            features[f'token_{token}'] = features.get(f'token_{token}', 0) + 1
            
        return features
        
    @lru_cache(maxsize=10000)
    def compute_hash(self, text: str) -> str:
        """计算文本哈希(用于缓存)"""
        return hashlib.md5(text.encode()).hexdigest()[:16]

# ============= 向量化引擎 =============
class VectorEngine:
    """向量化引擎 - 模拟BERT嵌入"""
    
    def __init__(self, dim: int = 128):
        self.dim = dim
        self.embeddings_cache = {}
        
    @lru_cache(maxsize=5000)
    def encode_text(self, text: str) -> np.ndarray:
        """文本编码为向量"""
        # 实际应用中应使用预训练模型
        # 这里使用简化的哈希向量化
        
        hash_val = hash(text)
        np.random.seed(hash_val % 2**32)
        vector = np.random.randn(self.dim)
        
        # 归一化
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm
            
        return vector
        
    def batch_encode(self, texts: List[str]) -> np.ndarray:
        """批量编码"""
        vectors = []
        for text in texts:
            if text in self.embeddings_cache:
                vectors.append(self.embeddings_cache[text])
            else:
                vec = self.encode_text(text)
                self.embeddings_cache[text] = vec
                vectors.append(vec)
                
        return np.array(vectors)
        
    def cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """计算余弦相似度"""
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
            
        return dot_product / (norm1 * norm2)

# ============= 智能推荐器 =============
class SmartRecommender:
    """多层混合推荐器"""
    
    def __init__(self, config: MLConfig):
        self.config = config
        self.text_processor = TextProcessor()
        self.vector_engine = VectorEngine(config.embedding_dim)
        self.user_profile = defaultdict(lambda: {'history': [], 'preferences': {}})
        self.phrase_embeddings = {}
        self.feedback_data = []
        
    def precompute_embeddings(self, phrases: List[Dict]) -> None:
        """预计算所有话术的嵌入"""
        logger.info(f"预计算 {len(phrases)} 个话术的嵌入向量...")
        
        for phrase in phrases:
            text = phrase.get('tpl', '')
            if text:
                embedding = self.vector_engine.encode_text(text)
                self.phrase_embeddings[phrase['id']] = {
                    'vector': embedding,
                    'features': self.text_processor.extract_features(text),
                    'metadata': phrase
                }
                
        logger.info("嵌入预计算完成")
        
    def fast_match(self, query: str, top_k: int = 100) -> List[Tuple[str, float]]:
        """快速匹配(L1层)"""
        # 基于关键词的快速过滤
        query_tokens = set(self.text_processor.tokenize(query.lower()))
        scores = []
        
        for phrase_id, data in self.phrase_embeddings.items():
            text = data['metadata'].get('tpl', '').lower()
            text_tokens = set(self.text_processor.tokenize(text))
            
            # Jaccard相似度
            if query_tokens and text_tokens:
                intersection = len(query_tokens & text_tokens)
                union = len(query_tokens | text_tokens)
                score = intersection / union if union > 0 else 0
                scores.append((phrase_id, score))
                
        # 返回top_k候选
        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[:top_k]
        
    def semantic_search(self, query: str, candidates: List[str]) -> List[Tuple[str, float]]:
        """语义搜索(L2层)"""
        query_vector = self.vector_engine.encode_text(query)
        results = []
        
        for phrase_id in candidates:
            if phrase_id in self.phrase_embeddings:
                phrase_vector = self.phrase_embeddings[phrase_id]['vector']
                similarity = self.vector_engine.cosine_similarity(query_vector, phrase_vector)
                results.append((phrase_id, similarity))
                
        results.sort(key=lambda x: x[1], reverse=True)
        return results
        
    def contextual_ranking(self, query: str, candidates: List[Tuple[str, float]], 
                         context: Optional[List[str]] = None) -> List[Tuple[str, float]]:
        """上下文排序(L3层)"""
        # 考虑上下文历史
        if context:
            # 提取上下文特征
            context_features = Counter()
            for ctx in context[-self.config.context_window:]:
                features = self.text_processor.extract_features(ctx)
                context_features.update(features)
                
            # 重新排序
            reranked = []
            for phrase_id, base_score in candidates:
                if phrase_id in self.phrase_embeddings:
                    phrase_features = self.phrase_embeddings[phrase_id]['features']
                    
                    # 计算特征匹配度
                    feature_score = sum(
                        min(phrase_features.get(f, 0), context_features.get(f, 0))
                        for f in set(phrase_features) & set(context_features)
                    )
                    
                    # 组合得分
                    final_score = base_score * 0.7 + feature_score * 0.3
                    reranked.append((phrase_id, final_score))
                    
            reranked.sort(key=lambda x: x[1], reverse=True)
            return reranked
            
        return candidates
        
    def personalize(self, candidates: List[Tuple[str, float]], user_id: str) -> List[Tuple[str, float]]:
        """个性化过滤(L4层)"""
        user_data = self.user_profile[user_id]
        
        if not user_data['history']:
            return candidates
            
        # 基于用户历史调整分数
        personalized = []
        for phrase_id, score in candidates:
            # 检查用户是否使用过
            usage_count = user_data['history'].count(phrase_id)
            
            # 降低重复使用的权重
            if usage_count > 0:
                score *= (1.0 / (1 + usage_count * 0.1))
                
            # 提升用户偏好类别
            if phrase_id in self.phrase_embeddings:
                tags = self.phrase_embeddings[phrase_id]['metadata'].get('tags', [])
                for tag in tags:
                    if tag in user_data['preferences']:
                        score *= (1 + user_data['preferences'][tag] * 0.1)
                        
            personalized.append((phrase_id, score))
            
        personalized.sort(key=lambda x: x[1], reverse=True)
        return personalized
        
    def recommend(self, query: str, user_id: Optional[str] = None, 
                 context: Optional[List[str]] = None, top_k: int = 5) -> List[Dict]:
        """主推荐函数"""
        start_time = time.time()
        
        # L1: 快速匹配
        fast_candidates = self.fast_match(query, top_k=50)
        candidate_ids = [c[0] for c in fast_candidates]
        
        # L2: 语义搜索
        semantic_results = self.semantic_search(query, candidate_ids)
        
        # L3: 上下文排序
        contextual_results = self.contextual_ranking(query, semantic_results, context)
        
        # L4: 个性化
        if user_id:
            final_results = self.personalize(contextual_results, user_id)
        else:
            final_results = contextual_results
            
        # 构建返回结果
        recommendations = []
        for phrase_id, score in final_results[:top_k]:
            if phrase_id in self.phrase_embeddings:
                result = self.phrase_embeddings[phrase_id]['metadata'].copy()
                result['score'] = float(score)
                result['latency_ms'] = (time.time() - start_time) * 1000
                recommendations.append(result)
                
        logger.info(f"推荐完成: {len(recommendations)} 结果, 耗时 {(time.time()-start_time)*1000:.2f}ms")
        return recommendations
        
    def update_user_profile(self, user_id: str, phrase_id: str, feedback: float) -> None:
        """更新用户画像"""
        user_data = self.user_profile[user_id]
        
        # 记录使用历史
        user_data['history'].append(phrase_id)
        
        # 更新偏好
        if phrase_id in self.phrase_embeddings:
            tags = self.phrase_embeddings[phrase_id]['metadata'].get('tags', [])
            for tag in tags:
                if tag not in user_data['preferences']:
                    user_data['preferences'][tag] = 0
                user_data['preferences'][tag] += feedback
                
        # 保存反馈数据
        self.feedback_data.append({
            'user_id': user_id,
            'phrase_id': phrase_id,
            'feedback': feedback,
            'timestamp': time.time()
        })
        
    def train_online(self) -> None:
        """在线学习(根据反馈调整)"""
        if len(self.feedback_data) < self.config.batch_size:
            return
            
        # 这里应该实现实际的在线学习算法
        # 例如：更新嵌入、调整权重等
        logger.info(f"执行在线学习，处理 {len(self.feedback_data)} 条反馈")
        
        # 清空已处理的反馈
        self.feedback_data = []

# ============= 性能基准测试 =============
class BenchmarkTester:
    """性能基准测试器"""
    
    def __init__(self, recommender: SmartRecommender):
        self.recommender = recommender
        
    def run_benchmark(self, test_queries: List[str], iterations: int = 100) -> Dict[str, Any]:
        """运行基准测试"""
        logger.info(f"开始基准测试: {len(test_queries)} 查询, {iterations} 次迭代")
        
        latencies = []
        
        for _ in range(iterations):
            for query in test_queries:
                start = time.time()
                self.recommender.recommend(query)
                latency = (time.time() - start) * 1000
                latencies.append(latency)
                
        # 计算统计
        latencies_array = np.array(latencies)
        stats = {
            'mean_ms': np.mean(latencies_array),
            'median_ms': np.median(latencies_array),
            'p95_ms': np.percentile(latencies_array, 95),
            'p99_ms': np.percentile(latencies_array, 99),
            'min_ms': np.min(latencies_array),
            'max_ms': np.max(latencies_array),
            'std_ms': np.std(latencies_array)
        }
        
        logger.info(f"基准测试结果:")
        logger.info(f"  平均延迟: {stats['mean_ms']:.2f}ms")
        logger.info(f"  P95延迟: {stats['p95_ms']:.2f}ms")
        logger.info(f"  P99延迟: {stats['p99_ms']:.2f}ms")
        
        return stats

# ============= 示例使用 =============
def demo():
    """演示ML推荐系统"""
    
    # 初始化配置
    config = MLConfig()
    recommender = SmartRecommender(config)
    
    # 加载话术库
    phrases = [
        {"id": "1", "tags": ["问候"], "tpl": "您好，我是客服小助手，有什么可以帮助您的吗？"},
        {"id": "2", "tags": ["价格"], "tpl": "这款产品的价格是999元，现在有优惠活动"},
        {"id": "3", "tags": ["退款"], "tpl": "退款申请已收到，预计3-5个工作日处理完成"},
        {"id": "4", "tags": ["发货"], "tpl": "您的订单已发货，预计2-3天送达"},
        {"id": "5", "tags": ["售后"], "tpl": "售后服务支持7天无理由退换货"},
    ]
    
    # 预计算嵌入
    recommender.precompute_embeddings(phrases)
    
    # 测试推荐
    test_queries = [
        "你好",
        "多少钱",
        "什么时候发货",
        "可以退款吗",
        "售后政策"
    ]
    
    print("\n=== 推荐测试 ===")
    for query in test_queries:
        print(f"\n查询: {query}")
        results = recommender.recommend(query, user_id="user123", top_k=3)
        for i, result in enumerate(results, 1):
            print(f"  {i}. {result['tpl'][:50]}... (得分: {result['score']:.3f})")
            
    # 性能测试
    print("\n=== 性能基准测试 ===")
    tester = BenchmarkTester(recommender)
    stats = tester.run_benchmark(test_queries, iterations=20)
    
    print("\n✅ ML推荐系统演示完成")

if __name__ == "__main__":
    demo()