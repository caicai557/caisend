#!/usr/bin/env python3
"""
WebSocket连接监控工具
用于测试和监控WS客户端的健壮性
"""

import sys
import time
import threading
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent))

from quickreply.ws_client import WsClient, ConnectionState

class WSMonitor:
    def __init__(self, ws_url: str):
        self.ws_url = ws_url
        self.client = None
        self.running = False
        
    def on_message(self, items):
        """消息回调"""
        print(f"📨 收到推荐: {len(items)} 条")
        for i, item in enumerate(items[:3]):  # 只显示前3条
            text = item.get("text", str(item))[:50]
            print(f"  {i+1}. {text}...")
            
    def start_monitoring(self):
        """开始监控"""
        print(f"🚀 启动WS监控器...")
        print(f"📡 连接地址: {self.ws_url}")
        print("=" * 60)
        
        self.client = WsClient(self.ws_url, self.on_message)
        self.running = True
        
        # 启动状态监控线程
        monitor_thread = threading.Thread(target=self._monitor_status, daemon=True)
        monitor_thread.start()
        
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n⏹️ 用户中断，正在停止...")
            self.stop()
            
    def stop(self):
        """停止监控"""
        self.running = False
        if self.client:
            self.client.stop()
            print("✅ WS客户端已停止")
            
    def _monitor_status(self):
        """监控连接状态"""
        last_state = None
        
        while self.running:
            if self.client:
                state = self.client.get_state()
                stats = self.client.get_stats()
                
                if state != last_state:
                    timestamp = time.strftime("%H:%M:%S")
                    status_icon = self._get_status_icon(state)
                    print(f"[{timestamp}] {status_icon} 状态变更: {state.name}")
                    last_state = state
                    
                # 每30秒显示一次统计信息
                if int(time.time()) % 30 == 0:
                    self._print_stats(stats)
                    
            time.sleep(1)
            
    def _get_status_icon(self, state: ConnectionState) -> str:
        """获取状态图标"""
        icons = {
            ConnectionState.DISCONNECTED: "⚪",
            ConnectionState.CONNECTING: "🟡", 
            ConnectionState.CONNECTED: "🟢",
            ConnectionState.RECONNECTING: "🔄",
            ConnectionState.CIRCUIT_BREAKER_OPEN: "🔴"
        }
        return icons.get(state, "❓")
        
    def _print_stats(self, stats: dict):
        """打印统计信息"""
        print(f"📊 统计 - 连接时长: {stats.get('uptime', 0):.0f}s, "
              f"失败次数: {stats.get('failure_count', 0)}, "
              f"重连次数: {stats.get('reconnect_count', 0)}")
        
        # 服务状态检测增强
        failures = stats.get('failure_count', 0)
        if self.client and self.client.get_state() == ConnectionState.CIRCUIT_BREAKER_OPEN:
            print("⚠️  服务可能未启动，请检查:")
            print("   1. 推荐服务是否运行 (npm run dev)")
            print("   2. 抓取脚本是否执行 (start-etrans.ps1)")
            print("   3. 端口是否被占用 (netstat -an | findstr 7799)")
        elif failures > 3:
            print("⚠️  连接频繁失败，建议:")
            print("   1. 检查网络连接")
            print("   2. 验证服务端点配置")
            print("   3. 查看防火墙设置")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="WebSocket连接监控工具")
    parser.add_argument('--url', default='wss://ws.postman-echo.com/raw', 
                       help='WebSocket服务器地址 (默认: wss://ws.postman-echo.com/raw)')
    parser.add_argument('--test-reconnect', action='store_true',
                       help='测试重连机制 (模拟网络中断)')
    
    args = parser.parse_args()
    
    monitor = WSMonitor(args.url)
    
    if args.test_reconnect:
        print("🧪 重连测试模式已启用")
        print("💡 提示: 可以手动停止/启动WebSocket服务器来测试重连")
        
    try:
        monitor.start_monitoring()
    except Exception as e:
        print(f"❌ 监控启动失败: {e}")

if __name__ == "__main__":
    main()
