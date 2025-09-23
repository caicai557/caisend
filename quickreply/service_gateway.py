#!/usr/bin/env python3
"""
统一服务网关 - 管理所有外部服务调用
"""
import requests
import time
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum
import logging
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from .config_manager import ConfigManager

logger = logging.getLogger(__name__)


class ServiceStatus(Enum):
    """服务状态枚举"""
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"
    CIRCUIT_OPEN = "circuit_open"


@dataclass
class ServiceConfig:
    """服务配置"""
    name: str
    base_url: str
    timeout: float = 3.0
    max_retries: int = 3
    circuit_breaker_threshold: int = 5
    circuit_breaker_timeout: int = 60


@dataclass
class ServiceResponse:
    """服务响应"""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    status_code: Optional[int] = None
    response_time: float = 0.0


class CircuitBreaker:
    """断路器实现"""
    
    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = 0
        self.state = ServiceStatus.HEALTHY
        self._lock = threading.Lock()
    
    def call(self, func, *args, **kwargs):
        """执行函数调用，带断路器保护"""
        with self._lock:
            if self._is_circuit_open():
                raise Exception("Circuit breaker is open")
            
            try:
                result = func(*args, **kwargs)
                self._on_success()
                return result
            except Exception as e:
                self._on_failure()
                raise e
    
    def _is_circuit_open(self) -> bool:
        """检查断路器是否开启"""
        if self.state == ServiceStatus.CIRCUIT_OPEN:
            if time.time() - self.last_failure_time > self.timeout:
                self.state = ServiceStatus.HEALTHY
                self.failure_count = 0
                logger.info("断路器已重置")
                return False
            return True
        return False
    
    def _on_success(self):
        """成功回调"""
        self.failure_count = 0
        if self.state == ServiceStatus.CIRCUIT_OPEN:
            self.state = ServiceStatus.HEALTHY
            logger.info("断路器已关闭")
    
    def _on_failure(self):
        """失败回调"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = ServiceStatus.CIRCUIT_OPEN
            logger.warning(f"断路器已开启，连续失败{self.failure_count}次")


class ServiceHealthChecker:
    """服务健康检查器"""
    
    def __init__(self, gateway):
        self.gateway = gateway
        self.check_interval = 30  # 30秒检查一次
        self.running = False
        self.thread = None
    
    def start(self):
        """启动健康检查"""
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self._health_check_loop, daemon=True)
            self.thread.start()
            logger.info("服务健康检查已启动")
    
    def stop(self):
        """停止健康检查"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
    
    def _health_check_loop(self):
        """健康检查循环"""
        while self.running:
            try:
                self._check_all_services()
                time.sleep(self.check_interval)
            except Exception as e:
                logger.error(f"健康检查异常: {e}")
                time.sleep(5)
    
    def _check_all_services(self):
        """检查所有服务健康状态"""
        for service_name, config in self.gateway.services.items():
            try:
                # 发送健康检查请求
                health_url = f"{config.base_url}/health"
                response = requests.get(health_url, timeout=2)
                
                if response.status_code == 200:
                    self.gateway.service_status[service_name] = ServiceStatus.HEALTHY
                else:
                    self.gateway.service_status[service_name] = ServiceStatus.UNHEALTHY
                    
            except requests.exceptions.RequestException:
                self.gateway.service_status[service_name] = ServiceStatus.UNHEALTHY
            except Exception as e:
                logger.warning(f"服务{service_name}健康检查失败: {e}")
                self.gateway.service_status[service_name] = ServiceStatus.UNKNOWN


class ServiceGateway:
    """统一服务网关"""
    
    def __init__(self):
        # 加载配置
        config_manager = ConfigManager()
        config = config_manager.load()
        api_endpoints = config["app"]["api_endpoints"]
        
        # 服务配置
        self.services = {
            "nlp": ServiceConfig(
                name="NLP服务",
                base_url=f"{api_endpoints.get('recommend', 'http://127.0.0.1:7788/recommend').replace('/recommend', '')}/api/nlp",
                timeout=3.0
            ),
            "recommend": ServiceConfig(
                name="推荐服务", 
                base_url=api_endpoints.get("recommend", "http://127.0.0.1:7788/recommend"),
                timeout=2.0
            ),
            "phrases": ServiceConfig(
                name="话术服务",
                base_url=api_endpoints.get("phrases", "http://127.0.0.1:7788/phrases"),
                timeout=5.0
            ),
            "ingest": ServiceConfig(
                name="消息接收服务",
                base_url=api_endpoints.get("ingest", "http://127.0.0.1:7788/ingest"),
                timeout=3.0
            )
        }
        
        # 服务状态
        self.service_status = {name: ServiceStatus.UNKNOWN for name in self.services.keys()}
        
        # 断路器
        self.circuit_breakers = {
            name: CircuitBreaker(
                config.circuit_breaker_threshold,
                config.circuit_breaker_timeout
            )
            for name, config in self.services.items()
        }
        
        # 健康检查器
        self.health_checker = ServiceHealthChecker(self)
        
        # 线程池
        self.thread_pool = ThreadPoolExecutor(max_workers=10)
        
        # 启动健康检查
        self.health_checker.start()
    
    def call_service(self, service_name: str, endpoint: str = "", 
                    method: str = "POST", payload: Optional[Dict] = None,
                    timeout: Optional[float] = None) -> ServiceResponse:
        """
        调用服务
        
        Args:
            service_name: 服务名称
            endpoint: 端点路径
            method: HTTP方法
            payload: 请求数据
            timeout: 超时时间
            
        Returns:
            ServiceResponse: 响应结果
        """
        if service_name not in self.services:
            return ServiceResponse(
                success=False,
                error=f"未知服务: {service_name}"
            )
        
        config = self.services[service_name]
        circuit_breaker = self.circuit_breakers[service_name]
        
        try:
            # 使用断路器保护
            response = circuit_breaker.call(
                self._make_request,
                config, endpoint, method, payload, timeout
            )
            return response
            
        except Exception as e:
            error_msg = str(e)
            if "Circuit breaker is open" in error_msg:
                self.service_status[service_name] = ServiceStatus.CIRCUIT_OPEN
                error_msg = f"服务{service_name}断路器开启，暂时不可用"
            
            return ServiceResponse(
                success=False,
                error=error_msg
            )
    
    def _make_request(self, config: ServiceConfig, endpoint: str, 
                     method: str, payload: Optional[Dict], 
                     timeout: Optional[float]) -> ServiceResponse:
        """执行HTTP请求"""
        start_time = time.time()
        
        # 构建URL
        url = config.base_url
        if endpoint:
            url = f"{url}/{endpoint.lstrip('/')}"
        
        # 设置超时
        request_timeout = timeout or config.timeout
        
        try:
            # 发送请求
            if method.upper() == "GET":
                response = requests.get(url, params=payload, timeout=request_timeout)
            elif method.upper() == "POST":
                response = requests.post(url, json=payload, timeout=request_timeout)
            elif method.upper() == "PUT":
                response = requests.put(url, json=payload, timeout=request_timeout)
            elif method.upper() == "DELETE":
                response = requests.delete(url, timeout=request_timeout)
            else:
                raise ValueError(f"不支持的HTTP方法: {method}")
            
            response_time = time.time() - start_time
            
            # 检查响应状态
            if response.status_code == 200:
                try:
                    data = response.json()
                except json.JSONDecodeError:
                    data = {"message": response.text}
                
                return ServiceResponse(
                    success=True,
                    data=data,
                    status_code=response.status_code,
                    response_time=response_time
                )
            else:
                return ServiceResponse(
                    success=False,
                    error=f"HTTP {response.status_code}: {response.text}",
                    status_code=response.status_code,
                    response_time=response_time
                )
                
        except requests.exceptions.Timeout:
            return ServiceResponse(
                success=False,
                error=f"服务调用超时 ({request_timeout}s)",
                response_time=time.time() - start_time
            )
        except requests.exceptions.ConnectionError:
            return ServiceResponse(
                success=False,
                error="服务连接失败",
                response_time=time.time() - start_time
            )
        except Exception as e:
            return ServiceResponse(
                success=False,
                error=f"请求异常: {str(e)}",
                response_time=time.time() - start_time
            )
    
    def batch_call(self, calls: List[Dict[str, Any]]) -> List[ServiceResponse]:
        """
        批量调用服务
        
        Args:
            calls: 调用列表，每个元素包含service_name, endpoint, method, payload等
            
        Returns:
            List[ServiceResponse]: 响应列表
        """
        futures = []
        
        for call in calls:
            future = self.thread_pool.submit(
                self.call_service,
                call.get('service_name'),
                call.get('endpoint', ''),
                call.get('method', 'POST'),
                call.get('payload'),
                call.get('timeout')
            )
            futures.append(future)
        
        results = []
        for future in as_completed(futures, timeout=30):
            try:
                result = future.result()
                results.append(result)
            except Exception as e:
                results.append(ServiceResponse(
                    success=False,
                    error=f"批量调用异常: {str(e)}"
                ))
        
        return results
    
    def get_service_status(self) -> Dict[str, Dict[str, Any]]:
        """获取所有服务状态"""
        status_info = {}
        
        for service_name, config in self.services.items():
            circuit_breaker = self.circuit_breakers[service_name]
            
            status_info[service_name] = {
                "name": config.name,
                "base_url": config.base_url,
                "status": self.service_status[service_name].value,
                "circuit_breaker": {
                    "state": circuit_breaker.state.value,
                    "failure_count": circuit_breaker.failure_count,
                    "last_failure_time": circuit_breaker.last_failure_time
                }
            }
        
        return status_info
    
    def reset_circuit_breaker(self, service_name: str) -> bool:
        """重置指定服务的断路器"""
        if service_name in self.circuit_breakers:
            circuit_breaker = self.circuit_breakers[service_name]
            circuit_breaker.failure_count = 0
            circuit_breaker.state = ServiceStatus.HEALTHY
            self.service_status[service_name] = ServiceStatus.HEALTHY
            logger.info(f"服务{service_name}断路器已重置")
            return True
        return False
    
    def shutdown(self):
        """关闭网关"""
        self.health_checker.stop()
        self.thread_pool.shutdown(wait=True)
        logger.info("服务网关已关闭")


# 全局网关实例
_gateway_instance = None
_gateway_lock = threading.Lock()


def get_gateway() -> ServiceGateway:
    """获取全局网关实例（单例模式）"""
    global _gateway_instance
    
    if _gateway_instance is None:
        with _gateway_lock:
            if _gateway_instance is None:
                _gateway_instance = ServiceGateway()
    
    return _gateway_instance


def main():
    """测试入口"""
    gateway = get_gateway()
    
    print("🌐 统一服务网关测试")
    print("=" * 50)
    
    # 测试服务调用
    test_calls = [
        {
            "service_name": "nlp",
            "endpoint": "intent",
            "payload": {"text": "我要查询订单状态"}
        },
        {
            "service_name": "recommend", 
            "endpoint": "suggestions",
            "payload": {"query": "产品推荐", "limit": 5}
        },
        {
            "service_name": "phrases",
            "endpoint": "",
            "method": "GET"
        }
    ]
    
    print("📡 执行服务调用测试...")
    for i, call in enumerate(test_calls, 1):
        print(f"\n测试 {i}: {call['service_name']}")
        response = gateway.call_service(**call)
        
        print(f"  成功: {response.success}")
        print(f"  响应时间: {response.response_time:.3f}s")
        if response.error:
            print(f"  错误: {response.error}")
        if response.data:
            print(f"  数据: {str(response.data)[:100]}...")
    
    # 显示服务状态
    print(f"\n📊 服务状态:")
    status = gateway.get_service_status()
    for service_name, info in status.items():
        print(f"  {info['name']}: {info['status']}")
        if info['circuit_breaker']['failure_count'] > 0:
            print(f"    失败次数: {info['circuit_breaker']['failure_count']}")
    
    # 测试批量调用
    print(f"\n🔄 批量调用测试...")
    batch_results = gateway.batch_call(test_calls)
    print(f"批量调用完成，成功: {sum(1 for r in batch_results if r.success)}/{len(batch_results)}")


if __name__ == "__main__":
    main()

