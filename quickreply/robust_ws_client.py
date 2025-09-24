"""
增强型WebSocket客户端 - 基于竞品分析的稳定实现
包含自动重连、心跳检测、消息队列、断线重传等功能
"""
from __future__ import annotations

import asyncio
import json
import time
import gzip
import logging
from typing import Optional, Dict, Any, Callable, List
from dataclasses import dataclass, field
from collections import deque
from enum import Enum
import threading
from queue import Queue, Empty

try:
    import websocket
    HAS_WEBSOCKET = True
except ImportError:
    HAS_WEBSOCKET = False
    
try:
    import aiohttp
    HAS_AIOHTTP = True
except ImportError:
    HAS_AIOHTTP = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============= 连接状态 =============
class ConnectionState(Enum):
    """连接状态枚举"""
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    RECONNECTING = "reconnecting"
    CLOSED = "closed"

# ============= 配置 =============
@dataclass
class WebSocketConfig:
    """WebSocket配置"""
    url: str
    reconnect_interval: float = 1.0      # 初始重连间隔
    max_reconnect_interval: float = 30.0  # 最大重连间隔
    max_reconnect_attempts: int = -1      # -1表示无限重试
    heartbeat_interval: float = 30.0      # 心跳间隔
    heartbeat_timeout: float = 60.0       # 心跳超时
    message_queue_size: int = 1000        # 消息队列大小
    enable_compression: bool = True       # 启用压缩
    batch_send_size: int = 10            # 批量发送大小
    batch_send_interval: float = 0.1     # 批量发送间隔

# ============= 消息队列管理 =============
class MessageQueue:
    """消息队列管理器"""
    
    def __init__(self, max_size: int = 1000):
        self.queue = deque(maxlen=max_size)
        self.pending = deque()  # 待重发消息
        self.sent = {}  # 已发送但未确认的消息
        self.message_id = 0
        
    def generate_id(self) -> str:
        """生成消息ID"""
        self.message_id += 1
        return f"msg_{self.message_id}_{int(time.time()*1000)}"
        
    def enqueue(self, message: Dict) -> str:
        """入队消息"""
        msg_id = self.generate_id()
        message['_id'] = msg_id
        message['_timestamp'] = time.time()
        self.queue.append(message)
        return msg_id
        
    def dequeue_batch(self, batch_size: int) -> List[Dict]:
        """批量出队"""
        batch = []
        for _ in range(min(batch_size, len(self.queue))):
            if self.queue:
                msg = self.queue.popleft()
                self.sent[msg['_id']] = msg
                batch.append(msg)
        return batch
        
    def mark_sent(self, msg_id: str) -> None:
        """标记消息已发送"""
        if msg_id in self.sent:
            del self.sent[msg_id]
            
    def mark_failed(self, msg_id: str) -> None:
        """标记消息发送失败"""
        if msg_id in self.sent:
            self.pending.append(self.sent[msg_id])
            del self.sent[msg_id]
            
    def get_pending(self) -> List[Dict]:
        """获取待重发消息"""
        pending = list(self.pending)
        self.pending.clear()
        
        # 添加超时未确认的消息
        timeout = time.time() - 30  # 30秒超时
        for msg_id, msg in list(self.sent.items()):
            if msg['_timestamp'] < timeout:
                pending.append(msg)
                del self.sent[msg_id]
                
        return pending

# ============= 增强型WebSocket客户端 =============
class RobustWebSocketClient:
    """增强型WebSocket客户端"""
    
    def __init__(self, config: WebSocketConfig, 
                 on_message: Optional[Callable] = None,
                 on_error: Optional[Callable] = None):
        self.config = config
        self.on_message = on_message
        self.on_error = on_error
        
        self.state = ConnectionState.DISCONNECTED
        self.ws = None
        self.reconnect_attempts = 0
        self.last_heartbeat = time.time()
        self.last_pong = time.time()
        
        self.message_queue = MessageQueue(config.message_queue_size)
        self.stats = {
            'messages_sent': 0,
            'messages_received': 0,
            'messages_failed': 0,
            'reconnections': 0,
            'total_downtime': 0,
            'last_error': None
        }
        
        self._running = False
        self._heartbeat_task = None
        self._send_task = None
        
    def _calculate_reconnect_delay(self) -> float:
        """计算重连延迟(指数退避)"""
        delay = min(
            self.config.reconnect_interval * (2 ** self.reconnect_attempts),
            self.config.max_reconnect_interval
        )
        return delay
        
    def _on_open(self, ws) -> None:
        """连接建立"""
        logger.info(f"WebSocket连接建立: {self.config.url}")
        self.state = ConnectionState.CONNECTED
        self.reconnect_attempts = 0
        self.last_heartbeat = time.time()
        self.last_pong = time.time()
        
        # 发送待重发消息
        pending = self.message_queue.get_pending()
        if pending:
            logger.info(f"重发 {len(pending)} 条待发送消息")
            for msg in pending:
                self.send(msg)
                
    def _on_message(self, ws, message) -> None:
        """接收消息"""
        try:
            # 解压缩
            if self.config.enable_compression and isinstance(message, bytes):
                message = gzip.decompress(message).decode('utf-8')
                
            # 解析消息
            data = json.loads(message) if isinstance(message, str) else message
            
            # 处理心跳响应
            if data.get('type') == 'pong':
                self.last_pong = time.time()
                return
                
            # 处理消息确认
            if data.get('type') == 'ack':
                msg_id = data.get('msg_id')
                if msg_id:
                    self.message_queue.mark_sent(msg_id)
                return
                
            # 更新统计
            self.stats['messages_received'] += 1
            
            # 调用回调
            if self.on_message:
                self.on_message(data)
                
        except Exception as e:
            logger.error(f"处理消息失败: {e}")
            
    def _on_error(self, ws, error) -> None:
        """错误处理"""
        logger.error(f"WebSocket错误: {error}")
        self.stats['last_error'] = str(error)
        
        if self.on_error:
            self.on_error(error)
            
    def _on_close(self, ws, close_status_code, close_msg) -> None:
        """连接关闭"""
        logger.warning(f"WebSocket连接关闭: {close_status_code} - {close_msg}")
        
        if self.state != ConnectionState.CLOSED:
            self.state = ConnectionState.DISCONNECTED
            
            # 标记所有已发送消息为失败
            for msg_id in list(self.message_queue.sent.keys()):
                self.message_queue.mark_failed(msg_id)
                
            # 尝试重连
            if self._running:
                self._reconnect()
                
    def _reconnect(self) -> None:
        """重连逻辑"""
        if not self._running:
            return
            
        if self.config.max_reconnect_attempts > 0 and \
           self.reconnect_attempts >= self.config.max_reconnect_attempts:
            logger.error("达到最大重连次数，停止重连")
            self.stop()
            return
            
        self.state = ConnectionState.RECONNECTING
        self.reconnect_attempts += 1
        self.stats['reconnections'] += 1
        
        delay = self._calculate_reconnect_delay()
        logger.info(f"将在 {delay:.1f} 秒后进行第 {self.reconnect_attempts} 次重连")
        
        time.sleep(delay)
        
        if self._running:
            self.connect()
            
    def _heartbeat_loop(self) -> None:
        """心跳循环"""
        while self._running:
            try:
                if self.state == ConnectionState.CONNECTED:
                    # 检查心跳超时
                    if time.time() - self.last_pong > self.config.heartbeat_timeout:
                        logger.warning("心跳超时，断开连接")
                        if self.ws:
                            self.ws.close()
                        continue
                        
                    # 发送心跳
                    self.send({'type': 'ping', 'timestamp': time.time()})
                    self.last_heartbeat = time.time()
                    
                time.sleep(self.config.heartbeat_interval)
                
            except Exception as e:
                logger.error(f"心跳异常: {e}")
                
    def _send_loop(self) -> None:
        """发送循环(批量发送)"""
        while self._running:
            try:
                if self.state == ConnectionState.CONNECTED:
                    # 批量发送消息
                    batch = self.message_queue.dequeue_batch(self.config.batch_send_size)
                    
                    if batch:
                        # 批量发送
                        message = {
                            'type': 'batch',
                            'messages': batch
                        }
                        
                        # 压缩
                        if self.config.enable_compression:
                            data = gzip.compress(json.dumps(message).encode('utf-8'))
                        else:
                            data = json.dumps(message)
                            
                        if self.ws:
                            self.ws.send(data)
                            self.stats['messages_sent'] += len(batch)
                            logger.debug(f"批量发送 {len(batch)} 条消息")
                            
                time.sleep(self.config.batch_send_interval)
                
            except Exception as e:
                logger.error(f"发送异常: {e}")
                # 标记失败
                for msg in batch:
                    self.message_queue.mark_failed(msg['_id'])
                    self.stats['messages_failed'] += 1
                    
    def connect(self) -> None:
        """建立连接"""
        if not HAS_WEBSOCKET:
            logger.error("websocket-client未安装")
            return
            
        try:
            self.state = ConnectionState.CONNECTING
            logger.info(f"正在连接: {self.config.url}")
            
            # 创建WebSocket连接
            self.ws = websocket.WebSocketApp(
                self.config.url,
                on_open=self._on_open,
                on_message=self._on_message,
                on_error=self._on_error,
                on_close=self._on_close
            )
            
            # 在新线程中运行
            wst = threading.Thread(target=self.ws.run_forever)
            wst.daemon = True
            wst.start()
            
        except Exception as e:
            logger.error(f"连接失败: {e}")
            self._on_error(None, e)
            
    def start(self) -> None:
        """启动客户端"""
        if self._running:
            return
            
        self._running = True
        
        # 启动心跳线程
        self._heartbeat_task = threading.Thread(target=self._heartbeat_loop)
        self._heartbeat_task.daemon = True
        self._heartbeat_task.start()
        
        # 启动发送线程
        self._send_task = threading.Thread(target=self._send_loop)
        self._send_task.daemon = True
        self._send_task.start()
        
        # 建立连接
        self.connect()
        
        logger.info("WebSocket客户端已启动")
        
    def stop(self) -> None:
        """停止客户端"""
        self._running = False
        self.state = ConnectionState.CLOSED
        
        if self.ws:
            self.ws.close()
            
        logger.info("WebSocket客户端已停止")
        
    def send(self, message: Dict) -> str:
        """发送消息"""
        msg_id = self.message_queue.enqueue(message)
        return msg_id
        
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        uptime = time.time() - self.last_heartbeat if self.state == ConnectionState.CONNECTED else 0
        
        return {
            'state': self.state.value,
            'messages_sent': self.stats['messages_sent'],
            'messages_received': self.stats['messages_received'],
            'messages_failed': self.stats['messages_failed'],
            'reconnections': self.stats['reconnections'],
            'queue_size': len(self.message_queue.queue),
            'pending_size': len(self.message_queue.pending),
            'uptime_seconds': uptime,
            'last_error': self.stats['last_error']
        }

# ============= 异步版本 =============
class AsyncRobustWebSocketClient:
    """异步版本的增强型WebSocket客户端"""
    
    def __init__(self, config: WebSocketConfig):
        self.config = config
        self.session = None
        self.ws = None
        self.state = ConnectionState.DISCONNECTED
        self.message_queue = asyncio.Queue(maxsize=config.message_queue_size)
        self._running = False
        
    async def connect(self) -> None:
        """异步连接"""
        if not HAS_AIOHTTP:
            logger.error("aiohttp未安装")
            return
            
        try:
            self.state = ConnectionState.CONNECTING
            self.session = aiohttp.ClientSession()
            
            self.ws = await self.session.ws_connect(
                self.config.url,
                compress=self.config.enable_compression
            )
            
            self.state = ConnectionState.CONNECTED
            logger.info(f"异步WebSocket连接成功: {self.config.url}")
            
            # 启动接收和发送任务
            asyncio.create_task(self._receive_loop())
            asyncio.create_task(self._send_loop())
            asyncio.create_task(self._heartbeat_loop())
            
        except Exception as e:
            logger.error(f"异步连接失败: {e}")
            await self._reconnect()
            
    async def _receive_loop(self) -> None:
        """接收循环"""
        while self._running and self.ws:
            try:
                msg = await self.ws.receive()
                
                if msg.type == aiohttp.WSMsgType.TEXT:
                    data = json.loads(msg.data)
                    await self._handle_message(data)
                elif msg.type == aiohttp.WSMsgType.ERROR:
                    logger.error(f"WebSocket错误: {msg}")
                elif msg.type == aiohttp.WSMsgType.CLOSED:
                    logger.warning("WebSocket连接关闭")
                    break
                    
            except Exception as e:
                logger.error(f"接收消息异常: {e}")
                break
                
        # 触发重连
        if self._running:
            await self._reconnect()
            
    async def _send_loop(self) -> None:
        """发送循环"""
        while self._running:
            try:
                # 批量获取消息
                batch = []
                deadline = asyncio.get_event_loop().time() + self.config.batch_send_interval
                
                while len(batch) < self.config.batch_send_size:
                    timeout = deadline - asyncio.get_event_loop().time()
                    if timeout <= 0:
                        break
                        
                    try:
                        msg = await asyncio.wait_for(
                            self.message_queue.get(), 
                            timeout=timeout
                        )
                        batch.append(msg)
                    except asyncio.TimeoutError:
                        break
                        
                # 发送批量消息
                if batch and self.ws and self.state == ConnectionState.CONNECTED:
                    message = {'type': 'batch', 'messages': batch}
                    await self.ws.send_json(message)
                    logger.debug(f"异步批量发送 {len(batch)} 条消息")
                    
            except Exception as e:
                logger.error(f"发送异常: {e}")
                
            await asyncio.sleep(0.01)
            
    async def _heartbeat_loop(self) -> None:
        """心跳循环"""
        while self._running:
            if self.ws and self.state == ConnectionState.CONNECTED:
                try:
                    await self.ws.send_json({'type': 'ping'})
                except:
                    pass
                    
            await asyncio.sleep(self.config.heartbeat_interval)
            
    async def _reconnect(self) -> None:
        """重连"""
        self.state = ConnectionState.RECONNECTING
        delay = self._calculate_reconnect_delay()
        logger.info(f"将在 {delay:.1f} 秒后重连")
        await asyncio.sleep(delay)
        
        if self._running:
            await self.connect()
            
    async def _handle_message(self, data: Dict) -> None:
        """处理消息"""
        # 处理不同类型的消息
        msg_type = data.get('type')
        
        if msg_type == 'pong':
            # 心跳响应
            pass
        elif msg_type == 'recommendation':
            # 推荐结果
            logger.info(f"收到推荐: {data.get('data', [])}")
        else:
            # 其他消息
            logger.debug(f"收到消息: {data}")
            
    def _calculate_reconnect_delay(self) -> float:
        """计算重连延迟"""
        return min(
            self.config.reconnect_interval * (2 ** self.reconnect_attempts),
            self.config.max_reconnect_interval
        )
        
    async def send(self, message: Dict) -> None:
        """发送消息"""
        await self.message_queue.put(message)
        
    async def start(self) -> None:
        """启动"""
        self._running = True
        await self.connect()
        
    async def stop(self) -> None:
        """停止"""
        self._running = False
        
        if self.ws:
            await self.ws.close()
        if self.session:
            await self.session.close()

# ============= 示例使用 =============
def demo():
    """演示增强型WebSocket客户端"""
    
    # 配置
    config = WebSocketConfig(
        url="ws://127.0.0.1:7799",
        reconnect_interval=1.0,
        max_reconnect_interval=30.0,
        heartbeat_interval=30.0,
        enable_compression=True
    )
    
    # 消息处理回调
    def on_message(data):
        logger.info(f"收到消息: {data}")
        
    def on_error(error):
        logger.error(f"错误: {error}")
        
    # 创建客户端
    client = RobustWebSocketClient(config, on_message, on_error)
    
    # 启动
    client.start()
    
    try:
        # 发送测试消息
        for i in range(10):
            client.send({'type': 'test', 'data': f'消息{i}'})
            time.sleep(1)
            
        # 显示统计
        stats = client.get_stats()
        logger.info(f"统计信息: {stats}")
        
        # 保持运行
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        client.stop()
        logger.info("客户端已停止")

if __name__ == "__main__":
    demo()