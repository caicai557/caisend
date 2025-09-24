"""
QuickReply优化版 - 集成所有性能优化和稳定性改进
基于竞品分析的企业级实现
"""
from __future__ import annotations

import asyncio
import json
import time
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
from dataclasses import dataclass

# 导入优化模块
from .async_app import AsyncQuickReplyApp, CacheManager, PerformanceConfig
from .ml_recommend import SmartRecommender, MLConfig
from .robust_ws_client import RobustWebSocketClient, WebSocketConfig
from .error_handler import MonitoringSystem, ErrorType, ErrorLevel, with_retry, RetryPolicy

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============= 统一配置 =============
@dataclass
class OptimizedConfig:
    """优化版配置"""
    # 性能配置
    cache_size: int = 2000
    response_timeout: float = 0.03  # 30ms目标
    batch_size: int = 100
    
    # ML配置
    embedding_dim: int = 256
    similarity_threshold: float = 0.4
    use_ml: bool = True
    
    # WebSocket配置
    ws_url: str = "ws://127.0.0.1:7799"
    reconnect_interval: float = 0.5
    heartbeat_interval: float = 20.0
    enable_compression: bool = True
    
    # 监控配置
    enable_monitoring: bool = True
    health_check_interval: float = 30.0
    alert_threshold: Dict[str, float] = None
    
    def __post_init__(self):
        if self.alert_threshold is None:
            self.alert_threshold = {
                'error_rate': 10,  # 每分钟错误数
                'response_time_p95': 100,  # ms
                'memory_mb': 300,
                'cpu_percent': 80
            }

# ============= 优化版主应用 =============
class OptimizedQuickReplyApp:
    """集成所有优化的QuickReply应用"""
    
    def __init__(self, config: Optional[OptimizedConfig] = None):
        self.config = config or OptimizedConfig()
        
        # 初始化监控系统
        self.monitoring = MonitoringSystem() if self.config.enable_monitoring else None
        
        # 初始化缓存
        self.cache = CacheManager(self.config.cache_size)
        
        # 初始化ML推荐器
        ml_config = MLConfig(
            embedding_dim=self.config.embedding_dim,
            similarity_threshold=self.config.similarity_threshold,
            use_cache=True
        )
        self.recommender = SmartRecommender(ml_config)
        
        # 初始化WebSocket客户端
        ws_config = WebSocketConfig(
            url=self.config.ws_url,
            reconnect_interval=self.config.reconnect_interval,
            heartbeat_interval=self.config.heartbeat_interval,
            enable_compression=self.config.enable_compression
        )
        self.ws_client = RobustWebSocketClient(
            ws_config,
            on_message=self._handle_ws_message,
            on_error=self._handle_ws_error
        )
        
        # 创建熔断器
        if self.monitoring:
            self.api_breaker = self.monitoring.create_circuit_breaker(
                "api",
                failure_threshold=5,
                recovery_timeout=30
            )
            self.db_breaker = self.monitoring.create_circuit_breaker(
                "database",
                failure_threshold=3,
                recovery_timeout=60
            )
        
        self.running = False
        self.phrases = []
        self.user_context = {}
        
    async def initialize(self) -> None:
        """异步初始化"""
        logger.info("🚀 正在初始化优化版QuickReply...")
        
        try:
            # 加载话术库
            await self._load_phrases()
            
            # 预计算ML嵌入
            if self.config.use_ml:
                logger.info("预计算ML嵌入向量...")
                self.recommender.precompute_embeddings(self.phrases)
                
            # 预热缓存
            await self._warmup_cache()
            
            # 启动WebSocket连接
            self.ws_client.start()
            
            # 注册健康检查
            if self.monitoring:
                self._register_health_checks()
                
            # 启动后台任务
            asyncio.create_task(self._background_tasks())
            
            self.running = True
            logger.info("✅ 优化版QuickReply初始化完成")
            
            # 显示配置信息
            self._show_config_info()
            
        except Exception as e:
            logger.error(f"初始化失败: {e}")
            if self.monitoring:
                self.monitoring.error_handler.handle_error(
                    e, ErrorType.SYSTEM, ErrorLevel.CRITICAL
                )
            raise
            
    async def _load_phrases(self) -> None:
        """加载话术库(带重试)"""
        @with_retry(RetryPolicy(max_retries=3))
        def load():
            path = Path("phrases.json")
            if path.exists():
                with open(path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            return []
            
        self.phrases = await asyncio.get_event_loop().run_in_executor(None, load)
        logger.info(f"加载了 {len(self.phrases)} 条话术")
        
    async def _warmup_cache(self) -> None:
        """缓存预热"""
        logger.info("开始缓存预热...")
        
        # 预热常见查询
        common_queries = [
            "你好", "您好", "在吗",
            "价格", "多少钱", "费用",
            "发货", "什么时候", "多久",
            "退款", "退货", "售后",
            "帮助", "客服", "人工"
        ]
        
        tasks = []
        for query in common_queries:
            tasks.append(self.get_recommendations(query, preload=True))
            
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        success_count = sum(1 for r in results if not isinstance(r, Exception))
        logger.info(f"缓存预热完成: {success_count}/{len(common_queries)} 成功")
        
    def _register_health_checks(self) -> None:
        """注册健康检查"""
        # WebSocket健康检查
        def check_websocket():
            return self.ws_client.state.value == "connected"
            
        # 缓存健康检查
        def check_cache():
            stats = self.cache.get_stats()
            hit_rate = float(stats['hit_rate'].rstrip('%'))
            return hit_rate > 30  # 命中率大于30%
            
        # ML服务健康检查
        def check_ml():
            try:
                # 测试推荐
                self.recommender.recommend("test", top_k=1)
                return True
            except:
                return False
                
        self.monitoring.health_checker.register_check("websocket", check_websocket, 30)
        self.monitoring.health_checker.register_check("cache", check_cache, 60)
        self.monitoring.health_checker.register_check("ml_service", check_ml, 60)
        
    async def _background_tasks(self) -> None:
        """后台任务"""
        while self.running:
            try:
                # 清理过期缓存
                await self._cleanup_cache()
                
                # 更新性能指标
                if self.monitoring:
                    metrics = self.monitoring.get_dashboard()
                    await self._check_alerts(metrics)
                    
                # 保存用户反馈
                await self._save_feedback()
                
                await asyncio.sleep(30)
                
            except Exception as e:
                logger.error(f"后台任务异常: {e}")
                
    async def _cleanup_cache(self) -> None:
        """清理缓存"""
        current_time = time.time()
        expired_count = 0
        
        for key in list(self.cache.cache.keys()):
            item = self.cache.cache[key]
            if item.get('expire_at', float('inf')) < current_time:
                del self.cache.cache[key]
                expired_count += 1
                
        if expired_count > 0:
            logger.debug(f"清理了 {expired_count} 个过期缓存")
            
    async def _check_alerts(self, metrics: Dict) -> None:
        """检查告警"""
        alerts = []
        
        # 检查错误率
        error_rate = metrics['errors'].get('error_rate_per_min', 0)
        if error_rate > self.config.alert_threshold['error_rate']:
            alerts.append(f"错误率过高: {error_rate:.2f}/分钟")
            
        # 检查响应时间
        perf = metrics.get('performance', {})
        if 'response_time' in perf:
            p95 = perf['response_time'].get('p95', 0)
            if p95 > self.config.alert_threshold['response_time_p95']:
                alerts.append(f"响应时间过长: P95={p95:.2f}ms")
                
        # 检查资源使用
        if 'memory_mb' in perf:
            memory = perf['memory_mb'].get('current', 0)
            if memory > self.config.alert_threshold['memory_mb']:
                alerts.append(f"内存使用过高: {memory:.2f}MB")
                
        if alerts:
            logger.warning(f"⚠️ 系统告警: {', '.join(alerts)}")
            
    async def _save_feedback(self) -> None:
        """保存用户反馈数据"""
        if hasattr(self.recommender, 'feedback_data') and self.recommender.feedback_data:
            # 批量保存反馈
            feedback_file = Path("feedback.jsonl")
            
            try:
                with open(feedback_file, 'a', encoding='utf-8') as f:
                    for feedback in self.recommender.feedback_data:
                        f.write(json.dumps(feedback) + '\n')
                        
                logger.debug(f"保存了 {len(self.recommender.feedback_data)} 条反馈")
                self.recommender.feedback_data.clear()
                
            except Exception as e:
                logger.error(f"保存反馈失败: {e}")
                
    def _handle_ws_message(self, data: Dict) -> None:
        """处理WebSocket消息"""
        try:
            msg_type = data.get('type')
            
            if msg_type == 'context_update':
                # 更新用户上下文
                user_id = data.get('user_id')
                context = data.get('context')
                if user_id and context:
                    self.user_context[user_id] = context
                    
            elif msg_type == 'recommendation_request':
                # 处理推荐请求
                asyncio.create_task(self._handle_recommendation_request(data))
                
        except Exception as e:
            logger.error(f"处理WebSocket消息失败: {e}")
            
    def _handle_ws_error(self, error: Any) -> None:
        """处理WebSocket错误"""
        if self.monitoring:
            self.monitoring.error_handler.handle_error(
                Exception(str(error)),
                ErrorType.NETWORK,
                ErrorLevel.ERROR
            )
            
    async def _handle_recommendation_request(self, data: Dict) -> None:
        """处理推荐请求"""
        user_id = data.get('user_id')
        query = data.get('query')
        
        if not query:
            return
            
        # 获取推荐
        recommendations = await self.get_recommendations(
            query,
            user_id=user_id,
            context=self.user_context.get(user_id)
        )
        
        # 发送响应
        response = {
            'type': 'recommendation_response',
            'user_id': user_id,
            'recommendations': recommendations
        }
        self.ws_client.send(response)
        
    async def get_recommendations(self, 
                                 query: str,
                                 user_id: Optional[str] = None,
                                 context: Optional[List[str]] = None,
                                 top_k: int = 5,
                                 preload: bool = False) -> List[Dict]:
        """获取推荐(核心API)"""
        start_time = time.time()
        
        try:
            # 检查缓存
            cache_key = f"rec_{query[:50]}_{user_id}_{top_k}"
            cached = await self.cache.get(cache_key)
            if cached and not preload:
                logger.debug(f"缓存命中: {cache_key}")
                return cached['value']
                
            # 使用ML推荐
            if self.config.use_ml:
                recommendations = await asyncio.get_event_loop().run_in_executor(
                    None,
                    self.recommender.recommend,
                    query,
                    user_id,
                    context,
                    top_k
                )
            else:
                # 降级到简单匹配
                recommendations = await self._simple_recommend(query, top_k)
                
            # 缓存结果
            await self.cache.set(cache_key, recommendations, ttl=300)
            
            # 记录性能
            response_time = time.time() - start_time
            if self.monitoring:
                self.monitoring.performance_monitor.record_request(response_time)
                
            # 检查性能
            if response_time > self.config.response_timeout:
                logger.warning(f"响应超时: {response_time*1000:.2f}ms > {self.config.response_timeout*1000}ms")
                
            return recommendations
            
        except Exception as e:
            logger.error(f"推荐失败: {e}")
            if self.monitoring:
                self.monitoring.error_handler.handle_error(
                    e, ErrorType.BUSINESS, ErrorLevel.ERROR
                )
                self.monitoring.performance_monitor.record_request(
                    time.time() - start_time, success=False
                )
            return []
            
    async def _simple_recommend(self, query: str, top_k: int) -> List[Dict]:
        """简单推荐(降级方案)"""
        results = []
        query_lower = query.lower()
        
        for phrase in self.phrases[:top_k]:
            text = phrase.get('tpl', '').lower()
            if any(word in text for word in query_lower.split()):
                results.append(phrase)
                
        return results[:top_k]
        
    def _show_config_info(self) -> None:
        """显示配置信息"""
        info = f"""
╔════════════════════════════════════════╗
║     QuickReply 优化版 - 配置信息       ║
╠════════════════════════════════════════╣
║ 性能配置:                              ║
║   • 缓存大小: {self.config.cache_size}
║   • 响应目标: <{self.config.response_timeout*1000:.0f}ms
║   • 批处理: {self.config.batch_size}
║                                        ║
║ ML配置:                                ║
║   • 启用ML: {self.config.use_ml}
║   • 嵌入维度: {self.config.embedding_dim}
║   • 相似度阈值: {self.config.similarity_threshold}
║                                        ║
║ WebSocket:                             ║
║   • 地址: {self.config.ws_url}
║   • 心跳间隔: {self.config.heartbeat_interval}s
║   • 压缩: {self.config.enable_compression}
║                                        ║
║ 监控:                                  ║
║   • 启用: {self.config.enable_monitoring}
║   • 健康检查: {self.config.health_check_interval}s
╚════════════════════════════════════════╝
        """
        print(info)
        
    async def get_status(self) -> Dict[str, Any]:
        """获取系统状态"""
        status = {
            'running': self.running,
            'phrases_loaded': len(self.phrases),
            'cache_stats': self.cache.get_stats(),
            'ws_stats': self.ws_client.get_stats(),
            'active_users': len(self.user_context)
        }
        
        if self.monitoring:
            status['monitoring'] = self.monitoring.get_dashboard()
            
        return status
        
    async def shutdown(self) -> None:
        """优雅关闭"""
        logger.info("正在关闭优化版QuickReply...")
        
        self.running = False
        
        # 保存未处理的反馈
        await self._save_feedback()
        
        # 关闭WebSocket
        self.ws_client.stop()
        
        # 关闭监控
        if self.monitoring:
            self.monitoring.shutdown()
            
        logger.info("✅ 优化版QuickReply已关闭")

# ============= 性能测试 =============
async def benchmark():
    """性能基准测试"""
    logger.info("开始性能基准测试...")
    
    # 创建应用
    config = OptimizedConfig(
        use_ml=True,
        cache_size=5000,
        response_timeout=0.05
    )
    app = OptimizedQuickReplyApp(config)
    
    # 初始化
    await app.initialize()
    
    # 测试查询
    test_queries = [
        "你好",
        "产品价格是多少",
        "什么时候发货",
        "可以退款吗",
        "售后服务怎么样",
        "有什么优惠活动",
        "支持哪些支付方式",
        "配送需要多久"
    ]
    
    # 预热
    logger.info("预热中...")
    for query in test_queries:
        await app.get_recommendations(query)
        
    # 性能测试
    logger.info("开始性能测试...")
    latencies = []
    
    for _ in range(10):
        for query in test_queries:
            start = time.time()
            await app.get_recommendations(query)
            latency = (time.time() - start) * 1000
            latencies.append(latency)
            
    # 计算统计
    import numpy as np
    latencies_array = np.array(latencies)
    
    print("\n" + "="*50)
    print("性能测试结果")
    print("="*50)
    print(f"平均延迟: {np.mean(latencies_array):.2f}ms")
    print(f"中位数: {np.median(latencies_array):.2f}ms")
    print(f"P95: {np.percentile(latencies_array, 95):.2f}ms")
    print(f"P99: {np.percentile(latencies_array, 99):.2f}ms")
    print(f"最小值: {np.min(latencies_array):.2f}ms")
    print(f"最大值: {np.max(latencies_array):.2f}ms")
    print("="*50)
    
    # 显示系统状态
    status = await app.get_status()
    print("\n系统状态:")
    print(json.dumps(status, indent=2, default=str))
    
    # 关闭
    await app.shutdown()

# ============= 主入口 =============
async def main():
    """主入口"""
    app = OptimizedQuickReplyApp()
    
    try:
        await app.initialize()
        
        # 保持运行
        while app.running:
            await asyncio.sleep(1)
            
    except KeyboardInterrupt:
        logger.info("收到退出信号")
    finally:
        await app.shutdown()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "benchmark":
        # 运行性能测试
        asyncio.run(benchmark())
    else:
        # 正常运行
        asyncio.run(main())