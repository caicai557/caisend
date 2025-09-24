"""
高级错误处理和监控系统 - 基于竞品分析的企业级实现
包含错误追踪、自动恢复、熔断器、监控指标等
"""
from __future__ import annotations

import time
import logging
import traceback
import json
from pathlib import Path
from typing import Optional, Dict, Any, Callable, List, Type
from dataclasses import dataclass, field
from collections import deque, defaultdict
from enum import Enum
from functools import wraps
from datetime import datetime, timedelta
import threading

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============= 错误级别 =============
class ErrorLevel(Enum):
    """错误级别"""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"
    FATAL = "fatal"

# ============= 错误类型 =============
class ErrorType(Enum):
    """错误类型"""
    NETWORK = "network"
    DATABASE = "database"
    VALIDATION = "validation"
    BUSINESS = "business"
    SYSTEM = "system"
    UNKNOWN = "unknown"

# ============= 错误记录 =============
@dataclass
class ErrorRecord:
    """错误记录"""
    timestamp: float
    level: ErrorLevel
    type: ErrorType
    message: str
    exception: Optional[Exception] = None
    traceback: Optional[str] = None
    context: Dict[str, Any] = field(default_factory=dict)
    retry_count: int = 0
    resolved: bool = False
    resolution_time: Optional[float] = None

# ============= 熔断器 =============
class CircuitBreaker:
    """熔断器模式实现"""
    
    class State(Enum):
        CLOSED = "closed"      # 正常状态
        OPEN = "open"          # 熔断状态
        HALF_OPEN = "half_open"  # 半开状态
        
    def __init__(self, 
                 failure_threshold: int = 5,
                 recovery_timeout: float = 60.0,
                 expected_exception: Type[Exception] = Exception):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        
        self.failure_count = 0
        self.last_failure_time = None
        self.state = self.State.CLOSED
        self._lock = threading.Lock()
        
    def call(self, func: Callable, *args, **kwargs) -> Any:
        """通过熔断器调用函数"""
        with self._lock:
            if self.state == self.State.OPEN:
                if self._should_attempt_reset():
                    self.state = self.State.HALF_OPEN
                else:
                    raise Exception(f"Circuit breaker is OPEN for {func.__name__}")
                    
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except self.expected_exception as e:
            self._on_failure()
            raise e
            
    def _should_attempt_reset(self) -> bool:
        """检查是否应该尝试重置"""
        return (self.last_failure_time and 
                time.time() - self.last_failure_time >= self.recovery_timeout)
                
    def _on_success(self) -> None:
        """成功调用"""
        with self._lock:
            self.failure_count = 0
            if self.state == self.State.HALF_OPEN:
                self.state = self.State.CLOSED
                logger.info("熔断器恢复到CLOSED状态")
                
    def _on_failure(self) -> None:
        """失败调用"""
        with self._lock:
            self.failure_count += 1
            self.last_failure_time = time.time()
            
            if self.failure_count >= self.failure_threshold:
                self.state = self.State.OPEN
                logger.warning(f"熔断器进入OPEN状态，失败次数: {self.failure_count}")
                
    def reset(self) -> None:
        """手动重置"""
        with self._lock:
            self.failure_count = 0
            self.last_failure_time = None
            self.state = self.State.CLOSED
            
    def get_state(self) -> Dict[str, Any]:
        """获取状态"""
        return {
            'state': self.state.value,
            'failure_count': self.failure_count,
            'last_failure_time': self.last_failure_time
        }

# ============= 重试机制 =============
class RetryPolicy:
    """重试策略"""
    
    def __init__(self,
                 max_retries: int = 3,
                 initial_delay: float = 1.0,
                 max_delay: float = 60.0,
                 exponential_base: float = 2.0,
                 jitter: bool = True):
        self.max_retries = max_retries
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter
        
    def calculate_delay(self, retry_count: int) -> float:
        """计算重试延迟"""
        delay = min(
            self.initial_delay * (self.exponential_base ** retry_count),
            self.max_delay
        )
        
        if self.jitter:
            import random
            delay = delay * (0.5 + random.random())
            
        return delay
        
    def should_retry(self, retry_count: int, exception: Exception) -> bool:
        """判断是否应该重试"""
        if retry_count >= self.max_retries:
            return False
            
        # 可以根据异常类型判断
        non_retryable = (ValueError, TypeError, KeyError)
        if isinstance(exception, non_retryable):
            return False
            
        return True

def with_retry(retry_policy: Optional[RetryPolicy] = None):
    """重试装饰器"""
    if retry_policy is None:
        retry_policy = RetryPolicy()
        
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            retry_count = 0
            last_exception = None
            
            while True:
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    
                    if not retry_policy.should_retry(retry_count, e):
                        raise e
                        
                    delay = retry_policy.calculate_delay(retry_count)
                    logger.warning(f"重试 {func.__name__}，延迟 {delay:.2f}秒，原因: {e}")
                    time.sleep(delay)
                    retry_count += 1
                    
            raise last_exception
            
        return wrapper
    return decorator

# ============= 错误处理器 =============
class ErrorHandler:
    """统一错误处理器"""
    
    def __init__(self, max_history: int = 1000):
        self.max_history = max_history
        self.error_history = deque(maxlen=max_history)
        self.error_counts = defaultdict(int)
        self.handlers = {}
        self.circuit_breakers = {}
        
    def register_handler(self, error_type: ErrorType, handler: Callable) -> None:
        """注册错误处理器"""
        self.handlers[error_type] = handler
        logger.info(f"注册错误处理器: {error_type.value}")
        
    def handle_error(self, 
                    exception: Exception,
                    error_type: ErrorType = ErrorType.UNKNOWN,
                    level: ErrorLevel = ErrorLevel.ERROR,
                    context: Optional[Dict] = None) -> ErrorRecord:
        """处理错误"""
        # 创建错误记录
        record = ErrorRecord(
            timestamp=time.time(),
            level=level,
            type=error_type,
            message=str(exception),
            exception=exception,
            traceback=traceback.format_exc(),
            context=context or {}
        )
        
        # 记录到历史
        self.error_history.append(record)
        self.error_counts[error_type] += 1
        
        # 记录日志
        if level in (ErrorLevel.CRITICAL, ErrorLevel.FATAL):
            logger.critical(f"[{error_type.value}] {exception}")
        elif level == ErrorLevel.ERROR:
            logger.error(f"[{error_type.value}] {exception}")
        elif level == ErrorLevel.WARNING:
            logger.warning(f"[{error_type.value}] {exception}")
        else:
            logger.info(f"[{error_type.value}] {exception}")
            
        # 调用处理器
        if error_type in self.handlers:
            try:
                self.handlers[error_type](record)
            except Exception as e:
                logger.error(f"错误处理器失败: {e}")
                
        return record
        
    def get_statistics(self) -> Dict[str, Any]:
        """获取错误统计"""
        total_errors = len(self.error_history)
        
        if total_errors == 0:
            return {
                'total_errors': 0,
                'error_rate': 0,
                'by_type': {},
                'by_level': {}
            }
            
        # 按类型统计
        by_type = dict(self.error_counts)
        
        # 按级别统计
        by_level = defaultdict(int)
        for record in self.error_history:
            by_level[record.level.value] += 1
            
        # 计算错误率
        time_window = 3600  # 1小时
        recent_errors = sum(
            1 for r in self.error_history 
            if time.time() - r.timestamp < time_window
        )
        error_rate = recent_errors / (time_window / 60)  # 每分钟错误数
        
        return {
            'total_errors': total_errors,
            'error_rate_per_min': error_rate,
            'by_type': by_type,
            'by_level': dict(by_level),
            'recent_errors': recent_errors
        }

# ============= 健康检查 =============
class HealthChecker:
    """健康检查器"""
    
    def __init__(self):
        self.checks = {}
        self.last_check_time = {}
        self.check_results = {}
        
    def register_check(self, name: str, check_func: Callable[[], bool], 
                      interval: float = 60.0) -> None:
        """注册健康检查"""
        self.checks[name] = {
            'func': check_func,
            'interval': interval
        }
        logger.info(f"注册健康检查: {name}")
        
    def run_checks(self) -> Dict[str, Any]:
        """运行所有健康检查"""
        results = {}
        overall_healthy = True
        
        for name, check in self.checks.items():
            # 检查是否需要运行
            last_time = self.last_check_time.get(name, 0)
            if time.time() - last_time < check['interval']:
                # 使用缓存结果
                results[name] = self.check_results.get(name, {'healthy': True})
                continue
                
            try:
                healthy = check['func']()
                results[name] = {
                    'healthy': healthy,
                    'last_check': time.time(),
                    'message': 'OK' if healthy else 'FAILED'
                }
            except Exception as e:
                results[name] = {
                    'healthy': False,
                    'last_check': time.time(),
                    'message': str(e)
                }
                overall_healthy = False
                
            self.last_check_time[name] = time.time()
            self.check_results[name] = results[name]
            
            if not results[name]['healthy']:
                overall_healthy = False
                
        return {
            'overall_healthy': overall_healthy,
            'checks': results,
            'timestamp': time.time()
        }

# ============= 性能监控 =============
class PerformanceMonitor:
    """性能监控器"""
    
    def __init__(self, window_size: int = 1000):
        self.window_size = window_size
        self.response_times = deque(maxlen=window_size)
        self.memory_usage = deque(maxlen=window_size)
        self.cpu_usage = deque(maxlen=window_size)
        self.active_requests = 0
        self.total_requests = 0
        self.failed_requests = 0
        
    def record_request(self, response_time: float, success: bool = True) -> None:
        """记录请求"""
        self.response_times.append(response_time)
        self.total_requests += 1
        
        if not success:
            self.failed_requests += 1
            
    def record_resource_usage(self) -> None:
        """记录资源使用"""
        try:
            import psutil
            process = psutil.Process()
            
            # 内存使用
            memory_mb = process.memory_info().rss / 1024 / 1024
            self.memory_usage.append(memory_mb)
            
            # CPU使用
            cpu_percent = process.cpu_percent()
            self.cpu_usage.append(cpu_percent)
            
        except ImportError:
            pass
            
    def get_metrics(self) -> Dict[str, Any]:
        """获取性能指标"""
        import numpy as np
        
        metrics = {
            'total_requests': self.total_requests,
            'failed_requests': self.failed_requests,
            'active_requests': self.active_requests,
            'success_rate': ((self.total_requests - self.failed_requests) / 
                           self.total_requests * 100) if self.total_requests > 0 else 100
        }
        
        # 响应时间统计
        if self.response_times:
            times = np.array(self.response_times)
            metrics['response_time'] = {
                'mean': np.mean(times),
                'median': np.median(times),
                'p95': np.percentile(times, 95),
                'p99': np.percentile(times, 99),
                'min': np.min(times),
                'max': np.max(times)
            }
            
        # 资源使用统计
        if self.memory_usage:
            metrics['memory_mb'] = {
                'current': self.memory_usage[-1] if self.memory_usage else 0,
                'mean': np.mean(self.memory_usage),
                'max': np.max(self.memory_usage)
            }
            
        if self.cpu_usage:
            metrics['cpu_percent'] = {
                'current': self.cpu_usage[-1] if self.cpu_usage else 0,
                'mean': np.mean(self.cpu_usage),
                'max': np.max(self.cpu_usage)
            }
            
        return metrics

# ============= 监控装饰器 =============
def monitor_performance(monitor: PerformanceMonitor):
    """性能监控装饰器"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            monitor.active_requests += 1
            success = True
            
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                success = False
                raise e
            finally:
                response_time = time.time() - start_time
                monitor.record_request(response_time, success)
                monitor.active_requests -= 1
                
        return wrapper
    return decorator

# ============= 统一监控系统 =============
class MonitoringSystem:
    """统一监控系统"""
    
    def __init__(self):
        self.error_handler = ErrorHandler()
        self.health_checker = HealthChecker()
        self.performance_monitor = PerformanceMonitor()
        self.circuit_breakers = {}
        
        # 启动后台监控线程
        self._running = True
        self._monitor_thread = threading.Thread(target=self._monitor_loop)
        self._monitor_thread.daemon = True
        self._monitor_thread.start()
        
    def _monitor_loop(self) -> None:
        """监控循环"""
        while self._running:
            try:
                # 记录资源使用
                self.performance_monitor.record_resource_usage()
                
                # 运行健康检查
                health_status = self.health_checker.run_checks()
                
                # 检查是否需要告警
                self._check_alerts()
                
                time.sleep(10)  # 每10秒检查一次
                
            except Exception as e:
                logger.error(f"监控循环异常: {e}")
                
    def _check_alerts(self) -> None:
        """检查告警条件"""
        metrics = self.performance_monitor.get_metrics()
        
        # 检查错误率
        error_stats = self.error_handler.get_statistics()
        if error_stats['error_rate_per_min'] > 10:
            logger.warning(f"错误率过高: {error_stats['error_rate_per_min']:.2f}/分钟")
            
        # 检查响应时间
        if 'response_time' in metrics:
            p95 = metrics['response_time']['p95']
            if p95 > 1000:  # 1秒
                logger.warning(f"响应时间过长: P95={p95:.2f}ms")
                
        # 检查内存使用
        if 'memory_mb' in metrics:
            current_memory = metrics['memory_mb']['current']
            if current_memory > 500:  # 500MB
                logger.warning(f"内存使用过高: {current_memory:.2f}MB")
                
    def get_dashboard(self) -> Dict[str, Any]:
        """获取监控仪表板数据"""
        return {
            'timestamp': time.time(),
            'health': self.health_checker.run_checks(),
            'performance': self.performance_monitor.get_metrics(),
            'errors': self.error_handler.get_statistics(),
            'circuit_breakers': {
                name: cb.get_state() 
                for name, cb in self.circuit_breakers.items()
            }
        }
        
    def create_circuit_breaker(self, name: str, **kwargs) -> CircuitBreaker:
        """创建熔断器"""
        cb = CircuitBreaker(**kwargs)
        self.circuit_breakers[name] = cb
        return cb
        
    def shutdown(self) -> None:
        """关闭监控系统"""
        self._running = False
        logger.info("监控系统已关闭")

# ============= 示例使用 =============
def demo():
    """演示错误处理和监控系统"""
    
    # 创建监控系统
    monitoring = MonitoringSystem()
    
    # 注册错误处理器
    def handle_network_error(record: ErrorRecord):
        logger.info(f"处理网络错误: {record.message}")
        
    monitoring.error_handler.register_handler(ErrorType.NETWORK, handle_network_error)
    
    # 注册健康检查
    def check_database():
        # 模拟数据库检查
        return True
        
    monitoring.health_checker.register_check("database", check_database)
    
    # 创建熔断器
    api_breaker = monitoring.create_circuit_breaker(
        "api",
        failure_threshold=3,
        recovery_timeout=30
    )
    
    # 使用重试装饰器
    @with_retry(RetryPolicy(max_retries=3))
    def unreliable_function():
        import random
        if random.random() < 0.7:
            raise Exception("Random failure")
        return "Success"
        
    # 使用性能监控装饰器
    @monitor_performance(monitoring.performance_monitor)
    def api_call():
        time.sleep(0.1)  # 模拟API调用
        return "OK"
        
    # 测试
    print("\n=== 错误处理和监控系统演示 ===\n")
    
    # 测试重试
    try:
        result = unreliable_function()
        print(f"重试成功: {result}")
    except Exception as e:
        print(f"重试失败: {e}")
        
    # 测试熔断器
    for i in range(10):
        try:
            api_breaker.call(api_call)
            print(f"调用 {i+1}: 成功")
        except Exception as e:
            print(f"调用 {i+1}: {e}")
            
    # 测试错误处理
    try:
        raise ValueError("测试错误")
    except Exception as e:
        monitoring.error_handler.handle_error(
            e, 
            ErrorType.VALIDATION,
            ErrorLevel.WARNING
        )
        
    # 显示监控仪表板
    dashboard = monitoring.get_dashboard()
    print("\n=== 监控仪表板 ===")
    print(json.dumps(dashboard, indent=2, default=str))
    
    # 关闭
    monitoring.shutdown()
    print("\n✅ 演示完成")

if __name__ == "__main__":
    demo()