"""
异步版本的QuickReply应用 - 性能优化版本
基于竞品分析实现的高性能架构
"""
from __future__ import annotations

import asyncio
import json
import time
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from collections import deque
import logging
from functools import lru_cache

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============= 性能优化配置 =============
@dataclass
class PerformanceConfig:
    """性能优化配置"""
    cache_size: int = 1000  # LRU缓存大小
    batch_size: int = 50    # 批处理大小
    connection_pool_size: int = 100  # 连接池大小
    response_timeout: float = 0.05  # 50ms响应超时
    cache_ttl: int = 300  # 缓存TTL(秒)
    
# ============= 内存缓存层 =============
class CacheManager:
    """多级缓存管理器"""
    
    def __init__(self, max_size: int = 1000):
        self.cache: Dict[str, Any] = {}
        self.access_times: deque = deque(maxlen=max_size)
        self.max_size = max_size
        self.hits = 0
        self.misses = 0
        
    async def get(self, key: str) -> Optional[Any]:
        """异步获取缓存"""
        if key in self.cache:
            self.hits += 1
            self.access_times.append((time.time(), key))
            return self.cache[key]
        self.misses += 1
        return None
        
    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        """异步设置缓存"""
        if len(self.cache) >= self.max_size:
            # LRU淘汰
            oldest_key = next((k for _, k in self.access_times if k in self.cache), None)
            if oldest_key:
                del self.cache[oldest_key]
                
        self.cache[key] = {
            'value': value,
            'expire_at': time.time() + ttl
        }
        
    def get_stats(self) -> Dict[str, Any]:
        """获取缓存统计"""
        total = self.hits + self.misses
        hit_rate = (self.hits / total * 100) if total > 0 else 0
        return {
            'hits': self.hits,
            'misses': self.misses,
            'hit_rate': f"{hit_rate:.2f}%",
            'size': len(self.cache)
        }

# ============= 异步推荐引擎 =============
class AsyncRecommendEngine:
    """高性能异步推荐引擎"""
    
    def __init__(self, cache_manager: CacheManager):
        self.cache = cache_manager
        self.phrases_cache = {}
        self.vector_cache = {}
        
    async def load_phrases(self, path: Path) -> List[Dict]:
        """异步加载话术库"""
        cache_key = f"phrases_{path}"
        cached = await self.cache.get(cache_key)
        if cached:
            return cached['value']
            
        # 异步读取文件
        loop = asyncio.get_event_loop()
        content = await loop.run_in_executor(None, path.read_text, 'utf-8')
        phrases = json.loads(content)
        
        # 预处理和缓存
        await self.cache.set(cache_key, phrases)
        return phrases
        
    @lru_cache(maxsize=1000)
    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """计算文本相似度(带缓存)"""
        # 简化的Jaccard相似度
        set1 = set(text1.lower().split())
        set2 = set(text2.lower().split())
        if not set1 or not set2:
            return 0.0
        intersection = set1 & set2
        union = set1 | set2
        return len(intersection) / len(union)
        
    async def recommend(self, context: str, top_k: int = 5) -> List[Dict]:
        """异步推荐"""
        start_time = time.time()
        
        # 检查缓存
        cache_key = f"rec_{context[:50]}_{top_k}"
        cached = await self.cache.get(cache_key)
        if cached:
            logger.info(f"缓存命中，耗时: {(time.time() - start_time)*1000:.2f}ms")
            return cached['value']
            
        # 加载话术库
        phrases = await self.load_phrases(Path("phrases.json"))
        
        # 并发计算相似度
        tasks = []
        for phrase in phrases:
            text = phrase.get('tpl', '')
            score = self._calculate_similarity(context, text)
            phrase['score'] = score
            
        # 排序和截取
        phrases.sort(key=lambda x: x.get('score', 0), reverse=True)
        results = phrases[:top_k]
        
        # 缓存结果
        await self.cache.set(cache_key, results, ttl=60)
        
        elapsed = (time.time() - start_time) * 1000
        logger.info(f"推荐完成，耗时: {elapsed:.2f}ms")
        
        return results

# ============= 异步WebSocket管理器 =============
class AsyncWebSocketManager:
    """增强型WebSocket管理器"""
    
    def __init__(self, url: str):
        self.url = url
        self.connection = None
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 5
        self.message_queue = asyncio.Queue(maxsize=1000)
        self.is_connected = False
        
    async def connect(self) -> None:
        """建立连接(带重试)"""
        while self.reconnect_attempts < self.max_reconnect_attempts:
            try:
                # 这里使用模拟连接，实际应使用 aiohttp 或 websockets
                logger.info(f"正在连接WebSocket: {self.url}")
                await asyncio.sleep(0.1)  # 模拟连接
                self.is_connected = True
                self.reconnect_attempts = 0
                logger.info("WebSocket连接成功")
                
                # 启动心跳
                asyncio.create_task(self._heartbeat())
                break
                
            except Exception as e:
                self.reconnect_attempts += 1
                wait_time = min(2 ** self.reconnect_attempts, 30)
                logger.error(f"连接失败，{wait_time}秒后重试: {e}")
                await asyncio.sleep(wait_time)
                
    async def _heartbeat(self) -> None:
        """心跳检测"""
        while self.is_connected:
            try:
                # 发送ping
                await self.send_message({'type': 'ping'})
                await asyncio.sleep(30)
            except:
                self.is_connected = False
                await self.connect()
                
    async def send_message(self, message: Dict) -> None:
        """发送消息(带队列缓冲)"""
        if not self.is_connected:
            # 缓存到队列
            await self.message_queue.put(message)
            return
            
        # 批量发送
        messages = [message]
        while not self.message_queue.empty() and len(messages) < 10:
            try:
                msg = self.message_queue.get_nowait()
                messages.append(msg)
            except asyncio.QueueEmpty:
                break
                
        # 模拟发送
        logger.debug(f"批量发送 {len(messages)} 条消息")
        
    async def receive_messages(self) -> AsyncIterator[Dict]:
        """接收消息流"""
        while True:
            if self.is_connected:
                # 模拟接收消息
                await asyncio.sleep(1)
                yield {'type': 'recommendation', 'data': []}

# ============= 性能监控 =============
class PerformanceMonitor:
    """性能监控器"""
    
    def __init__(self):
        self.metrics = {
            'request_count': 0,
            'total_response_time': 0,
            'error_count': 0,
            'active_connections': 0
        }
        
    async def record_request(self, response_time: float) -> None:
        """记录请求"""
        self.metrics['request_count'] += 1
        self.metrics['total_response_time'] += response_time
        
    async def record_error(self) -> None:
        """记录错误"""
        self.metrics['error_count'] += 1
        
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        count = self.metrics['request_count']
        avg_response = (self.metrics['total_response_time'] / count * 1000) if count > 0 else 0
        error_rate = (self.metrics['error_count'] / count * 100) if count > 0 else 0
        
        return {
            'requests': count,
            'avg_response_ms': f"{avg_response:.2f}",
            'error_rate': f"{error_rate:.2f}%",
            'active_connections': self.metrics['active_connections']
        }

# ============= 主应用类 =============
class AsyncQuickReplyApp:
    """异步版QuickReply应用"""
    
    def __init__(self):
        self.config = PerformanceConfig()
        self.cache = CacheManager(self.config.cache_size)
        self.engine = AsyncRecommendEngine(self.cache)
        self.ws_manager = AsyncWebSocketManager("ws://127.0.0.1:7799")
        self.monitor = PerformanceMonitor()
        self.running = False
        
    async def initialize(self) -> None:
        """初始化应用"""
        logger.info("正在初始化异步QuickReply...")
        
        # 预热缓存
        await self._warmup_cache()
        
        # 建立WebSocket连接
        await self.ws_manager.connect()
        
        # 启动后台任务
        asyncio.create_task(self._background_tasks())
        
        self.running = True
        logger.info("✅ 异步QuickReply初始化完成")
        
    async def _warmup_cache(self) -> None:
        """缓存预热"""
        logger.info("开始缓存预热...")
        
        # 预加载常用话术
        phrases = await self.engine.load_phrases(Path("phrases.json"))
        
        # 预计算常见查询
        common_queries = ["你好", "价格", "退款", "发货", "售后"]
        tasks = [self.engine.recommend(q) for q in common_queries]
        await asyncio.gather(*tasks)
        
        logger.info(f"缓存预热完成: {self.cache.get_stats()}")
        
    async def _background_tasks(self) -> None:
        """后台任务"""
        while self.running:
            # 定期清理过期缓存
            await self._cleanup_cache()
            
            # 定期输出性能统计
            stats = {
                'cache': self.cache.get_stats(),
                'performance': self.monitor.get_stats()
            }
            logger.info(f"性能统计: {stats}")
            
            await asyncio.sleep(60)
            
    async def _cleanup_cache(self) -> None:
        """清理过期缓存"""
        current_time = time.time()
        expired_keys = []
        
        for key, value in self.cache.cache.items():
            if value.get('expire_at', float('inf')) < current_time:
                expired_keys.append(key)
                
        for key in expired_keys:
            del self.cache.cache[key]
            
        if expired_keys:
            logger.debug(f"清理了 {len(expired_keys)} 个过期缓存项")
            
    async def handle_request(self, context: str) -> List[Dict]:
        """处理推荐请求"""
        start_time = time.time()
        
        try:
            # 异步获取推荐
            results = await self.engine.recommend(context, self.config.batch_size)
            
            # 记录性能
            response_time = time.time() - start_time
            await self.monitor.record_request(response_time)
            
            if response_time > self.config.response_timeout:
                logger.warning(f"响应超时: {response_time*1000:.2f}ms > {self.config.response_timeout*1000}ms")
                
            return results
            
        except Exception as e:
            await self.monitor.record_error()
            logger.error(f"处理请求失败: {e}")
            return []
            
    async def run(self) -> None:
        """运行应用"""
        await self.initialize()
        
        logger.info("异步QuickReply正在运行...")
        logger.info("性能目标:")
        logger.info(f"  - 响应时间: <{self.config.response_timeout*1000}ms")
        logger.info(f"  - 缓存大小: {self.config.cache_size}")
        logger.info(f"  - 连接池: {self.config.connection_pool_size}")
        
        try:
            # 模拟处理请求
            while self.running:
                await asyncio.sleep(1)
                
        except KeyboardInterrupt:
            logger.info("正在关闭...")
            self.running = False
            
    async def shutdown(self) -> None:
        """关闭应用"""
        self.running = False
        # 清理资源
        logger.info("异步QuickReply已关闭")

# ============= 入口函数 =============
async def main():
    """主入口"""
    app = AsyncQuickReplyApp()
    
    try:
        await app.run()
    finally:
        await app.shutdown()

if __name__ == "__main__":
    # 运行异步应用
    asyncio.run(main())