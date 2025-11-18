"""Telegram Web 账号运行器"""

import asyncio
import logging
from pathlib import Path
from typing import Optional

from ..models.account import Account
from ..models.config import RuntimeConfig
from ..rules.engine import RuleEngine
from ..telegram_web.browser import BrowserManager
from ..telegram_web.navigator import ChatNavigator
from ..telegram_web.monitor import MessageMonitor
from ..telegram_web.actions import MessageActions
from ..telegram_web.groups import GroupManager
from .signals import get_signal_handler
from ..models.group import GroupInvite

# OCR 模块（可选依赖）
try:
    from ..ocr import DigitRecognizer, OCRResult
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    DigitRecognizer = None  # type: ignore
    OCRResult = None  # type: ignore


class AccountRunner:
    """Telegram Web 账号运行器
    
    负责管理单个账号的完整运行流程：
    - 浏览器管理
    - 聊天导航
    - 消息监控
    - 规则匹配与回复
    """
    
    def __init__(self, account: Account, runtime_config: RuntimeConfig, show_browser: bool = False):
        """
        初始化账号运行器
        
        Args:
            account: 账号配置
            runtime_config: 运行时配置
            show_browser: 是否显示浏览器界面
        """
        self.account = account
        self.runtime_config = runtime_config
        self.show_browser = show_browser
        
        # 设置日志
        self.logger = logging.getLogger(f"AccountRunner.{account.name}")
        
        # 核心组件
        self.browser_manager: Optional[BrowserManager] = None
        self.navigator: Optional[ChatNavigator] = None
        self.monitor: Optional[MessageMonitor] = None
        self.actions: Optional[MessageActions] = None
        self.rule_engine: Optional[RuleEngine] = None
        
        # OCR 组件（可选）
        self.ocr_recognizer: Optional[DigitRecognizer] = None  # type: ignore
        self.last_ocr_result: str = ""
        
        # 运行状态
        self.is_running = False
        self.should_stop = False
        
        # 错误计数
        self.consecutive_errors = 0
        self.max_consecutive_errors = 5
    
    async def initialize(self) -> bool:
        """
        初始化所有组件
        
        Returns:
            bool: True 表示初始化成功，False 表示失败
        """
        try:
            self.logger.info(f"开始初始化账号运行器: {self.account.name}")
            
            # 创建浏览器数据目录
            browser_data_dir = None
            if self.account.browser_data_dir:
                browser_data_dir = self.account.browser_data_dir
                # 确保目录存在
                browser_data_dir.mkdir(parents=True, exist_ok=True)
            
            # 初始化浏览器管理器
            self.browser_manager = BrowserManager(
                user_data_dir=browser_data_dir,
                headless=not self.show_browser
            )
            
            # 启动浏览器
            page = await self.browser_manager.launch()
            await self.browser_manager.navigate_to_telegram()
            
            # 初始化其他组件
            self.navigator = ChatNavigator(page)
            self.monitor = MessageMonitor(page, timeout=self.runtime_config.check_interval)
            self.actions = MessageActions(page)
            self.group_manager = GroupManager(
                page, 
                max_retries=self.runtime_config.max_retry_count
            )
            
            # 初始化规则引擎
            # TODO (Phase 4): 传递 runtime_config.random_seed 到 DelayCalculator
            self.rule_engine = RuleEngine(self.account)
            
            # Phase 7: 初始化 OCR 识别器（可选）
            if OCR_AVAILABLE:
                try:
                    self.ocr_recognizer = DigitRecognizer()  # type: ignore
                    self.logger.info("OCR 识别器初始化成功")
                except Exception as e:
                    self.logger.warning(f"OCR 识别器初始化失败: {e}，OCR 功能将不可用")
                    self.ocr_recognizer = None
            else:
                self.logger.debug("OCR 模块未安装，OCR 功能不可用")
            
            # Phase 6: 自动加入群组
            if self.account.group_invites:
                await self._join_groups()
            
            self.logger.info(f"账号运行器初始化成功: {self.account.name}")
            return True
            
        except Exception as e:
            self.logger.error(f"账号运行器初始化失败: {self.account.name}, 错误: {e}")
            return False
    
    async def run(self) -> None:
        """
        运行主循环
        
        监控消息、处理规则匹配、发送回复
        """
        if not await self.initialize():
            self.logger.error("初始化失败，无法启动运行器")
            return
        
        self.is_running = True
        self.should_stop = False
        
        # 注册信号处理
        signal_handler = get_signal_handler()
        signal_handler.register(cleanup_callback=lambda: setattr(self, 'should_stop', True))
        
        self.logger.info(f"开始运行账号: {self.account.name}")
        
        try:
            # 主要运行循环
            while not self.should_stop and not signal_handler.should_stop:
                try:
                    # 处理每个监控的聊天
                    for chat_name in self.account.monitor_chats:
                        if self.should_stop:
                            break
                        
                        await self._process_chat(chat_name)
                    
                    # 重置错误计数
                    self.consecutive_errors = 0
                    
                    # 等待下次检查
                    await asyncio.sleep(self.runtime_config.check_interval)
                    
                except Exception as e:
                    self.consecutive_errors += 1
                    self.logger.error(f"运行循环发生错误 (连续错误 {self.consecutive_errors}): {e}")
                    
                    # 错误降级处理
                    if self.consecutive_errors >= self.max_consecutive_errors:
                        self.logger.warning("连续错误过多，启用降级模式")
                        await self._handle_error_degradation()
                    
                    # 等待后继续
                    await asyncio.sleep(self.runtime_config.check_interval * 2)
        
        except asyncio.CancelledError:
            self.logger.info("运行器被取消")
        
        finally:
            await self.cleanup()
    
    async def stop(self) -> None:
        """停止运行器"""
        self.logger.info(f"正在停止账号运行器: {self.account.name}")
        self.should_stop = True
    
    async def cleanup(self) -> None:
        """清理资源"""
        try:
            self.is_running = False
            
            # 关闭浏览器
            if self.browser_manager:
                await self.browser_manager.close()
            
            self.logger.info(f"账号运行器清理完成: {self.account.name}")
            
        except Exception as e:
            self.logger.error(f"清理资源时发生错误: {e}")
    
    async def _process_chat(self, chat_name: str) -> None:
        """
        处理单个聊天
        
        Args:
            chat_name: 聊天名称
        """
        try:
            # 导航到聊天
            if not await self.navigator.navigate_to_chat(chat_name):
                self.logger.warning(f"无法导航到聊天: {chat_name}")
                return
            
            # 检查新消息
            if await self.monitor.check_new_messages():
                # 获取最新消息
                message_text = await self.monitor.get_latest_message_text()
                
                if message_text:
                    self.logger.info(f"检测到新消息: {message_text}")
                    
                    # Phase 7: 检查是否包含图片并进行 OCR
                    if self.ocr_recognizer and await self.monitor.has_image_in_latest_message():
                        self.logger.info("检测到图片消息，准备进行 OCR 识别")
                        # 注意: 实际应用中需要下载图片，这里简化处理
                        # 在实际场景中，需要实现图片下载功能
                        self.logger.warning("OCR 功能需要图片下载支持（待实现）")
                        # TODO: 实现图片下载和 OCR 识别
                        # image_url = await self.monitor.get_latest_image_url()
                        # if image_url:
                        #     image_path = await download_image(image_url)
                        #     ocr_result = self.ocr_recognizer.recognize(image_path, preprocess=True)
                        #     if ocr_result.success:
                        #         self.last_ocr_result = ocr_result.digits_only
                        #         self.logger.info(f"OCR 识别结果: {self.last_ocr_result}")
                    
                    # 标记为已读
                    await self.actions.mark_as_read()
                    
                    # 规则匹配
                    match_result = self.rule_engine.process_message(message_text)
                    
                    if match_result.matched:
                        self.logger.info(f"匹配到规则: {match_result.rule.keywords}")
                        
                        # 等待延迟
                        if match_result.delay > 0:
                            self.logger.info(f"等待延迟: {match_result.delay} 秒")
                            await asyncio.sleep(match_result.delay)
                        
                        # Phase 7: T074 - 发送回复（替换 OCR 变量）
                        if match_result.reply_text:
                            # 替换 {ocr_result} 变量
                            reply_text = match_result.reply_text.replace("{ocr_result}", self.last_ocr_result)
                            
                            success = await self.actions.send_message(reply_text)
                            if success:
                                self.logger.info(f"成功发送回复: {reply_text}")
                            else:
                                self.logger.error(f"发送回复失败: {reply_text}")
        
        except Exception as e:
            self.logger.error(f"处理聊天 {chat_name} 时发生错误: {e}")
            raise
    
    async def _join_groups(self) -> None:
        """
        加入配置的群组列表
        
        Phase 6: 群组支持功能
        """
        self.logger.info(f"开始加入 {len(self.account.group_invites)} 个群组")
        
        for i, group_invite in enumerate(self.account.group_invites, 1):
            try:
                # 解析群组邀请（支持字符串或 GroupInvite 对象）
                if isinstance(group_invite, str):
                    invite_link = group_invite
                    welcome_message = None
                elif isinstance(group_invite, GroupInvite):
                    if not group_invite.enabled:
                        self.logger.info(f"跳过已禁用的群组邀请 ({i}/{len(self.account.group_invites)}): {group_invite.invite_link}")
                        continue
                    invite_link = group_invite.invite_link
                    welcome_message = group_invite.welcome_message
                else:
                    self.logger.warning(f"未知的群组邀请类型: {type(group_invite)}")
                    continue
                
                self.logger.info(f"加入群组 ({i}/{len(self.account.group_invites)}): {invite_link}")
                
                # 尝试加入群组
                success = await self.group_manager.join_group(invite_link, welcome_message)
                
                if success:
                    self.logger.info(f"成功加入群组 ({i}/{len(self.account.group_invites)})")
                else:
                    self.logger.warning(f"加入群组失败 ({i}/{len(self.account.group_invites)})")
                
            except Exception as e:
                self.logger.error(f"处理群组邀请时出错 ({i}/{len(self.account.group_invites)}): {e}")
                # 继续处理下一个群组
                continue
        
        self.logger.info("群组加入流程完成")
    
    async def _handle_error_degradation(self) -> None:
        """
        处理错误降级模式
        
        当连续错误过多时，降低检查频率
        """
        self.logger.warning("进入错误降级模式，降低检查频率")
        
        # 降低检查频率
        degraded_interval = self.runtime_config.check_interval * 3
        await asyncio.sleep(degraded_interval)
        
        # 尝试重新初始化
        try:
            if self.browser_manager:
                await self.browser_manager.close()
            
            await self.initialize()
            self.consecutive_errors = 0
            self.logger.info("错误降级模式：重新初始化成功")
            
        except Exception as e:
            self.logger.error(f"错误降级模式：重新初始化失败: {e}")
    
    def get_status(self) -> dict:
        """
        获取运行器状态
        
        Returns:
            dict: 状态信息
        """
        return {
            "account_name": self.account.name,
            "is_running": self.is_running,
            "should_stop": self.should_stop,
            "consecutive_errors": self.consecutive_errors,
            "monitor_chats": len(self.account.monitor_chats),
            "rules_count": len(self.account.rules)
        }
