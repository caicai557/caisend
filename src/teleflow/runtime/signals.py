"""信号处理模块 - 优雅退出支持"""

import signal
import sys
import logging
from typing import Callable, Optional


logger = logging.getLogger(__name__)


class SignalHandler:
    """信号处理器 - 处理 SIGINT/SIGTERM 实现优雅退出"""
    
    def __init__(self):
        """初始化信号处理器"""
        self.should_stop = False
        self.cleanup_callback: Optional[Callable] = None
        self._original_sigint = None
        self._original_sigterm = None
    
    def register(self, cleanup_callback: Optional[Callable] = None):
        """注册信号处理
        
        Args:
            cleanup_callback: 清理回调函数，在接收到信号时调用
        """
        self.cleanup_callback = cleanup_callback
        
        # 保存原始信号处理器
        self._original_sigint = signal.signal(signal.SIGINT, self._handle_signal)
        
        # Windows 不支持 SIGTERM，需要检查
        if hasattr(signal, 'SIGTERM'):
            self._original_sigterm = signal.signal(signal.SIGTERM, self._handle_signal)
            logger.info("已注册 SIGINT 和 SIGTERM 信号处理")
        else:
            logger.info("已注册 SIGINT 信号处理（系统不支持 SIGTERM）")
    
    def unregister(self):
        """取消注册信号处理"""
        if self._original_sigint:
            signal.signal(signal.SIGINT, self._original_sigint)
            self._original_sigint = None
        
        if self._original_sigterm and hasattr(signal, 'SIGTERM'):
            signal.signal(signal.SIGTERM, self._original_sigterm)
            self._original_sigterm = None
        
        logger.info("已取消信号处理注册")
    
    def _handle_signal(self, signum, frame):
        """信号处理回调
        
        Args:
            signum: 信号编号
            frame: 当前栈帧
        """
        signal_name = signal.Signals(signum).name if hasattr(signal, 'Signals') else f"Signal {signum}"
        
        if self.should_stop:
            logger.warning(f"再次接收到 {signal_name}，强制退出")
            sys.exit(1)
        
        logger.info(f"接收到 {signal_name}，准备优雅退出...")
        self.should_stop = True
        
        # 调用清理回调
        if self.cleanup_callback:
            try:
                logger.info("执行清理操作...")
                self.cleanup_callback()
            except Exception as e:
                logger.error(f"清理操作失败: {e}")
    
    def reset(self):
        """重置停止标志"""
        self.should_stop = False


# 全局信号处理器实例
_global_handler: Optional[SignalHandler] = None


def get_signal_handler() -> SignalHandler:
    """获取全局信号处理器实例"""
    global _global_handler
    if _global_handler is None:
        _global_handler = SignalHandler()
    return _global_handler


def register_signal_handler(cleanup_callback: Optional[Callable] = None):
    """注册信号处理（便捷函数）
    
    Args:
        cleanup_callback: 清理回调函数
    """
    handler = get_signal_handler()
    handler.register(cleanup_callback)


def should_stop() -> bool:
    """检查是否应该停止运行
    
    Returns:
        bool: True 表示应该停止
    """
    handler = get_signal_handler()
    return handler.should_stop
