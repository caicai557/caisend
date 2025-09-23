"""WebSocket客户端模块，用于订阅消息推荐"""
import json
import threading
import time
import random
from typing import Callable, Any
from enum import Enum

try:
    import websocket  # pip install websocket-client
except ImportError:
    websocket = None


class ConnectionState(Enum):
    """连接状态枚举"""
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting" 
    CONNECTED = "connected"
    RECONNECTING = "reconnecting"
    CIRCUIT_BREAKER_OPEN = "circuit_breaker_open"


class WsClient:
    """健壮的WebSocket客户端，支持指数退避重连和断路器"""
    
    def __init__(self, url: str, on_recos: Callable[[list], None]):
        self.url = url
        self.on_recos = on_recos
        self._stop = False
        self._ws = None
        self._thread = None
        
        # 重连参数
        self._backoff = 1  # 初始退避时间(秒)
        self._max_backoff = 60  # 最大退避时间
        self._backoff_multiplier = 2
        self._jitter_factor = 0.5
        
        # 断路器参数 - 动态阈值调整
        self._failure_count = 0
        self._failure_threshold = 5  # 初始连续失败阈值
        self._max_failure_threshold = 15  # 最大阈值
        self._circuit_breaker_timeout = 120  # 断路器开启时间(秒)
        self._circuit_breaker_open_time = 0
        self._success_count = 0  # 成功连接计数
        
        # 心跳参数
        self._ping_interval = 15
        self._ping_timeout = 10
        self._last_pong = 0
        
        # 连接状态
        self._state = ConnectionState.DISCONNECTED
        self._connection_start_time = 0
        
        if websocket is None:
            print("[WS客户端] 警告: websocket-client 未安装，无法接收实时推荐")
            return
            
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()
        print(f"[WS客户端] 启动连接到 {url}")

    def _run(self):
        """主运行循环，支持智能重连和断路器"""
        while not self._stop:
            # 检查断路器状态
            if self._is_circuit_breaker_open():
                self._state = ConnectionState.CIRCUIT_BREAKER_OPEN
                print(f"[WS客户端] 断路器开启，等待 {self._circuit_breaker_timeout} 秒...")
                time.sleep(5)  # 短暂等待后重新检查
                continue
            
            try:
                self._state = ConnectionState.CONNECTING
                self._connection_start_time = time.time()
                
                self._ws = websocket.WebSocketApp(
                    self.url,
                    on_message=self._on_message,
                    on_error=self._on_error,
                    on_close=self._on_close,
                    on_open=self._on_open,
                    on_pong=self._on_pong
                )
                
                # 启动连接（阻塞直到连接关闭）
                self._ws.run_forever(
                    ping_interval=self._ping_interval,
                    ping_timeout=self._ping_timeout
                )
                
            except Exception as e:
                self._on_connection_failed(f"连接异常: {e}")
                
            # 连接结束，准备重连
            if not self._stop:
                self._state = ConnectionState.RECONNECTING
                self._wait_with_backoff()

    def _on_open(self, ws):
        """连接成功回调"""
        self._state = ConnectionState.CONNECTED
        self._reset_circuit_breaker()  # 重置断路器
        connection_time = time.time() - self._connection_start_time
        print(f"[WS客户端] 连接已建立 (耗时: {connection_time:.2f}s)")
        self._last_pong = time.time()

    def _on_message(self, ws, message: str):
        """消息接收回调"""
        try:
            obj = json.loads(message)
            msg_type = obj.get("type")
            
            if msg_type == "hello":
                print("[WS客户端] 收到服务器问候")
            elif msg_type == "recommendations":
                items = obj.get("items", [])
                session_id = obj.get("sessionId", "")
                chat_title = obj.get("chatTitle", "")
                print(f"[WS客户端] 收到推荐 {len(items)} 条 [{chat_title}]")
                self.on_recos(items)
            elif msg_type == "message":
                message_obj = obj.get("message", {})
                text = message_obj.get("text", "")
                print(f"[WS客户端] 收到新消息: {text[:50]}...")
                
        except Exception as e:
            print(f"[WS客户端] 消息解析错误: {e}")

    def _on_error(self, ws, error):
        """错误回调"""
        if not self._stop:
            print(f"[WS客户端] 连接错误: {error}")
            self._on_connection_failed(f"连接错误: {error}")

    def _on_close(self, ws, close_status_code, close_msg):
        """连接关闭回调"""
        self._state = ConnectionState.DISCONNECTED
        if not self._stop:
            print(f"[WS客户端] 连接关闭 (状态码: {close_status_code}, 消息: {close_msg})")

    def _on_pong(self, ws, data):
        """心跳响应回调"""
        self._last_pong = time.time()

    def _on_connection_failed(self, reason: str):
        """处理连接失败"""
        self._failure_count += 1
        self._success_count = 0  # 重置成功计数
        print(f"[WS客户端] 连接失败 ({self._failure_count}/{self._failure_threshold}): {reason}")
        
        # 动态调整阈值
        self._adjust_failure_threshold()
        
        # 检查是否需要开启断路器
        if self._failure_count >= self._failure_threshold:
            self._open_circuit_breaker()

    def _is_circuit_breaker_open(self) -> bool:
        """检查断路器是否开启"""
        if self._circuit_breaker_open_time == 0:
            return False
        
        # 检查是否超过超时时间
        if time.time() - self._circuit_breaker_open_time > self._circuit_breaker_timeout:
            self._close_circuit_breaker()
            return False
        
        return True

    def _open_circuit_breaker(self):
        """开启断路器"""
        self._circuit_breaker_open_time = time.time()
        print(f"[WS客户端] 断路器开启 ({self._failure_count} 次连续失败)")

    def _close_circuit_breaker(self):
        """关闭断路器"""
        self._circuit_breaker_open_time = 0
        print("[WS客户端] 断路器关闭，尝试重新连接")

    def _reset_circuit_breaker(self):
        """重置断路器"""
        self._failure_count = 0
        self._backoff = 1
        self._circuit_breaker_open_time = 0
        self._success_count += 1  # 增加成功计数
        
        # 连接成功时动态降低阈值
        if self._success_count >= 3 and self._failure_threshold > 5:
            self._failure_threshold = max(5, self._failure_threshold - 1)
            print(f"[WS客户端] 连接稳定，降低失败阈值至 {self._failure_threshold}")
    
    def _adjust_failure_threshold(self):
        """动态调整失败阈值"""
        # 连续失败时适度提高阈值，但不超过最大值
        if self._failure_count > 0 and self._failure_count % 3 == 0:
            if self._failure_threshold < self._max_failure_threshold:
                self._failure_threshold = min(self._max_failure_threshold, self._failure_threshold + 2)
                print(f"[WS客户端] 连接困难，提高失败阈值至 {self._failure_threshold}")

    def _wait_with_backoff(self):
        """指数退避等待"""
        # 计算退避时间（带抖动）
        jitter = random.uniform(-self._jitter_factor, self._jitter_factor)
        sleep_time = min(self._max_backoff, self._backoff) * (1 + jitter)
        
        print(f"[WS客户端] 等待 {sleep_time:.1f} 秒后重连...")
        time.sleep(sleep_time)
        
        # 增加退避时间
        self._backoff = min(self._max_backoff, self._backoff * self._backoff_multiplier)

    def get_state(self) -> ConnectionState:
        """获取当前连接状态"""
        return self._state

    def get_stats(self) -> dict:
        """获取连接统计信息"""
        return {
            "state": self._state.value,
            "failure_count": self._failure_count,
            "circuit_breaker_open": self._is_circuit_breaker_open(),
            "backoff_time": self._backoff,
            "last_pong": self._last_pong
        }

    def stop(self):
        """停止WebSocket客户端"""
        self._stop = True
        if self._ws:
            self._ws.close()
        print("[WS客户端] 已停止")

    def is_available(self) -> bool:
        """检查WebSocket客户端是否可用"""
        return websocket is not None and self._thread is not None

    def is_connected(self) -> bool:
        """检查是否已连接"""
        return self._state == ConnectionState.CONNECTED
