"""
服务健康检查模块
用于在应用启动前验证所有必需服务的可用性
"""
import requests
import socket
import time
import tkinter as tk
from tkinter import messagebox
from typing import Dict, List, Tuple, Optional
import threading
from urllib.parse import urlparse
import websocket
import logging

logger = logging.getLogger(__name__)

class ServiceHealthChecker:
    """服务健康检查器"""
    
    def __init__(self, timeout: int = 5, max_retries: int = 3):
        self.timeout = timeout
        self.max_retries = max_retries
        
    def check_http_service(self, url: str, service_name: str = "") -> Tuple[bool, str]:
        """检查HTTP服务健康状态"""
        try:
            # 尝试健康检查端点
            health_url = url.replace('/recommend', '/health').replace('/ingest', '/health')
            
            for attempt in range(self.max_retries):
                try:
                    response = requests.get(health_url, timeout=self.timeout)
                    if response.status_code == 200:
                        try:
                            health_data = response.json()
                            if health_data.get('status') == 'ok':
                                return True, f"{service_name}服务健康"
                            else:
                                return False, f"{service_name}服务状态异常: {health_data.get('message', '未知错误')}"
                        except:
                            # 如果不是JSON响应，检查状态码
                            return True, f"{service_name}服务可访问"
                    else:
                        if attempt == self.max_retries - 1:
                            return False, f"{service_name}服务返回错误: HTTP {response.status_code}"
                except requests.exceptions.ConnectionError:
                    if attempt == self.max_retries - 1:
                        return False, f"{service_name}服务连接失败"
                except requests.exceptions.Timeout:
                    if attempt == self.max_retries - 1:
                        return False, f"{service_name}服务响应超时"
                except Exception as e:
                    if attempt == self.max_retries - 1:
                        return False, f"{service_name}服务检查异常: {str(e)}"
                
                # 重试前等待
                if attempt < self.max_retries - 1:
                    time.sleep(1)
                    
        except Exception as e:
            return False, f"{service_name}服务检查失败: {str(e)}"
        
        return False, f"{service_name}服务不可用"
    
    def check_websocket_service(self, ws_url: str, service_name: str = "WebSocket") -> Tuple[bool, str]:
        """检查WebSocket服务健康状态"""
        try:
            # 解析URL获取主机和端口
            parsed = urlparse(ws_url)
            host = parsed.hostname or 'localhost'
            port = parsed.port or (443 if parsed.scheme == 'wss' else 80)
            
            # 先检查端口是否开放
            if not self._check_port_open(host, port):
                return False, f"{service_name}服务端口 {port} 未开放"
            
            # 尝试WebSocket连接
            try:
                # 使用短超时快速测试连接
                ws = websocket.create_connection(ws_url, timeout=self.timeout)
                ws.close()
                return True, f"{service_name}服务连接正常"
            except websocket.WebSocketException as e:
                return False, f"{service_name}服务WebSocket连接失败: {str(e)}"
            except Exception as e:
                return False, f"{service_name}服务连接异常: {str(e)}"
                
        except Exception as e:
            return False, f"{service_name}服务检查失败: {str(e)}"
    
    def _check_port_open(self, host: str, port: int) -> bool:
        """检查端口是否开放"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(self.timeout)
            result = sock.connect_ex((host, port))
            sock.close()
            return result == 0
        except:
            return False
    
    def check_all_services(self, api_endpoints: Dict[str, str]) -> Tuple[bool, List[Tuple[str, bool, str]]]:
        """检查所有服务健康状态
        
        Returns:
            Tuple[bool, List[Tuple[str, bool, str]]]: (all_healthy, [(service_name, is_healthy, message)])
        """
        results = []
        all_healthy = True
        
        # 定义服务检查配置
        service_checks = [
            ("推荐服务", api_endpoints.get("recommend", ""), "http"),
            ("数据接收服务", api_endpoints.get("ingest", ""), "http"),
            ("话术管理服务", api_endpoints.get("phrases", ""), "http"),
            ("WebSocket服务", api_endpoints.get("ws", ""), "websocket"),
        ]
        
        for service_name, endpoint, check_type in service_checks:
            if not endpoint:
                results.append((service_name, False, "服务端点未配置"))
                all_healthy = False
                continue
            
            try:
                if check_type == "http":
                    is_healthy, message = self.check_http_service(endpoint, service_name)
                elif check_type == "websocket":
                    is_healthy, message = self.check_websocket_service(endpoint, service_name)
                else:
                    is_healthy, message = False, f"未知的检查类型: {check_type}"
                
                results.append((service_name, is_healthy, message))
                if not is_healthy:
                    all_healthy = False
                    
            except Exception as e:
                results.append((service_name, False, f"检查异常: {str(e)}"))
                all_healthy = False
        
        return all_healthy, results

def check_service_health(api_endpoints: Dict[str, str], timeout: int = 5) -> Tuple[bool, List[Tuple[str, bool, str]]]:
    """检查服务健康状态的便捷函数"""
    checker = ServiceHealthChecker(timeout=timeout)
    return checker.check_all_services(api_endpoints)

def show_service_error_dialog(results: List[Tuple[str, bool, str]], auto_start: bool = True) -> bool:
    """显示服务错误对话框
    
    Args:
        results: 服务检查结果列表
        auto_start: 是否显示自动启动选项
        
    Returns:
        bool: 用户是否选择继续启动
    """
    # 创建隐藏的根窗口
    root = tk.Tk()
    root.withdraw()
    
    # 准备错误信息
    error_services = [name for name, healthy, _ in results if not healthy]
    healthy_services = [name for name, healthy, _ in results if healthy]
    
    message = "🔍 服务健康检查结果:\n\n"
    
    if healthy_services:
        message += "✅ 正常服务:\n"
        for name in healthy_services:
            message += f"  • {name}\n"
        message += "\n"
    
    if error_services:
        message += "❌ 异常服务:\n"
        for name, _, msg in results:
            if not _:  # not healthy
                message += f"  • {name}: {msg}\n"
        message += "\n"
    
    message += "📋 解决方案:\n"
    
    if any("推荐服务" in name for name in error_services):
        message += "  1. 启动推荐服务:\n"
        message += "     cd C:\\dev\\reply-recosvc && npm run dev\n\n"
    
    if any("WebSocket" in name for name in error_services):
        message += "  2. 启动消息捕获服务:\n"
        message += "     cd C:\\dev\\chat-capture && .\\start-etrans.ps1\n\n"
    
    if auto_start:
        message += "  3. 使用统一启动脚本:\n"
        message += "     .\\start-all-simple.ps1\n\n"
    
    message += "是否仍要继续启动应用程序？\n"
    message += "（建议先启动相关服务以获得完整功能）"
    
    # 显示对话框
    try:
        result = messagebox.askyesno(
            "服务健康检查",
            message,
            icon="warning"
        )
        root.destroy()
        return result
    except Exception as e:
        logger.error(f"显示错误对话框失败: {e}")
        root.destroy()
        # 如果对话框显示失败，在控制台显示错误信息
        print("\n" + "="*60)
        print("🔍 服务健康检查失败:")
        for name, healthy, msg in results:
            status = "✅" if healthy else "❌"
            print(f"  {status} {name}: {msg}")
        
        print("\n📋 建议操作:")
        print("  1. 运行统一启动脚本: .\\start-all-simple.ps1")
        print("  2. 或手动启动相关服务")
        print("  3. 运行状态检查: .\\status-check.ps1")
        print("="*60 + "\n")
        
        # 默认允许继续启动
        return True

def show_service_status_dialog(results: List[Tuple[str, bool, str]]) -> None:
    """显示服务状态信息对话框（仅信息展示）"""
    root = tk.Tk()
    root.withdraw()
    
    healthy_count = sum(1 for _, healthy, _ in results if healthy)
    total_count = len(results)
    
    if healthy_count == total_count:
        title = "服务状态正常"
        icon = "info"
        message = f"🎉 所有服务运行正常！({healthy_count}/{total_count})\n\n"
    else:
        title = "服务状态检查"
        icon = "warning"
        message = f"⚠️ 部分服务异常 ({healthy_count}/{total_count})\n\n"
    
    for name, healthy, msg in results:
        status = "✅" if healthy else "❌"
        message += f"{status} {name}: {msg}\n"
    
    try:
        messagebox.showinfo(title, message, icon=icon)
        root.destroy()
    except Exception as e:
        logger.error(f"显示状态对话框失败: {e}")
        root.destroy()
        # 控制台输出
        print(f"\n🔍 服务状态检查结果:")
        for name, healthy, msg in results:
            status = "✅" if healthy else "❌"
            print(f"  {status} {name}: {msg}")

# 异步健康检查（非阻塞）
class AsyncServiceHealthChecker:
    """异步服务健康检查器"""
    
    def __init__(self, on_complete_callback=None):
        self.on_complete = on_complete_callback
        self.checker = ServiceHealthChecker(timeout=3, max_retries=1)
        
    def check_async(self, api_endpoints: Dict[str, str]) -> None:
        """异步执行健康检查"""
        def _check_thread():
            try:
                all_healthy, results = self.checker.check_all_services(api_endpoints)
                if self.on_complete:
                    self.on_complete(all_healthy, results)
            except Exception as e:
                logger.error(f"异步健康检查失败: {e}")
                if self.on_complete:
                    self.on_complete(False, [("健康检查", False, f"检查异常: {str(e)}")])
        
        thread = threading.Thread(target=_check_thread, daemon=True)
        thread.start()

def quick_service_check(api_endpoints: Dict[str, str]) -> bool:
    """快速服务检查（只检查关键服务）"""
    try:
        checker = ServiceHealthChecker(timeout=2, max_retries=1)
        
        # 只检查WebSocket服务（最关键）
        ws_url = api_endpoints.get("ws", "")
        if ws_url:
            is_healthy, _ = checker.check_websocket_service(ws_url, "WebSocket")
            return is_healthy
        
        return False
    except:
        return False
