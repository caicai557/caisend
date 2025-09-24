"""
自适应捕获优化器 - 智能优化捕获策略
根据实际情况动态调整捕获参数，提高效率和稳定性
"""

import asyncio
import json
import time
import numpy as np
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from collections import deque
import logging
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

# ============= 性能指标 =============
@dataclass
class PerformanceMetrics:
    """性能指标"""
    timestamp: float
    capture_rate: float  # 捕获率（消息/秒）
    success_rate: float  # 成功率
    latency: float  # 延迟（毫秒）
    cpu_usage: float  # CPU使用率
    memory_usage: float  # 内存使用率
    error_count: int  # 错误数
    
@dataclass
class CaptureStrategy:
    """捕获策略"""
    interval: float = 1.0  # 捕获间隔（秒）
    batch_size: int = 50  # 批处理大小
    timeout: float = 5.0  # 超时时间
    retry_count: int = 3  # 重试次数
    observer_throttle: int = 100  # 观察器节流（毫秒）
    max_messages: int = 100  # 单次最大消息数
    
    def to_dict(self) -> Dict:
        return {
            'interval': self.interval,
            'batch_size': self.batch_size,
            'timeout': self.timeout,
            'retry_count': self.retry_count,
            'observer_throttle': self.observer_throttle,
            'max_messages': self.max_messages
        }

# ============= 性能分析器 =============
class PerformanceAnalyzer:
    """性能分析器"""
    
    def __init__(self, window_size: int = 100):
        self.window_size = window_size
        self.metrics_history = deque(maxlen=window_size)
        self.anomaly_threshold = 2.0  # 标准差阈值
        
    def add_metrics(self, metrics: PerformanceMetrics) -> None:
        """添加性能指标"""
        self.metrics_history.append(metrics)
        
    def analyze_trend(self) -> Dict[str, str]:
        """分析趋势"""
        if len(self.metrics_history) < 10:
            return {'status': 'insufficient_data'}
            
        # 提取最近的指标
        recent_metrics = list(self.metrics_history)[-20:]
        
        # 计算趋势
        capture_rates = [m.capture_rate for m in recent_metrics]
        success_rates = [m.success_rate for m in recent_metrics]
        latencies = [m.latency for m in recent_metrics]
        
        trends = {
            'capture_rate': self._calculate_trend(capture_rates),
            'success_rate': self._calculate_trend(success_rates),
            'latency': self._calculate_trend(latencies),
            'status': 'analyzed'
        }
        
        return trends
        
    def _calculate_trend(self, values: List[float]) -> str:
        """计算趋势（上升/下降/稳定）"""
        if len(values) < 2:
            return 'unknown'
            
        # 线性回归
        X = np.arange(len(values)).reshape(-1, 1)
        y = np.array(values)
        
        model = LinearRegression()
        model.fit(X, y)
        
        slope = model.coef_[0]
        
        # 判断趋势
        if abs(slope) < 0.01:
            return 'stable'
        elif slope > 0:
            return 'increasing'
        else:
            return 'decreasing'
            
    def detect_anomalies(self) -> List[str]:
        """检测异常"""
        if len(self.metrics_history) < 20:
            return []
            
        anomalies = []
        recent = self.metrics_history[-1]
        
        # 计算历史平均值和标准差
        capture_rates = [m.capture_rate for m in self.metrics_history]
        success_rates = [m.success_rate for m in self.metrics_history]
        latencies = [m.latency for m in self.metrics_history]
        
        # 检测捕获率异常
        mean_capture = np.mean(capture_rates)
        std_capture = np.std(capture_rates)
        
        if abs(recent.capture_rate - mean_capture) > self.anomaly_threshold * std_capture:
            anomalies.append(f"capture_rate_anomaly: {recent.capture_rate:.2f}")
            
        # 检测成功率异常
        if recent.success_rate < 0.8:
            anomalies.append(f"low_success_rate: {recent.success_rate:.2%}")
            
        # 检测延迟异常
        mean_latency = np.mean(latencies)
        std_latency = np.std(latencies)
        
        if recent.latency > mean_latency + self.anomaly_threshold * std_latency:
            anomalies.append(f"high_latency: {recent.latency:.0f}ms")
            
        # 检测资源异常
        if recent.cpu_usage > 80:
            anomalies.append(f"high_cpu: {recent.cpu_usage:.1f}%")
            
        if recent.memory_usage > 80:
            anomalies.append(f"high_memory: {recent.memory_usage:.1f}%")
            
        return anomalies
        
    def get_recommendations(self) -> List[str]:
        """获取优化建议"""
        recommendations = []
        
        if len(self.metrics_history) < 10:
            return ["需要更多数据进行分析"]
            
        trends = self.analyze_trend()
        anomalies = self.detect_anomalies()
        
        # 基于趋势的建议
        if trends['capture_rate'] == 'decreasing':
            recommendations.append("捕获率下降，建议减少捕获间隔")
            
        if trends['success_rate'] == 'decreasing':
            recommendations.append("成功率下降，建议增加重试次数")
            
        if trends['latency'] == 'increasing':
            recommendations.append("延迟增加，建议减少批处理大小")
            
        # 基于异常的建议
        if any('high_cpu' in a for a in anomalies):
            recommendations.append("CPU使用率高，建议增加观察器节流时间")
            
        if any('high_memory' in a for a in anomalies):
            recommendations.append("内存使用率高，建议减少缓存大小")
            
        return recommendations if recommendations else ["系统运行正常"]

# ============= 策略优化器 =============
class StrategyOptimizer:
    """策略优化器"""
    
    def __init__(self):
        self.current_strategy = CaptureStrategy()
        self.strategy_history = []
        self.performance_scores = []
        self.learning_rate = 0.1
        
    def optimize(self, metrics: PerformanceMetrics, anomalies: List[str]) -> CaptureStrategy:
        """优化策略"""
        # 计算性能得分
        score = self._calculate_score(metrics)
        self.performance_scores.append(score)
        
        # 根据性能调整策略
        new_strategy = self._adjust_strategy(metrics, anomalies)
        
        # 记录历史
        self.strategy_history.append({
            'timestamp': time.time(),
            'strategy': self.current_strategy.to_dict(),
            'score': score
        })
        
        self.current_strategy = new_strategy
        return new_strategy
        
    def _calculate_score(self, metrics: PerformanceMetrics) -> float:
        """计算性能得分"""
        # 综合评分（0-100）
        capture_score = min(metrics.capture_rate * 10, 30)  # 最高30分
        success_score = metrics.success_rate * 30  # 最高30分
        latency_score = max(0, 20 - metrics.latency / 10)  # 最高20分
        resource_score = max(0, 20 - (metrics.cpu_usage + metrics.memory_usage) / 10)  # 最高20分
        
        total_score = capture_score + success_score + latency_score + resource_score
        
        return min(max(total_score, 0), 100)
        
    def _adjust_strategy(self, metrics: PerformanceMetrics, anomalies: List[str]) -> CaptureStrategy:
        """调整策略"""
        new_strategy = CaptureStrategy(
            interval=self.current_strategy.interval,
            batch_size=self.current_strategy.batch_size,
            timeout=self.current_strategy.timeout,
            retry_count=self.current_strategy.retry_count,
            observer_throttle=self.current_strategy.observer_throttle,
            max_messages=self.current_strategy.max_messages
        )
        
        # 根据捕获率调整间隔
        if metrics.capture_rate < 0.5:
            new_strategy.interval = max(0.5, self.current_strategy.interval * 0.9)
        elif metrics.capture_rate > 2.0:
            new_strategy.interval = min(5.0, self.current_strategy.interval * 1.1)
            
        # 根据成功率调整重试
        if metrics.success_rate < 0.8:
            new_strategy.retry_count = min(5, self.current_strategy.retry_count + 1)
        elif metrics.success_rate > 0.95:
            new_strategy.retry_count = max(1, self.current_strategy.retry_count - 1)
            
        # 根据延迟调整批处理
        if metrics.latency > 200:
            new_strategy.batch_size = max(10, int(self.current_strategy.batch_size * 0.8))
        elif metrics.latency < 50:
            new_strategy.batch_size = min(200, int(self.current_strategy.batch_size * 1.2))
            
        # 根据资源使用调整节流
        if metrics.cpu_usage > 70:
            new_strategy.observer_throttle = min(500, int(self.current_strategy.observer_throttle * 1.2))
        elif metrics.cpu_usage < 30:
            new_strategy.observer_throttle = max(50, int(self.current_strategy.observer_throttle * 0.9))
            
        # 处理异常情况
        for anomaly in anomalies:
            if 'high_latency' in anomaly:
                new_strategy.timeout = min(10.0, self.current_strategy.timeout * 1.2)
            if 'low_success_rate' in anomaly:
                new_strategy.retry_count = min(5, self.current_strategy.retry_count + 1)
                
        return new_strategy
        
    def get_best_strategy(self) -> Optional[CaptureStrategy]:
        """获取最佳策略"""
        if not self.strategy_history:
            return None
            
        # 找到得分最高的策略
        best_entry = max(self.strategy_history, key=lambda x: x['score'])
        
        return CaptureStrategy(**best_entry['strategy'])

# ============= 自适应管理器 =============
class AdaptiveManager:
    """自适应管理器"""
    
    def __init__(self):
        self.analyzer = PerformanceAnalyzer()
        self.optimizer = StrategyOptimizer()
        self.current_metrics = None
        self.adjustment_interval = 60  # 调整间隔（秒）
        self.last_adjustment = 0
        self.enabled = True
        
    async def update_metrics(self, stats: Dict) -> None:
        """更新性能指标"""
        # 构建指标对象
        metrics = PerformanceMetrics(
            timestamp=time.time(),
            capture_rate=stats.get('capture_rate', 0),
            success_rate=stats.get('success_rate', 1.0),
            latency=stats.get('latency', 0),
            cpu_usage=stats.get('cpu_usage', 0),
            memory_usage=stats.get('memory_usage', 0),
            error_count=stats.get('error_count', 0)
        )
        
        self.current_metrics = metrics
        self.analyzer.add_metrics(metrics)
        
    async def should_adjust(self) -> bool:
        """判断是否需要调整"""
        if not self.enabled:
            return False
            
        current_time = time.time()
        
        # 检查时间间隔
        if current_time - self.last_adjustment < self.adjustment_interval:
            return False
            
        # 检查是否有异常
        anomalies = self.analyzer.detect_anomalies()
        if anomalies:
            logger.warning(f"Detected anomalies: {anomalies}")
            return True
            
        # 检查趋势
        trends = self.analyzer.analyze_trend()
        if trends.get('success_rate') == 'decreasing' or trends.get('latency') == 'increasing':
            return True
            
        # 定期调整
        return current_time - self.last_adjustment > self.adjustment_interval * 2
        
    async def adjust_strategy(self) -> CaptureStrategy:
        """调整策略"""
        if not self.current_metrics:
            return self.optimizer.current_strategy
            
        # 检测异常
        anomalies = self.analyzer.detect_anomalies()
        
        # 优化策略
        new_strategy = self.optimizer.optimize(self.current_metrics, anomalies)
        
        self.last_adjustment = time.time()
        
        logger.info(f"Strategy adjusted: {new_strategy.to_dict()}")
        
        return new_strategy
        
    def get_analysis(self) -> Dict:
        """获取分析结果"""
        return {
            'trends': self.analyzer.analyze_trend(),
            'anomalies': self.analyzer.detect_anomalies(),
            'recommendations': self.analyzer.get_recommendations(),
            'current_strategy': self.optimizer.current_strategy.to_dict(),
            'best_strategy': self.optimizer.get_best_strategy().to_dict() if self.optimizer.get_best_strategy() else None,
            'performance_history': [
                {
                    'timestamp': m.timestamp,
                    'capture_rate': m.capture_rate,
                    'success_rate': m.success_rate,
                    'latency': m.latency
                }
                for m in list(self.analyzer.metrics_history)[-10:]
            ]
        }

# ============= 智能调度器 =============
class IntelligentScheduler:
    """智能调度器"""
    
    def __init__(self):
        self.peak_hours = []  # 高峰时段
        self.quiet_hours = []  # 低谷时段
        self.message_patterns = defaultdict(list)  # 消息模式
        self.schedule_cache = {}
        
    def learn_patterns(self, messages: List[Dict]) -> None:
        """学习消息模式"""
        for msg in messages:
            timestamp = msg.get('timestamp', time.time())
            hour = time.localtime(timestamp / 1000).tm_hour
            
            # 记录每小时的消息数
            self.message_patterns[hour].append(1)
            
        # 更新高峰和低谷时段
        self._update_peak_hours()
        
    def _update_peak_hours(self) -> None:
        """更新高峰时段"""
        if not self.message_patterns:
            return
            
        # 计算每小时平均消息数
        hourly_avg = {}
        for hour, counts in self.message_patterns.items():
            hourly_avg[hour] = sum(counts) / len(counts)
            
        # 找出高峰和低谷
        if hourly_avg:
            avg = sum(hourly_avg.values()) / len(hourly_avg)
            
            self.peak_hours = [h for h, c in hourly_avg.items() if c > avg * 1.5]
            self.quiet_hours = [h for h, c in hourly_avg.items() if c < avg * 0.5]
            
    def get_optimal_strategy(self, current_hour: Optional[int] = None) -> Dict:
        """获取最优策略"""
        if current_hour is None:
            current_hour = time.localtime().tm_hour
            
        # 缓存检查
        if current_hour in self.schedule_cache:
            cache_time, strategy = self.schedule_cache[current_hour]
            if time.time() - cache_time < 3600:  # 1小时缓存
                return strategy
                
        # 根据时段调整策略
        if current_hour in self.peak_hours:
            strategy = {
                'mode': 'peak',
                'interval': 0.5,
                'batch_size': 100,
                'priority': 'high'
            }
        elif current_hour in self.quiet_hours:
            strategy = {
                'mode': 'quiet',
                'interval': 5.0,
                'batch_size': 20,
                'priority': 'low'
            }
        else:
            strategy = {
                'mode': 'normal',
                'interval': 1.0,
                'batch_size': 50,
                'priority': 'medium'
            }
            
        # 缓存策略
        self.schedule_cache[current_hour] = (time.time(), strategy)
        
        return strategy
        
    def predict_load(self, next_hours: int = 1) -> List[float]:
        """预测未来负载"""
        predictions = []
        current_hour = time.localtime().tm_hour
        
        for i in range(next_hours):
            hour = (current_hour + i) % 24
            
            if hour in self.message_patterns:
                counts = self.message_patterns[hour]
                prediction = sum(counts) / len(counts) if counts else 0
            else:
                prediction = 0
                
            predictions.append(prediction)
            
        return predictions

# ============= 集成优化系统 =============
class IntegratedOptimizationSystem:
    """集成优化系统"""
    
    def __init__(self):
        self.adaptive_manager = AdaptiveManager()
        self.scheduler = IntelligentScheduler()
        self.running = False
        self.optimization_task = None
        
    async def start(self) -> None:
        """启动优化系统"""
        self.running = True
        self.optimization_task = asyncio.create_task(self._optimization_loop())
        logger.info("Optimization system started")
        
    async def stop(self) -> None:
        """停止优化系统"""
        self.running = False
        
        if self.optimization_task:
            self.optimization_task.cancel()
            
        logger.info("Optimization system stopped")
        
    async def _optimization_loop(self) -> None:
        """优化循环"""
        while self.running:
            try:
                # 检查是否需要调整
                if await self.adaptive_manager.should_adjust():
                    # 获取新策略
                    new_strategy = await self.adaptive_manager.adjust_strategy()
                    
                    # 应用策略
                    await self._apply_strategy(new_strategy)
                    
                # 获取调度建议
                schedule = self.scheduler.get_optimal_strategy()
                
                # 预测负载
                load_prediction = self.scheduler.predict_load(3)
                
                logger.debug(f"Schedule: {schedule}, Load prediction: {load_prediction}")
                
            except Exception as e:
                logger.error(f"Optimization error: {e}")
                
            await asyncio.sleep(30)  # 每30秒检查一次
            
    async def _apply_strategy(self, strategy: CaptureStrategy) -> None:
        """应用策略"""
        # TODO: 实际应用策略到捕获系统
        logger.info(f"Applying strategy: {strategy.to_dict()}")
        
    async def feed_stats(self, stats: Dict) -> None:
        """输入统计数据"""
        await self.adaptive_manager.update_metrics(stats)
        
    def feed_messages(self, messages: List[Dict]) -> None:
        """输入消息数据"""
        self.scheduler.learn_patterns(messages)
        
    def get_optimization_report(self) -> Dict:
        """获取优化报告"""
        return {
            'adaptive_analysis': self.adaptive_manager.get_analysis(),
            'schedule': self.scheduler.get_optimal_strategy(),
            'peak_hours': self.scheduler.peak_hours,
            'quiet_hours': self.scheduler.quiet_hours,
            'load_prediction': self.scheduler.predict_load(24)
        }

# ============= 使用示例 =============
async def demo():
    """演示优化系统"""
    
    # 创建优化系统
    optimizer = IntegratedOptimizationSystem()
    
    # 启动系统
    await optimizer.start()
    
    # 模拟输入数据
    for i in range(100):
        # 模拟统计数据
        stats = {
            'capture_rate': np.random.uniform(0.5, 2.0),
            'success_rate': np.random.uniform(0.7, 1.0),
            'latency': np.random.uniform(50, 200),
            'cpu_usage': np.random.uniform(20, 80),
            'memory_usage': np.random.uniform(30, 70),
            'error_count': np.random.randint(0, 5)
        }
        
        await optimizer.feed_stats(stats)
        
        # 模拟消息数据
        messages = [
            {'timestamp': time.time() * 1000 + j * 1000}
            for j in range(np.random.randint(10, 50))
        ]
        
        optimizer.feed_messages(messages)
        
        # 获取优化报告
        if i % 10 == 0:
            report = optimizer.get_optimization_report()
            print(f"\n=== Optimization Report (Iteration {i}) ===")
            print(json.dumps(report, indent=2, default=str))
            
        await asyncio.sleep(1)
        
    # 停止系统
    await optimizer.stop()

if __name__ == "__main__":
    asyncio.run(demo())