"""
多账号自动化控制器 - 企业级多账号管理系统
支持账号池管理、自动切换、负载均衡等高级功能
"""

import asyncio
import json
import time
import os
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import logging
import random
from concurrent.futures import ThreadPoolExecutor
import psutil

logger = logging.getLogger(__name__)

# ============= 账号配置 =============
@dataclass
class AccountConfig:
    """账号配置"""
    account_id: str
    phone_number: str
    password: Optional[str] = None
    session_file: Optional[str] = None
    proxy: Optional[str] = None
    user_agent: Optional[str] = None
    cookies: Optional[List[Dict]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
@dataclass 
class BrowserProfile:
    """浏览器配置文件"""
    profile_id: str
    profile_path: str
    cdp_port: int
    account_id: Optional[str] = None
    process: Optional[subprocess.Popen] = None
    created_at: float = field(default_factory=time.time)
    last_used: Optional[float] = None
    
# ============= 账号池管理器 =============
class AccountPool:
    """账号池管理器"""
    
    def __init__(self, max_concurrent: int = 5):
        self.accounts: Dict[str, AccountConfig] = {}
        self.active_accounts: Dict[str, AccountConfig] = {}
        self.suspended_accounts: Dict[str, AccountConfig] = {}
        self.max_concurrent = max_concurrent
        self.rotation_index = 0
        
    def add_account(self, account: AccountConfig) -> None:
        """添加账号到池"""
        self.accounts[account.account_id] = account
        logger.info(f"Added account to pool: {account.account_id}")
        
    def get_available_account(self) -> Optional[AccountConfig]:
        """获取可用账号（轮询）"""
        available = [
            acc for acc_id, acc in self.accounts.items()
            if acc_id not in self.active_accounts and acc_id not in self.suspended_accounts
        ]
        
        if not available:
            return None
            
        # 轮询选择
        account = available[self.rotation_index % len(available)]
        self.rotation_index += 1
        
        return account
        
    def activate_account(self, account_id: str) -> bool:
        """激活账号"""
        if len(self.active_accounts) >= self.max_concurrent:
            logger.warning(f"Max concurrent accounts reached: {self.max_concurrent}")
            return False
            
        if account_id in self.accounts:
            account = self.accounts[account_id]
            self.active_accounts[account_id] = account
            logger.info(f"Activated account: {account_id}")
            return True
            
        return False
        
    def deactivate_account(self, account_id: str) -> None:
        """停用账号"""
        if account_id in self.active_accounts:
            del self.active_accounts[account_id]
            logger.info(f"Deactivated account: {account_id}")
            
    def suspend_account(self, account_id: str, reason: str = "") -> None:
        """暂停账号"""
        if account_id in self.accounts:
            account = self.accounts[account_id]
            self.suspended_accounts[account_id] = account
            
            if account_id in self.active_accounts:
                del self.active_accounts[account_id]
                
            logger.warning(f"Suspended account {account_id}: {reason}")
            
    def resume_account(self, account_id: str) -> None:
        """恢复账号"""
        if account_id in self.suspended_accounts:
            del self.suspended_accounts[account_id]
            logger.info(f"Resumed account: {account_id}")
            
    def get_status(self) -> Dict:
        """获取池状态"""
        return {
            'total': len(self.accounts),
            'active': len(self.active_accounts),
            'suspended': len(self.suspended_accounts),
            'available': len(self.accounts) - len(self.active_accounts) - len(self.suspended_accounts),
            'max_concurrent': self.max_concurrent
        }

# ============= 浏览器管理器 =============
class BrowserManager:
    """浏览器实例管理器"""
    
    def __init__(self, base_profile_dir: str = "./profiles"):
        self.base_profile_dir = Path(base_profile_dir)
        self.base_profile_dir.mkdir(exist_ok=True)
        self.profiles: Dict[str, BrowserProfile] = {}
        self.port_pool = list(range(9222, 9322))
        self.used_ports = set()
        
    def create_profile(self, account_id: str) -> BrowserProfile:
        """创建浏览器配置文件"""
        profile_id = f"profile_{account_id}_{int(time.time())}"
        profile_path = self.base_profile_dir / profile_id
        profile_path.mkdir(exist_ok=True)
        
        # 分配端口
        port = self._allocate_port()
        
        profile = BrowserProfile(
            profile_id=profile_id,
            profile_path=str(profile_path),
            cdp_port=port,
            account_id=account_id
        )
        
        self.profiles[profile_id] = profile
        
        logger.info(f"Created browser profile: {profile_id}")
        return profile
        
    def _allocate_port(self) -> int:
        """分配可用端口"""
        available_ports = [p for p in self.port_pool if p not in self.used_ports]
        
        if not available_ports:
            raise Exception("No available CDP ports")
            
        port = available_ports[0]
        self.used_ports.add(port)
        
        return port
        
    def _release_port(self, port: int) -> None:
        """释放端口"""
        self.used_ports.discard(port)
        
    def launch_browser(self, profile: BrowserProfile, account_config: Optional[AccountConfig] = None) -> bool:
        """启动浏览器实例"""
        try:
            # 查找Chrome路径
            chrome_path = self._find_chrome()
            
            if not chrome_path:
                raise Exception("Chrome not found")
                
            # 构建启动参数
            args = [
                chrome_path,
                f"--remote-debugging-port={profile.cdp_port}",
                f"--user-data-dir={profile.profile_path}",
                "--no-first-run",
                "--no-default-browser-check",
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--no-sandbox"
            ]
            
            # 添加代理
            if account_config and account_config.proxy:
                args.append(f"--proxy-server={account_config.proxy}")
                
            # 添加User-Agent
            if account_config and account_config.user_agent:
                args.append(f"--user-agent={account_config.user_agent}")
                
            # 易翻译特殊配置
            args.extend([
                "--disable-web-security",
                "--disable-features=IsolateOrigins,site-per-process",
                "--allow-running-insecure-content",
                "--disable-site-isolation-trials"
            ])
            
            # 启动进程
            process = subprocess.Popen(
                args,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            
            profile.process = process
            profile.last_used = time.time()
            
            # 等待浏览器启动
            time.sleep(2)
            
            # 检查进程是否存活
            if process.poll() is not None:
                raise Exception("Browser process died")
                
            logger.info(f"Launched browser for profile: {profile.profile_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to launch browser: {e}")
            return False
            
    def _find_chrome(self) -> Optional[str]:
        """查找Chrome可执行文件"""
        paths = [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            r"C:\Users\%USERNAME%\AppData\Local\Google\Chrome\Application\chrome.exe",
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/usr/bin/google-chrome",
            "/usr/bin/chromium-browser",
            "/usr/bin/chromium"
        ]
        
        for path in paths:
            expanded = os.path.expandvars(path)
            if os.path.exists(expanded):
                return expanded
                
        return None
        
    def close_browser(self, profile_id: str) -> None:
        """关闭浏览器实例"""
        if profile_id not in self.profiles:
            return
            
        profile = self.profiles[profile_id]
        
        if profile.process:
            try:
                # 优雅关闭
                profile.process.terminate()
                profile.process.wait(timeout=5)
            except:
                # 强制关闭
                profile.process.kill()
                
            profile.process = None
            
        # 释放端口
        self._release_port(profile.cdp_port)
        
        logger.info(f"Closed browser for profile: {profile_id}")
        
    def cleanup_old_profiles(self, max_age_days: int = 7) -> None:
        """清理旧配置文件"""
        current_time = time.time()
        max_age_seconds = max_age_days * 24 * 3600
        
        for profile_id, profile in list(self.profiles.items()):
            age = current_time - profile.created_at
            
            if age > max_age_seconds and not profile.process:
                # 删除配置文件目录
                profile_path = Path(profile.profile_path)
                if profile_path.exists():
                    import shutil
                    shutil.rmtree(profile_path)
                    
                del self.profiles[profile_id]
                logger.info(f"Cleaned up old profile: {profile_id}")

# ============= 会话管理器 =============
class SessionManager:
    """会话状态管理器"""
    
    def __init__(self, session_dir: str = "./sessions"):
        self.session_dir = Path(session_dir)
        self.session_dir.mkdir(exist_ok=True)
        
    def save_session(self, account_id: str, session_data: Dict) -> None:
        """保存会话数据"""
        session_file = self.session_dir / f"{account_id}.json"
        
        with open(session_file, 'w') as f:
            json.dump({
                'account_id': account_id,
                'timestamp': time.time(),
                'data': session_data
            }, f, indent=2)
            
        logger.debug(f"Saved session for account: {account_id}")
        
    def load_session(self, account_id: str) -> Optional[Dict]:
        """加载会话数据"""
        session_file = self.session_dir / f"{account_id}.json"
        
        if not session_file.exists():
            return None
            
        try:
            with open(session_file, 'r') as f:
                session = json.load(f)
                
            # 检查会话是否过期（7天）
            age = time.time() - session['timestamp']
            if age > 7 * 24 * 3600:
                logger.warning(f"Session expired for account: {account_id}")
                return None
                
            return session['data']
            
        except Exception as e:
            logger.error(f"Failed to load session: {e}")
            return None
            
    def clear_session(self, account_id: str) -> None:
        """清除会话"""
        session_file = self.session_dir / f"{account_id}.json"
        
        if session_file.exists():
            session_file.unlink()
            logger.debug(f"Cleared session for account: {account_id}")

# ============= 负载均衡器 =============
class LoadBalancer:
    """负载均衡器"""
    
    def __init__(self, max_messages_per_account: int = 1000):
        self.max_messages_per_account = max_messages_per_account
        self.account_loads: Dict[str, int] = {}
        self.account_last_used: Dict[str, float] = {}
        
    def select_account(self, available_accounts: List[str]) -> Optional[str]:
        """选择负载最低的账号"""
        if not available_accounts:
            return None
            
        # 计算每个账号的得分
        scores = {}
        current_time = time.time()
        
        for account_id in available_accounts:
            load = self.account_loads.get(account_id, 0)
            last_used = self.account_last_used.get(account_id, 0)
            
            # 负载得分（越低越好）
            load_score = load / self.max_messages_per_account
            
            # 时间得分（越久没用越好）
            time_score = (current_time - last_used) / 3600  # 小时为单位
            
            # 综合得分
            scores[account_id] = load_score - (time_score * 0.1)
            
        # 选择得分最低的账号
        best_account = min(scores, key=scores.get)
        
        self.account_last_used[best_account] = current_time
        
        return best_account
        
    def update_load(self, account_id: str, messages_count: int) -> None:
        """更新账号负载"""
        self.account_loads[account_id] = self.account_loads.get(account_id, 0) + messages_count
        
    def reset_load(self, account_id: str) -> None:
        """重置账号负载"""
        self.account_loads[account_id] = 0
        
    def get_load_status(self) -> Dict:
        """获取负载状态"""
        return {
            'account_loads': self.account_loads,
            'max_load': max(self.account_loads.values()) if self.account_loads else 0,
            'avg_load': sum(self.account_loads.values()) / len(self.account_loads) if self.account_loads else 0
        }

# ============= 自动化控制器 =============
class AutomationController:
    """自动化控制器"""
    
    def __init__(self, config: Dict):
        self.config = config
        self.account_pool = AccountPool(config.get('max_concurrent', 5))
        self.browser_manager = BrowserManager(config.get('profile_dir', './profiles'))
        self.session_manager = SessionManager(config.get('session_dir', './sessions'))
        self.load_balancer = LoadBalancer(config.get('max_messages_per_account', 1000))
        self.running = False
        self.tasks = []
        
    def add_accounts(self, accounts: List[Dict]) -> None:
        """批量添加账号"""
        for acc_data in accounts:
            account = AccountConfig(
                account_id=acc_data['id'],
                phone_number=acc_data['phone'],
                password=acc_data.get('password'),
                session_file=acc_data.get('session'),
                proxy=acc_data.get('proxy'),
                user_agent=acc_data.get('user_agent'),
                metadata=acc_data.get('metadata', {})
            )
            
            self.account_pool.add_account(account)
            
    async def start(self) -> None:
        """启动自动化控制"""
        self.running = True
        
        # 启动监控任务
        self.tasks.append(asyncio.create_task(self._monitor_accounts()))
        self.tasks.append(asyncio.create_task(self._auto_rotate()))
        self.tasks.append(asyncio.create_task(self._health_check()))
        
        logger.info("Automation controller started")
        
    async def stop(self) -> None:
        """停止自动化控制"""
        self.running = False
        
        # 取消所有任务
        for task in self.tasks:
            task.cancel()
            
        # 关闭所有浏览器
        for profile_id in list(self.browser_manager.profiles.keys()):
            self.browser_manager.close_browser(profile_id)
            
        logger.info("Automation controller stopped")
        
    async def _monitor_accounts(self) -> None:
        """监控账号状态"""
        while self.running:
            try:
                # 检查活跃账号
                for account_id in list(self.account_pool.active_accounts.keys()):
                    # 检查负载
                    load = self.load_balancer.account_loads.get(account_id, 0)
                    
                    if load > self.config.get('max_messages_per_account', 1000):
                        logger.warning(f"Account {account_id} reached max load, rotating...")
                        await self._rotate_account(account_id)
                        
                # 清理旧配置文件
                self.browser_manager.cleanup_old_profiles()
                
            except Exception as e:
                logger.error(f"Monitor error: {e}")
                
            await asyncio.sleep(60)  # 每分钟检查一次
            
    async def _auto_rotate(self) -> None:
        """自动轮换账号"""
        while self.running:
            try:
                rotation_interval = self.config.get('rotation_interval', 3600)
                await asyncio.sleep(rotation_interval)
                
                # 轮换最久未使用的账号
                if self.account_pool.active_accounts:
                    oldest_account = min(
                        self.account_pool.active_accounts.keys(),
                        key=lambda x: self.load_balancer.account_last_used.get(x, 0)
                    )
                    
                    await self._rotate_account(oldest_account)
                    
            except Exception as e:
                logger.error(f"Auto rotate error: {e}")
                
    async def _rotate_account(self, old_account_id: str) -> None:
        """轮换账号"""
        # 获取新账号
        new_account = self.account_pool.get_available_account()
        
        if not new_account:
            logger.warning("No available account for rotation")
            return
            
        # 停用旧账号
        self.account_pool.deactivate_account(old_account_id)
        
        # 关闭旧浏览器
        for profile_id, profile in self.browser_manager.profiles.items():
            if profile.account_id == old_account_id:
                self.browser_manager.close_browser(profile_id)
                break
                
        # 启动新账号
        await self._launch_account(new_account.account_id)
        
        logger.info(f"Rotated account: {old_account_id} -> {new_account.account_id}")
        
    async def _launch_account(self, account_id: str) -> bool:
        """启动账号"""
        if account_id not in self.account_pool.accounts:
            return False
            
        account = self.account_pool.accounts[account_id]
        
        # 创建浏览器配置文件
        profile = self.browser_manager.create_profile(account_id)
        
        # 启动浏览器
        if not self.browser_manager.launch_browser(profile, account):
            return False
            
        # 激活账号
        self.account_pool.activate_account(account_id)
        
        # 加载会话
        session = self.session_manager.load_session(account_id)
        if session:
            # TODO: 恢复会话到浏览器
            pass
            
        return True
        
    async def _health_check(self) -> None:
        """健康检查"""
        while self.running:
            try:
                # 检查浏览器进程
                for profile_id, profile in list(self.browser_manager.profiles.items()):
                    if profile.process and profile.process.poll() is not None:
                        logger.error(f"Browser crashed for profile: {profile_id}")
                        
                        # 重启浏览器
                        if profile.account_id:
                            await self._launch_account(profile.account_id)
                            
                # 检查系统资源
                memory = psutil.virtual_memory()
                cpu = psutil.cpu_percent(interval=1)
                
                if memory.percent > 90:
                    logger.warning(f"High memory usage: {memory.percent}%")
                    
                if cpu > 90:
                    logger.warning(f"High CPU usage: {cpu}%")
                    
            except Exception as e:
                logger.error(f"Health check error: {e}")
                
            await asyncio.sleep(30)  # 每30秒检查一次
            
    def get_status(self) -> Dict:
        """获取控制器状态"""
        return {
            'running': self.running,
            'account_pool': self.account_pool.get_status(),
            'load_balancer': self.load_balancer.get_load_status(),
            'active_browsers': len([p for p in self.browser_manager.profiles.values() if p.process]),
            'system': {
                'memory': psutil.virtual_memory().percent,
                'cpu': psutil.cpu_percent()
            }
        }

# ============= 使用示例 =============
async def main():
    """示例主函数"""
    
    # 配置
    config = {
        'max_concurrent': 3,
        'profile_dir': './browser_profiles',
        'session_dir': './account_sessions',
        'max_messages_per_account': 500,
        'rotation_interval': 1800  # 30分钟
    }
    
    # 创建控制器
    controller = AutomationController(config)
    
    # 添加账号
    accounts = [
        {
            'id': 'acc1',
            'phone': '+1234567890',
            'proxy': 'socks5://127.0.0.1:1080'
        },
        {
            'id': 'acc2',
            'phone': '+0987654321',
            'proxy': 'http://127.0.0.1:8080'
        },
        {
            'id': 'acc3',
            'phone': '+1122334455'
        }
    ]
    
    controller.add_accounts(accounts)
    
    # 启动控制器
    await controller.start()
    
    try:
        # 运行
        while True:
            status = controller.get_status()
            print(f"Controller status: {json.dumps(status, indent=2)}")
            await asyncio.sleep(60)
            
    except KeyboardInterrupt:
        await controller.stop()

if __name__ == "__main__":
    asyncio.run(main())