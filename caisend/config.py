#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
配置文件
管理易翻译路径、窗口标题等配置项
"""
import os

class Config:
    """系统配置类"""
    
    # 易翻译程序路径
    TRANSLATOR_EXE_PATH = r"C:\Program Files\traneasy\易翻译.exe"
    
    # CDP调试端口配置
    CDP_DEBUG_PORT = 9223
    CDP_HOST = '127.0.0.1'
    CDP_TIMEOUT = 10  # 连接超时（秒）
    
    # 易翻译可能的窗口标题（按优先级排序）
    TRANSLATOR_WINDOW_TITLES = [
        "易翻译",
        "EasyTranslator", 
        "Easy Translator",
        "traneasy",
        "TranEasy",
        "翻译助手",
        "Translation Assistant",
        "翻译器",
        "Translator"
    ]
    
    # 易翻译窗口检测关键词
    TRANSLATOR_KEYWORDS = [
        '易翻译',
        'traneasy', 
        'translate', 
        'easy', 
        'trans',
        'translator'
    ]
    
    # 日志文件相关配置
    LOG_PATHS = [
        r"C:\Users\hybnb\Desktop\traneasy\logs\chat.log",      # 可能的日志路径1
        r"C:\Users\hybnb\Desktop\traneasy\data\chat.log",      # 可能的日志路径2
        r"C:\Users\hybnb\Desktop\traneasy\chat.log",           # 可能的日志路径3
        r"C:\Users\hybnb\AppData\Local\TranEasy\chat.log",     # 用户数据目录
        r"C:\Users\hybnb\AppData\Roaming\TranEasy\chat.log",   # 漫游数据目录
        r"C:\temp\chat.log"                                    # 默认测试路径
    ]
    
    # 数据库配置
    DATABASE_PATH = "phrases.db"
    MESSAGES_DB_PATH = "messages.db"  # CDP捕捉的消息数据库
    
    # UI配置
    UI_CONFIG = {
        'floating_window_width': 350,
        'floating_window_max_height': 200,
        'auto_hide_delay': 10000,  # 10秒
        'position_update_interval': 100,  # 100ms
        'show_floating_window': True,
        'auto_send': True,
        # 浮动窗口吸附目标: 'telegram' 或 'translator'
        'attach_target': 'translator',  # 默认吸附到易翻译
        # 无匹配时是否显示全部话术
        'show_all_when_no_match': True
    }
    
    # 匹配配置
    MATCH_CONFIG = {
        'max_results': 5,
        'enable_fts_search': True,
        'keyword_min_length': 2,
        'cache_size': 100
    }
    
    @classmethod
    def get_translator_exe_path(cls):
        """获取易翻译程序路径"""
        return cls.TRANSLATOR_EXE_PATH
    
    @classmethod
    def get_log_path(cls):
        """获取日志文件路径（返回第一个存在的路径）"""
        for path in cls.LOG_PATHS:
            if os.path.exists(path):
                return path
        
        # 如果都不存在，尝试基于程序路径推测
        if os.path.exists(cls.TRANSLATOR_EXE_PATH):
            exe_dir = os.path.dirname(cls.TRANSLATOR_EXE_PATH)
            possible_logs = [
                os.path.join(exe_dir, "logs", "chat.log"),
                os.path.join(exe_dir, "data", "chat.log"),
                os.path.join(exe_dir, "chat.log"),
                os.path.join(exe_dir, "log.txt"),
                os.path.join(exe_dir, "messages.log")
            ]
            for log_path in possible_logs:
                if os.path.exists(log_path):
                    return log_path
        
        # 返回默认测试路径
        return cls.LOG_PATHS[-1]
    
    @classmethod
    def is_translator_running(cls):
        """检查易翻译是否正在运行"""
        import psutil
        try:
            exe_name = os.path.basename(cls.TRANSLATOR_EXE_PATH)
            for proc in psutil.process_iter(['name', 'exe']):
                try:
                    if proc.info['name'] and exe_name.lower() in proc.info['name'].lower():
                        return True
                    if proc.info['exe'] and cls.TRANSLATOR_EXE_PATH.lower() == proc.info['exe'].lower():
                        return True
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            return False
        except ImportError:
            # 如果没有psutil，尝试其他方法
            return os.path.exists(cls.TRANSLATOR_EXE_PATH)
    
    @classmethod
    def start_translator(cls, debug_mode=True, debug_port=None):
        """启动易翻译程序"""
        if debug_port is None:
            debug_port = cls.CDP_DEBUG_PORT
            
        if cls.is_translator_running():
            print("易翻译已在运行")
            return True
        
        if not os.path.exists(cls.TRANSLATOR_EXE_PATH):
            print(f"未找到易翻译程序：{cls.TRANSLATOR_EXE_PATH}")
            return False
        
        try:
            import subprocess
            
            # 构建启动命令
            cmd = [cls.TRANSLATOR_EXE_PATH]
            if debug_mode:
                cmd.append(f'--remote-debugging-port={debug_port}')
                cmd.append('--remote-allow-origins=*')
                print(f"以调试模式启动易翻译 (端口:{debug_port})")
            
            subprocess.Popen(cmd, shell=True)
            print(f"正在启动易翻译：{' '.join(cmd)}")
            return True
        except Exception as e:
            print(f"启动易翻译失败：{e}")
            return False
    
    @classmethod
    def validate_config(cls):
        """验证配置是否有效"""
        issues = []
        
        # 检查程序路径
        if not os.path.exists(cls.TRANSLATOR_EXE_PATH):
            issues.append(f"易翻译程序不存在：{cls.TRANSLATOR_EXE_PATH}")
        
        # 检查日志路径
        log_path = cls.get_log_path()
        if not os.path.exists(log_path):
            issues.append(f"日志文件不存在：{log_path}")
            
        # 检查CDP端口范围
        if not (1024 <= cls.CDP_DEBUG_PORT <= 65535):
            issues.append(f"CDP调试端口超出范围：{cls.CDP_DEBUG_PORT}")
        
        return issues
    
    @classmethod
    def check_cdp_connection(cls, host=None, port=None):
        """检查CDP连接是否可用"""
        if host is None:
            host = cls.CDP_HOST
        if port is None:
            port = cls.CDP_DEBUG_PORT
            
        try:
            import requests
            response = requests.get(f'http://{host}:{port}/json', timeout=cls.CDP_TIMEOUT)
            return response.status_code == 200
        except Exception:
            return False
    
    @classmethod
    def set_translator_path(cls, path, debug_port=None):
        """设置易翻译程序路径和调试端口"""
        cls.TRANSLATOR_EXE_PATH = path
        if debug_port is not None:
            cls.CDP_DEBUG_PORT = debug_port
    
    @classmethod
    def print_config_info(cls):
        """打印配置信息"""
        print("=== 易翻译配置信息 ===")
        print(f"程序路径: {cls.TRANSLATOR_EXE_PATH}")
        print(f"程序存在: {'是' if os.path.exists(cls.TRANSLATOR_EXE_PATH) else '否'}")
        print(f"程序运行: {'是' if cls.is_translator_running() else '否'}")
        
        print(f"\n=== CDP调试配置 ===")
        print(f"调试主机: {cls.CDP_HOST}")
        print(f"调试端口: {cls.CDP_DEBUG_PORT}")
        print(f"连接超时: {cls.CDP_TIMEOUT}秒")
        print(f"CDP可用: {'是' if cls.check_cdp_connection() else '否'}")
        
        print(f"\n=== 数据库配置 ===")
        print(f"话术数据库: {cls.DATABASE_PATH}")
        print(f"消息数据库: {cls.MESSAGES_DB_PATH}")
        
        print(f"\n=== 传统监控配置 ===")
        print(f"日志路径: {cls.get_log_path()}")
        print(f"日志存在: {'是' if os.path.exists(cls.get_log_path()) else '否'}")
        print(f"支持的窗口标题: {', '.join(cls.TRANSLATOR_WINDOW_TITLES[:3])}...")
        
        # 检查配置问题
        issues = cls.validate_config()
        if issues:
            print("\n[WARN] 配置问题:")
            for issue in issues:
                print(f"  - {issue}")
        else:
            print("\n[OK] 配置正常")


# 直接暴露的全局配置常量，便于其他模块引用
SAVE_MESSAGES = True
MESSAGES_DB_PATH = Config.MESSAGES_DB_PATH


# 测试代码
if __name__ == "__main__":
    Config.print_config_info()
    
    # 测试启动易翻译
    user_input = input("\n是否启动易翻译？(y/N): ").strip().lower()
    if user_input == 'y':
        Config.start_translator()
